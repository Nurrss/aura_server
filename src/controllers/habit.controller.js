import { ok, fail } from '../utils/response.js';
import * as habitService from '../services/habit.service.js';

export const getHabits = async (req, res) => {
  try {
    const list = await habitService.getHabits(req.user.id);
    return ok(res, list);
  } catch (err) {
    return fail(res, err.message || 'Failed', 500);
  }
};

export const createHabit = async (req, res) => {
  try {
    const h = await habitService.createHabit(req.user.id, req.body);
    return ok(res, h);
  } catch (err) {
    return fail(res, err.message || 'Create failed', 400);
  }
};

export const toggleHabit = async (req, res) => {
  try {
    const result = await habitService.toggleHabit(
      req.user.id,
      Number(req.params.id)
    );
    return ok(res, result);
  } catch (err) {
    return fail(res, err.message || 'Toggle failed', 400);
  }
};

export const updateHabit = async (req, res) => {
  try {
    const h = await habitService.updateHabit(
      req.user.id,
      Number(req.params.id),
      req.body
    );
    return ok(res, h);
  } catch (err) {
    return fail(res, err.message || 'Update failed', 400);
  }
};
