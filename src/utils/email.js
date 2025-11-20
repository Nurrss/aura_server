// src/utils/email.js
import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

export const sendResetPasswordEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT,
    secure: ENV.SMTP_SECURE === 'true',
    auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
  });

  const resetUrl = `${ENV.APP_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: `"Aura Support" <${ENV.SMTP_USER}>`,
    to: email,
    subject: 'Reset your Aura password',
    html: `
      <h3>Password Reset Request</h3>
      <p>Click below to reset your password:</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>This link expires in 15 minutes.</p>
    `,
  });
};
