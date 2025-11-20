// habit.service.js
import { prisma } from '../config/prismaClient.js';
import dayjs from 'dayjs';

export const getHabits = async (userId) =>
  prisma.habit.findMany({ where: { userId } });

export const createHabit = async (userId, data) =>
  prisma.habit.create({ data: { userId, ...data } });

export const updateHabit = async (userId, habitId, data) => {
  const h = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!h || h.userId !== userId) throw new Error('Habit not found');
  return prisma.habit.update({ where: { id: habitId }, data });
};

/**
 * Simple toggle:
 * - if lastCompleted is yesterday -> streak++
 * - else -> streak = 1
 */
export const toggleHabit = async (userId, habitId) => {
  const h = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!h || h.userId !== userId) throw new Error('Habit not found');
  const today = dayjs().startOf('day');
  const yesterday = dayjs().subtract(1, 'day').startOf('day');
  const lastCompleted = h.lastCompletedAt ? dayjs(h.lastCompletedAt).startOf('day') : null;

  let streak = h.streak || 0;
  if (lastCompleted && lastCompleted.isSame(yesterday, 'day')) {
    streak += 1;
  } else if (lastCompleted && lastCompleted.isSame(today, 'day')) {
    // Already completed today, don't update
    return h;
  } else {
    streak = 1;
  }

  return prisma.habit.update({
    where: { id: habitId },
    data: { streak, lastCompletedAt: today.toDate() },
  });
};

export const deleteHabit = async (userId, habitId) => {
  const h = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!h || h.userId !== userId) throw new Error('Habit not found');
  return prisma.habit.delete({ where: { id: habitId } });
};
