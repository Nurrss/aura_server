//telegramBot.js
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../config/prismaClient.js';
import { ENV } from '../config/env.js';
import dayjs from 'dayjs';

const botToken = ENV.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  console.error('❌ Telegram Bot Token not found! Check your .env file.');
  process.exit(1);
}

const bot = new TelegramBot(botToken, { polling: true });
console.log('🤖 Telegram bot started...');

// ============ COMMAND HANDLERS ============

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  const welcomeMessage = `👋 *Welcome to Aura!*

Your personal productivity & life management assistant.

*Available Commands:*
/link - Link your Aura account
/roadmaps - View your active roadmaps
/today - See today's tasks
/progress - Check your progress
/help - Show all commands

To get started, use /link to connect your account.`;

  bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/link/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    '🔗 To link your account, enter your 6-digit code from the Aura app (e.g., 123456).'
  );
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `📚 *Aura Bot Commands*

*Account:*
/link - Link your Aura account
/unlink - Unlink Telegram account

*Roadmaps:*
/roadmaps - View active roadmaps
/progress - Check overall progress
/goals - View your goals

*Tasks:*
/today - Tasks for today
/week - Tasks for this week
/upcoming - Upcoming milestones

*Other:*
/help - Show this message
/about - About Aura

💡 You'll receive automatic reminders for:
• Daily tasks (6 AM)
• Milestone due dates
• Weekly progress summaries (Sunday)`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/about/, async (msg) => {
  const chatId = msg.chat.id;

  const aboutMessage = `🎯 *About Aura*

Aura is your comprehensive productivity & life management suite.

*Features:*
• 5-Year Roadmaps with AI assistance
• Goal & Milestone tracking
• Daily task generation
• Progress analytics
• Telegram notifications

Built to help you achieve your long-term vision through consistent daily action.

🚀 Start creating your roadmap today!`;

  bot.sendMessage(chatId, aboutMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/roadmaps/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const user = await getUserByChatId(chatId);
    if (!user) {
      bot.sendMessage(chatId, '❌ Please link your account first using /link');
      return;
    }

    const roadmaps = await prisma.roadmap.findMany({
      where: { userId: user.id, status: 'active' },
      include: {
        goals: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (roadmaps.length === 0) {
      bot.sendMessage(
        chatId,
        '📋 You don\'t have any active roadmaps yet.\n\nCreate your first roadmap in the Aura app!'
      );
      return;
    }

    let message = '🗺️ *Your Active Roadmaps*\n\n';

    roadmaps.forEach((roadmap, index) => {
      const progress = Number(roadmap.progressPercentage || 0).toFixed(0);
      const progressBar = getProgressBar(Number(progress));
      const goalsTotal = roadmap.goals.length;
      const goalsCompleted = roadmap.goals.filter((g) => g.status === 'completed').length;

      message += `${index + 1}. *${roadmap.title}*\n`;
      message += `${progressBar} ${progress}%\n`;
      message += `Goals: ${goalsCompleted}/${goalsTotal}\n`;
      message += `End date: ${dayjs(roadmap.endDate).format('MMM YYYY')}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /roadmaps:', error);
    bot.sendMessage(chatId, '⚠️ An error occurred. Please try again later.');
  }
});

bot.onText(/\/today/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const user = await getUserByChatId(chatId);
    if (!user) {
      bot.sendMessage(chatId, '❌ Please link your account first using /link');
      return;
    }

    const today = dayjs().startOf('day').toDate();
    const endOfDay = dayjs().endOf('day').toDate();

    const tasks = await prisma.roadmapTask.findMany({
      where: {
        roadmap: { userId: user.id },
        scheduledDate: { gte: today, lte: endOfDay },
        status: { in: ['pending', 'in_progress'] },
      },
      include: {
        milestone: {
          select: {
            title: true,
            goal: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    if (tasks.length === 0) {
      bot.sendMessage(
        chatId,
        `📅 *Today (${dayjs().format('MMM D')})*\n\nNo tasks scheduled for today. Enjoy your free time! 😊`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    let message = `📅 *Today's Tasks (${dayjs().format('MMM D')})*\n\n`;

    tasks.forEach((task, index) => {
      const priorityEmoji = getPriorityEmoji(task.priority);
      const duration = task.estimatedDuration ? `(~${task.estimatedDuration}min)` : '';

      message += `${priorityEmoji} ${task.title} ${duration}\n`;
      if (task.milestone) {
        message += `   └ ${task.milestone.goal.title}\n`;
      }
      message += '\n';
    });

    message += `\n💪 Total: ${tasks.length} task${tasks.length > 1 ? 's' : ''}`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /today:', error);
    bot.sendMessage(chatId, '⚠️ An error occurred. Please try again later.');
  }
});

bot.onText(/\/progress/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const user = await getUserByChatId(chatId);
    if (!user) {
      bot.sendMessage(chatId, '❌ Please link your account first using /link');
      return;
    }

    const roadmaps = await prisma.roadmap.findMany({
      where: { userId: user.id, status: 'active' },
      include: {
        goals: true,
      },
    });

    if (roadmaps.length === 0) {
      bot.sendMessage(chatId, '📋 No active roadmaps found.');
      return;
    }

    const weekStart = dayjs().startOf('week').toDate();
    const weekEnd = dayjs().endOf('week').toDate();

    const completedThisWeek = await prisma.roadmapTask.count({
      where: {
        roadmap: { userId: user.id },
        status: 'completed',
        completionDate: { gte: weekStart, lte: weekEnd },
      },
    });

    let message = '📊 *Progress Summary*\n\n';
    message += `✅ Tasks completed this week: *${completedThisWeek}*\n\n`;

    roadmaps.forEach((roadmap) => {
      const progress = Number(roadmap.progressPercentage || 0).toFixed(0);
      const progressBar = getProgressBar(Number(progress));
      const goalsCompleted = roadmap.goals.filter((g) => g.status === 'completed').length;
      const goalsTotal = roadmap.goals.length;

      message += `🗺️ *${roadmap.title}*\n`;
      message += `${progressBar} ${progress}%\n`;
      message += `Goals: ${goalsCompleted}/${goalsTotal}\n\n`;
    });

    message += '\n🎯 Keep up the great work!';

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /progress:', error);
    bot.sendMessage(chatId, '⚠️ An error occurred. Please try again later.');
  }
});

bot.onText(/\/upcoming/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const user = await getUserByChatId(chatId);
    if (!user) {
      bot.sendMessage(chatId, '❌ Please link your account first using /link');
      return;
    }

    const today = dayjs().startOf('day').toDate();
    const futureDate = dayjs().add(30, 'days').endOf('day').toDate();

    const milestones = await prisma.milestone.findMany({
      where: {
        goal: {
          roadmap: {
            userId: user.id,
            status: 'active',
          },
        },
        status: { in: ['not_started', 'in_progress'] },
        dueDate: { gte: today, lte: futureDate },
      },
      include: {
        goal: {
          select: {
            title: true,
            category: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    if (milestones.length === 0) {
      bot.sendMessage(chatId, '📅 No upcoming milestones in the next 30 days.');
      return;
    }

    let message = '📅 *Upcoming Milestones*\n\n';

    milestones.forEach((milestone) => {
      const daysUntil = dayjs(milestone.dueDate).diff(dayjs(), 'days');
      const categoryEmoji = getCategoryEmoji(milestone.goal.category);

      message += `${categoryEmoji} *${milestone.title}*\n`;
      message += `   Goal: ${milestone.goal.title}\n`;
      message += `   Due: ${dayjs(milestone.dueDate).format('MMM D, YYYY')}`;

      if (daysUntil === 0) message += ' (Today!)';
      else if (daysUntil === 1) message += ' (Tomorrow)';
      else if (daysUntil <= 7) message += ` (${daysUntil} days)`;

      message += '\n\n';
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /upcoming:', error);
    bot.sendMessage(chatId, '⚠️ An error occurred. Please try again later.');
  }
});

bot.onText(/\/unlink/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const user = await getUserByChatId(chatId);
    if (!user) {
      bot.sendMessage(chatId, '❌ Your account is not linked.');
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramId: null },
    });

    bot.sendMessage(chatId, '✅ Your account has been unlinked successfully.');
  } catch (error) {
    console.error('Error in /unlink:', error);
    bot.sendMessage(chatId, '⚠️ An error occurred. Please try again later.');
  }
});

// ============ MESSAGE HANDLER (6-digit code) ============

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  // Ignore commands
  if (!text || text.startsWith('/')) return;

  // Check if it's a 6-digit code
  if (!/^\d{6}$/.test(text)) {
    return; // Silently ignore non-code messages
  }

  try {
    const user = await prisma.user.findUnique({
      where: { telegramCode: text },
    });

    if (!user) {
      bot.sendMessage(chatId, '❌ Invalid code. Please try again or use /link for help.');
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramId: String(chatId),
        telegramCode: null,
      },
    });

    bot.sendMessage(
      chatId,
      '✅ *Account linked successfully!*\n\nYou\'ll now receive:\n• Daily task reminders (6 AM)\n• Milestone due date alerts\n• Weekly progress summaries\n\nUse /help to see all available commands.',
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('💥 Telegram bot error:', error);
    bot.sendMessage(chatId, '⚠️ An error occurred. Please try again later.');
  }
});

// ============ HELPER FUNCTIONS ============

async function getUserByChatId(chatId) {
  return prisma.user.findUnique({
    where: { telegramId: String(chatId) },
    select: {
      id: true,
      email: true,
      telegramId: true,
    },
  });
}

function getProgressBar(percentage) {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function getPriorityEmoji(priority) {
  const emojis = {
    critical: '🔴',
    high: '🟠',
    normal: '🟡',
    low: '🟢',
  };
  return emojis[priority] || '⚪';
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
  };
  return emojis[category] || '📌';
}

export default bot;
