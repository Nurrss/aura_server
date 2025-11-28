import cron from 'node-cron'
import {
  sendDailyRemindersToAllUsers,
  sendWeeklyProgressSummary,
  checkMilestoneDueDates,
  checkOverdueMilestones,
} from '../services/roadmapNotification.service.js'
import { prisma } from '../config/prismaClient.js'
import logger from '../config/logger.js'

/**
 * Roadmap Notification Jobs
 * Sends Telegram notifications for roadmap events
 */

export const startRoadmapNotificationJobs = () => {
  logger.info('🔔 Roadmap notification jobs scheduler initialized...')

  // Daily task reminders - 6:00 AM every day
  cron.schedule('0 6 * * *', async () => {
    logger.info('📬 Starting daily task reminders job...')

    try {
      const result = await sendDailyRemindersToAllUsers()

      logger.info(
        `✅ Daily reminders sent: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`
      )
    } catch (error) {
      logger.error('💥 Daily reminders job failed:', error)
    }
  })

  // Milestone due date checks - 8:00 AM every day
  cron.schedule('0 8 * * *', async () => {
    logger.info('📅 Checking milestone due dates...')

    try {
      const result = await checkMilestoneDueDates()

      logger.info(
        `✅ Milestone due date check complete: ${result.totalReminders} reminders sent`
      )
    } catch (error) {
      logger.error('💥 Milestone due date check failed:', error)
    }
  })

  // Overdue milestone checks - 9:00 AM every day
  cron.schedule('0 9 * * *', async () => {
    logger.info('⚠️ Checking for overdue milestones...')

    try {
      const result = await checkOverdueMilestones()

      logger.info(
        `✅ Overdue check complete: ${result.totalOverdue} overdue, ${result.alertsSent} alerts sent`
      )
    } catch (error) {
      logger.error('💥 Overdue milestone check failed:', error)
    }
  })

  // Weekly progress summary - Sunday at 18:00 (6 PM)
  cron.schedule('0 18 * * 0', async () => {
    logger.info('📊 Starting weekly progress summaries...')

    try {
      const users = await prisma.user.findMany({
        where: {
          telegramId: { not: null },
          roadmaps: {
            some: {
              status: 'active',
            },
          },
        },
        select: {
          id: true,
          email: true,
        },
      })

      let successCount = 0
      let failedCount = 0

      for (const user of users) {
        try {
          await sendWeeklyProgressSummary(user.id)
          successCount++
        } catch (error) {
          logger.error(`Failed to send weekly summary to user ${user.id}:`, error)
          failedCount++
        }
      }

      logger.info(
        `✅ Weekly summaries complete: ${successCount} sent, ${failedCount} failed`
      )
    } catch (error) {
      logger.error('💥 Weekly summary job failed:', error)
    }
  })

  // Motivational Monday message - Monday at 7:00 AM
  cron.schedule('0 7 * * 1', async () => {
    logger.info('💪 Sending Monday motivation...')

    try {
      const users = await prisma.user.findMany({
        where: {
          telegramId: { not: null },
          roadmaps: {
            some: {
              status: 'active',
            },
          },
        },
        select: {
          id: true,
          telegramId: true,
        },
      })

      const { sendMessageToUser } = await import('../services/telegram.service.js')

      const motivationalMessages = [
        '🌟 Happy Monday! A new week means new opportunities to move closer to your goals. What will you achieve this week?',
        '💪 It\'s Monday! Time to crush your roadmap goals. Remember: small steps lead to big achievements.',
        '🚀 New week, new victories! Check your roadmap and let\'s make this week count.',
        '🎯 Monday motivation: Every goal you\'ve set is within reach. Start strong today!',
        '✨ Happy Monday! Your future self will thank you for the work you do today.',
      ]

      const message =
        motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]

      let sentCount = 0

      for (const user of users) {
        try {
          await sendMessageToUser(user.telegramId, message)
          sentCount++
        } catch (error) {
          logger.error(`Failed to send Monday message to user ${user.id}:`, error)
        }
      }

      logger.info(`✅ Monday motivation sent to ${sentCount} users`)
    } catch (error) {
      logger.error('💥 Monday motivation job failed:', error)
    }
  })

  logger.info('📋 Scheduled notification jobs:')
  logger.info('  - Daily task reminders: 06:00 AM every day')
  logger.info('  - Milestone due dates: 08:00 AM every day')
  logger.info('  - Overdue milestones: 09:00 AM every day')
  logger.info('  - Weekly progress: 18:00 PM every Sunday')
  logger.info('  - Monday motivation: 07:00 AM every Monday')
}
