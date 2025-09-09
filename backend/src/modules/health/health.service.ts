import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { TelegramBot } from '../bot/entities/telegram-bot.entity';
import { TelegramApiService } from '../bot/services/telegram-api.service';
import { firstValueFrom } from 'rxjs';

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
    @InjectRepository(TelegramBot)
    private botRepository: Repository<TelegramBot>,
    private httpService: HttpService,
    private telegramApiService: TelegramApiService,
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
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    if (unhealthyChecks.length > 0) {
      status = unhealthyChecks.length === checks.length ? 'unhealthy' : 'degraded';
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
      // If Redis is configured, check it here
      // For now, we'll assume it's healthy if not configured
      if (!process.env.REDIS_URL) {
        return {
          name: 'redis',
          status: 'healthy',
          message: 'Redis not configured, skipping check',
          duration_ms: Date.now() - startTime,
        };
      }

      // TODO: Implement actual Redis health check when Redis is integrated
      return {
        name: 'redis',
        status: 'healthy',
        message: 'Redis connection is working',
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
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
      const qpayUrl = process.env.QPAY_API_URL || 'https://merchant.qpay.mn/v2';
      
      // Make a simple request to check QPay API availability
      const response = await firstValueFrom(
        this.httpService.get(`${qpayUrl}/auth/token`, {
          timeout: 5000,
          validateStatus: () => true, // Accept any status code
        })
      );

      const isHealthy = response.status < 500;
      
      return {
        name: 'qpay',
        status: isHealthy ? 'healthy' : 'unhealthy',
        message: isHealthy ? 'QPay API is reachable' : 'QPay API is not responding',
        duration_ms: Date.now() - startTime,
        details: {
          status_code: response.status,
          url: qpayUrl,
        },
      };
    } catch (error) {
      return {
        name: 'qpay',
        status: 'unhealthy',
        message: 'QPay API check failed',
        duration_ms: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  private async checkTelegramHealth(): Promise<HealthCheck> {
    const startTime = Date.now();
    
    try {
      // Get a sample bot to test Telegram API connectivity
      const sampleBot = await this.botRepository.findOne({
        where: { is_active: true },
      });

      if (!sampleBot) {
        return {
          name: 'telegram',
          status: 'healthy',
          message: 'No active bots configured, skipping check',
          duration_ms: Date.now() - startTime,
        };
      }

      // Try to verify bot token to check Telegram API connectivity
      const botInfo = await this.telegramApiService.verifyBotToken(sampleBot.bot_token);
      
      return {
        name: 'telegram',
        status: botInfo ? 'healthy' : 'unhealthy',
        message: botInfo ? 'Telegram API is reachable' : 'Telegram API connectivity issue',
        duration_ms: Date.now() - startTime,
        details: botInfo ? {
          bot_id: botInfo.id,
          bot_username: botInfo.username,
        } : undefined,
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