// jwt.js
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const generateTokens = (user) => {
  const accessToken = jwt.sign({ userId: user.id }, ENV.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ userId: user.id }, ENV.JWT_REFRESH_SECRET, {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};

export const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};
