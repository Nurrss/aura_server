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
 * For this MVP we store lastCompleted date into `reminderTime` field as hack (better to add lastCompleted column later)
 */
export const toggleHabit = async (userId, habitId) => {
  const h = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!h || h.userId !== userId) throw new Error('Habit not found');
  const today = dayjs().format('YYYY-MM-DD');
  const last = h.reminderTime || null; // reusing reminderTime as lastCompleted (quick)
  let streak = h.streak || 0;
  if (last === dayjs().subtract(1, 'day').format('YYYY-MM-DD')) {
    streak += 1;
  } else {
    streak = 1;
  }
  return prisma.habit.update({
    where: { id: habitId },
    data: { streak, reminderTime: today },
  });
};
