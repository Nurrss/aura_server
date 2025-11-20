// auth.middleware.js
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { COOKIE_NAMES } from '../utils/cookies.js';

export const authenticate = (req, res, next) => {
  try {
    // Try to get token from cookie first, then fallback to Authorization header
    let token = req.cookies[COOKIE_NAMES.ACCESS_TOKEN];

    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const header = req.headers.authorization;
      if (header) {
        token = header.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token' });
    }

    const decoded = jwt.verify(token, ENV.JWT_ACCESS_SECRET);
    // attach user info to request
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, error: 'Invalid or expired token' });
  }
};
