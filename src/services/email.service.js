import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

export const transporter = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: Number(ENV.SMTP_PORT),
  secure: ENV.SMTP_SECURE === true || ENV.SMTP_SECURE === 'true',
  auth: {
    user: ENV.SMTP_USER,
    pass: ENV.SMTP_PASS,
  },
  tls: {
    // Не обязательно, но помогает при "Unexpected socket close"
    rejectUnauthorized: false,
  },
});

export const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${ENV.APP_URL}/api/auth/verify-email?token=${token}`;

  try {
    const info = await transporter.sendMail({
      from: `"Aura App" <${ENV.SMTP_USER}>`,
      to: email,
      subject: 'Verify your email address',
      html: `
        <h2>Welcome to Aura 🌟</h2>
        <p>Please confirm your email by clicking the link below:</p>
        <a href="${verifyUrl}" target="_blank">${verifyUrl}</a>
      `,
    });

    console.log('✅ Email sent:', info.messageId);
  } catch (err) {
    console.error('❌ Email send error:', err);
    throw err;
  }
};
