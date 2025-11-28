// finance.routes.js
import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validation.middleware.js';
import * as financeController from '../controllers/finance.controller.js';
import {
  createTransactionSchema,
  updateTransactionSchema,
  createCategorySchema,
  updateCategorySchema,
  createBudgetSchema,
  financeIdSchema,
} from '../validators/finance.validator.js';

const router = express.Router();
router.use(authenticate);

// Transaction routes
router.get('/transactions', financeController.getTransactions);
router.post('/transactions', validate(createTransactionSchema), financeController.createTransaction);
router.patch('/transactions/:id', validate(financeIdSchema, 'params'), validate(updateTransactionSchema), financeController.updateTransaction);
router.delete('/transactions/:id', validate(financeIdSchema, 'params'), financeController.deleteTransaction);

// Category routes
router.get('/categories', financeController.getCategories);
router.post('/categories', validate(createCategorySchema), financeController.createCategory);
router.patch('/categories/:id', validate(financeIdSchema, 'params'), validate(updateCategorySchema), financeController.updateCategory);
router.delete('/categories/:id', validate(financeIdSchema, 'params'), financeController.deleteCategory);

// Budget routes
router.get('/budgets', financeController.getBudgets);
router.post('/budgets', validate(createBudgetSchema), financeController.upsertBudget);
router.delete('/budgets/:id', validate(financeIdSchema, 'params'), financeController.deleteBudget);

// Summary route
router.get('/summary', financeController.getSummary);

export default router;
