import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramApiService } from '../../integrations/telegram/telegram-api.service';

interface BotWebhookConfig {
  name: string;
  tokenEnvVar: string;
  webhookPath: string;
}

interface WebhookHealthStatus {
  botName: string;
  configured: boolean;
  expectedUrl: string;
  actualUrl: string;
  needsUpdate: boolean;
  error?: string;
}

@Injectable()
export class GlobalBotWebhookService implements OnModuleInit {
  private readonly logger = new Logger(GlobalBotWebhookService.name);
  private readonly bots: BotWebhookConfig[] = [
    {
      name: 'Onboarding Bot',
      tokenEnvVar: 'TELEGRAM_ONBOARDING_BOT_TOKEN',
      webhookPath: '/v1/onboarding-bot/webhook',
    },
    {
      name: 'Channel ID Bot',
      tokenEnvVar: 'TELEGRAM_CHANNEL_ID_BOT_TOKEN',
      webhookPath: '/v1/channel-id-bot/webhook',
    },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly telegramApiService: TelegramApiService,
  ) {}

  async onModuleInit() {
    const healthCheckEnabled = this.configService.get('WEBHOOK_HEALTH_CHECK_ON_STARTUP', 'true') === 'true';
    const autoFixEnabled = this.configService.get('WEBHOOK_AUTO_FIX_ON_STARTUP', 'true') === 'true';

    if (!healthCheckEnabled) {
      this.logger.log('Webhook health check disabled via WEBHOOK_HEALTH_CHECK_ON_STARTUP');
      return;
    }

    this.logger.log('Starting global bot webhook health check...');

    const results = await this.checkAllBotWebhooks();

    // Log results
    for (const result of results) {
      if (result.error) {
        this.logger.error(`${result.botName}: ${result.error}`);
      } else if (result.needsUpdate) {
        this.logger.warn(`${result.botName}: Webhook mismatch detected`);
        this.logger.warn(`  Expected: ${result.expectedUrl}`);
        this.logger.warn(`  Actual:   ${result.actualUrl}`);

        if (autoFixEnabled) {
          await this.fixWebhook(result);
        } else {
          this.logger.warn(`  Auto-fix disabled. Set WEBHOOK_AUTO_FIX_ON_STARTUP=true to enable`);
        }
      } else {
        this.logger.log(`${result.botName}: Webhook OK ✓`);
      }
    }

    this.logger.log('Global bot webhook health check complete');
  }

  /**
   * Check webhook status for all configured bots
   */
  async checkAllBotWebhooks(): Promise<WebhookHealthStatus[]> {
    const results: WebhookHealthStatus[] = [];

    for (const bot of this.bots) {
      const status = await this.checkBotWebhook(bot);
      results.push(status);
    }

    return results;
  }

  /**
   * Check webhook status for a specific bot
   */
  private async checkBotWebhook(bot: BotWebhookConfig): Promise<WebhookHealthStatus> {
    const token = this.configService.get(bot.tokenEnvVar);

    if (!token) {
      return {
        botName: bot.name,
        configured: false,
        expectedUrl: '',
        actualUrl: '',
        needsUpdate: false,
        error: `Bot token not configured (${bot.tokenEnvVar})`,
      };
    }

    const baseUrl = this.configService.get('BASE_URL');
    if (!baseUrl) {
      return {
        botName: bot.name,
        configured: false,
        expectedUrl: '',
        actualUrl: '',
        needsUpdate: false,
        error: 'BASE_URL not configured',
      };
    }

    const expectedUrl = `${baseUrl}${bot.webhookPath}/${token}`;

    try {
      const webhookInfo = await this.getWebhookInfo(token);
      const actualUrl = webhookInfo.url || '';

      return {
        botName: bot.name,
        configured: !!actualUrl,
        expectedUrl,
        actualUrl,
        needsUpdate: actualUrl !== expectedUrl,
      };
    } catch (error) {
      return {
        botName: bot.name,
        configured: false,
        expectedUrl,
        actualUrl: '',
        needsUpdate: false,
        error: `Failed to check webhook: ${error.message}`,
      };
    }
  }

  /**
   * Get webhook info from Telegram
   */
  private async getWebhookInfo(botToken: string): Promise<{ url: string }> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getWebhookInfo`,
      );
      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Failed to get webhook info');
      }

      return data.result;
    } catch (error) {
      this.logger.error(`Failed to get webhook info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fix mismatched webhook
   */
  private async fixWebhook(status: WebhookHealthStatus): Promise<void> {
    this.logger.log(`Fixing webhook for ${status.botName}...`);

    // Extract token from expected URL
    const token = status.expectedUrl.split('/').pop();

    if (!token) {
      this.logger.error(`Failed to extract token from URL: ${status.expectedUrl}`);
      return;
    }

    try {
      const success = await this.setWebhook(token, status.expectedUrl);

      if (success) {
        this.logger.log(`${status.botName}: Webhook updated successfully ✓`);
      } else {
        this.logger.error(`${status.botName}: Failed to update webhook`);
      }
    } catch (error) {
      this.logger.error(`${status.botName}: Error updating webhook - ${error.message}`);
    }
  }

  /**
   * Set webhook URL for a bot
   */
  private async setWebhook(botToken: string, webhookUrl: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: webhookUrl }),
        },
      );

      const data = await response.json();
      return data.ok;
    } catch (error) {
      this.logger.error(`Failed to set webhook: ${error.message}`);
      return false;
    }
  }

  /**
   * Manual webhook check (can be called from health endpoint)
   */
  async getWebhookHealth(): Promise<WebhookHealthStatus[]> {
    return this.checkAllBotWebhooks();
  }

  /**
   * Manual webhook fix (can be called from admin endpoint)
   */
  async fixAllWebhooks(): Promise<{ fixed: string[]; failed: string[] }> {
    const results = await this.checkAllBotWebhooks();
    const fixed: string[] = [];
    const failed: string[] = [];

    for (const result of results) {
      if (result.needsUpdate && !result.error) {
        await this.fixWebhook(result);

        // Verify fix
        const botConfig = this.bots.find(b => b.name === result.botName);
        if (botConfig) {
          const newStatus = await this.checkBotWebhook(botConfig);
          if (!newStatus.needsUpdate) {
            fixed.push(result.botName);
          } else {
            failed.push(result.botName);
          }
        }
      }
    }

    return { fixed, failed };
  }
}
