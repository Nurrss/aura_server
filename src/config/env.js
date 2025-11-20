// src/config/env.js
import dotenv from 'dotenv';
dotenv.config();

// Required environment variables
const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

// Validate required environment variables
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Warn about recommended variables
const recommended = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'APP_URL'];
for (const key of recommended) {
  if (!process.env[key]) {
    console.warn(`⚠️  Warning: Missing recommended environment variable: ${key}`);
  }
}

export const ENV = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '1d',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '30d',

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: Number(process.env.SMTP_PORT) || 465,
  SMTP_SECURE:
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === true,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,

  APP_URL: process.env.APP_URL,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};
