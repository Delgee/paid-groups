import * as cron from 'node-cron';
import { queues } from '../config/queue';
import { createLogger } from '../config/logger';

const logger = createLogger();

export async function setupSchedulers() {
  logger.info('Setting up scheduled jobs...');

  // Check membership expiration every hour
  cron.schedule('0 * * * *', async () => {
    logger.info('Scheduling membership expiration check');
    await queues.membership.add('check-expiration', {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  });

  // Aggregate analytics data every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Scheduling analytics aggregation');
    await queues.analytics.add('aggregate-data', {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  });

  // Daily cleanup tasks at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Running daily cleanup tasks');
    // Add cleanup jobs here
  });

  logger.info('All schedulers configured');
}