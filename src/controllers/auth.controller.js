//auth.controller.js
import * as authService from '../services/auth.service.js';
import { prisma } from '../config/prismaClient.js';
import crypto from 'crypto';
import validator from 'validator';
import dns from 'dns/promises';
import { sendVerificationEmail } from '../services/email.service.js';

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
 * Login: return tokens
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, error: 'Email and password required' });

    const data = await authService.loginUser(email, password);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(401).json({ success: false, error: error.message });
  }
};

/**
 * Refresh tokens
 */
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshTokens(refreshToken);
    return res.status(200).json({ success: true, data: tokens });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(401).json({ success: false, error: error.message });
  }
};

/**
 * Logout
 */
export const logout = async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header)
      return res
        .status(401)
        .json({ success: false, error: 'No token provided' });

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET);

    const data = await logoutUser(decoded.id);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
};
