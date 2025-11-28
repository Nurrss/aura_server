import PgBoss from 'pg-boss';
import logger from './logger.js';
import { ENV } from './env.js';

let boss = null;

export async function initQueue() {
  try {
    boss = new PgBoss({
      connectionString: ENV.DATABASE_URL,
      schema: 'pgboss',
      max: 10, // connection pool size
      deleteAfterDays: 7, // auto-delete completed jobs after 7 days
      retryLimit: 3,
      retryDelay: 60, // seconds
      retryBackoff: true,
      expireInHours: 24,
    });

    boss.on('error', (error) => {
      logger.error('PgBoss error:', { error: error.message });
    });

    await boss.start();
    logger.info('Job queue (PgBoss) initialized successfully');

    return boss;
  } catch (error) {
    logger.error('Failed to initialize job queue:', { error: error.message });
    throw error;
  }
}

export function getQueue() {
  if (!boss) {
    throw new Error('Queue not initialized. Call initQueue() first.');
  }
  return boss;
}

export async function stopQueue() {
  if (boss) {
    await boss.stop();
    logger.info('Job queue stopped');
  }
}

export default {
  initQueue,
  getQueue,
  stopQueue,
};
