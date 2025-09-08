import Bull from 'bull';
import { createLogger } from './logger';

const logger = createLogger();

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

export const queues = {
  payment: new Bull('payment processing', { redis: redisOptions }),
  membership: new Bull('membership management', { redis: redisOptions }),
  analytics: new Bull('analytics aggregation', { redis: redisOptions }),
  notification: new Bull('notification sending', { redis: redisOptions }),
};

export async function initializeQueues() {
  logger.info('Initializing job queues...');

  // TODO: Setup queue processors when job files are created
  // queues.payment.process('process-payment', processPayment);
  // queues.membership.process('check-expiration', checkExpiration);
  // queues.analytics.process('aggregate-data', aggregateData);
  // queues.notification.process('send-notification', sendNotification);

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