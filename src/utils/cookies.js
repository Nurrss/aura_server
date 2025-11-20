// cookies.js
import { ENV } from '../config/env.js';

const isProduction = process.env.NODE_ENV === 'production';

export const COOKIE_OPTIONS = {
  ACCESS_TOKEN: {
    httpOnly: true,
    secure: isProduction, // HTTPS only in production
    sameSite: 'lax', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    path: '/',
  },
  REFRESH_TOKEN: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    path: '/',
  },
};

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'aura-access-token',
  REFRESH_TOKEN: 'aura-refresh-token',
};

/**
 * Set authentication cookies in response
 * @param {Object} res - Express response object
 * @param {String} accessToken - JWT access token
 * @param {String} refreshToken - JWT refresh token
 */
export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(
    COOKIE_NAMES.ACCESS_TOKEN,
    accessToken,
    COOKIE_OPTIONS.ACCESS_TOKEN
  );
  res.cookie(
    COOKIE_NAMES.REFRESH_TOKEN,
    refreshToken,
    COOKIE_OPTIONS.REFRESH_TOKEN
  );
};

/**
 * Clear authentication cookies
 * @param {Object} res - Express response object
 */
export const clearAuthCookies = (res) => {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, { path: '/' });
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: '/' });
};
