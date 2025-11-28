import cron from 'node-cron';
import { prisma } from '../config/prismaClient.js';
import { generateWeeklyCoaching } from '../services/aiCoaching.service.js';
import { sendMessageToUser } from '../services/roadmapNotification.service.js';
import logger from '../config/logger.js';

/**
 * AI Coaching Cron Jobs
 * Automated coaching insights delivery
 */

/**
 * Format coaching message for Telegram
 */
function formatCoachingMessage(coaching) {
  let message = `🎯 *Your Weekly Coaching Insights*\n\n`;

  // Progress Highlights
  if (coaching.highlights) {
    message += `✨ *Progress Highlights*\n`;
    message += `${coaching.highlights}\n\n`;
  }

  // Key Insights
  if (coaching.insights && coaching.insights.length > 0) {
    message += `💡 *Key Insights*\n`;
    coaching.insights.forEach((insight) => {
      message += `• ${insight}\n`;
    });
    message += `\n`;
  }

  // Recommendations
  if (coaching.recommendations && coaching.recommendations.length > 0) {
    message += `🎯 *This Week's Focus*\n`;
    coaching.recommendations.forEach((rec, idx) => {
      message += `${idx + 1}. ${rec}\n`;
    });
    message += `\n`;
  }

  // Analytics Summary
  if (coaching.analytics) {
    const { velocityTrend, tasksPerWeek, currentStreak, overdueCount } = coaching.analytics;
    message += `📊 *Quick Stats*\n`;
    message += `• Velocity: ${velocityTrend === 'increasing' ? '📈' : velocityTrend === 'decreasing' ? '📉' : '➡️'} ${velocityTrend}\n`;
    message += `• Tasks/week: ${tasksPerWeek.toFixed(1)}\n`;
    message += `• Current streak: ${currentStreak} days\n`;
    if (overdueCount > 0) {
      message += `• ⚠️ Overdue items: ${overdueCount}\n`;
    }
    message += `\n`;
  }

  // Motivation
  if (coaching.motivation) {
    message += `💪 *${coaching.motivation}*\n\n`;
  }

  message += `---\n`;
  message += `_Generated with AI • ${new Date().toLocaleDateString()}_`;

  return message;
}

/**
 * Send weekly coaching to a single user
 */
async function sendWeeklyCoachingToUser(userId) {
  try {
    // Get user with Telegram info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, telegramId: true },
    });

    if (!user?.telegramId) {
      return { skipped: true, reason: 'no_telegram', userId };
    }

    // Generate coaching insights
    const coaching = await generateWeeklyCoaching(userId);

    // Format and send message
    const message = formatCoachingMessage(coaching);
    await sendMessageToUser(user.telegramId, message);

    logger.info(`Weekly coaching sent to user ${userId}`);

    return { success: true, userId };
  } catch (error) {
    logger.error(`Error sending weekly coaching to user ${userId}:`, error);
    return { failed: true, reason: error.message, userId };
  }
}

/**
 * Send weekly coaching to all eligible users
 */
export async function sendWeeklyCoachingToAll() {
  logger.info('🤖 Starting weekly AI coaching job...');

  const startTime = Date.now();

  try {
    // Get all users with active roadmaps and Telegram linked
    const users = await prisma.user.findMany({
      where: {
        telegramId: { not: null },
        roadmaps: {
          some: {
            status: 'active',
          },
        },
      },
      select: { id: true },
    });

    logger.info(`Found ${users.length} users for weekly coaching`);

    const results = {
      total: users.length,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    // Process each user
    for (const user of users) {
      const result = await sendWeeklyCoachingToUser(user.id);

      if (result.success) {
        results.sent++;
      } else if (result.skipped) {
        results.skipped++;
      } else if (result.failed) {
        results.failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const duration = Date.now() - startTime;

    logger.info(`✅ Weekly coaching completed in ${(duration / 1000).toFixed(1)}s:`, results);

    return results;
  } catch (error) {
    logger.error('Error in weekly coaching job:', error);
    throw error;
  }
}

/**
 * Start all AI coaching cron jobs
 */
export function startAICoachingJobs() {
  logger.info('🤖 AI coaching jobs scheduler initialized...');

  // Weekly coaching - Every Sunday at 19:00 (7 PM)
  cron.schedule('0 19 * * 0', async () => {
    logger.info('🤖 Running weekly AI coaching job...');
    try {
      const result = await sendWeeklyCoachingToAll();
      logger.info(`Weekly coaching completed: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`);
    } catch (error) {
      logger.error('Weekly coaching job failed:', error);
    }
  });

  logger.info('✅ AI coaching jobs scheduled:');
  logger.info('   • Weekly coaching: Sunday 19:00');
}

export default {
  sendWeeklyCoachingToUser,
  sendWeeklyCoachingToAll,
  startAICoachingJobs,
};
