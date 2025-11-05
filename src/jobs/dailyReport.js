// src/jobs/dailyReport.js
import cron from 'node-cron';
import { prisma } from '../config/prismaClient.js';
import { getTodayReport, saveDailyReport } from '../services/report.service.js';
import { sendMessageToUser } from '../services/telegram.service.js';

export const startDailyJob = () => {
  console.log('🕒 Daily job scheduler initialized...');

  // каждый день в 20:00 (серверное время)
  cron.schedule('0 20 * * *', async () => {
    console.log('🚀 Starting daily report job at 20:00...');

    try {
      const users = await prisma.user.findMany();
      console.log(`📋 Found ${users.length} users to process`);

      for (const u of users) {
        try {
          const report = await getTodayReport(u.id);
          await saveDailyReport(u.id, report);

          if (u.telegramId) {
            await sendMessageToUser(
              u.telegramId,
              `📊 Daily Report:\n${JSON.stringify(report, null, 2)}`
            );
          }

          console.log(`✅ Report sent for user ${u.id}`);
        } catch (e) {
          console.error('❌ daily job user error', u.id, e);
        }
      }
    } catch (e) {
      console.error('💥 daily job failed', e);
    }
  });
};
