//telegramBot.js
import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../config/prismaClient.js';
import { ENV } from '../config/env.js';

const botToken = ENV.TELEGRAM_BOT_TOKEN;

if (!botToken) {
  console.error('❌ Telegram Bot Token not found! Check your .env file.');
  process.exit(1);
}

const bot = new TelegramBot(botToken, { polling: true });
console.log('🤖 Telegram bot started...');

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    '👋 Привет! Чтобы связать свой аккаунт, введи свой 6-значный код из приложения (например: 123456).'
  );
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text || text.startsWith('/start')) return;

  if (!/^\d{6}$/.test(text)) {
    bot.sendMessage(
      chatId,
      '⚠️ Введи корректный 6-значный код (например: 123456).'
    );
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { telegramCode: text },
    });

    if (!user) {
      bot.sendMessage(chatId, '❌ Неверный код. Попробуй снова.');
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramId: String(chatId),
        telegramCode: null,
      },
    });

    bot.sendMessage(chatId, '✅ Готово! Твой аккаунт успешно привязан.');
  } catch (error) {
    console.error('💥 Telegram bot error:', error);
    bot.sendMessage(chatId, '⚠️ Произошла ошибка. Попробуй позже.');
  }
});

export default bot;
