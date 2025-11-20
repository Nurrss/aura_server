// telegram.service.js
import fetch from 'node-fetch';
import { ENV } from '../config/env.js';
import { prisma } from '../config/prismaClient.js';

const BOT = ENV.TELEGRAM_BOT_TOKEN;
if (!BOT)
  console.warn('Telegram bot token not configured (TELEGRAM_BOT_TOKEN)');

export const sendMessageToUser = async (chatId, text) => {
  if (!BOT) throw new Error('Telegram bot not configured');
  const url = `https://api.telegram.org/bot${BOT}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.description || 'Telegram error');
  return json.result;
};

export const linkTelegramAccount = async (telegramCode, telegramId) => {
  const user = await prisma.user.findUnique({ where: { telegramCode } });
  if (!user) throw new Error('Invalid Telegram code');

  const existing = await prisma.user.findUnique({ where: { telegramId } });
  if (existing && existing.id !== user.id)
    throw new Error('This Telegram is already linked to another account');

  return prisma.user.update({
    where: { id: user.id },
    data: { telegramId, telegramCode: null },
    select: { id: true, email: true, telegramId: true },
  });
};

export const unlinkTelegramAccount = async (userId) => {
  return prisma.user.update({
    where: { id: userId },
    data: { telegramId: null },
  });
};
