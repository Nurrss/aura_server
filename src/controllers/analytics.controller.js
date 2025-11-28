import {
  calculateVelocity,
  predictRoadmapCompletion,
  detectBottlenecks,
  getCategoryDistribution,
  generateAnalyticsReport,
  getStreak,
} from '../services/analytics.service.js';
import {
  generateWeeklyCoaching,
  generateGoalRecommendations,
  suggestMilestones,
} from '../services/aiCoaching.service.js';
import logger from '../config/logger.js';

/**
 * Analytics Controller
 * Handles analytics and AI coaching endpoints
 */

/**
 * Get user's velocity metrics
 * GET /api/analytics/velocity?days=30
 */
export const getVelocity = async (req, res) => {
  try {
    const userId = req.user.userId;
    const days = parseInt(req.query.days) || 30;

    if (days < 7 || days > 365) {
      return res.status(400).json({
        success: false,
        message: 'Days must be between 7 and 365',
      });
    }

    const velocity = await calculateVelocity(userId, days);

    res.json({
      success: true,
      data: velocity,
    });
  } catch (error) {
    logger.error('Error in getVelocity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate velocity',
      error: error.message,
    });
  }
};

/**
 * Get roadmap completion prediction
 * GET /api/analytics/predict/:roadmapId
 */
export const getPrediction = async (req, res) => {
  try {
    const roadmapId = parseInt(req.params.roadmapId);

    const prediction = await predictRoadmapCompletion(roadmapId);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    logger.error('Error in getPrediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to predict completion',
      error: error.message,
    });
  }
};

/**
 * Detect bottlenecks in user's progress
 * GET /api/analytics/bottlenecks
 */
export const getBottlenecks = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bottlenecks = await detectBottlenecks(userId);

    res.json({
      success: true,
      data: bottlenecks,
    });
  } catch (error) {
    logger.error('Error in getBottlenecks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect bottlenecks',
      error: error.message,
    });
  }
};

/**
 * Get category distribution
 * GET /api/analytics/categories
 */
export const getCategoryStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const distribution = await getCategoryDistribution(userId);

    res.json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    logger.error('Error in getCategoryStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get category distribution',
      error: error.message,
    });
  }
};

/**
 * Get user's streak information
 * GET /api/analytics/streak
 */
export const getStreakInfo = async (req, res) => {
  try {
    const userId = req.user.userId;

    const streak = await getStreak(userId);

    res.json({
      success: true,
      data: streak,
    });
  } catch (error) {
    logger.error('Error in getStreakInfo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get streak info',
      error: error.message,
    });
  }
};

/**
 * Generate comprehensive analytics report
 * GET /api/analytics/report?roadmapId=1
 */
export const getAnalyticsReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const roadmapId = req.query.roadmapId ? parseInt(req.query.roadmapId) : null;

    const report = await generateAnalyticsReport(userId, roadmapId);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Error in getAnalyticsReport:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics report',
      error: error.message,
    });
  }
};

/**
 * Generate weekly AI coaching insights
 * POST /api/analytics/coaching/weekly
 */
export const getWeeklyCoaching = async (req, res) => {
  try {
    const userId = req.user.userId;

    const coaching = await generateWeeklyCoaching(userId);

    res.json({
      success: true,
      data: coaching,
    });
  } catch (error) {
    logger.error('Error in getWeeklyCoaching:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate coaching insights',
      error: error.message,
    });
  }
};

/**
 * Get goal recommendations
 * GET /api/analytics/recommendations/goals
 */
export const getGoalRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;

    const recommendations = await generateGoalRecommendations(userId);

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    logger.error('Error in getGoalRecommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: error.message,
    });
  }
};

/**
 * Get milestone suggestions for a goal
 * POST /api/analytics/suggest/milestones/:goalId
 */
export const getMilestoneSuggestions = async (req, res) => {
  try {
    const goalId = parseInt(req.params.goalId);

    const suggestions = await suggestMilestones(goalId);

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    logger.error('Error in getMilestoneSuggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suggest milestones',
      error: error.message,
    });
  }
};

/**
 * Get analytics dashboard data (comprehensive overview)
 * GET /api/analytics/dashboard
 */
export const getDashboardData = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Gather all data in parallel
    const [velocity, bottlenecks, categoryDist, streak, report] = await Promise.all([
      calculateVelocity(userId, 30),
      detectBottlenecks(userId),
      getCategoryDistribution(userId),
      getStreak(userId),
      generateAnalyticsReport(userId),
    ]);

    res.json({
      success: true,
      data: {
        velocity,
        bottlenecks,
        categoryDistribution: categoryDist,
        streak,
        predictions: report.predictions,
        overview: report.overview,
      },
    });
  } catch (error) {
    logger.error('Error in getDashboardData:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: error.message,
    });
  }
};

export default {
  getVelocity,
  getPrediction,
  getBottlenecks,
  getCategoryStats,
  getStreakInfo,
  getAnalyticsReport,
  getWeeklyCoaching,
  getGoalRecommendations,
  getMilestoneSuggestions,
  getDashboardData,
};
