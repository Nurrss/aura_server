// roadmap.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import * as roadmapController from '../controllers/roadmap.controller.js';
import {
  createRoadmapSchema,
  updateRoadmapSchema,
  roadmapIdSchema,
  getRoadmapsQuerySchema,
  createGoalSchema,
  updateGoalSchema,
  goalIdSchema,
  reorderGoalsSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  milestoneIdSchema,
  reorderMilestonesSchema,
  generateRoadmapSchema,
} from '../validators/roadmap.validator.js';

const router = express.Router();
router.use(authenticate);

// ============ ROADMAP ROUTES ============

router.get('/', validate(getRoadmapsQuerySchema, 'query'), roadmapController.getRoadmaps);
router.post('/', validate(createRoadmapSchema), roadmapController.createRoadmap);
router.get('/:id', validate(roadmapIdSchema, 'params'), roadmapController.getRoadmapById);
router.patch('/:id', validate(roadmapIdSchema, 'params'), validate(updateRoadmapSchema), roadmapController.updateRoadmap);
router.delete('/:id', validate(roadmapIdSchema, 'params'), roadmapController.deleteRoadmap);
router.get('/:id/stats', validate(roadmapIdSchema, 'params'), roadmapController.getRoadmapStats);

// ============ GOAL ROUTES ============

router.get('/:roadmapId/goals', validate(roadmapIdSchema, 'params'), roadmapController.getGoals);
router.post('/:roadmapId/goals', validate(roadmapIdSchema, 'params'), validate(createGoalSchema), roadmapController.createGoal);
router.get('/goals/:id', validate(goalIdSchema, 'params'), roadmapController.getGoalById);
router.patch('/goals/:id', validate(goalIdSchema, 'params'), validate(updateGoalSchema), roadmapController.updateGoal);
router.delete('/goals/:id', validate(goalIdSchema, 'params'), roadmapController.deleteGoal);
router.post('/goals/reorder', validate(reorderGoalsSchema), roadmapController.reorderGoals);

// ============ MILESTONE ROUTES ============

router.get('/goals/:goalId/milestones', validate(goalIdSchema, 'params'), roadmapController.getMilestones);
router.post('/goals/:goalId/milestones', validate(goalIdSchema, 'params'), validate(createMilestoneSchema), roadmapController.createMilestone);
router.get('/:roadmapId/milestones/upcoming', validate(roadmapIdSchema, 'params'), roadmapController.getUpcomingMilestones);
router.get('/milestones/:id', validate(milestoneIdSchema, 'params'), roadmapController.getMilestoneById);
router.patch('/milestones/:id', validate(milestoneIdSchema, 'params'), validate(updateMilestoneSchema), roadmapController.updateMilestone);
router.post('/milestones/:id/complete', validate(milestoneIdSchema, 'params'), roadmapController.completeMilestone);
router.delete('/milestones/:id', validate(milestoneIdSchema, 'params'), roadmapController.deleteMilestone);
router.post('/milestones/reorder', validate(reorderMilestonesSchema), roadmapController.reorderMilestones);

// ============ ROADMAP GENERATION ROUTE ============

router.post('/generate', validate(generateRoadmapSchema), roadmapController.generateRoadmap);

// ============ DAILY TASK GENERATION ROUTES ============

router.post('/milestones/:milestoneId/generate-tasks', roadmapController.generateTasksForMilestone);
router.get('/milestones-needing-tasks', roadmapController.getMilestonesNeedingTasks);
router.post('/roadmap-tasks/:roadmapTaskId/convert', roadmapController.convertRoadmapTaskToTask);

export default router;
