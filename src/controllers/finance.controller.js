// finance.controller.js
import { ok, fail } from '../utils/response.js';
import * as financeService from '../services/finance.service.js';
import { parsePaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

// ============ TRANSACTIONS ============

export const getTransactions = async (req, res) => {
  try {
    const { from, to, type, categoryId } = req.query;
    const { page, limit, skip, take } = parsePaginationParams(req.query);

    const { transactions, total } = await financeService.getTransactions(req.user.id, {
      from,
      to,
      type,
      categoryId,
      skip,
      take,
    });

    const response = buildPaginatedResponse(transactions, total, page, limit);
    return ok(res, response);
  } catch (err) {
    return fail(res, err.message || 'Failed to get transactions', 500);
  }
};

export const createTransaction = async (req, res) => {
  try {
    const transaction = await financeService.createTransaction(req.user.id, req.body);
    return ok(res, transaction);
  } catch (err) {
    return fail(res, err.message || 'Failed to create transaction', 400);
  }
};

export const updateTransaction = async (req, res) => {
  try {
    const transaction = await financeService.updateTransaction(
      req.user.id,
      Number(req.params.id),
      req.body
    );
    return ok(res, transaction);
  } catch (err) {
    return fail(res, err.message || 'Failed to update transaction', 400);
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    await financeService.deleteTransaction(req.user.id, Number(req.params.id));
    return ok(res, { message: 'Transaction deleted' });
  } catch (err) {
    return fail(res, err.message || 'Failed to delete transaction', 400);
  }
};

// ============ CATEGORIES ============

export const getCategories = async (req, res) => {
  try {
    const { type } = req.query;
    const categories = await financeService.getCategories(req.user.id, type);
    return ok(res, categories);
  } catch (err) {
    return fail(res, err.message || 'Failed to get categories', 500);
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await financeService.createCategory(req.user.id, req.body);
    return ok(res, category);
  } catch (err) {
    return fail(res, err.message || 'Failed to create category', 400);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await financeService.updateCategory(
      req.user.id,
      Number(req.params.id),
      req.body
    );
    return ok(res, category);
  } catch (err) {
    return fail(res, err.message || 'Failed to update category', 400);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await financeService.deleteCategory(req.user.id, Number(req.params.id));
    return ok(res, { message: 'Category deleted' });
  } catch (err) {
    return fail(res, err.message || 'Failed to delete category', 400);
  }
};

// ============ BUDGETS ============

export const getBudgets = async (req, res) => {
  try {
    const budgets = await financeService.getBudgets(req.user.id);
    return ok(res, budgets);
  } catch (err) {
    return fail(res, err.message || 'Failed to get budgets', 500);
  }
};

export const upsertBudget = async (req, res) => {
  try {
    const budget = await financeService.upsertBudget(req.user.id, req.body);
    return ok(res, budget);
  } catch (err) {
    return fail(res, err.message || 'Failed to save budget', 400);
  }
};

export const deleteBudget = async (req, res) => {
  try {
    await financeService.deleteBudget(req.user.id, Number(req.params.id));
    return ok(res, { message: 'Budget deleted' });
  } catch (err) {
    return fail(res, err.message || 'Failed to delete budget', 400);
  }
};

// ============ SUMMARY ============

export const getSummary = async (req, res) => {
  try {
    const summary = await financeService.getFinanceSummary(req.user.id);
    return ok(res, summary);
  } catch (err) {
    return fail(res, err.message || 'Failed to get summary', 500);
  }
};
