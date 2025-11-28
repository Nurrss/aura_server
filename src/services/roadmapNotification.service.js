import { prisma } from '../config/prismaClient.js'
import { sendMessageToUser } from './telegram.service.js'
import dayjs from 'dayjs'
import logger from '../config/logger.js'

/**
 * Roadmap Notification Service
 * Sends Telegram notifications for roadmap events
 */

/**
 * Send daily task reminder to user
 * @param {number} userId
 * @param {Date} date - Date to get tasks for
 */
export const sendDailyTaskReminder = async (userId, date = new Date()) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, email: true },
    })

    if (!user?.telegramId) {
      logger.info(`User ${userId} has no Telegram linked, skipping reminder`)
      return { skipped: true, reason: 'no_telegram' }
    }

    // Get roadmap tasks scheduled for today
    const startOfDay = dayjs(date).startOf('day').toDate()
    const endOfDay = dayjs(date).endOf('day').toDate()

    const roadmapTasks = await prisma.roadmapTask.findMany({
      where: {
        roadmap: { userId },
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { in: ['pending', 'in_progress'] },
      },
      include: {
        milestone: {
          include: {
            goal: {
              include: {
                roadmap: true,
              },
            },
          },
        },
      },
      orderBy: { priority: 'desc' },
      take: 10, // Limit to 10 tasks
    })

    if (roadmapTasks.length === 0) {
      logger.info(`No tasks scheduled for user ${userId} on ${dayjs(date).format('YYYY-MM-DD')}`)
      return { skipped: true, reason: 'no_tasks' }
    }

    // Format message
    const message = formatDailyTasksMessage(roadmapTasks, date)

    // Send via Telegram
    await sendMessageToUser(user.telegramId, message)

    logger.info(`Sent daily task reminder to user ${userId} (${roadmapTasks.length} tasks)`)

    return {
      success: true,
      tasksCount: roadmapTasks.length,
      userId,
    }
  } catch (error) {
    logger.error(`Failed to send daily reminder to user ${userId}:`, error)
    throw error
  }
}

/**
 * Send milestone due date reminder
 * @param {number} milestoneId
 * @param {number} daysUntilDue
 */
export const sendMilestoneDueReminder = async (milestoneId, daysUntilDue) => {
  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        goal: {
          include: {
            roadmap: {
              include: {
                user: {
                  select: {
                    id: true,
                    telegramId: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!milestone) {
      logger.warn(`Milestone ${milestoneId} not found`)
      return { skipped: true, reason: 'not_found' }
    }

    const user = milestone.goal.roadmap.user

    if (!user.telegramId) {
      return { skipped: true, reason: 'no_telegram' }
    }

    const message = formatMilestoneDueMessage(milestone, daysUntilDue)

    await sendMessageToUser(user.telegramId, message)

    logger.info(`Sent milestone due reminder for milestone ${milestoneId} to user ${user.id}`)

    return {
      success: true,
      milestoneId,
      userId: user.id,
    }
  } catch (error) {
    logger.error(`Failed to send milestone due reminder for ${milestoneId}:`, error)
    throw error
  }
}

/**
 * Send weekly progress summary
 * @param {number} userId
 */
export const sendWeeklyProgressSummary = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, email: true },
    })

    if (!user?.telegramId) {
      return { skipped: true, reason: 'no_telegram' }
    }

    // Get active roadmaps
    const roadmaps = await prisma.roadmap.findMany({
      where: {
        userId,
        status: 'active',
      },
      include: {
        goals: {
          include: {
            milestones: true,
          },
        },
      },
    })

    if (roadmaps.length === 0) {
      return { skipped: true, reason: 'no_active_roadmaps' }
    }

    // Get tasks completed this week
    const weekStart = dayjs().startOf('week').toDate()
    const weekEnd = dayjs().endOf('week').toDate()

    const completedThisWeek = await prisma.roadmapTask.count({
      where: {
        roadmap: { userId },
        status: 'completed',
        completionDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    })

    const message = formatWeeklyProgressMessage(roadmaps, completedThisWeek)

    await sendMessageToUser(user.telegramId, message)

    logger.info(`Sent weekly progress summary to user ${userId}`)

    return {
      success: true,
      userId,
      roadmapsCount: roadmaps.length,
      completedTasks: completedThisWeek,
    }
  } catch (error) {
    logger.error(`Failed to send weekly summary to user ${userId}:`, error)
    throw error
  }
}

/**
 * Send milestone completed celebration
 * @param {number} milestoneId
 */
export const sendMilestoneCompletedMessage = async (milestoneId) => {
  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        goal: {
          include: {
            roadmap: {
              include: {
                user: {
                  select: {
                    id: true,
                    telegramId: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!milestone) return { skipped: true, reason: 'not_found' }

    const user = milestone.goal.roadmap.user

    if (!user.telegramId) return { skipped: true, reason: 'no_telegram' }

    const message = `🎉 *Milestone Completed!*

✅ *${milestone.title}*

Goal: ${milestone.goal.title}
Roadmap: ${milestone.goal.roadmap.title}

Keep up the great work! You're ${Number(milestone.goal.roadmap.progressPercentage).toFixed(0)}% done with your roadmap.

💪 Every milestone brings you closer to your vision!`

    await sendMessageToUser(user.telegramId, message)

    logger.info(`Sent milestone completed message for ${milestoneId}`)

    return { success: true, milestoneId, userId: user.id }
  } catch (error) {
    logger.error(`Failed to send milestone completed message:`, error)
    throw error
  }
}

/**
 * Send goal completed celebration
 * @param {number} goalId
 */
export const sendGoalCompletedMessage = async (goalId) => {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        roadmap: {
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
              },
            },
          },
        },
        milestones: {
          where: { status: 'completed' },
        },
      },
    })

    if (!goal) return { skipped: true, reason: 'not_found' }

    const user = goal.roadmap.user

    if (!user.telegramId) return { skipped: true, reason: 'no_telegram' }

    const message = `🏆 *GOAL ACHIEVED!*

🎯 *${goal.title}*

Category: ${getCategoryEmoji(goal.category)} ${goal.category}
Milestones completed: ${goal.milestones.length}
Roadmap: ${goal.roadmap.title}

🚀 This is a HUGE accomplishment! Celebrate this victory!

Your roadmap is now ${Number(goal.roadmap.progressPercentage).toFixed(0)}% complete. Keep crushing it! 💪`

    await sendMessageToUser(user.telegramId, message)

    logger.info(`Sent goal completed message for ${goalId}`)

    return { success: true, goalId, userId: user.id }
  } catch (error) {
    logger.error(`Failed to send goal completed message:`, error)
    throw error
  }
}

/**
 * Send overdue milestone alert
 * @param {number} milestoneId
 */
export const sendOverdueMilestoneAlert = async (milestoneId) => {
  try {
    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        goal: {
          include: {
            roadmap: {
              include: {
                user: {
                  select: {
                    id: true,
                    telegramId: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!milestone) return { skipped: true, reason: 'not_found' }

    const user = milestone.goal.roadmap.user

    if (!user.telegramId) return { skipped: true, reason: 'no_telegram' }

    const daysOverdue = dayjs().diff(dayjs(milestone.dueDate), 'days')

    const message = `⚠️ *Milestone Overdue*

📌 *${milestone.title}*

Goal: ${milestone.goal.title}
Due date: ${dayjs(milestone.dueDate).format('MMM D, YYYY')}
Days overdue: ${daysOverdue}

Don't worry! You can:
• Adjust the timeline
• Break it into smaller tasks
• Ask for help if needed

Need to reschedule? Just update the milestone in your roadmap.`

    await sendMessageToUser(user.telegramId, message)

    logger.info(`Sent overdue alert for milestone ${milestoneId}`)

    return { success: true, milestoneId, userId: user.id }
  } catch (error) {
    logger.error(`Failed to send overdue alert:`, error)
    throw error
  }
}

// ============ HELPER FUNCTIONS ============

function formatDailyTasksMessage(tasks, date) {
  const dateStr = dayjs(date).format('dddd, MMMM D')

  let message = `📅 *Your Tasks for ${dateStr}*\n\n`

  if (tasks.length === 0) {
    message += `No tasks scheduled for today. Enjoy your day! 😊`
    return message
  }

  // Group by roadmap
  const tasksByRoadmap = {}
  tasks.forEach((task) => {
    const roadmapTitle = task.milestone.goal.roadmap.title
    if (!tasksByRoadmap[roadmapTitle]) {
      tasksByRoadmap[roadmapTitle] = []
    }
    tasksByRoadmap[roadmapTitle].push(task)
  })

  Object.entries(tasksByRoadmap).forEach(([roadmapTitle, roadmapTasks]) => {
    message += `🗺️ *${roadmapTitle}*\n\n`

    roadmapTasks.forEach((task, index) => {
      const priorityEmoji = getPriorityEmoji(task.priority)
      const duration = task.estimatedDuration ? `(~${task.estimatedDuration}min)` : ''

      message += `${priorityEmoji} ${task.title} ${duration}\n`

      if (task.milestone) {
        message += `   └ Milestone: ${task.milestone.title}\n`
      }

      message += '\n'
    })
  })

  message += `\n💪 Total: ${tasks.length} task${tasks.length > 1 ? 's' : ''}\n`
  message += `\nLet's make today count! 🚀`

  return message
}

function formatMilestoneDueMessage(milestone, daysUntilDue) {
  const emoji = daysUntilDue <= 1 ? '🚨' : daysUntilDue <= 3 ? '⏰' : '📅'

  let urgency = ''
  if (daysUntilDue === 0) urgency = 'DUE TODAY'
  else if (daysUntilDue === 1) urgency = 'DUE TOMORROW'
  else urgency = `Due in ${daysUntilDue} days`

  return `${emoji} *Milestone Due Soon*

📌 *${milestone.title}*

${urgency}
Goal: ${milestone.goal.title}
Due date: ${dayjs(milestone.dueDate).format('MMM D, YYYY')}

${milestone.description ? `\n${milestone.description}\n` : ''}
Time to focus and finish strong! 💪`
}

function formatWeeklyProgressMessage(roadmaps, completedTasks) {
  let message = `📊 *Weekly Progress Summary*\n\n`

  message += `✅ Tasks completed this week: *${completedTasks}*\n\n`

  roadmaps.forEach((roadmap) => {
    const progress = Number(roadmap.progressPercentage || 0).toFixed(0)
    const progressBar = getProgressBar(Number(progress))

    const goalsInProgress = roadmap.goals.filter((g) => g.status === 'in_progress').length
    const goalsCompleted = roadmap.goals.filter((g) => g.status === 'completed').length

    message += `🗺️ *${roadmap.title}*\n`
    message += `${progressBar} ${progress}%\n`
    message += `Goals: ${goalsCompleted} completed, ${goalsInProgress} in progress\n\n`
  })

  message += `\n🎯 Keep pushing forward! Every small step counts.\n`
  message += `\nHave a great week ahead! 🚀`

  return message
}

function getPriorityEmoji(priority) {
  const emojis = {
    critical: '🔴',
    high: '🟠',
    normal: '🟡',
    low: '🟢',
  }
  return emojis[priority] || '⚪'
}

function getCategoryEmoji(category) {
  const emojis = {
    career: '💼',
    health: '💪',
    finance: '💰',
    relationships: '❤️',
    learning: '📚',
    personal: '🌟',
    other: '📌',
  }
  return emojis[category] || '📌'
}

function getProgressBar(percentage) {
  const filled = Math.round(percentage / 10)
  const empty = 10 - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

/**
 * Send daily reminders to all users with active roadmaps
 */
export const sendDailyRemindersToAllUsers = async () => {
  logger.info('Starting daily reminder dispatch...')

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
        telegramId: true,
      },
    })

    const results = []

    for (const user of users) {
      try {
        const result = await sendDailyTaskReminder(user.id)
        results.push({ userId: user.id, ...result })
      } catch (error) {
        logger.error(`Failed to send reminder to user ${user.id}:`, error)
        results.push({ userId: user.id, error: error.message })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const skippedCount = results.filter((r) => r.skipped).length
    const failedCount = results.filter((r) => r.error).length

    logger.info(
      `Daily reminders complete: ${successCount} sent, ${skippedCount} skipped, ${failedCount} failed`
    )

    return {
      success: true,
      totalUsers: users.length,
      sent: successCount,
      skipped: skippedCount,
      failed: failedCount,
      results,
    }
  } catch (error) {
    logger.error('Failed to send daily reminders:', error)
    throw error
  }
}

/**
 * Check for upcoming milestone due dates and send reminders
 */
export const checkMilestoneDueDates = async () => {
  logger.info('Checking milestone due dates...')

  try {
    const today = dayjs().startOf('day')

    // Check milestones due in 1, 3, and 7 days
    const dueDateChecks = [1, 3, 7]
    const results = []

    for (const daysAhead of dueDateChecks) {
      const targetDate = today.add(daysAhead, 'days').toDate()
      const targetDateEnd = today.add(daysAhead, 'days').endOf('day').toDate()

      const milestones = await prisma.milestone.findMany({
        where: {
          dueDate: {
            gte: targetDate,
            lte: targetDateEnd,
          },
          status: { in: ['not_started', 'in_progress'] },
          goal: {
            roadmap: {
              status: 'active',
            },
          },
        },
        select: {
          id: true,
        },
      })

      for (const milestone of milestones) {
        try {
          const result = await sendMilestoneDueReminder(milestone.id, daysAhead)
          results.push({ milestoneId: milestone.id, daysAhead, ...result })
        } catch (error) {
          logger.error(`Failed to send due reminder for milestone ${milestone.id}:`, error)
          results.push({
            milestoneId: milestone.id,
            daysAhead,
            error: error.message,
          })
        }
      }
    }

    logger.info(`Milestone due date check complete: ${results.length} reminders sent`)

    return {
      success: true,
      totalReminders: results.length,
      results,
    }
  } catch (error) {
    logger.error('Failed to check milestone due dates:', error)
    throw error
  }
}

/**
 * Check for overdue milestones and send alerts
 */
export const checkOverdueMilestones = async () => {
  logger.info('Checking for overdue milestones...')

  try {
    const today = dayjs().startOf('day').toDate()

    const overdueMilestones = await prisma.milestone.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: ['not_started', 'in_progress'] },
        goal: {
          roadmap: {
            status: 'active',
          },
        },
      },
      select: {
        id: true,
      },
    })

    const results = []

    for (const milestone of overdueMilestones) {
      try {
        // Update status to overdue
        await prisma.milestone.update({
          where: { id: milestone.id },
          data: { status: 'overdue' },
        })

        const result = await sendOverdueMilestoneAlert(milestone.id)
        results.push({ milestoneId: milestone.id, ...result })
      } catch (error) {
        logger.error(`Failed to process overdue milestone ${milestone.id}:`, error)
        results.push({
          milestoneId: milestone.id,
          error: error.message,
        })
      }
    }

    logger.info(`Overdue milestone check complete: ${results.length} alerts sent`)

    return {
      success: true,
      totalOverdue: overdueMilestones.length,
      alertsSent: results.filter((r) => r.success).length,
      results,
    }
  } catch (error) {
    logger.error('Failed to check overdue milestones:', error)
    throw error
  }
}
