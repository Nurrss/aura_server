// task.controller.js
import { ok, fail } from '../utils/response.js';
import * as taskService from '../services/task.service.js';

export const getTasks = async (req, res) => {
  try {
    const { from, to } = req.query;
    const tasks = await taskService.getTasksForUser(req.user.id, from, to);
    return ok(res, tasks);
  } catch (err) {
    return fail(res, err.message || 'Failed to get tasks', 500);
  }
};

export const createTask = async (req, res) => {
  try {
    const payload = req.body;
    const task = await taskService.createTask(req.user.id, payload);
    return ok(res, task);
  } catch (err) {
    return fail(res, err.message || 'Create failed', 400);
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await taskService.updateTask(
      req.user.id,
      Number(req.params.id),
      req.body
    );
    return ok(res, task);
  } catch (err) {
    return fail(res, err.message || 'Update failed', 400);
  }
};

export const moveTask = async (req, res) => {
  try {
    const { startTime, endTime } = req.body;
    const task = await taskService.moveTask(
      req.user.id,
      Number(req.params.id),
      startTime,
      endTime
    );
    return ok(res, task);
  } catch (err) {
    return fail(res, err.message || 'Move failed', 400);
  }
};

export const completeTask = async (req, res) => {
  try {
    await taskService.completeTask(req.user.id, Number(req.params.id));
    return ok(res, { message: 'Task completed' });
  } catch (err) {
    return fail(res, err.message || 'Complete failed', 400);
  }
};
