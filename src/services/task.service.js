// task.service.js
import { prisma } from '../config/prismaClient.js';
import dayjs from 'dayjs';

export const getTasksForUser = async (userId, from, to) => {
  const where = { userId };
  if (from || to) {
    where.AND = [];
    if (from)
      where.AND.push({
        OR: [
          { startTime: { gte: new Date(from) } },
          { endTime: { gte: new Date(from) } },
        ],
      });
    if (to)
      where.AND.push({
        OR: [
          { startTime: { lte: new Date(to) } },
          { endTime: { lte: new Date(to) } },
        ],
      });
  }
  return prisma.task.findMany({ where, orderBy: { startTime: 'asc' } });
};

export const createTask = async (userId, data) => {
  return prisma.task.create({
    data: { userId, ...data },
  });
};

export const updateTask = async (userId, taskId, data) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== userId) throw new Error('Task not found');
  return prisma.task.update({ where: { id: taskId }, data });
};

export const moveTask = async (userId, taskId, startTime, endTime) => {
  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (!t || t.userId !== userId) throw new Error('Task not found');
  return prisma.task.update({
    where: { id: taskId },
    data: {
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
    },
  });
};

export const completeTask = async (userId, taskId) => {
  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (!t || t.userId !== userId) throw new Error('Task not found');
  return prisma.task.update({
    where: { id: taskId },
    data: { status: 'completed' },
  });
};

export const deleteTask = async (userId, taskId) => {
  const t = await prisma.task.findUnique({ where: { id: taskId } });
  if (!t || t.userId !== userId) throw new Error('Task not found');
  return prisma.task.delete({ where: { id: taskId } });
};
