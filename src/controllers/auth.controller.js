//auth.controller.js
import * as authService from '../services/auth.service.js';
import { prisma } from '../config/prismaClient.js';
import crypto from 'crypto';
import validator from 'validator';
import dns from 'dns/promises';
import { sendVerificationEmail } from '../services/email.service.js';
import * as telegramService from '../services/telegram.service.js';
import { sendResetPasswordEmail } from '../utils/email.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js';

/**
 * Register: create user + return tokens
 */

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // 1️⃣ Проверяем формат email
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid email format' });
    }

    // 2️⃣ Проверяем MX-запись домена
    const domain = email.split('@')[1];
    try {
      const records = await dns.resolveMx(domain);
      if (!records || records.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: 'Email domain not found' });
      }
    } catch {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid email domain' });
    }

    // 3️⃣ Проверяем, не зарегистрирован ли уже пользователь
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, error: 'Email already registered' });
    }

    // 4️⃣ Генерируем Telegram-код
    let telegramCode;
    let exists = true;
    while (exists) {
      telegramCode = crypto.randomInt(100000, 999999).toString();
      exists = await prisma.user.findUnique({ where: { telegramCode } });
    }

    // 5️⃣ Хэш пароля
    const passwordHash = await authService.hashPassword(password);

    // 6️⃣ Токен верификации
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 минут

    // 7️⃣ Создаём пользователя
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        telegramCode,
        verifyToken,
        verifyExpires,
      },
    });

    // 8️⃣ Отправляем письмо
    await sendVerificationEmail(email, verifyToken);

    res.status(201).json({
      success: true,
      message: 'Verification email sent. Please confirm your email.',
      data: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ✅ Новый эндпоинт для подтверждения email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyExpires: { gt: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid or expired token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verifyToken: null,
        verifyExpires: null,
      },
    });

    res
      .status(200)
      .json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Login: return tokens and set cookies
 */
export const login = async (req, res) => {
  console.log('📩 Login request received:', { email: req.body?.email });
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('❌ Login failed: missing credentials');
      return res
        .status(400)
        .json({ success: false, error: 'Email and password required' });
    }

    const data = await authService.loginUser(email, password);
    console.log('✅ Login successful for:', email);

    // Set HttpOnly cookies
    setAuthCookies(res, data.accessToken, data.refreshToken);

    // Return user info without tokens (tokens are in cookies)
    return res.status(200).json({
      success: true,
      data: {
        user: data.user,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return res.status(401).json({ success: false, error: error.message });
  }
};

/**
 * Refresh tokens - reads from cookie, sets new cookies
 */
export const refresh = async (req, res) => {
  try {
    // Try to get refresh token from cookie first, fallback to body
    const refreshToken =
      req.cookies['aura-refresh-token'] || req.body.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, error: 'No refresh token provided' });
    }

    const tokens = await authService.refreshTokens(refreshToken);

    // Set new HttpOnly cookies
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(200).json({ success: true, data: { refreshed: true } });
  } catch (error) {
    console.error('Refresh error:', error);
    // Clear cookies on refresh failure
    clearAuthCookies(res);
    return res.status(401).json({ success: false, error: error.message });
  }
};

/**
 * Logout - clears cookies and invalidates refresh token
 */
export const logout = async (req, res) => {
  try {
    // Get user ID from authenticated request (set by middleware)
    const userId = req.user?.id;

    if (userId) {
      // Invalidate refresh token in database
      await authService.logoutUser(userId);
    }

    // Clear HttpOnly cookies
    clearAuthCookies(res);

    return res
      .status(200)
      .json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, clear the cookies
    clearAuthCookies(res);
    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  }
};

// ========== 🔑 Forgot Password ==========
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, error: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
      return res.status(200).json({
        success: true,
        message: 'If the email exists, reset link sent.',
      });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { email },
      data: { verifyToken: token, verifyExpires: expires },
    });

    await sendResetPasswordEmail(user.email, token);
    return res
      .status(200)
      .json({ success: true, message: 'Reset link sent to your email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res
      .status(500)
      .json({ success: false, error: 'Failed to send reset link' });
  }
};

// ========== 🔁 Reset Password ==========
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword)
      return res
        .status(400)
        .json({ success: false, error: 'Token and password required' });

    const user = await prisma.user.findFirst({
      where: {
        verifyToken: token,
        verifyExpires: { gt: new Date() },
      },
    });
    if (!user)
      return res
        .status(400)
        .json({ success: false, error: 'Invalid or expired token' });

    const passwordHash = await authService.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, verifyToken: null, verifyExpires: null },
    });

    return res
      .status(200)
      .json({ success: true, message: 'Password successfully reset' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
};

// ========== 🔒 Change Password (authenticated user) ==========
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user)
      return res.status(404).json({ success: false, error: 'User not found' });

    const isValid = await authService.verifyPassword(
      oldPassword,
      user.passwordHash
    );
    if (!isValid)
      return res
        .status(400)
        .json({ success: false, error: 'Old password incorrect' });

    const passwordHash = await authService.hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return res
      .status(200)
      .json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res
      .status(500)
      .json({ success: false, error: 'Failed to change password' });
  }
};

// ========== 🤖 Telegram Link ==========
export const linkTelegram = async (req, res) => {
  try {
    const { telegramCode, telegramId } = req.body;
    if (!telegramCode || !telegramId)
      return res.status(400).json({
        success: false,
        error: 'telegramCode and telegramId required',
      });

    const result = await telegramService.linkTelegramAccount(
      telegramCode,
      telegramId
    );
    return res.status(200).json({
      success: true,
      message: 'Telegram successfully linked',
      data: result,
    });
  } catch (err) {
    console.error('Telegram link error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// ========== 🔌 Telegram Unlink ==========
export const unlinkTelegram = async (req, res) => {
  try {
    const userId = req.user.id;
    await telegramService.unlinkTelegramAccount(userId);
    return res
      .status(200)
      .json({ success: true, message: 'Telegram successfully unlinked' });
  } catch (err) {
    console.error('Telegram unlink error:', err);
    res
      .status(500)
      .json({ success: false, error: 'Failed to unlink Telegram' });
  }
};
