// auth.middleware.js
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header)
      return res.status(401).json({ success: false, error: 'No token' });

    const token = header.split(' ')[1];
    if (!token)
      return res.status(401).json({ success: false, error: 'No token' });

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
