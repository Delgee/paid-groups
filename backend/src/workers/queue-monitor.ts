#!/usr/bin/env node

/**
 * Queue Monitor Utility
 * 
 * This script provides monitoring capabilities for BullMQ queues.
 * Run with: npx ts-node src/workers/queue-monitor.ts
 */

import * as Bull from 'bull';
import Redis from 'ioredis';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

class QueueMonitor {
  private redis: Redis;
  private paymentQueue: Bull.Queue;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.paymentQueue = new Bull('payment-processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    });
  }

  async getQueueStats(): Promise<QueueStats> {
    return {
      waiting: await this.paymentQueue.getWaiting().then(jobs => jobs.length),
      active: await this.paymentQueue.getActive().then(jobs => jobs.length),
      completed: await this.paymentQueue.getCompleted().then(jobs => jobs.length),
      failed: await this.paymentQueue.getFailed().then(jobs => jobs.length),
      delayed: await this.paymentQueue.getDelayed().then(jobs => jobs.length),
    };
  }

  async getFailedJobs(limit: number = 10): Promise<Bull.Job[]> {
    return this.paymentQueue.getFailed(0, limit - 1);
  }

  async getActiveJobs(): Promise<Bull.Job[]> {
    return this.paymentQueue.getActive();
  }

  async retryFailedJobs(limit: number = 5): Promise<void> {
    const failedJobs = await this.getFailedJobs(limit);
    
    console.log(`Retrying ${failedJobs.length} failed jobs...`);
    
    for (const job of failedJobs) {
      try {
        await job.retry();
        console.log(`✅ Retried job ${job.id}`);
      } catch (error) {
        console.error(`❌ Failed to retry job ${job.id}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  async clearCompletedJobs(): Promise<void> {
    await this.paymentQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
    console.log('✅ Cleared old completed jobs');
  }

  async clearFailedJobs(): Promise<void> {
    await this.paymentQueue.clean(0, 'failed');
    console.log('✅ Cleared all failed jobs');
  }

  async monitor(): Promise<void> {
    console.log('🔍 Payment Queue Monitor');
    console.log('========================');
    
    const stats = await this.getQueueStats();
    
    console.log(`📊 Queue Stats:`);
    console.log(`  Waiting: ${stats.waiting}`);
    console.log(`  Active: ${stats.active}`);
    console.log(`  Completed: ${stats.completed}`);
    console.log(`  Failed: ${stats.failed}`);
    console.log(`  Delayed: ${stats.delayed}`);
    console.log('');

    if (stats.active > 0) {
      console.log('⚡ Active Jobs:');
      const activeJobs = await this.getActiveJobs();
      activeJobs.forEach(job => {
        console.log(`  - Job ${job.id}: ${job.name} (Started: ${new Date(job.processedOn || 0).toLocaleString()})`);
      });
      console.log('');
    }

    if (stats.failed > 0) {
      console.log('❌ Failed Jobs (last 5):');
      const failedJobs = await this.getFailedJobs(5);
      failedJobs.forEach(job => {
        console.log(`  - Job ${job.id}: ${job.name}`);
        console.log(`    Failed: ${new Date((job as any).failedOn || Date.now()).toLocaleString()}`);
        console.log(`    Error: ${(job as any).failedReason || 'Unknown error'}`);
        console.log(`    Attempts: ${job.attemptsMade}/${job.opts.attempts || 'unlimited'}`);
        console.log('');
      });
    }
  }

  async close(): Promise<void> {
    await this.paymentQueue.close();
    await this.redis.disconnect();
  }
}

async function main() {
  const monitor = new QueueMonitor();
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'stats':
        await monitor.monitor();
        break;
      
      case 'retry':
        const limit = parseInt(process.argv[3]) || 5;
        await monitor.retryFailedJobs(limit);
        break;
      
      case 'clear-completed':
        await monitor.clearCompletedJobs();
        break;
      
      case 'clear-failed':
        await monitor.clearFailedJobs();
        break;
      
      case 'watch':
        console.log('👀 Watching queue (press Ctrl+C to exit)...\n');
        const interval = setInterval(async () => {
          console.clear();
          await monitor.monitor();
        }, 3000);
        
        process.on('SIGINT', () => {
          clearInterval(interval);
          monitor.close().then(() => process.exit(0));
        });
        break;
      
      default:
        console.log('Usage: npx ts-node src/workers/queue-monitor.ts <command>');
        console.log('');
        console.log('Commands:');
        console.log('  stats           - Show current queue statistics');
        console.log('  retry [limit]   - Retry failed jobs (default: 5)');
        console.log('  clear-completed - Clear old completed jobs');
        console.log('  clear-failed    - Clear all failed jobs');
        console.log('  watch           - Watch queue in real-time');
        break;
    }
    
    if (command !== 'watch') {
      await monitor.close();
    }
  } catch (error) {
    console.error('Error:', error);
    await monitor.close();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}