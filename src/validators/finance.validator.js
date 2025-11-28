import { z } from 'zod';

const transactionType = z.enum(['income', 'expense']);
const categoryType = z.enum(['income', 'expense']);

// Transaction validators
export const createTransactionSchema = z.object({
  type: transactionType,
  amount: z.number().positive('Amount must be positive'),
  date: z.string().datetime('Invalid date format'),
  categoryId: z.number().int().positive('Invalid category ID'),
  note: z.string().max(500, 'Note too long').optional().nullable(),
});

export const updateTransactionSchema = z.object({
  type: transactionType.optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  date: z.string().datetime('Invalid date format').optional(),
  categoryId: z.number().int().positive('Invalid category ID').optional(),
  note: z.string().max(500, 'Note too long').optional().nullable(),
});

// Category validators
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long'),
  type: categoryType,
});

export const updateCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name too long').optional(),
  type: categoryType.optional(),
});

// Budget validators
export const createBudgetSchema = z.object({
  categoryId: z.number().int().positive('Invalid category ID'),
  monthlyLimit: z.number().positive('Monthly limit must be positive'),
  alertThreshold: z.number().min(0).max(100, 'Alert threshold must be between 0 and 100').optional().default(80),
});

// ID validator
export const financeIdSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID').transform(Number),
});
