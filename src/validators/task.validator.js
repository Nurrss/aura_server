import { z } from 'zod';

const taskPriority = z.enum(['low', 'normal', 'high']);
const taskStatus = z.enum(['pending', 'in_progress', 'completed']);

export const createTaskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  isAllDay: z.boolean().optional().default(false),
  category: z.string().max(50, 'Category too long').optional().nullable(),
  priority: taskPriority.optional().default('normal'),
  status: taskStatus.optional().default('pending'),
});

export const updateTaskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  startTime: z.string().datetime().optional().nullable(),
  endTime: z.string().datetime().optional().nullable(),
  isAllDay: z.boolean().optional(),
  category: z.string().max(50, 'Category too long').optional().nullable(),
  priority: taskPriority.optional(),
  status: taskStatus.optional(),
});

export const taskIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid task ID').transform(Number),
});
