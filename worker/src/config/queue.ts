import Bull from 'bull';
import Redis from 'ioredis';
import { createLogger } from './logger';
import { processPayment } from '../jobs/payment-processor';
import { checkExpiration } from '../jobs/membership-expiration';
import { aggregateData } from '../jobs/analytics-aggregation';
import { sendNotification } from '../jobs/notification-sender';

const logger = createLogger();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
});

export const queues = {
  payment: new Bull('payment processing', { redis }),
  membership: new Bull('membership management', { redis }),
  analytics: new Bull('analytics aggregation', { redis }),
  notification: new Bull('notification sending', { redis }),
};

export async function initializeQueues() {
  logger.info('Initializing job queues...');

  // Setup queue processors
  queues.payment.process('process-payment', processPayment);
  queues.membership.process('check-expiration', checkExpiration);
  queues.analytics.process('aggregate-data', aggregateData);
  queues.notification.process('send-notification', sendNotification);

  // Global error handling
  Object.values(queues).forEach(queue => {
    queue.on('error', (error) => {
      logger.error(`Queue ${queue.name} error:`, error);
    });

    queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} in queue ${queue.name} failed:`, err);
    });

    queue.on('completed', (job) => {
      logger.info(`Job ${job.id} in queue ${queue.name} completed`);
    });
  });

  return queues;
}