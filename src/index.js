// index.js src
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { doubleCsrf } from 'csrf-csrf';
import dotenv from 'dotenv';

dotenv.config();

import { ENV } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/tasks.routes.js';
import habitRoutes from './routes/habits.routes.js';
import pomodoroRoutes from './routes/pomodoro.routes.js';
import reportRoutes from './routes/reports.routes.js';
import telegramRoutes from './routes/telegram.routes.js';
import userRoutes from './routes/user.routes.js';
import financeRoutes from './routes/finance.routes.js';
import roadmapRoutes from './routes/roadmap.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import './bot/telegramBot.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: ENV.CLIENT_URL,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(cookieParser());

// CSRF Protection
const {
  generateCsrfToken, // generates a CSRF token
  doubleCsrfProtection, // middleware to validate CSRF
} = doubleCsrf({
  getSecret: () => ENV.JWT_ACCESS_SECRET, // Use existing secret
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getSessionIdentifier: (req) => req.sessionID || req.ip || '', // Use session ID or IP
});

// Endpoint to get CSRF token
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

// HTTP request logging (dev format for better readability in console)
app.use(morgan('dev'));

// Rate limiting for email endpoints
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 999, // Max 3 emails per hour
  message: 'Too many email requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to email routes
app.use('/api/auth/forgot-password', emailLimiter);

// Apply CSRF protection to all API routes (ignores GET/HEAD/OPTIONS)
app.use('/api', doubleCsrfProtection);

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/users', userRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Aura API is running' });
});

export default app;
