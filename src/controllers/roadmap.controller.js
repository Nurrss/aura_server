// roadmap.controller.js
import { ok, fail } from '../utils/response.js';
import * as roadmapService from '../services/roadmap.service.js';
import * as goalService from '../services/goal.service.js';
import * as milestoneService from '../services/milestone.service.js';
import * as generatorService from '../services/roadmapGenerator.service.js';
import * as taskGeneratorService from '../services/dailyTaskGenerator.service.js';

// ============ ROADMAP CONTROLLERS ============

export const getRoadmaps = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      includeGoals: req.query.includeGoals === 'true',
      includeMilestones: req.query.includeMilestones === 'true',
      includeProgress: req.query.includeProgress !== 'false', // default true
    };

    const roadmaps = await roadmapService.getRoadmapsForUser(req.user.id, filters);
    return ok(res, { roadmaps });
  } catch (err) {
    return fail(res, err.message || 'Failed to get roadmaps', 500);
  }
};

export const getRoadmapById = async (req, res) => {
  try {
    const options = {
      includeGoals: req.query.includeGoals !== 'false', // default true
      includeMilestones: req.query.includeMilestones !== 'false', // default true
      includeTasks: req.query.includeTasks === 'true',
    };

    const roadmap = await roadmapService.getRoadmapById(
      req.user.id,
      Number(req.params.id),
      options
    );

    return ok(res, { roadmap });
  } catch (err) {
    return fail(res, err.message || 'Roadmap not found', 404);
  }
};

export const createRoadmap = async (req, res) => {
  try {
    const roadmap = await roadmapService.createRoadmap(req.user.id, req.body);
    return ok(res, { roadmap }, 201);
  } catch (err) {
    return fail(res, err.message || 'Create failed', 400);
  }
};

export const updateRoadmap = async (req, res) => {
  try {
    const roadmap = await roadmapService.updateRoadmap(
      req.user.id,
      Number(req.params.id),
      req.body
    );
    return ok(res, { roadmap });
  } catch (err) {
    return fail(res, err.message || 'Update failed', 400);
  }
};

export const deleteRoadmap = async (req, res) => {
  try {
    await roadmapService.deleteRoadmap(req.user.id, Number(req.params.id));
    return ok(res, { message: 'Roadmap deleted' });
  } catch (err) {
    return fail(res, err.message || 'Delete failed', 400);
  }
};

export const getRoadmapStats = async (req, res) => {
  try {
    const stats = await roadmapService.getRoadmapStats(Number(req.params.id));
    return ok(res, { stats });
  } catch (err) {
    return fail(res, err.message || 'Failed to get stats', 500);
  }
};

// ============ GOAL CONTROLLERS ============

export const getGoals = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      category: req.query.category,
      includeMilestones: req.query.includeMilestones === 'true',
    };

    const goals = await goalService.getGoalsForRoadmap(Number(req.params.roadmapId), filters);
    return ok(res, { goals });
  } catch (err) {
    return fail(res, err.message || 'Failed to get goals', 500);
  }
};

export const getGoalById = async (req, res) => {
  try {
    const options = {
      includeMilestones: req.query.includeMilestones !== 'false', // default true
    };

    const goal = await goalService.getGoalById(Number(req.params.id), options);
    return ok(res, { goal });
  } catch (err) {
    return fail(res, err.message || 'Goal not found', 404);
  }
};

export const createGoal = async (req, res) => {
  try {
    const goal = await goalService.createGoal(Number(req.params.roadmapId), req.body);

    // Auto-generate milestones if requested
    if (req.body.autoGenerateMilestones) {
      const roadmap = await roadmapService.getRoadmapById(req.user.id, Number(req.params.roadmapId), {
        includeGoals: false,
      });

      await generatorService.generateMilestonesForGoal(goal, {
        startDate: roadmap.startDate,
      });
    }

    return ok(res, { goal }, 201);
  } catch (err) {
    return fail(res, err.message || 'Create failed', 400);
  }
};

export const updateGoal = async (req, res) => {
  try {
    const goal = await goalService.updateGoal(Number(req.params.id), req.body);

    // Update roadmap progress
    const updatedGoal = await goalService.getGoalById(goal.id);
    await roadmapService.updateRoadmapProgress(updatedGoal.roadmapId);

    return ok(res, { goal });
  } catch (err) {
    return fail(res, err.message || 'Update failed', 400);
  }
};

export const deleteGoal = async (req, res) => {
  try {
    const goal = await goalService.getGoalById(Number(req.params.id));
    await goalService.deleteGoal(Number(req.params.id));

    // Update roadmap progress after deletion
    await roadmapService.updateRoadmapProgress(goal.roadmapId);

    return ok(res, { message: 'Goal deleted' });
  } catch (err) {
    return fail(res, err.message || 'Delete failed', 400);
  }
};

export const reorderGoals = async (req, res) => {
  try {
    await goalService.reorderGoals(req.body.goals);
    return ok(res, { message: 'Goals reordered' });
  } catch (err) {
    return fail(res, err.message || 'Reorder failed', 400);
  }
};

// ============ MILESTONE CONTROLLERS ============

export const getMilestones = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      includeTasks: req.query.includeTasks === 'true',
    };

    const milestones = await milestoneService.getMilestonesForGoal(
      Number(req.params.goalId),
      filters
    );
    return ok(res, { milestones });
  } catch (err) {
    return fail(res, err.message || 'Failed to get milestones', 500);
  }
};

export const getMilestoneById = async (req, res) => {
  try {
    const options = {
      includeTasks: req.query.includeTasks === 'true',
      includeGoal: req.query.includeGoal === 'true',
    };

    const milestone = await milestoneService.getMilestoneById(Number(req.params.id), options);
    return ok(res, { milestone });
  } catch (err) {
    return fail(res, err.message || 'Milestone not found', 404);
  }
};

export const getUpcomingMilestones = async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 5,
      daysAhead: parseInt(req.query.daysAhead) || 30,
    };

    const milestones = await milestoneService.getUpcomingMilestones(
      Number(req.params.roadmapId),
      options
    );
    return ok(res, { milestones });
  } catch (err) {
    return fail(res, err.message || 'Failed to get upcoming milestones', 500);
  }
};

export const createMilestone = async (req, res) => {
  try {
    const milestone = await milestoneService.createMilestone(Number(req.params.goalId), req.body);
    return ok(res, { milestone }, 201);
  } catch (err) {
    return fail(res, err.message || 'Create failed', 400);
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const milestone = await milestoneService.updateMilestone(Number(req.params.id), req.body);

    // Update goal and roadmap progress
    await goalService.updateGoalProgress(milestone.goalId);
    const goal = await goalService.getGoalById(milestone.goalId);
    await roadmapService.updateRoadmapProgress(goal.roadmapId);

    return ok(res, { milestone });
  } catch (err) {
    return fail(res, err.message || 'Update failed', 400);
  }
};

export const completeMilestone = async (req, res) => {
  try {
    const milestone = await milestoneService.completeMilestone(Number(req.params.id));

    // Update goal and roadmap progress
    await goalService.updateGoalProgress(milestone.goalId);
    const goal = await goalService.getGoalById(milestone.goalId);
    await roadmapService.updateRoadmapProgress(goal.roadmapId);

    return ok(res, { milestone, message: 'Milestone completed!' });
  } catch (err) {
    return fail(res, err.message || 'Complete failed', 400);
  }
};

export const deleteMilestone = async (req, res) => {
  try {
    const milestone = await milestoneService.getMilestoneById(Number(req.params.id));
    await milestoneService.deleteMilestone(Number(req.params.id));

    // Update goal and roadmap progress
    await goalService.updateGoalProgress(milestone.goalId);
    const goal = await goalService.getGoalById(milestone.goalId);
    await roadmapService.updateRoadmapProgress(goal.roadmapId);

    return ok(res, { message: 'Milestone deleted' });
  } catch (err) {
    return fail(res, err.message || 'Delete failed', 400);
  }
};

export const reorderMilestones = async (req, res) => {
  try {
    await milestoneService.reorderMilestones(req.body.milestones);
    return ok(res, { message: 'Milestones reordered' });
  } catch (err) {
    return fail(res, err.message || 'Reorder failed', 400);
  }
};

// ============ ROADMAP GENERATION CONTROLLER ============

export const generateRoadmap = async (req, res) => {
  try {
    const { title, visionStatement, startDate, weeklyAvailableHours, goals, personalityData } = req.body;

    const result = await generatorService.generateRoadmap(
      req.user.id,
      { title, visionStatement, startDate, weeklyAvailableHours },
      goals
    );

    return ok(res, {
      roadmap: result.roadmap,
      goals: result.goals,
      validation: result.validation,
      message: 'Roadmap generated successfully',
    }, 201);
  } catch (err) {
    return fail(res, err.message || 'Generation failed', 400);
  }
};

// ============ DAILY TASK GENERATION CONTROLLERS ============

export const generateTasksForMilestone = async (req, res) => {
  try {
    const { useLLM, taskCount, startDate } = req.body;
    const milestoneId = Number(req.params.milestoneId);

    const tasks = await taskGeneratorService.generateTasksForMilestone(
      req.user.id,
      milestoneId,
      { useLLM, taskCount, startDate }
    );

    return ok(res, {
      tasks,
      message: `Generated ${tasks.length} tasks for milestone`
    }, 201);
  } catch (err) {
    return fail(res, err.message || 'Task generation failed', 400);
  }
};

export const getMilestonesNeedingTasks = async (req, res) => {
  try {
    const { roadmapId, daysAhead, includeOverdue } = req.query;

    const milestones = await taskGeneratorService.getMilestonesNeedingTasks(
      req.user.id,
      {
        roadmapId: roadmapId ? Number(roadmapId) : undefined,
        daysAhead: daysAhead ? Number(daysAhead) : 14,
        includeOverdue: includeOverdue !== 'false',
      }
    );

    return ok(res, { milestones, count: milestones.length });
  } catch (err) {
    return fail(res, err.message || 'Failed to fetch milestones', 500);
  }
};

export const convertRoadmapTaskToTask = async (req, res) => {
  try {
    const roadmapTaskId = Number(req.params.roadmapTaskId);
    const task = await taskGeneratorService.convertRoadmapTaskToTask(
      roadmapTaskId,
      req.user.id,
      req.body
    );

    return ok(res, { task, message: 'Task converted successfully' }, 201);
  } catch (err) {
    return fail(res, err.message || 'Conversion failed', 400);
  }
};
