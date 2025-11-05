// server.js root
import app from './src/index.js';
import { startDailyJob } from './src/jobs/dailyReport.js';

import nodemailer from 'nodemailer';
import { ENV } from './src/config/env.js';

const testTransporter = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: ENV.SMTP_PORT,
  secure: ENV.SMTP_SECURE,
  auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
});

testTransporter
  .verify()
  .then(() => console.log('✅ SMTP connection works!'))
  .catch((err) => console.error('❌ SMTP connection failed:', err.message));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

startDailyJob();
