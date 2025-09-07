import Bull from 'bull';
import Redis from 'ioredis';
import { createLogger } from './logger';

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
  queues.payment.process('process-payment', require('../jobs/payment-processor').processPayment);
  queues.membership.process('check-expiration', require('../jobs/membership-expiration').checkExpiration);
  queues.analytics.process('aggregate-data', require('../jobs/analytics-aggregation').aggregateData);
  queues.notification.process('send-notification', require('../jobs/notification-sender').sendNotification);

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