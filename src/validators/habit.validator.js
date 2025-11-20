import { z } from 'zod';

const frequency = z.enum(['daily', 'weekly', 'monthly']);

export const createHabitSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  frequency: frequency.optional().default('daily'),
  reminderTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional().nullable(),
});

export const updateHabitSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long').optional(),
  frequency: frequency.optional(),
  reminderTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)').optional().nullable(),
});

export const habitIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid habit ID').transform(Number),
});
