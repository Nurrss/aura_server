// server.js root
import app from './src/index.js';
import { startDailyJob } from './src/jobs/dailyReport.js';
import { startDailyTaskGenerationJob } from './src/jobs/dailyTaskGeneration.js';
import { startRoadmapNotificationJobs } from './src/jobs/roadmapNotifications.js';
import { startAICoachingJobs } from './src/jobs/aiCoaching.js';
import logger from './src/config/logger.js';

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
  .then(() => logger.info('SMTP connection verified successfully'))
  .catch((err) =>
    logger.error('SMTP connection failed', { error: err.message })
  );

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server started on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

startDailyJob();
startDailyTaskGenerationJob();
startRoadmapNotificationJobs();
startAICoachingJobs();
