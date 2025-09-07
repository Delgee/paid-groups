import 'reflect-metadata';
import { config } from 'dotenv';
import { createLogger } from './config/logger';
import { initializeQueues } from './config/queue';
import { setupSchedulers } from './schedulers';

// Load environment variables
config();

const logger = createLogger();

async function bootstrap() {
  try {
    logger.info('Starting Telegram SaaS Worker...');

    // Initialize Redis connection and queues
    const queues = await initializeQueues();
    logger.info(`Initialized ${Object.keys(queues).length} queues`);

    // Setup scheduled jobs
    await setupSchedulers();
    logger.info('Schedulers initialized');

    logger.info('Worker is ready and processing jobs');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      
      // Close all queues
      for (const queue of Object.values(queues)) {
        await queue.close();
      }
      
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

bootstrap();