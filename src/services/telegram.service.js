// telegram.service.js
import fetch from 'node-fetch';
import { ENV } from '../config/env.js';

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
