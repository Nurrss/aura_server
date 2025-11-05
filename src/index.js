// index.js src
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/tasks.routes.js';
import habitRoutes from './routes/habits.routes.js';
import pomodoroRoutes from './routes/pomodoro.routes.js';
import reportRoutes from './routes/reports.routes.js';
import telegramRoutes from './routes/telegram.routes.js';
import './bot/telegramBot.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/telegram', telegramRoutes);

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Aura API is running' });
});

export default app;
