//user.controller.js
import { ok, fail } from '../utils/response.js';
import * as userService from '../services/user.service.js';

export const getMe = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return ok(res, user);
  } catch (err) {
    return fail(res, err.message || 'Failed to get user', 400);
  }
};

export const updateMe = async (req, res) => {
  try {
    const { preferences } = req.body;
    const user = await userService.updateUserPreferences(req.user.id, preferences);
    return ok(res, user);
  } catch (err) {
    return fail(res, err.message || 'Failed to update user', 400);
  }
};
