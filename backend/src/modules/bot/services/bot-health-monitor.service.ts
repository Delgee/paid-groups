import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Telegraf } from 'telegraf';
import { TelegramBot } from '../entities/telegram-bot.entity';
import { EncryptionService } from '../../../common/services/encryption.service';
import { HealthCheck, BotHealthStatus, SecurityAlert } from '../dto/bot-validation.dto';

@Injectable()
export class BotHealthMonitorService {
  private readonly logger = new Logger(BotHealthMonitorService.name);
  private readonly healthCache = new Map<string, BotHealthStatus>();

  constructor(
    @InjectRepository(TelegramBot)
    private botRepository: Repository<TelegramBot>,
    private encryptionService: EncryptionService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorAllBots() {
    this.logger.log('Starting scheduled bot health monitoring...');

    const activeBots = await this.botRepository.find({
      where: { is_active: true },
      relations: ['tenant']
    });

    const monitoringPromises = activeBots.map(bot =>
      this.monitorBotHealth(bot.id, bot).catch(error => {
        this.logger.error(`Failed to monitor bot ${bot.id}:`, error);
      })
    );

    await Promise.allSettled(monitoringPromises);

    this.logger.log(`Completed health monitoring for ${activeBots.length} bots`);
  }

  async monitorBotHealth(botId: string, bot?: TelegramBot): Promise<BotHealthStatus> {
    try {
      if (!bot) {
        bot = await this.botRepository.findOne({
          where: { id: botId },
          relations: ['tenant']
        });
      }

      if (!bot) {
        throw new Error(`Bot ${botId} not found`);
      }

      const decryptedToken = this.encryptionService.decrypt(bot.bot_token);
      const telegrafBot = new Telegraf(decryptedToken);

      // Run all health checks in parallel
      const [respondingCheck, webhookCheck, activityCheck] = await Promise.allSettled([
        this.checkBotResponding(telegrafBot),
        this.checkWebhookDelivery(telegrafBot, bot),
        this.checkLastActivity(bot)
      ]);

      const responding = respondingCheck.status === 'fulfilled' ? respondingCheck.value : { healthy: false, error: 'Health check failed' };
      const webhook = webhookCheck.status === 'fulfilled' ? webhookCheck.value : { healthy: false, error: 'Webhook check failed' };
      const activity = activityCheck.status === 'fulfilled' ? activityCheck.value : { healthy: false, error: 'Activity check failed' };

      // Determine overall health status
      const overallHealthy = responding.healthy && webhook.healthy && activity.healthy;
      const degraded = (!responding.healthy || !webhook.healthy || !activity.healthy) &&
                      (responding.healthy || webhook.healthy || activity.healthy);

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (overallHealthy) {
        status = 'healthy';
      } else if (degraded) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      const healthStatus: BotHealthStatus = {
        botId: bot.id,
        status,
        lastCheck: new Date(),
        checks: { responding, webhook, activity },
        alerts: []
      };

      // Store in cache
      this.healthCache.set(botId, healthStatus);

      // Handle unhealthy bots
      if (status === 'unhealthy') {
        await this.handleUnhealthyBot(bot, healthStatus);
      }

      return healthStatus;
    } catch (error) {
      this.logger.error(`Bot health monitoring failed for ${botId}:`, error);

      const healthStatus: BotHealthStatus = {
        botId,
        status: 'unhealthy',
        lastCheck: new Date(),
        checks: {
          responding: { healthy: false, error: error.message },
          webhook: { healthy: false, error: 'Could not check webhook' },
          activity: { healthy: false, error: 'Could not check activity' }
        },
        alerts: [{
          type: 'TOKEN_REVOKED',
          message: `Bot monitoring failed: ${error.message}`,
          severity: 'CRITICAL',
          timestamp: new Date()
        }]
      };

      this.healthCache.set(botId, healthStatus);
      return healthStatus;
    }
  }

  private async checkBotResponding(bot: Telegraf): Promise<HealthCheck> {
    try {
      const info = await bot.telegram.getMe();
      return {
        healthy: true,
        timestamp: new Date()
      };
    } catch (error) {
      let errorMessage = error.message;

      if (error.response?.error_code === 401) {
        errorMessage = 'Bot token is invalid or revoked';
      } else if (error.response?.error_code === 429) {
        errorMessage = 'Rate limited by Telegram API';
      }

      return {
        healthy: false,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  private async checkWebhookDelivery(bot: Telegraf, botEntity: TelegramBot): Promise<HealthCheck> {
    try {
      const webhookInfo = await bot.telegram.getWebhookInfo();

      // Check if webhook URL matches expected
      const expectedWebhookPattern = `/webhooks/telegram/${botEntity.tenant_id}/${botEntity.id}`;
      const webhookMatches = webhookInfo.url?.includes(expectedWebhookPattern);

      if (!webhookMatches && webhookInfo.url) {
        return {
          healthy: false,
          error: 'Webhook URL does not match expected pattern',
          timestamp: new Date()
        };
      }

      // Check for recent webhook errors
      if (webhookInfo.last_error_date) {
        const errorAge = Date.now() - webhookInfo.last_error_date * 1000;
        if (errorAge < 300000) { // Error in last 5 minutes
          return {
            healthy: false,
            error: webhookInfo.last_error_message,
            pending_updates: webhookInfo.pending_update_count,
            timestamp: new Date()
          };
        }
      }

      // Check for excessive pending updates
      if (webhookInfo.pending_update_count > 100) {
        return {
          healthy: false,
          error: `High pending updates count: ${webhookInfo.pending_update_count}`,
          pending_updates: webhookInfo.pending_update_count,
          timestamp: new Date()
        };
      }

      return {
        healthy: true,
        pending_updates: webhookInfo.pending_update_count,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        error: `Webhook check failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async checkLastActivity(bot: TelegramBot): Promise<HealthCheck> {
    try {
      // Check when the bot was last updated (this indicates recent activity)
      const lastActivity = bot.updated_at;
      const now = new Date();
      const timeSinceActivity = now.getTime() - lastActivity.getTime();

      // Consider bot inactive if no activity for more than 24 hours
      const maxInactivity = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (timeSinceActivity > maxInactivity) {
        return {
          healthy: false,
          error: `No activity detected for ${Math.round(timeSinceActivity / (60 * 60 * 1000))} hours`,
          timestamp: new Date()
        };
      }

      return {
        healthy: true,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        error: `Activity check failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  private async handleUnhealthyBot(bot: TelegramBot, healthStatus: BotHealthStatus): Promise<void> {
    this.logger.warn(`Bot ${bot.id} is unhealthy:`, healthStatus);

    // Check if token is revoked
    const tokenRevoked = healthStatus.checks.responding.error?.includes('invalid or revoked');

    if (tokenRevoked) {
      // Mark bot as inactive but don't delete it
      const updatedSettings = {
        ...bot.settings,
        health_status: 'token_revoked',
        last_health_check: new Date().toISOString(),
        deactivated_at: new Date().toISOString(),
        deactivation_reason: 'Token revoked or invalid'
      };

      await this.botRepository.update(bot.id, {
        is_active: false,
        settings: updatedSettings as Record<string, any>
      });

      this.logger.warn(`Bot ${bot.id} marked as inactive due to token revocation`);
    }

    // TODO: Send notification to tenant about bot health issues
    // This could be implemented as an event or notification service call
  }

  getBotHealthStatus(botId: string): BotHealthStatus | null {
    return this.healthCache.get(botId) || null;
  }

  async getAllBotsHealthStatus(tenantId: string): Promise<BotHealthStatus[]> {
    const tenantBots = await this.botRepository.find({
      where: { tenant_id: tenantId },
      select: ['id']
    });

    return tenantBots
      .map(bot => this.healthCache.get(bot.id))
      .filter((status): status is BotHealthStatus => status !== undefined);
  }

  async forceHealthCheck(botId: string): Promise<BotHealthStatus> {
    const bot = await this.botRepository.findOne({
      where: { id: botId },
      relations: ['tenant']
    });

    if (!bot) {
      throw new Error(`Bot ${botId} not found`);
    }

    return await this.monitorBotHealth(botId, bot);
  }

  getHealthSummary(tenantId?: string): { healthy: number; degraded: number; unhealthy: number; total: number } {
    let statuses: BotHealthStatus[];

    if (tenantId) {
      statuses = Array.from(this.healthCache.values()).filter(status => {
        // This is not ideal - we'd need to store tenantId in health status
        // For now, we'll return all statuses
        return true;
      });
    } else {
      statuses = Array.from(this.healthCache.values());
    }

    return {
      healthy: statuses.filter(s => s.status === 'healthy').length,
      degraded: statuses.filter(s => s.status === 'degraded').length,
      unhealthy: statuses.filter(s => s.status === 'unhealthy').length,
      total: statuses.length
    };
  }
}