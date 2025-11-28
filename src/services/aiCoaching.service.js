import { prisma } from '../config/prismaClient.js';
import { callLLM } from './llmService.js';
import {
  calculateVelocity,
  detectBottlenecks,
  getCategoryDistribution,
  predictRoadmapCompletion,
  getStreak,
} from './analytics.service.js';
import logger from '../config/logger.js';
import dayjs from 'dayjs';

/**
 * AI Coaching Service
 * Generates personalized insights, recommendations, and motivational coaching
 */

/**
 * Generate personalized weekly coaching message
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Coaching insights
 */
export const generateWeeklyCoaching = async (userId) => {
  try {
    // Gather all analytics data
    const velocity = await calculateVelocity(userId, 30);
    const bottlenecks = await detectBottlenecks(userId);
    const categoryDistribution = await getCategoryDistribution(userId);
    const streak = await getStreak(userId);

    // Get user's active roadmaps
    const roadmaps = await prisma.roadmap.findMany({
      where: { userId, status: 'active' },
      include: {
        goals: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            completionPercentage: true,
          },
        },
      },
    });

    // Build context for LLM
    const context = buildCoachingContext({
      velocity,
      bottlenecks,
      categoryDistribution,
      streak,
      roadmaps,
    });

    // Generate coaching with LLM
    const prompt = `You are an expert life coach analyzing a user's 5-year roadmap progress. Based on the data below, provide personalized coaching insights.

${context}

Please provide:
1. **Progress Highlights** (2-3 sentences): Celebrate recent wins and positive trends
2. **Key Insights** (3-4 bullet points): Important observations about their progress
3. **Recommendations** (3-4 actionable items): Specific advice to improve their journey
4. **Motivation** (1-2 sentences): Encouraging message tailored to their situation

Keep the tone supportive, specific, and actionable. Use their actual data in your insights.`;

    const llmResponse = await callLLM({
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 1000,
    });

    // Parse LLM response
    const coaching = parseLLMCoachingResponse(llmResponse);

    // Add structured data
    coaching.analytics = {
      velocityTrend: velocity.trend,
      tasksPerWeek: velocity.averages.tasksPerWeek,
      currentStreak: streak.currentStreak,
      bottleneckSeverity: bottlenecks.summary.severity,
      overdueCount: bottlenecks.summary.totalOverdue,
    };

    // Save coaching to database
    await prisma.coachingInsight.create({
      data: {
        userId,
        insightType: 'weekly_coaching',
        content: JSON.stringify(coaching),
        generatedAt: new Date(),
      },
    }).catch(() => {
      // Table might not exist yet, log but don't fail
      logger.warn('CoachingInsight table not found, skipping save');
    });

    return coaching;
  } catch (error) {
    logger.error('Error generating weekly coaching:', error);

    // Return fallback coaching if LLM fails
    return generateFallbackCoaching(userId);
  }
};

/**
 * Build context string for LLM coaching
 */
function buildCoachingContext(data) {
  const { velocity, bottlenecks, categoryDistribution, streak, roadmaps } = data;

  let context = `## User Progress Data\n\n`;

  // Velocity section
  context += `### Velocity (Last 30 Days)\n`;
  context += `- Tasks completed: ${velocity.totals.tasksCompleted}\n`;
  context += `- Milestones completed: ${velocity.totals.milestonesCompleted}\n`;
  context += `- Average tasks per week: ${velocity.averages.tasksPerWeek}\n`;
  context += `- Average hours per week: ${velocity.averages.hoursPerWeek}\n`;
  context += `- Trend: ${velocity.trend}\n\n`;

  // Streak section
  context += `### Consistency\n`;
  context += `- Current streak: ${streak.currentStreak} days\n`;
  context += `- Longest streak: ${streak.longestStreak} days\n`;
  context += `- Total active days: ${streak.totalActiveDays}\n\n`;

  // Bottlenecks section
  if (bottlenecks.summary.totalOverdue > 0 || bottlenecks.strugglingGoals.length > 0) {
    context += `### Challenges\n`;
    if (bottlenecks.summary.totalOverdue > 0) {
      context += `- Overdue milestones: ${bottlenecks.summary.totalOverdue}\n`;
      bottlenecks.overdueMilestones.slice(0, 3).forEach((m) => {
        context += `  - "${m.milestoneTitle}" (${m.daysOverdue} days overdue)\n`;
      });
    }
    if (bottlenecks.strugglingGoals.length > 0) {
      context += `- Goals with low progress:\n`;
      bottlenecks.strugglingGoals.slice(0, 2).forEach((g) => {
        context += `  - "${g.goalTitle}" (${g.completionRate}% complete)\n`;
      });
    }
    if (bottlenecks.underperformingCategories.length > 0) {
      context += `- Categories needing attention:\n`;
      bottlenecks.underperformingCategories.slice(0, 2).forEach((c) => {
        context += `  - ${c.category} (${c.completionRate}% completion rate)\n`;
      });
    }
    context += `\n`;
  }

  // Category distribution
  context += `### Category Focus\n`;
  categoryDistribution.distribution.forEach((cat) => {
    context += `- ${cat.category}: ${cat.goalsCount} goals, ${cat.completionRate}% complete\n`;
  });
  context += `\n`;

  // Active roadmaps
  context += `### Active Roadmaps\n`;
  roadmaps.forEach((r) => {
    const activeGoals = r.goals.filter((g) => g.status !== 'completed').length;
    const completedGoals = r.goals.filter((g) => g.status === 'completed').length;
    context += `- "${r.title}": ${Number(r.progressPercentage).toFixed(0)}% complete (${completedGoals}/${r.goals.length} goals done)\n`;
  });

  return context;
}

/**
 * Parse LLM response into structured coaching object
 */
function parseLLMCoachingResponse(llmText) {
  const sections = {
    highlights: '',
    insights: [],
    recommendations: [],
    motivation: '',
  };

  // Simple parsing - look for sections
  const lines = llmText.split('\n');
  let currentSection = null;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.match(/progress.*highlight/i) || trimmed.match(/^#+.*highlight/i)) {
      currentSection = 'highlights';
    } else if (trimmed.match(/key.*insight/i) || trimmed.match(/^#+.*insight/i)) {
      currentSection = 'insights';
    } else if (trimmed.match(/recommendation/i) || trimmed.match(/^#+.*recommendation/i)) {
      currentSection = 'recommendations';
    } else if (trimmed.match(/motivation/i) || trimmed.match(/^#+.*motivation/i)) {
      currentSection = 'motivation';
    } else if (trimmed && currentSection) {
      // Add content to current section
      if (currentSection === 'highlights' || currentSection === 'motivation') {
        sections[currentSection] += (sections[currentSection] ? ' ' : '') + trimmed.replace(/^[*-]\s*/, '');
      } else if (trimmed.match(/^[-*•]\s/)) {
        sections[currentSection].push(trimmed.replace(/^[-*•]\s*/, ''));
      }
    }
  });

  return {
    type: 'weekly_coaching',
    generatedAt: new Date().toISOString(),
    highlights: sections.highlights,
    insights: sections.insights.filter((i) => i),
    recommendations: sections.recommendations.filter((r) => r),
    motivation: sections.motivation,
  };
}

/**
 * Generate fallback coaching without LLM
 */
async function generateFallbackCoaching(userId) {
  const velocity = await calculateVelocity(userId, 30);
  const bottlenecks = await detectBottlenecks(userId);
  const streak = await getStreak(userId);

  const highlights = generateHighlights(velocity, streak);
  const insights = generateInsights(velocity, bottlenecks);
  const recommendations = generateRecommendations(bottlenecks, velocity);
  const motivation = generateMotivation(streak, velocity);

  return {
    type: 'weekly_coaching',
    generatedAt: new Date().toISOString(),
    highlights,
    insights,
    recommendations,
    motivation,
    analytics: {
      velocityTrend: velocity.trend,
      tasksPerWeek: velocity.averages.tasksPerWeek,
      currentStreak: streak.currentStreak,
      bottleneckSeverity: bottlenecks.summary.severity,
      overdueCount: bottlenecks.summary.totalOverdue,
    },
  };
}

function generateHighlights(velocity, streak) {
  const highlights = [];

  if (velocity.totals.tasksCompleted > 20) {
    highlights.push(`Great work! You completed ${velocity.totals.tasksCompleted} tasks in the last 30 days.`);
  }

  if (streak.currentStreak >= 7) {
    highlights.push(`You're on fire with a ${streak.currentStreak}-day streak!`);
  } else if (streak.currentStreak >= 3) {
    highlights.push(`Keep it up! You have a ${streak.currentStreak}-day streak going.`);
  }

  if (velocity.trend === 'increasing') {
    highlights.push('Your productivity is trending upward - momentum is building!');
  }

  if (highlights.length === 0) {
    highlights.push("You're working on your roadmap. Every step forward counts!");
  }

  return highlights.join(' ');
}

function generateInsights(velocity, bottlenecks) {
  const insights = [];

  if (velocity.averages.tasksPerWeek < 3 && velocity.totals.tasksCompleted > 0) {
    insights.push(`You're completing about ${velocity.averages.tasksPerWeek.toFixed(1)} tasks per week. Consider increasing your pace to maintain momentum.`);
  }

  if (bottlenecks.summary.totalOverdue > 0) {
    insights.push(`You have ${bottlenecks.summary.totalOverdue} overdue milestone${bottlenecks.summary.totalOverdue > 1 ? 's' : ''}. Addressing these should be a priority.`);
  }

  if (bottlenecks.strugglingGoals.length > 0) {
    insights.push(`${bottlenecks.strugglingGoals.length} goal${bottlenecks.strugglingGoals.length > 1 ? 's are' : ' is'} showing low progress. These may need more attention or timeline adjustment.`);
  }

  if (velocity.trend === 'decreasing') {
    insights.push('Your task completion rate has decreased recently. Consider reviewing your schedule and priorities.');
  }

  if (insights.length === 0) {
    insights.push('Your progress is steady. Keep maintaining your current approach.');
  }

  return insights;
}

function generateRecommendations(bottlenecks, velocity) {
  const recommendations = [];

  if (bottlenecks.summary.totalOverdue > 0) {
    recommendations.push('Review overdue milestones and either reschedule them or break them into smaller tasks.');
  }

  if (bottlenecks.strugglingGoals.length > 0) {
    const goal = bottlenecks.strugglingGoals[0];
    recommendations.push(`Focus on "${goal.goalTitle}" (${goal.category}) - it needs attention.`);
  }

  if (velocity.averages.tasksPerWeek < 2) {
    recommendations.push('Try to complete at least 3-5 tasks per week to build momentum.');
  }

  if (bottlenecks.underperformingCategories.length > 0) {
    const category = bottlenecks.underperformingCategories[0];
    recommendations.push(`Dedicate more time to your ${category.category} goals this week.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue your current pace and stay consistent.');
    recommendations.push('Review your roadmap weekly to stay aligned with your vision.');
  }

  return recommendations;
}

function generateMotivation(streak, velocity) {
  if (streak.currentStreak >= 7) {
    return "You're building incredible momentum! Consistency is the key to achieving your 5-year vision. Keep going!";
  } else if (velocity.trend === 'increasing') {
    return "Your upward trend shows you're finding your rhythm. Trust the process and keep pushing forward!";
  } else if (velocity.totals.tasksCompleted > 0) {
    return "Every task completed is a step closer to your dreams. You've got this!";
  } else {
    return "Getting started is the hardest part, but you're here and ready. Take it one task at a time!";
  }
}

/**
 * Generate personalized goal recommendation
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Goal suggestions
 */
export const generateGoalRecommendations = async (userId) => {
  try {
    const categoryDist = await getCategoryDistribution(userId);
    const bottlenecks = await detectBottlenecks(userId);

    // Identify underrepresented categories
    const allCategories = ['career', 'health', 'finance', 'learning', 'relationships', 'personal'];
    const userCategories = categoryDist.distribution.map((d) => d.category);
    const missingCategories = allCategories.filter((c) => !userCategories.includes(c));

    // Identify struggling categories
    const strugglingCategories = bottlenecks.underperformingCategories.map((c) => c.category);

    const recommendations = [];

    // Suggest missing categories
    if (missingCategories.length > 0) {
      recommendations.push({
        type: 'new_category',
        priority: 'medium',
        categories: missingCategories.slice(0, 2),
        message: `Consider adding goals in ${missingCategories.slice(0, 2).join(' or ')} to create a more balanced roadmap.`,
      });
    }

    // Suggest focus on struggling areas
    if (strugglingCategories.length > 0) {
      recommendations.push({
        type: 'improve_existing',
        priority: 'high',
        categories: strugglingCategories,
        message: `Your ${strugglingCategories[0]} goals need more attention. Consider breaking them into smaller milestones.`,
      });
    }

    // Check for imbalanced focus
    if (!categoryDist.summary.isBalanced) {
      const most = categoryDist.summary.mostFocusedCategory;
      const least = categoryDist.summary.leastFocusedCategory;
      recommendations.push({
        type: 'balance',
        priority: 'low',
        message: `You have many ${most} goals but fewer ${least} goals. Consider balancing your focus areas.`,
      });
    }

    return {
      recommendations,
      currentDistribution: categoryDist.distribution,
      missingCategories,
      strugglingCategories,
    };
  } catch (error) {
    logger.error('Error generating goal recommendations:', error);
    throw error;
  }
};

/**
 * Generate smart milestone suggestion for a goal
 * @param {number} goalId - Goal ID
 * @returns {Promise<Array>} Suggested milestones
 */
export const suggestMilestones = async (goalId) => {
  try {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        milestones: true,
        roadmap: { select: { startDate: true, endDate: true } },
      },
    });

    if (!goal) {
      throw new Error('Goal not found');
    }

    // Build prompt for LLM
    const prompt = `Generate 3-5 realistic quarterly milestones for this goal:

**Category**: ${goal.category}
**Goal**: ${goal.title}
**Description**: ${goal.description || 'Not provided'}
**Current State**: ${goal.currentState || 'Not specified'}
**Desired State**: ${goal.desiredState || 'Not specified'}
**Target Year**: Year ${goal.targetYear}
**Priority**: ${goal.priority}/5

**Existing Milestones**: ${goal.milestones.length > 0 ? goal.milestones.map((m) => m.title).join(', ') : 'None yet'}

Please suggest milestones that:
1. Are specific and measurable
2. Progress logically toward the goal
3. Are achievable within quarterly timeframes
4. Build on each other

Format each milestone as:
MILESTONE: [title]
DESCRIPTION: [2-3 sentences]
EFFORT: [estimated hours]
---`;

    const llmResponse = await callLLM({
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 800,
    });

    // Parse LLM response
    const milestones = parseMilestoneSuggestions(llmResponse, goal);

    return milestones;
  } catch (error) {
    logger.error('Error suggesting milestones:', error);

    // Return fallback suggestions
    return generateFallbackMilestones(goal);
  }
};

function parseMilestoneSuggestions(llmText, goal) {
  const milestones = [];
  const blocks = llmText.split('---').filter((b) => b.trim());

  blocks.forEach((block) => {
    const titleMatch = block.match(/MILESTONE:\s*(.+)/i);
    const descMatch = block.match(/DESCRIPTION:\s*(.+?)(?=EFFORT:|$)/is);
    const effortMatch = block.match(/EFFORT:\s*(\d+)/i);

    if (titleMatch) {
      milestones.push({
        title: titleMatch[1].trim(),
        description: descMatch ? descMatch[1].trim().replace(/\n/g, ' ') : '',
        estimatedEffortHours: effortMatch ? parseInt(effortMatch[1]) : 20,
      });
    }
  });

  return milestones;
}

function generateFallbackMilestones(goal) {
  const category = goal.category;
  const templates = {
    career: [
      { title: 'Complete skill assessment and create learning plan', effort: 10 },
      { title: 'Achieve intermediate proficiency in key skills', effort: 40 },
      { title: 'Complete major project or certification', effort: 60 },
      { title: 'Reach target position or capability', effort: 30 },
    ],
    health: [
      { title: 'Establish baseline and create routine', effort: 8 },
      { title: 'Build consistent habit (30 days)', effort: 15 },
      { title: 'Reach intermediate goal markers', effort: 20 },
      { title: 'Achieve target health metrics', effort: 15 },
    ],
    finance: [
      { title: 'Audit current finances and set targets', effort: 5 },
      { title: 'Implement savings/investment plan', effort: 10 },
      { title: 'Reach 50% of financial goal', effort: 20 },
      { title: 'Achieve full financial target', effort: 15 },
    ],
  };

  const template = templates[category] || templates.career;

  return template.map((t) => ({
    title: t.title,
    description: `${t.title} for: ${goal.title}`,
    estimatedEffortHours: t.effort,
  }));
}

export default {
  generateWeeklyCoaching,
  generateGoalRecommendations,
  suggestMilestones,
};
