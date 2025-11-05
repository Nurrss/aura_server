import express from 'express';
import authRoutes from './auth.routes.js';
import tasksRoutes from './tasks.routes.js';
import habitsRoutes from './habits.routes.js';
import pomodoroRoutes from './pomodoro.routes.js';
import reportsRoutes from './reports.routes.js';
import telegramRoutes from './telegram.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/tasks', tasksRoutes);
router.use('/habits', habitsRoutes);
router.use('/pomodoro', pomodoroRoutes);
router.use('/reports', reportsRoutes);
router.use('/telegram', telegramRoutes);

export default router;
