// report.service.js
import { prisma } from '../config/prismaClient.js';
import dayjs from 'dayjs';

export const getTodayReport = async (userId) => {
  const todayStart = dayjs().startOf('day').toDate();
  const todayEnd = dayjs().endOf('day').toDate();
  const tasksCompleted = await prisma.task.count({
    where: {
      userId,
      status: 'completed',
      updatedAt: { gte: todayStart, lte: todayEnd },
    },
  });
  const tasksPending = await prisma.task.count({
    where: { userId, status: 'pending' },
  });
  const focusSessions = await prisma.focusSession.findMany({
    where: { userId, createdAt: { gte: todayStart, lte: todayEnd } },
  });
  const focusMinutes = focusSessions.reduce((s, x) => s + (x.duration || 0), 0);
  const habitsDone = await prisma.habit.count({
    where: {
      userId,
      lastCompletedAt: { gte: todayStart, lte: todayEnd },
    },
  });
  return {
    date: new Date(),
    tasksCompleted,
    tasksPending,
    focusMinutes,
    habitsDone,
  };
};

export const saveDailyReport = async (userId, payload) => {
  const r = await prisma.dailyReport.create({
    data: {
      userId,
      date: payload.date ? new Date(payload.date) : new Date(),
      tasksCompleted: payload.tasksCompleted || 0,
      tasksPending: payload.tasksPending || 0,
      focusMinutes: payload.focusMinutes || 0,
      habitsDone: payload.habitsDone || 0,
    },
  });
  return r;
};
