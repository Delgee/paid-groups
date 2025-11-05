import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TelegramApiService } from '../../integrations/telegram/telegram-api.service';
import { QPayAuthService } from '../../integrations/qpay/services/qpay-auth.service';
import { firstValueFrom } from 'rxjs';
import { Project } from '../project/entities/project.entity';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QueueStatusDto, QueueStatsDto } from './dto/queue-stats.dto';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version?: string;
  checks?: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  duration_ms?: number;
  details?: Record<string, any>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private httpService: HttpService,
    private telegramApiService: TelegramApiService,
    private qpayAuthService: QPayAuthService,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    @Optional()
    @InjectQueue('payment-processing')
    private paymentQueue?: Queue,
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    try {
      // Database health check
      const dbHealth = await this.checkDatabaseHealth();
      checks.push(dbHealth);

      // Redis health check (if configured)
      const redisHealth = await this.checkRedisHealth();
      checks.push(redisHealth);

      // QPay health check
      const qpayHealth = await this.checkQPayHealth();
      checks.push(qpayHealth);

      // Telegram health check
      const telegramHealth = await this.checkTelegramHealth();
      checks.push(telegramHealth);
    } catch (error) {
      this.logger.error('Error during health check:', error);
      checks.push({
        name: 'system',
        status: 'unhealthy',
        message: 'Error during health check',
        details: { error: error.message },
      });
    }

    // Determine overall status
    const unhealthyChecks = checks.filter(
      (check) => check.status === 'unhealthy',
    );
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    if (unhealthyChecks.length > 0) {
      status =
        unhealthyChecks.length === checks.length ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };
  }

  async getDatabaseHealth(): Promise<HealthCheck> {
    return this.checkDatabaseHealth();
  }

  async getRedisHealth(): Promise<HealthCheck> {
    return this.checkRedisHealth();
  }

  async getQPayHealth(): Promise<HealthCheck> {
    return this.checkQPayHealth();
  }

  async getTelegramHealth(): Promise<HealthCheck> {
    return this.checkTelegramHealth();
  }

  async getQueueStatus(): Promise<QueueStatusDto> {
    if (!this.paymentQueue) {
      return {
        name: 'payment-processing',
        stats: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        },
        is_healthy: false,
        message: 'Payment queue not initialized',
      };
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.paymentQueue.getWaiting(),
        this.paymentQueue.getActive(),
        this.paymentQueue.getCompleted(),
        this.paymentQueue.getFailed(),
        this.paymentQueue.getDelayed(),
      ]);

      const stats: QueueStatsDto = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
      };

      // Determine queue health
      const failureRate =
        stats.completed > 0 ? stats.failed / (stats.completed + stats.failed) : 0;
      const isHealthy = stats.active >= 0 && failureRate < 0.1; // Less than 10% failure rate

      let message = 'Queue is operating normally';
      if (failureRate >= 0.1) {
        message = `High failure rate: ${(failureRate * 100).toFixed(1)}%`;
      } else if (stats.waiting > 100) {
        message = `High backlog: ${stats.waiting} jobs waiting`;
      }

      return {
        name: 'payment-processing',
        stats,
        is_healthy: isHealthy,
        message,
      };
    } catch (error) {
      this.logger.error('Error getting queue status:', error);
      return {
        name: 'payment-processing',
        stats: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        },
        is_healthy: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Simple query to check database connectivity
      await this.dataSource.query('SELECT 1');

      // Check connection pool status (simplified)
      const poolStatus = {
        is_connected: this.dataSource.isInitialized,
        has_driver: !!this.dataSource.driver,
      };

      return {
        name: 'database',
        status: 'healthy',
        message: 'Database connection is working',
        duration_ms: Date.now() - startTime,
        details: poolStatus,
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: 'Database connection failed',
        duration_ms: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  private async checkRedisHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Perform a simple set/get operation to verify Redis connectivity
      const testKey = 'health:check:ping';
      const testValue = Date.now().toString();

      // Set a value with 10 second TTL
      await this.cacheManager.set(testKey, testValue, 10000);

      // Retrieve the value to confirm round-trip
      const retrieved = await this.cacheManager.get<string>(testKey);

      if (retrieved !== testValue) {
        return {
          name: 'redis',
          status: 'unhealthy',
          message: 'Redis read/write verification failed',
          duration_ms: Date.now() - startTime,
          details: {
            expected: testValue,
            received: retrieved,
          },
        };
      }

      // Clean up test key
      await this.cacheManager.del(testKey);

      return {
        name: 'redis',
        status: 'healthy',
        message: 'Redis connection is working',
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Redis health check failed', error.stack);

      return {
        name: 'redis',
        status: 'unhealthy',
        message: 'Redis connection failed',
        duration_ms: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  private async checkQPayHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Use the actual QPay authentication service to verify credentials
      const isHealthy = await this.qpayAuthService.healthCheck();

      if (isHealthy) {
        return {
          name: 'qpay',
          status: 'healthy',
          message: 'QPay authentication successful',
          duration_ms: Date.now() - startTime,
          details: {
            base_url: process.env.QPAY_BASE_URL,
            environment: process.env.QPAY_ENV || 'development',
            terminal_id: process.env.QPAY_TERMINAL_ID,
          },
        };
      }

      return {
        name: 'qpay',
        status: 'unhealthy',
        message: 'QPay authentication failed - check credentials',
        duration_ms: Date.now() - startTime,
        details: {
          base_url: process.env.QPAY_BASE_URL,
          hint: 'Verify QPAY_USERNAME, QPAY_PASSWORD, and QPAY_TERMINAL_ID in .env',
        },
      };
    } catch (error) {
      this.logger.error('QPay health check error:', error.stack);

      return {
        name: 'qpay',
        status: 'unhealthy',
        message: 'QPay health check failed',
        duration_ms: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  private async checkTelegramHealth(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      // Get a sample bot to test Telegram API connectivity
      const sampleProject = await this.projectRepository.findOne({
        where: { is_active: true },
      });

      if (!sampleProject) {
        return {
          name: 'telegram',
          status: 'healthy',
          message: 'No active projects configured, skipping check',
          duration_ms: Date.now() - startTime,
        };
      }

      // Try to verify bot token to check Telegram API connectivity
      const projectInfo = await this.telegramApiService.verifyBotToken(
        sampleProject.bot_token,
      );

      return {
        name: 'telegram',
        status: projectInfo ? 'healthy' : 'unhealthy',
        message: projectInfo
          ? 'Telegram API is reachable'
          : 'Telegram API connectivity issue',
        duration_ms: Date.now() - startTime,
        details: projectInfo
          ? {
              bot_id: projectInfo.id,
              bot_username: projectInfo.username,
            }
          : undefined,
      };
    } catch (error) {
      return {
        name: 'telegram',
        status: 'unhealthy',
        message: 'Telegram API check failed',
        duration_ms: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }
}
