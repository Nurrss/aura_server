// goal.service.js
import { prisma } from '../config/prismaClient.js';
import { sendGoalCompletedMessage } from './roadmapNotification.service.js';
import logger from '../config/logger.js';

/**
 * Create a new goal
 * @param {number} roadmapId - Roadmap ID
 * @param {Object} data - Goal data
 * @returns {Promise<Object>} - Created goal
 */
export const createGoal = async (roadmapId, data) => {
  const { category, title, description, priority, timeframe, targetYear, successCriteria, order } = data;

  const goal = await prisma.goal.create({
    data: {
      roadmapId,
      category,
      title,
      description,
      priority: priority || 3,
      timeframe: timeframe || 'year_1',
      targetYear,
      successCriteria,
      order: order || 0,
      status: 'not_started',
      completionPercentage: 0,
    },
  });

  return goal;
};

/**
 * Get goal by ID
 * @param {number} goalId - Goal ID
 * @param {Object} options - Include options
 * @returns {Promise<Object>} - Goal object
 */
export const getGoalById = async (goalId, options = {}) => {
  const { includeMilestones = true } = options;

  const include = {};
  if (includeMilestones) {
    include.milestones = {
      orderBy: { order: 'asc' },
    };
  }

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include,
  });

  if (!goal) {
    throw new Error('Goal not found');
  }

  return goal;
};

/**
 * Get all goals for a roadmap
 * @param {number} roadmapId - Roadmap ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - List of goals
 */
export const getGoalsForRoadmap = async (roadmapId, filters = {}) => {
  const { status, category, includeMilestones = false } = filters;

  const where = { roadmapId };
  if (status) where.status = status;
  if (category) where.category = category;

  const include = {};
  if (includeMilestones) {
    include.milestones = {
      orderBy: { order: 'asc' },
    };
  }

  const goals = await prisma.goal.findMany({
    where,
    include,
    orderBy: { order: 'asc' },
  });

  return goals;
};

/**
 * Update a goal
 * @param {number} goalId - Goal ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} - Updated goal
 */
export const updateGoal = async (goalId, data) => {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw new Error('Goal not found');
  }

  const updated = await prisma.goal.update({
    where: { id: goalId },
    data,
  });

  return updated;
};

/**
 * Delete a goal
 * @param {number} goalId - Goal ID
 * @returns {Promise<Object>} - Deleted goal
 */
export const deleteGoal = async (goalId) => {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw new Error('Goal not found');
  }

  return await prisma.goal.delete({
    where: { id: goalId },
  });
};

/**
 * Update goal progress based on milestones
 * @param {number} goalId - Goal ID
 * @returns {Promise<Object>} - Updated goal
 */
export const updateGoalProgress = async (goalId) => {
  const milestones = await prisma.milestone.findMany({
    where: { goalId },
  });

  if (milestones.length === 0) {
    return await prisma.goal.update({
      where: { id: goalId },
      data: { completionPercentage: 0, status: 'not_started' },
    });
  }

  const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
  const completionPercentage = (completedMilestones / milestones.length) * 100;

  // Get current goal to check if status is changing
  const currentGoal = await prisma.goal.findUnique({ where: { id: goalId } });

  // Determine status
  let status = 'not_started';
  if (completionPercentage === 100) {
    status = 'completed';
  } else if (completionPercentage > 0) {
    status = 'in_progress';
  }

  const updatedGoal = await prisma.goal.update({
    where: { id: goalId },
    data: {
      completionPercentage,
      status,
    },
  });

  // Send celebration notification if goal just became completed
  if (status === 'completed' && currentGoal.status !== 'completed') {
    sendGoalCompletedMessage(goalId).catch((error) => {
      logger.error(`Failed to send goal completed notification for ${goalId}:`, error);
    });
  }

  return updatedGoal;
};

/**
 * Reorder goals
 * @param {Array} goalOrders - Array of {id, order} objects
 * @returns {Promise<Array>} - Updated goals
 */
export const reorderGoals = async (goalOrders) => {
  const updates = goalOrders.map(({ id, order }) =>
    prisma.goal.update({
      where: { id },
      data: { order },
    })
  );

  return await Promise.all(updates);
};
