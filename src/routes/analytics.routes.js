import express from 'express';
import {
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
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Analytics Routes
 * All routes require authentication
 */

// Velocity and performance metrics
router.get('/velocity', authenticate, getVelocity);
router.get('/streak', authenticate, getStreakInfo);

// Predictions and insights
router.get('/predict/:roadmapId', authenticate, getPrediction);
router.get('/bottlenecks', authenticate, getBottlenecks);
router.get('/categories', authenticate, getCategoryStats);

// Comprehensive reports
router.get('/report', authenticate, getAnalyticsReport);
router.get('/dashboard', authenticate, getDashboardData);

// AI Coaching
router.post('/coaching/weekly', authenticate, getWeeklyCoaching);
router.get('/recommendations/goals', authenticate, getGoalRecommendations);
router.post('/suggest/milestones/:goalId', authenticate, getMilestoneSuggestions);

export default router;
