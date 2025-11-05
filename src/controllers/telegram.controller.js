// telegram.controller.js
import { ok, fail } from '../utils/response.js';
import * as telegramService from '../services/telegram.service.js';
import { prisma } from '../config/prismaClient.js';

export const notify = async (req, res) => {
  try {
    const { userId, text } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.telegramId)
      return fail(res, 'User not linked to Telegram', 400);
    await telegramService.sendMessageToUser(user.telegramId, text);
    return ok(res, { sent: true });
  } catch (err) {
    return fail(res, err.message || 'Notify failed', 500);
  }
};

export const link = async (req, res) => {
  try {
    const { telegramId } = req.body;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { telegramId },
    });
    return ok(res, { linked: true });
  } catch (err) {
    return fail(res, err.message || 'Link failed', 400);
  }
};

export const sendReport = async (req, res) => {
  try {
    const { userId, date } = req.body;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return fail(res, 'User not found', 404);
    const report = await prisma.dailyReport.findFirst({
      where: { userId, date: new Date(date) },
    });
    const text = report ? JSON.stringify(report, null, 2) : 'No report';
    if (!user.telegramId) return fail(res, 'User not linked', 400);
    await telegramService.sendMessageToUser(user.telegramId, text);
    return ok(res, { sent: true });
  } catch (err) {
    return fail(res, err.message || 'Send report failed', 500);
  }
};
