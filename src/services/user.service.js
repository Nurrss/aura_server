// user.service.js
import { prisma } from '../config/prismaClient.js';

export const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isVerified: true,
      telegramId: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new Error('User not found');
  return user;
};

export const updateUserPreferences = async (userId, preferences) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  return prisma.user.update({
    where: { id: userId },
    data: { preferences },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isVerified: true,
      telegramId: true,
      preferences: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};
