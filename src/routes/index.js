// index.js routes
import express from 'express';
import authRoutes from './auth.routes.js';
import tasksRoutes from './tasks.routes.js';
import habitsRoutes from './habits.routes.js';
import pomodoroRoutes from './pomodoro.routes.js';
import reportsRoutes from './reports.routes.js';
import telegramRoutes from './telegram.routes.js';
import financeRoutes from './finance.routes.js';
import roadmapRoutes from './roadmap.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/tasks', tasksRoutes);
router.use('/habits', habitsRoutes);
router.use('/pomodoro', pomodoroRoutes);
router.use('/reports', reportsRoutes);
router.use('/telegram', telegramRoutes);
router.use('/finance', financeRoutes);
router.use('/roadmap', roadmapRoutes);

export default router;
