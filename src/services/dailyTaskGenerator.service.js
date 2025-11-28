import { prisma } from '../config/prismaClient.js'
import dayjs from 'dayjs'
import { callLLM } from './llmService.js'
import logger from '../config/logger.js'

/**
 * Daily Task Generator Service
 * Breaks down milestones into actionable daily tasks
 */

/**
 * Get milestones that need task generation
 * @param {number} userId
 * @param {object} options - { roadmapId, daysAhead, includeOverdue }
 * @returns {Promise<Array>} milestones needing tasks
 */
export const getMilestonesNeedingTasks = async (userId, options = {}) => {
  const { roadmapId, daysAhead = 14, includeOverdue = true } = options

  const today = dayjs().startOf('day').toDate()
  const futureDate = dayjs().add(daysAhead, 'days').endOf('day').toDate()

  const where = {
    goal: {
      roadmap: {
        userId,
        status: { in: ['active', 'draft'] },
      },
    },
    status: { in: ['not_started', 'in_progress', 'overdue'] },
    dueDate: includeOverdue
      ? { lte: futureDate }
      : { gte: today, lte: futureDate },
  }

  if (roadmapId) {
    where.goal.roadmapId = roadmapId
  }

  const milestones = await prisma.milestone.findMany({
    where,
    include: {
      goal: {
        include: {
          roadmap: true,
        },
      },
      roadmapTasks: {
        where: {
          status: { in: ['pending', 'in_progress'] },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  })

  // Filter milestones that don't have enough tasks
  return milestones.filter((milestone) => {
    // If milestone has no tasks, needs generation
    if (milestone.roadmapTasks.length === 0) return true

    // If milestone is due soon and has few tasks, needs more
    const daysUntilDue = dayjs(milestone.dueDate).diff(dayjs(), 'days')
    if (daysUntilDue <= 7 && milestone.roadmapTasks.length < 5) return true

    return false
  })
}

/**
 * Generate daily tasks for a specific milestone
 * @param {number} userId
 * @param {number} milestoneId
 * @param {object} options - { useLLM, taskCount, startDate }
 * @returns {Promise<Array>} generated tasks
 */
export const generateTasksForMilestone = async (
  userId,
  milestoneId,
  options = {}
) => {
  const { useLLM = false, taskCount = 5, startDate } = options

  // Fetch milestone with full context
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      goal: {
        include: {
          roadmap: true,
        },
      },
    },
  })

  if (!milestone) throw new Error('Milestone not found')
  if (milestone.goal.roadmap.userId !== userId) {
    throw new Error('Unauthorized')
  }

  // Calculate task scheduling
  const dueDate = dayjs(milestone.dueDate)
  const start = startDate ? dayjs(startDate) : dayjs()
  const daysAvailable = Math.max(1, dueDate.diff(start, 'days'))

  let tasks
  if (useLLM) {
    tasks = await generateTasksWithLLM(milestone, taskCount, start, dueDate)
  } else {
    tasks = generateTasksRuleBased(milestone, taskCount, start, dueDate)
  }

  // Create RoadmapTask records
  const createdTasks = await Promise.all(
    tasks.map((task) =>
      prisma.roadmapTask.create({
        data: {
          milestoneId: milestone.id,
          roadmapId: milestone.goal.roadmapId,
          title: task.title,
          description: task.description,
          scheduledDate: task.scheduledDate,
          estimatedDuration: task.estimatedDuration || 60,
          priority: task.priority || 'normal',
          status: 'pending',
          source: useLLM ? 'ai_generated' : 'system_suggested',
          aiGenerationContext: useLLM ? task.context : null,
        },
      })
    )
  )

  logger.info(`Generated ${createdTasks.length} tasks for milestone ${milestoneId}`)

  return createdTasks
}

/**
 * Generate tasks using LLM
 */
async function generateTasksWithLLM(milestone, taskCount, startDate, dueDate) {
  const prompt = `You are a productivity assistant. Break down the following milestone into ${taskCount} actionable daily tasks.

**Milestone:** ${milestone.title}
${milestone.description ? `**Description:** ${milestone.description}` : ''}

**Goal Context:**
- Category: ${milestone.goal.category}
- Goal: ${milestone.goal.title}
- Vision: ${milestone.goal.roadmap.visionStatement || 'N/A'}

**Constraints:**
- Start Date: ${startDate.format('YYYY-MM-DD')}
- Due Date: ${dueDate.format('YYYY-MM-DD')}
- Days Available: ${dueDate.diff(startDate, 'days')}
- Estimated Effort: ${milestone.estimatedEffortHours || 'unknown'} hours total

**Requirements:**
1. Create ${taskCount} specific, actionable tasks
2. Order tasks logically (what comes first?)
3. Distribute tasks evenly across available days
4. Each task should be completable in 30-90 minutes
5. Be specific about what the user should do

**Output Format (JSON only):**
\`\`\`json
{
  "tasks": [
    {
      "title": "Task title (max 100 chars)",
      "description": "Detailed description of what to do",
      "dayOffset": 0,
      "estimatedMinutes": 60,
      "priority": "normal"
    }
  ]
}
\`\`\`

Return ONLY the JSON, no explanations.`

  const systemPrompt =
    'You are an expert productivity coach who breaks down goals into actionable tasks. Always respond with valid JSON.'

  try {
    const response = await callLLM({
      prompt,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Parse LLM response
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    const jsonStr = jsonMatch ? jsonMatch[1] : response
    const parsed = JSON.parse(jsonStr)

    // Convert to task format
    return parsed.tasks.map((task) => ({
      title: task.title,
      description: task.description,
      scheduledDate: startDate.add(task.dayOffset || 0, 'days').toDate(),
      estimatedDuration: task.estimatedMinutes || 60,
      priority: task.priority || 'normal',
      context: { llmGenerated: true, milestone: milestone.title },
    }))
  } catch (error) {
    logger.error('LLM task generation failed, falling back to rule-based:', error)
    return generateTasksRuleBased(milestone, taskCount, startDate, dueDate)
  }
}

/**
 * Generate tasks using rule-based logic
 */
function generateTasksRuleBased(milestone, taskCount, startDate, dueDate) {
  const daysAvailable = Math.max(1, dueDate.diff(startDate, 'days'))
  const dayInterval = Math.max(1, Math.floor(daysAvailable / taskCount))

  const tasks = []
  const baseTitle = milestone.title

  // Generate task templates based on category
  const taskTemplates = getTaskTemplates(milestone.goal.category)

  for (let i = 0; i < taskCount; i++) {
    const dayOffset = i * dayInterval
    const template = taskTemplates[i % taskTemplates.length]

    tasks.push({
      title: `${baseTitle}: ${template.action}`,
      description: template.description
        .replace('{milestone}', milestone.title)
        .replace('{goal}', milestone.goal.title),
      scheduledDate: startDate.add(dayOffset, 'days').toDate(),
      estimatedDuration: template.duration || 60,
      priority: i === 0 ? 'high' : i === taskCount - 1 ? 'high' : 'normal',
    })
  }

  return tasks
}

/**
 * Get task templates by goal category
 */
function getTaskTemplates(category) {
  const templates = {
    career: [
      {
        action: 'Research and Planning',
        description: 'Research required skills and create action plan for {milestone}',
        duration: 60,
      },
      {
        action: 'Skill Development',
        description: 'Practice key skills needed for {milestone}',
        duration: 90,
      },
      {
        action: 'Implementation Work',
        description: 'Make tangible progress on {milestone}',
        duration: 120,
      },
      {
        action: 'Review and Adjust',
        description: 'Review progress and adjust approach if needed',
        duration: 45,
      },
      {
        action: 'Final Push',
        description: 'Complete remaining work and document results',
        duration: 90,
      },
    ],
    health: [
      {
        action: 'Initial Assessment',
        description: 'Assess current state and set baseline for {milestone}',
        duration: 30,
      },
      {
        action: 'Build Routine',
        description: 'Establish daily routine supporting {milestone}',
        duration: 45,
      },
      {
        action: 'Progressive Practice',
        description: 'Increase intensity/difficulty progressively',
        duration: 60,
      },
      {
        action: 'Track Progress',
        description: 'Measure results and track improvements',
        duration: 30,
      },
      {
        action: 'Optimize Approach',
        description: 'Fine-tune approach based on results',
        duration: 45,
      },
    ],
    finance: [
      {
        action: 'Financial Analysis',
        description: 'Analyze current financial situation for {milestone}',
        duration: 60,
      },
      {
        action: 'Create Budget Plan',
        description: 'Design budget and savings plan',
        duration: 45,
      },
      {
        action: 'Implement Changes',
        description: 'Put financial plan into action',
        duration: 30,
      },
      {
        action: 'Monitor Progress',
        description: 'Track expenses and progress toward {milestone}',
        duration: 30,
      },
      {
        action: 'Review and Optimize',
        description: 'Review results and optimize strategy',
        duration: 45,
      },
    ],
    learning: [
      {
        action: 'Study Foundation',
        description: 'Learn fundamental concepts for {milestone}',
        duration: 90,
      },
      {
        action: 'Practice Exercises',
        description: 'Complete practice problems and exercises',
        duration: 60,
      },
      {
        action: 'Deep Work Session',
        description: 'Focus deeply on challenging aspects',
        duration: 120,
      },
      {
        action: 'Review and Test',
        description: 'Review material and test understanding',
        duration: 60,
      },
      {
        action: 'Apply Knowledge',
        description: 'Apply what you learned to real scenarios',
        duration: 90,
      },
    ],
    relationships: [
      {
        action: 'Plan Activity',
        description: 'Plan meaningful interaction for {milestone}',
        duration: 30,
      },
      {
        action: 'Quality Time',
        description: 'Spend focused quality time together',
        duration: 90,
      },
      {
        action: 'Communication',
        description: 'Have important conversation about {goal}',
        duration: 60,
      },
      {
        action: 'Shared Experience',
        description: 'Create shared positive experience',
        duration: 120,
      },
      {
        action: 'Follow Up',
        description: 'Follow up and strengthen connection',
        duration: 30,
      },
    ],
    personal: [
      {
        action: 'Self Reflection',
        description: 'Reflect on goals and motivation for {milestone}',
        duration: 30,
      },
      {
        action: 'Take Action',
        description: 'Take concrete step toward {milestone}',
        duration: 60,
      },
      {
        action: 'Practice Consistency',
        description: 'Build consistent habits supporting {goal}',
        duration: 45,
      },
      {
        action: 'Overcome Challenge',
        description: 'Address obstacles blocking progress',
        duration: 60,
      },
      {
        action: 'Celebrate Progress',
        description: 'Acknowledge and celebrate progress made',
        duration: 30,
      },
    ],
  }

  return templates[category] || templates.personal
}

/**
 * Generate daily tasks for all active roadmaps
 * Called by cron job
 */
export const generateDailyTasksForAllUsers = async () => {
  logger.info('Starting daily task generation for all users...')

  try {
    // Get all users with active roadmaps
    const users = await prisma.user.findMany({
      where: {
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

    const results = []

    for (const user of users) {
      try {
        const milestones = await getMilestonesNeedingTasks(user.id, {
          daysAhead: 7, // Look 1 week ahead
          includeOverdue: true,
        })

        let generatedCount = 0

        for (const milestone of milestones) {
          const tasks = await generateTasksForMilestone(user.id, milestone.id, {
            useLLM: false, // Use rule-based for batch generation
            taskCount: 3, // Generate 3 tasks per milestone
          })
          generatedCount += tasks.length
        }

        results.push({
          userId: user.id,
          email: user.email,
          milestonesProcessed: milestones.length,
          tasksGenerated: generatedCount,
        })

        logger.info(
          `Generated ${generatedCount} tasks for user ${user.id} (${milestones.length} milestones)`
        )
      } catch (error) {
        logger.error(`Failed to generate tasks for user ${user.id}:`, error)
        results.push({
          userId: user.id,
          email: user.email,
          error: error.message,
        })
      }
    }

    logger.info(
      `Daily task generation complete. Processed ${users.length} users.`
    )

    return {
      success: true,
      usersProcessed: users.length,
      results,
    }
  } catch (error) {
    logger.error('Daily task generation failed:', error)
    throw error
  }
}

/**
 * Link a RoadmapTask to a regular Task (when user schedules it)
 */
export const linkRoadmapTaskToTask = async (roadmapTaskId, taskId, userId) => {
  const roadmapTask = await prisma.roadmapTask.findUnique({
    where: { id: roadmapTaskId },
    include: {
      roadmap: true,
    },
  })

  if (!roadmapTask) throw new Error('Roadmap task not found')
  if (roadmapTask.roadmap.userId !== userId) throw new Error('Unauthorized')

  // Update RoadmapTask to link to Task
  await prisma.roadmapTask.update({
    where: { id: roadmapTaskId },
    data: { taskId },
  })

  logger.info(`Linked RoadmapTask ${roadmapTaskId} to Task ${taskId}`)

  return roadmapTask
}

/**
 * Convert RoadmapTask to regular Task
 */
export const convertRoadmapTaskToTask = async (roadmapTaskId, userId, taskData = {}) => {
  const roadmapTask = await prisma.roadmapTask.findUnique({
    where: { id: roadmapTaskId },
    include: {
      roadmap: true,
    },
  })

  if (!roadmapTask) throw new Error('Roadmap task not found')
  if (roadmapTask.roadmap.userId !== userId) throw new Error('Unauthorized')

  // Create a regular Task from RoadmapTask
  const task = await prisma.task.create({
    data: {
      userId,
      title: taskData.title || roadmapTask.title,
      description: taskData.description || roadmapTask.description,
      startTime: taskData.startTime || roadmapTask.scheduledDate,
      endTime:
        taskData.endTime ||
        dayjs(roadmapTask.scheduledDate)
          .add(roadmapTask.estimatedDuration, 'minutes')
          .toDate(),
      priority: roadmapTask.priority,
      status: 'pending',
      category: taskData.category || null,
      isAllDay: taskData.isAllDay || false,
    },
  })

  // Link RoadmapTask to Task
  await prisma.roadmapTask.update({
    where: { id: roadmapTaskId },
    data: { taskId: task.id },
  })

  logger.info(`Converted RoadmapTask ${roadmapTaskId} to Task ${task.id}`)

  return task
}
