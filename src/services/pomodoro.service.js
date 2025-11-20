// pomodoro.service.js
import { prisma } from '../config/prismaClient.js';

export const startSession = async (userId, taskId, duration) => {
  const s = await prisma.focusSession.create({
    data: {
      userId,
      taskId: taskId || null,
      duration: duration || 25,
      completed: false,
    },
  });
  return { sessionId: s.id, startedAt: s.createdAt };
};

export const finishSession = async (userId, sessionId, duration, completed) => {
  const s = await prisma.focusSession.findUnique({ where: { id: sessionId } });
  if (!s || s.userId !== userId) throw new Error('Session not found');
  const updated = await prisma.focusSession.update({
    where: { id: sessionId },
    data: { duration: duration || s.duration, completed: !!completed },
  });
  if (completed && s.taskId) {
    await prisma.task.update({
      where: { id: s.taskId },
      data: { status: 'completed' },
    });
  }
  return updated;
};

export const getStats = async (userId, from, to, paginationParams) => {
  const where = { userId };
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = new Date(from);
  if (to) where.createdAt.lte = new Date(to);

  const { skip, take } = paginationParams || {};

  const [sessions, totalSessions, allSessions] = await Promise.all([
    prisma.focusSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.focusSession.count({ where }),
    // Get all sessions for calculating total minutes (not paginated)
    prisma.focusSession.findMany({
      where,
      select: { duration: true },
    }),
  ]);

  const totalMinutes = allSessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  return {
    totalMinutes,
    sessionsCount: totalSessions,
    sessions,
    total: totalSessions,
  };
};

export const deleteSession = async (userId, sessionId) => {
  const s = await prisma.focusSession.findUnique({ where: { id: sessionId } });
  if (!s || s.userId !== userId) throw new Error('Session not found');
  return prisma.focusSession.delete({ where: { id: sessionId } });
};
