import { z } from 'zod';

// Enum validators
const roadmapStatus = z.enum(['draft', 'active', 'paused', 'completed', 'archived']);
const generationMethod = z.enum(['llm_assisted', 'manual', 'hybrid']);
const goalCategory = z.enum(['career', 'health', 'finance', 'relationships', 'learning', 'personal', 'other']);
const timeframe = z.enum(['year_1', 'year_2', 'year_3', 'year_4', 'year_5', 'ongoing']);
const goalStatus = z.enum(['not_started', 'in_progress', 'completed', 'blocked', 'abandoned']);
const milestoneStatus = z.enum(['not_started', 'in_progress', 'completed', 'overdue', 'skipped']);
const period = z.enum(['Q1', 'Q2', 'Q3', 'Q4', 'monthly']);

// ============ ROADMAP VALIDATORS ============

export const createRoadmapSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  visionStatement: z.string().max(2000, 'Vision statement too long').optional().nullable(),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date').optional().nullable(),
  status: roadmapStatus.optional().default('draft'),
  generationMethod: generationMethod.optional().default('manual'),
});

export const updateRoadmapSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long').optional(),
  visionStatement: z.string().max(2000, 'Vision statement too long').optional().nullable(),
  status: roadmapStatus.optional(),
  lastReviewDate: z.string().datetime('Invalid review date').optional().nullable(),
});

export const roadmapIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid roadmap ID').transform(Number),
});

export const getRoadmapsQuerySchema = z.object({
  status: roadmapStatus.optional(),
  includeGoals: z.string().transform(val => val === 'true').optional(),
  includeMilestones: z.string().transform(val => val === 'true').optional(),
  includeProgress: z.string().transform(val => val === 'true').optional(),
});

// ============ GOAL VALIDATORS ============

export const createGoalSchema = z.object({
  category: goalCategory,
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
  priority: z.number().int().min(1).max(5).optional().default(3),
  timeframe: timeframe.optional().default('year_1'),
  targetYear: z.number().int().min(1).max(5),
  successCriteria: z.string().max(1000, 'Success criteria too long').optional().nullable(),
  dependencies: z.array(z.number().int()).optional().nullable(),
  order: z.number().int().min(0).optional().default(0),
  estimatedWeeklyHours: z.number().min(0).max(168).optional(),
  importance: z.number().int().min(1).max(5).optional(),
});

export const updateGoalSchema = z.object({
  category: goalCategory.optional(),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long').optional(),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
  priority: z.number().int().min(1).max(5).optional(),
  timeframe: timeframe.optional(),
  targetYear: z.number().int().min(1).max(5).optional(),
  successCriteria: z.string().max(1000, 'Success criteria too long').optional().nullable(),
  dependencies: z.array(z.number().int()).optional().nullable(),
  status: goalStatus.optional(),
  order: z.number().int().min(0).optional(),
});

export const goalIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid goal ID').transform(Number),
});

export const reorderGoalsSchema = z.object({
  goals: z.array(z.object({
    id: z.number().int(),
    order: z.number().int().min(0),
  })),
});

// ============ MILESTONE VALIDATORS ============

export const createMilestoneSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
  dueDate: z.string().datetime('Invalid due date'),
  period: period.optional().nullable(),
  year: z.number().int().min(1).max(5),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
  estimatedEffortHours: z.number().int().min(0).optional().nullable(),
  order: z.number().int().min(0).optional().default(0),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title too long').optional(),
  description: z.string().max(2000, 'Description too long').optional().nullable(),
  dueDate: z.string().datetime('Invalid due date').optional(),
  period: period.optional().nullable(),
  year: z.number().int().min(1).max(5).optional(),
  quarter: z.number().int().min(1).max(4).optional().nullable(),
  month: z.number().int().min(1).max(12).optional().nullable(),
  status: milestoneStatus.optional(),
  estimatedEffortHours: z.number().int().min(0).optional().nullable(),
  actualEffortHours: z.number().int().min(0).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export const milestoneIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid milestone ID').transform(Number),
});

export const reorderMilestonesSchema = z.object({
  milestones: z.array(z.object({
    id: z.number().int(),
    order: z.number().int().min(0),
  })),
});

// ============ ROADMAP GENERATION VALIDATORS ============

export const generateRoadmapSchema = z.object({
  title: z.string().min(5).max(200),
  visionStatement: z.string().max(2000).optional(),
  startDate: z.string().datetime(),
  weeklyAvailableHours: z.number().min(1).max(168).optional().default(20),
  goals: z.array(z.object({
    category: goalCategory,
    title: z.string().min(5).max(200),
    description: z.string().max(2000).optional(),
    currentState: z.string().max(500),
    desiredState: z.string().max(500),
    importance: z.number().int().min(1).max(5),
    timeCommitment: z.string().max(100).optional(),
    targetYear: z.number().int().min(1).max(5),
    estimatedWeeklyHours: z.number().min(0).max(168).optional(),
  })).min(1, 'At least one goal is required'),
  personalityData: z.object({
    mbtiType: z.string().max(4).optional(),
    strengths: z.array(z.string()).optional(),
    weaknesses: z.array(z.string()).optional(),
    values: z.array(z.string()).optional(),
    motivationStyle: z.enum(['intrinsic', 'extrinsic', 'mixed']).optional(),
    riskTolerance: z.enum(['low', 'medium', 'high']).optional(),
    workStyle: z.enum(['structured', 'flexible', 'adaptive']).optional(),
  }).optional(),
});
