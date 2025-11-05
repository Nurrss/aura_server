import { ok, fail } from '../utils/response.js';
import * as pomodoroService from '../services/pomodoro.service.js';

export const start = async (req, res) => {
  try {
    const { taskId, duration } = req.body;
    const session = await pomodoroService.startSession(
      req.user.id,
      taskId,
      duration || 25
    );
    return ok(res, session);
  } catch (err) {
    return fail(res, err.message || 'Start failed', 400);
  }
};

export const finish = async (req, res) => {
  try {
    const { sessionId, duration, completed } = req.body;
    const result = await pomodoroService.finishSession(
      req.user.id,
      sessionId,
      duration,
      !!completed
    );
    return ok(res, result);
  } catch (err) {
    return fail(res, err.message || 'Finish failed', 400);
  }
};

export const stats = async (req, res) => {
  try {
    const { from, to } = req.query;
    const data = await pomodoroService.getStats(req.user.id, from, to);
    return ok(res, data);
  } catch (err) {
    return fail(res, err.message || 'Stats failed', 400);
  }
};
