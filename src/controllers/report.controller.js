//report.controller.js
import { prisma } from '../config/prismaClient.js';
import { getTodayReport, saveDailyReport } from '../services/report.service.js';
import { sendMessageToUser } from '../services/telegram.service.js';
import { ok, fail } from '../utils/response.js';

// Get reports for a date range
export const getReports = async (req, res) => {
  try {
    const { from, to } = req.query;

    const where = { userId: req.user.id };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return ok(res, reports);
  } catch (err) {
    return fail(res, err.message || 'Failed to fetch reports', 500);
  }
};

export const getToday = async (req, res) => {
  try {
    const r = await getTodayReport(req.user.id);
    return ok(res, r);
  } catch (err) {
    return fail(res, err.message || 'Report failed', 500);
  }
};

export const saveDaily = async (req, res) => {
  try {
    const payload = req.body;
    const saved = await saveDailyReport(req.user.id, payload);
    return ok(res, saved);
  } catch (err) {
    return fail(res, err.message || 'Save failed', 400);
  }
};

export const runDailyJob = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    const results = [];

    for (const u of users) {
      const report = await getTodayReport(u.id);
      await saveDailyReport(u.id, report);

      if (u.telegramId) {
        await sendMessageToUser(
          u.telegramId,
          `📊 Daily Report:\n${JSON.stringify(report, null, 2)}`
        );
      }

      results.push({ userId: u.id, report });
    }

    return ok(res, { message: '✅ Manual daily report completed', results });
  } catch (err) {
    console.error('💥 Manual daily job failed', err);
    return fail(res, err.message);
  }
};
