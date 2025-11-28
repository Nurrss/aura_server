import { prisma } from '../config/prismaClient.js';
import dayjs from 'dayjs';
import logger from '../config/logger.js';

/**
 * Analytics Service
 * Provides velocity tracking, progress predictions, and insights
 */

/**
 * Calculate user's task completion velocity
 * @param {number} userId - User ID
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Object>} Velocity metrics
 */
export const calculateVelocity = async (userId, days = 30) => {
  const startDate = dayjs().subtract(days, 'days').startOf('day').toDate();
  const endDate = dayjs().endOf('day').toDate();

  // Get completed tasks in the period
  const completedTasks = await prisma.roadmapTask.findMany({
    where: {
      roadmap: { userId },
      status: 'completed',
      completedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      completedAt: true,
      estimatedDuration: true,
      priority: true,
    },
    orderBy: { completedAt: 'asc' },
  });

  // Get completed milestones in the period
  const completedMilestones = await prisma.milestone.findMany({
    where: {
      goal: { roadmap: { userId } },
      status: 'completed',
      completionDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      completionDate: true,
      estimatedEffortHours: true,
    },
  });

  // Calculate weekly breakdown
  const weeklyData = [];
  for (let i = 0; i < Math.ceil(days / 7); i++) {
    const weekStart = dayjs().subtract((i + 1) * 7, 'days').startOf('day').toDate();
    const weekEnd = dayjs().subtract(i * 7, 'days').endOf('day').toDate();

    const weekTasks = completedTasks.filter(
      (t) => new Date(t.completedAt) >= weekStart && new Date(t.completedAt) <= weekEnd
    );

    const weekMilestones = completedMilestones.filter(
      (m) => new Date(m.completionDate) >= weekStart && new Date(m.completionDate) <= weekEnd
    );

    weeklyData.push({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      tasksCompleted: weekTasks.length,
      milestonesCompleted: weekMilestones.length,
      totalHours: weekTasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0) / 60,
    });
  }

  // Calculate averages
  const avgTasksPerWeek = weeklyData.reduce((sum, w) => sum + w.tasksCompleted, 0) / weeklyData.length;
  const avgMilestonesPerWeek = weeklyData.reduce((sum, w) => sum + w.milestonesCompleted, 0) / weeklyData.length;
  const avgHoursPerWeek = weeklyData.reduce((sum, w) => sum + w.totalHours, 0) / weeklyData.length;

  // Calculate trend (comparing first half vs second half)
  const halfPoint = Math.floor(weeklyData.length / 2);
  const firstHalfAvg = weeklyData.slice(0, halfPoint).reduce((sum, w) => sum + w.tasksCompleted, 0) / halfPoint;
  const secondHalfAvg = weeklyData.slice(halfPoint).reduce((sum, w) => sum + w.tasksCompleted, 0) / (weeklyData.length - halfPoint);
  const trend = secondHalfAvg > firstHalfAvg ? 'increasing' : secondHalfAvg < firstHalfAvg ? 'decreasing' : 'stable';

  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
    },
    totals: {
      tasksCompleted: completedTasks.length,
      milestonesCompleted: completedMilestones.length,
      totalHours: completedTasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0) / 60,
    },
    averages: {
      tasksPerWeek: parseFloat(avgTasksPerWeek.toFixed(2)),
      milestonesPerWeek: parseFloat(avgMilestonesPerWeek.toFixed(2)),
      hoursPerWeek: parseFloat(avgHoursPerWeek.toFixed(2)),
      tasksPerDay: parseFloat((avgTasksPerWeek / 7).toFixed(2)),
    },
    trend,
    weeklyBreakdown: weeklyData.reverse(), // Most recent first
  };
};

/**
 * Predict roadmap completion date based on current velocity
 * @param {number} roadmapId - Roadmap ID
 * @returns {Promise<Object>} Prediction data
 */
export const predictRoadmapCompletion = async (roadmapId) => {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    include: {
      goals: {
        include: {
          milestones: {
            select: {
              id: true,
              status: true,
              estimatedEffortHours: true,
            },
          },
        },
      },
    },
  });

  if (!roadmap) {
    throw new Error('Roadmap not found');
  }

  // Calculate remaining work
  const allMilestones = roadmap.goals.flatMap((g) => g.milestones);
  const incompleteMilestones = allMilestones.filter((m) => m.status !== 'completed');
  const remainingHours = incompleteMilestones.reduce((sum, m) => sum + (m.estimatedEffortHours || 0), 0);

  // Get user's velocity
  const velocity = await calculateVelocity(roadmap.userId, 30);
  const hoursPerWeek = velocity.averages.hoursPerWeek;

  if (hoursPerWeek === 0) {
    return {
      predictedCompletionDate: null,
      confidence: 'low',
      remainingHours,
      estimatedWeeks: null,
      message: 'Not enough data to predict. Complete some tasks to see predictions.',
    };
  }

  // Calculate weeks needed
  const weeksNeeded = remainingHours / hoursPerWeek;
  const predictedDate = dayjs().add(weeksNeeded, 'weeks').toDate();

  // Calculate confidence based on data points
  const dataPoints = velocity.totals.tasksCompleted;
  let confidence = 'low';
  if (dataPoints >= 50) confidence = 'high';
  else if (dataPoints >= 20) confidence = 'medium';

  // Check if on track
  const roadmapEndDate = dayjs(roadmap.endDate);
  const onTrack = dayjs(predictedDate).isBefore(roadmapEndDate);

  return {
    predictedCompletionDate: predictedDate.toISOString(),
    confidence,
    remainingHours: parseFloat(remainingHours.toFixed(2)),
    estimatedWeeks: parseFloat(weeksNeeded.toFixed(1)),
    currentVelocity: hoursPerWeek,
    onTrack,
    scheduledEndDate: roadmap.endDate,
    daysAheadOrBehind: roadmapEndDate.diff(predictedDate, 'days'),
  };
};

/**
 * Detect bottlenecks in user's roadmap progress
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Bottleneck analysis
 */
export const detectBottlenecks = async (userId) => {
  const now = new Date();

  // Find overdue milestones
  const overdueMilestones = await prisma.milestone.findMany({
    where: {
      goal: { roadmap: { userId } },
      status: { in: ['not_started', 'in_progress'] },
      dueDate: { lt: now },
    },
    include: {
      goal: {
        select: {
          id: true,
          title: true,
          category: true,
          roadmap: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  // Find goals with low completion rate
  const goals = await prisma.goal.findMany({
    where: {
      roadmap: { userId },
      status: { not: 'completed' },
    },
    include: {
      milestones: {
        select: {
          id: true,
          status: true,
        },
      },
      roadmap: { select: { id: true, title: true } },
    },
  });

  const strugglingGoals = goals
    .map((goal) => {
      const total = goal.milestones.length;
      const completed = goal.milestones.filter((m) => m.status === 'completed').length;
      const completionRate = total > 0 ? completed / total : 0;

      return {
        goalId: goal.id,
        goalTitle: goal.title,
        category: goal.category,
        roadmapId: goal.roadmap.id,
        roadmapTitle: goal.roadmap.title,
        completionRate: parseFloat((completionRate * 100).toFixed(2)),
        totalMilestones: total,
        completedMilestones: completed,
      };
    })
    .filter((g) => g.totalMilestones >= 3 && g.completionRate < 30)
    .sort((a, b) => a.completionRate - b.completionRate);

  // Find categories with low activity
  const tasksByCategory = await prisma.roadmapTask.groupBy({
    by: ['status'],
    where: {
      roadmap: { userId },
      milestone: {
        goal: {
          category: { not: null },
        },
      },
    },
    _count: true,
  });

  // Get task completion by category
  const categoryStats = await prisma.$queryRaw`
    SELECT
      g.category,
      COUNT(DISTINCT rt.id) as total_tasks,
      COUNT(DISTINCT CASE WHEN rt.status = 'completed' THEN rt.id END) as completed_tasks
    FROM "RoadmapTask" rt
    INNER JOIN "Milestone" m ON rt."milestoneId" = m.id
    INNER JOIN "Goal" g ON m."goalId" = g.id
    INNER JOIN "Roadmap" r ON g."roadmapId" = r.id
    WHERE r."userId" = ${userId}
    GROUP BY g.category
    HAVING COUNT(DISTINCT rt.id) >= 5
  `;

  const underperformingCategories = categoryStats
    .map((cat) => ({
      category: cat.category,
      totalTasks: Number(cat.total_tasks),
      completedTasks: Number(cat.completed_tasks),
      completionRate: parseFloat(((Number(cat.completed_tasks) / Number(cat.total_tasks)) * 100).toFixed(2)),
    }))
    .filter((c) => c.completionRate < 50)
    .sort((a, b) => a.completionRate - b.completionRate);

  return {
    overdueMilestones: overdueMilestones.map((m) => ({
      milestoneId: m.id,
      milestoneTitle: m.title,
      dueDate: m.dueDate,
      daysOverdue: dayjs().diff(dayjs(m.dueDate), 'days'),
      goalTitle: m.goal.title,
      category: m.goal.category,
      roadmapTitle: m.goal.roadmap.title,
    })),
    strugglingGoals,
    underperformingCategories,
    summary: {
      totalOverdue: overdueMilestones.length,
      strugglingGoalsCount: strugglingGoals.length,
      underperformingCategoriesCount: underperformingCategories.length,
      severity: overdueMilestones.length > 5 || strugglingGoals.length > 3 ? 'high' : overdueMilestones.length > 2 ? 'medium' : 'low',
    },
  };
};

/**
 * Get category distribution analysis
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Category breakdown
 */
export const getCategoryDistribution = async (userId) => {
  const goals = await prisma.goal.findMany({
    where: { roadmap: { userId } },
    include: {
      milestones: {
        select: {
          id: true,
          status: true,
          estimatedEffortHours: true,
        },
      },
    },
  });

  const categoryMap = {};

  goals.forEach((goal) => {
    const category = goal.category;
    if (!categoryMap[category]) {
      categoryMap[category] = {
        category,
        goalsCount: 0,
        milestonesTotal: 0,
        milestonesCompleted: 0,
        estimatedHours: 0,
        completionRate: 0,
      };
    }

    categoryMap[category].goalsCount += 1;
    categoryMap[category].milestonesTotal += goal.milestones.length;
    categoryMap[category].milestonesCompleted += goal.milestones.filter((m) => m.status === 'completed').length;
    categoryMap[category].estimatedHours += goal.milestones.reduce((sum, m) => sum + (m.estimatedEffortHours || 0), 0);
  });

  // Calculate completion rates
  Object.values(categoryMap).forEach((cat) => {
    cat.completionRate =
      cat.milestonesTotal > 0 ? parseFloat(((cat.milestonesCompleted / cat.milestonesTotal) * 100).toFixed(2)) : 0;
    cat.estimatedHours = parseFloat(cat.estimatedHours.toFixed(2));
  });

  const distribution = Object.values(categoryMap).sort((a, b) => b.goalsCount - a.goalsCount);

  // Check for balance
  const totalGoals = distribution.reduce((sum, c) => sum + c.goalsCount, 0);
  const expectedPerCategory = totalGoals / distribution.length;
  const isBalanced = distribution.every((c) => Math.abs(c.goalsCount - expectedPerCategory) <= 2);

  return {
    distribution,
    summary: {
      totalCategories: distribution.length,
      totalGoals,
      isBalanced,
      mostFocusedCategory: distribution[0]?.category || null,
      leastFocusedCategory: distribution[distribution.length - 1]?.category || null,
    },
  };
};

/**
 * Generate comprehensive analytics report
 * @param {number} userId - User ID
 * @param {number} roadmapId - Optional roadmap ID
 * @returns {Promise<Object>} Complete analytics report
 */
export const generateAnalyticsReport = async (userId, roadmapId = null) => {
  try {
    const velocity = await calculateVelocity(userId, 30);
    const bottlenecks = await detectBottlenecks(userId);
    const categoryDistribution = await getCategoryDistribution(userId);

    let roadmapPredictions = [];
    if (roadmapId) {
      const prediction = await predictRoadmapCompletion(roadmapId);
      roadmapPredictions = [{ roadmapId, prediction }];
    } else {
      // Get predictions for all active roadmaps
      const roadmaps = await prisma.roadmap.findMany({
        where: { userId, status: 'active' },
        select: { id: true, title: true },
      });

      roadmapPredictions = await Promise.all(
        roadmaps.map(async (r) => ({
          roadmapId: r.id,
          roadmapTitle: r.title,
          prediction: await predictRoadmapCompletion(r.id),
        }))
      );
    }

    // Overall progress summary
    const totalRoadmaps = await prisma.roadmap.count({
      where: { userId },
    });

    const activeRoadmaps = await prisma.roadmap.count({
      where: { userId, status: 'active' },
    });

    const completedRoadmaps = await prisma.roadmap.count({
      where: { userId, status: 'completed' },
    });

    return {
      generatedAt: new Date().toISOString(),
      userId,
      overview: {
        totalRoadmaps,
        activeRoadmaps,
        completedRoadmaps,
      },
      velocity,
      predictions: roadmapPredictions,
      bottlenecks,
      categoryDistribution,
    };
  } catch (error) {
    logger.error('Error generating analytics report:', error);
    throw error;
  }
};

/**
 * Get streak information (consecutive days with completed tasks)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Streak data
 */
export const getStreak = async (userId) => {
  // Get all completed tasks ordered by completion date
  const completedTasks = await prisma.roadmapTask.findMany({
    where: {
      roadmap: { userId },
      status: 'completed',
      completedAt: { not: null },
    },
    select: {
      completedAt: true,
    },
    orderBy: { completedAt: 'desc' },
  });

  if (completedTasks.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
    };
  }

  // Get unique dates
  const uniqueDates = [...new Set(completedTasks.map((t) => dayjs(t.completedAt).format('YYYY-MM-DD')))];

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = dayjs().startOf('day');

  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.format('YYYY-MM-DD');
    if (uniqueDates.includes(dateStr)) {
      currentStreak++;
      checkDate = checkDate.subtract(1, 'day');
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;
  let prevDate = dayjs(uniqueDates[0]);

  for (let i = 1; i < uniqueDates.length; i++) {
    const currDate = dayjs(uniqueDates[i]);
    const daysDiff = prevDate.diff(currDate, 'days');

    if (daysDiff === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }

    prevDate = currDate;
  }

  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return {
    currentStreak,
    longestStreak,
    lastActiveDate: completedTasks[0].completedAt,
    totalActiveDays: uniqueDates.length,
  };
};

export default {
  calculateVelocity,
  predictRoadmapCompletion,
  detectBottlenecks,
  getCategoryDistribution,
  generateAnalyticsReport,
  getStreak,
};
