import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prismaClient.js';
import { ENV } from '../config/env.js';

/**
 * Password
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Tokens
 */
export const generateAccessToken = (payload) =>
  jwt.sign(payload, ENV.JWT_ACCESS_SECRET, {
    expiresIn: ENV.JWT_ACCESS_EXPIRES,
  });

export const generateRefreshToken = (payload) =>
  jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES,
  });

const issueTokens = (userId) => {
  const accessToken = generateAccessToken({ id: userId });
  const refreshToken = generateRefreshToken({ id: userId });
  return { accessToken, refreshToken };
};

/**
 * Register user (create + tokens)
 * NOTE: caller is responsible for validating payload (email/password)
 */
export const registerUser = async (
  email,
  password,
  name,
  telegramCode = null
) => {
  // check email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('User already exists');

  const passwordHash = await hashPassword(password);

  // create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      telegramCode,
    },
  });

  const tokens = issueTokens(user.id);

  // store refresh token
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      telegramCode: user.telegramCode,
    },
    ...tokens,
  };
};

/**
 * Login user
 */
export const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid password');

  const tokens = issueTokens(user.id);

  // save refresh token (rotation)
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      telegramCode: user.telegramCode,
    },
    ...tokens,
  };
};

/**
 * Refresh tokens (token rotation)
 */
export const refreshTokens = async (oldRefreshToken) => {
  if (!oldRefreshToken) throw new Error('No refresh token provided');

  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, ENV.JWT_REFRESH_SECRET);
  } catch (e) {
    throw new Error('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new Error('User not found');

  // check token equality (we store single refresh token per user)
  if (!user.refreshToken || user.refreshToken !== oldRefreshToken) {
    throw new Error('Refresh token mismatch');
  }

  const tokens = issueTokens(user.id);

  // rotate refresh token in DB
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return tokens;
};

/**
 * Logout: invalidate refresh token in DB
 */
export const logoutUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  return { message: 'Logged out successfully' };
};
