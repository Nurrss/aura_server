// roadmap.service.js
import { prisma } from '../config/prismaClient.js';
import dayjs from 'dayjs';

/**
 * Get all roadmaps for a user
 * @param {number} userId - User ID
 * @param {Object} filters - Optional filters (status, includeGoals, includeMilestones)
 * @returns {Promise<Array>} - List of roadmaps
 */
export const getRoadmapsForUser = async (userId, filters = {}) => {
  const { status, includeGoals = true, includeMilestones = false, includeProgress = true } = filters;

  const where = { userId };
  if (status) {
    where.status = status;
  }

  const include = {};
  if (includeGoals) {
    include.goals = {
      orderBy: { order: 'asc' },
      include: includeMilestones ? { milestones: { orderBy: { order: 'asc' } } } : false,
    };
  }
  if (includeProgress) {
    include.progressSnapshots = {
      orderBy: { snapshotDate: 'desc' },
      take: 1,
    };
  }

  const roadmaps = await prisma.roadmap.findMany({
    where,
    include,
    orderBy: { createdAt: 'desc' },
  });

  return roadmaps;
};

/**
 * Get a single roadmap by ID
 * @param {number} userId - User ID
 * @param {number} roadmapId - Roadmap ID
 * @param {Object} options - Include options
 * @returns {Promise<Object>} - Roadmap object
 */
export const getRoadmapById = async (userId, roadmapId, options = {}) => {
  const { includeGoals = true, includeMilestones = true, includeTasks = false } = options;

  const include = {};
  if (includeGoals) {
    include.goals = {
      orderBy: { order: 'asc' },
      include: includeMilestones
        ? {
            milestones: {
              orderBy: { order: 'asc' },
              include: includeTasks ? { roadmapTasks: true } : false,
            },
          }
        : false,
    };
  }

  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    include,
  });

  if (!roadmap || roadmap.userId !== userId) {
    throw new Error('Roadmap not found');
  }

  return roadmap;
};

/**
 * Create a new roadmap
 * @param {number} userId - User ID
 * @param {Object} data - Roadmap data
 * @returns {Promise<Object>} - Created roadmap
 */
export const createRoadmap = async (userId, data) => {
  const { title, visionStatement, startDate, endDate, status = 'draft', generationMethod = 'manual' } = data;

  // Calculate 5 years from start date if endDate not provided
  const start = dayjs(startDate);
  const end = endDate ? dayjs(endDate) : start.add(5, 'year');

  const roadmap = await prisma.roadmap.create({
    data: {
      userId,
      title,
      visionStatement,
      startDate: start.toDate(),
      endDate: end.toDate(),
      status,
      generationMethod,
      progressPercentage: 0,
    },
  });

  return roadmap;
};

/**
 * Update a roadmap
 * @param {number} userId - User ID
 * @param {number} roadmapId - Roadmap ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} - Updated roadmap
 */
export const updateRoadmap = async (userId, roadmapId, data) => {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
  });

  if (!roadmap || roadmap.userId !== userId) {
    throw new Error('Roadmap not found');
  }

  const updated = await prisma.roadmap.update({
    where: { id: roadmapId },
    data,
  });

  return updated;
};

/**
 * Delete a roadmap
 * @param {number} userId - User ID
 * @param {number} roadmapId - Roadmap ID
 * @returns {Promise<Object>} - Deleted roadmap
 */
export const deleteRoadmap = async (userId, roadmapId) => {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
  });

  if (!roadmap || roadmap.userId !== userId) {
    throw new Error('Roadmap not found');
  }

  return await prisma.roadmap.delete({
    where: { id: roadmapId },
  });
};

/**
 * Update roadmap progress
 * @param {number} roadmapId - Roadmap ID
 * @returns {Promise<Object>} - Updated roadmap
 */
export const updateRoadmapProgress = async (roadmapId) => {
  // Get all goals with their completion percentages
  const goals = await prisma.goal.findMany({
    where: { roadmapId },
  });

  if (goals.length === 0) {
    return await prisma.roadmap.update({
      where: { id: roadmapId },
      data: { progressPercentage: 0 },
    });
  }

  // Calculate average progress across all goals
  const totalProgress = goals.reduce((sum, goal) => {
    return sum + parseFloat(goal.completionPercentage || 0);
  }, 0);

  const averageProgress = totalProgress / goals.length;

  return await prisma.roadmap.update({
    where: { id: roadmapId },
    data: { progressPercentage: averageProgress },
  });
};

/**
 * Get roadmap statistics
 * @param {number} roadmapId - Roadmap ID
 * @returns {Promise<Object>} - Statistics object
 */
export const getRoadmapStats = async (roadmapId) => {
  const [goals, milestones, tasks] = await Promise.all([
    prisma.goal.findMany({ where: { roadmapId } }),
    prisma.milestone.findMany({
      where: { goal: { roadmapId } },
    }),
    prisma.roadmapTask.findMany({ where: { roadmapId } }),
  ]);

  const stats = {
    totalGoals: goals.length,
    completedGoals: goals.filter((g) => g.status === 'completed').length,
    inProgressGoals: goals.filter((g) => g.status === 'in_progress').length,
    totalMilestones: milestones.length,
    completedMilestones: milestones.filter((m) => m.status === 'completed').length,
    overdueMilestones: milestones.filter((m) => m.status === 'overdue').length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
    pendingTasks: tasks.filter((t) => t.status === 'pending').length,
    categoryDistribution: {},
  };

  // Calculate category distribution
  goals.forEach((goal) => {
    if (!stats.categoryDistribution[goal.category]) {
      stats.categoryDistribution[goal.category] = 0;
    }
    stats.categoryDistribution[goal.category]++;
  });

  return stats;
};
