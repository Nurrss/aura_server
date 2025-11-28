import cron from 'node-cron'
import { generateDailyTasksForAllUsers } from '../services/dailyTaskGenerator.service.js'
import logger from '../config/logger.js'

/**
 * Daily Task Generation Job
 * Runs every day at 06:00 AM to generate tasks for the day
 */

export const startDailyTaskGenerationJob = () => {
  logger.info('🕒 Daily task generation job scheduler initialized...')

  // Run every day at 06:00 AM (server time)
  cron.schedule('0 6 * * *', async () => {
    logger.info('🚀 Starting daily task generation job at 06:00 AM...')

    try {
      const result = await generateDailyTasksForAllUsers()

      logger.info(
        `✅ Daily task generation complete. Processed ${result.usersProcessed} users.`
      )

      // Log summary
      const successCount = result.results.filter((r) => !r.error).length
      const failureCount = result.results.filter((r) => r.error).length
      const totalTasks = result.results.reduce(
        (sum, r) => sum + (r.tasksGenerated || 0),
        0
      )

      logger.info(`📊 Summary: ${successCount} succeeded, ${failureCount} failed, ${totalTasks} tasks generated`)
    } catch (error) {
      logger.error('💥 Daily task generation job failed:', error)
    }
  })

  // Also run a weekly review job (Sunday at 18:00)
  cron.schedule('0 18 * * 0', async () => {
    logger.info('📅 Starting weekly task generation review...')

    try {
      // Generate tasks for the next 2 weeks
      const result = await generateDailyTasksForAllUsers()
      logger.info(`✅ Weekly review complete. Generated tasks for ${result.usersProcessed} users.`)
    } catch (error) {
      logger.error('💥 Weekly task generation failed:', error)
    }
  })

  logger.info('📋 Scheduled jobs:')
  logger.info('  - Daily task generation: 06:00 AM every day')
  logger.info('  - Weekly review: 18:00 PM every Sunday')
}
