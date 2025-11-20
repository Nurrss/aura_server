// index.js src
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

import { ENV } from './config/env.js';
import logger from './config/logger.js';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/tasks.routes.js';
import habitRoutes from './routes/habits.routes.js';
import pomodoroRoutes from './routes/pomodoro.routes.js';
import reportRoutes from './routes/reports.routes.js';
import telegramRoutes from './routes/telegram.routes.js';
import userRoutes from './routes/user.routes.js';
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

// HTTP request logging
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for email endpoints
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 emails per hour
  message: 'Too many email requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', emailLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Aura API is running' });
});

export default app;
