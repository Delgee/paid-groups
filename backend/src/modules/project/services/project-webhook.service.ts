import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { EncryptionService } from '../../../common/services/encryption.service';

export interface WebhookSetupResult {
  success: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  error?: string;
}

/**
 * ProjectWebhookService
 *
 * Handles webhook setup, validation, and management for Project entities.
 * Similar to BotValidationService but specifically for Project module.
 */
@Injectable()
export class ProjectWebhookService {
  private readonly logger = new Logger(ProjectWebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Generate webhook URL for a project
   * Pattern: {BASE_URL}/v1/projects/webhook/{tenantId}/{projectId}
   */
  generateWebhookUrl(tenantId: string, projectId: string): string {
    const baseUrl = this.configService.get<string>('BASE_URL');

    if (!baseUrl) {
      throw new Error('BASE_URL is not configured in environment variables');
    }

    return `${baseUrl}/v1/projects/webhook/${tenantId}/${projectId}`;
  }

  /**
   * Generate a new webhook secret
   */
  generateWebhookSecret(): string {
    return this.encryptionService.generateRandomSecret(32);
  }

  /**
   * Setup webhook with Telegram API
   * Registers the webhook URL with Telegram and configures update filtering
   */
  async setupWebhook(
    botToken: string,
    tenantId: string,
    projectId: string,
    webhookSecret?: string,
  ): Promise<WebhookSetupResult> {
    try {
      const bot = new Telegraf(botToken);
      const webhookUrl = this.generateWebhookUrl(tenantId, projectId);
      const secret = webhookSecret || this.generateWebhookSecret();

      // Set webhook with Telegram API
      await bot.telegram.setWebhook(webhookUrl, {
        secret_token: secret,
        allowed_updates: [
          'message',
          'callback_query',
          'chat_member',
          'my_chat_member',
        ],
        drop_pending_updates: true, // Clear any pending updates
      });

      this.logger.log(`Webhook configured for project ${projectId}: ${webhookUrl}`);

      return {
        success: true,
        webhookUrl,
        webhookSecret: secret,
      };
    } catch (error) {
      this.logger.error(
        `Failed to setup webhook for project ${projectId}: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify webhook is correctly configured with Telegram
   */
  async verifyWebhook(
    botToken: string,
    expectedWebhookUrl: string,
  ): Promise<{ isValid: boolean; currentUrl?: string; error?: string }> {
    try {

      console.log('botToken', botToken);
      console.log('expectedWebhookUrl', expectedWebhookUrl);
      const bot = new Telegraf(botToken);
      const webhookInfo = await bot.telegram.getWebhookInfo();

      // Telegram returns empty string when no webhook is set
      const currentUrl = webhookInfo.url || null;
      const isValid = webhookInfo.url === expectedWebhookUrl;

      if (!isValid) {
        this.logger.warn(
          `Webhook URL mismatch. Expected: ${expectedWebhookUrl}, Got: ${currentUrl || '(not set)'}`,
        );
      }

      return {
        isValid,
        currentUrl: currentUrl,
      };
    } catch (error) {
      this.logger.error(`Failed to verify webhook: ${error.message}`);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove webhook from Telegram
   */
  async removeWebhook(botToken: string): Promise<boolean> {
    try {
      const bot = new Telegraf(botToken);
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });

      this.logger.log('Webhook removed successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove webhook: ${error.message}`);
      return false;
    }
  }

  /**
   * Refresh webhook - generates new secret and re-registers with Telegram
   */
  async refreshWebhook(
    botToken: string,
    tenantId: string,
    projectId: string,
  ): Promise<WebhookSetupResult> {
    this.logger.log(`Refreshing webhook for project ${projectId}`);

    // Generate new secret for security
    const newSecret = this.generateWebhookSecret();

    // Setup webhook with new secret
    return this.setupWebhook(botToken, tenantId, projectId, newSecret);
  }

  /**
   * Check if BASE_URL matches the current configuration
   * Returns true if webhook URL is valid for current BASE_URL
   */
  isWebhookUrlValid(webhookUrl: string): boolean {
    const baseUrl = this.configService.get<string>('BASE_URL');

    if (!baseUrl || !webhookUrl) {
      return false;
    }

    return webhookUrl.startsWith(baseUrl);
  }

  /**
   * Validate webhook secret token from incoming requests
   */
  validateWebhookSecret(
    providedSecret: string,
    storedSecret: string,
  ): boolean {
    if (!providedSecret || !storedSecret) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return this.encryptionService.verifyHash(providedSecret, storedSecret);
  }

  /**
   * Set webhook for any bot (including onboarding bot)
   * Used for webhook health checks and auto-fixing
   */
  async setWebhook(
    botToken: string,
    webhookUrl: string,
  ): Promise<WebhookSetupResult> {
    try {
      const bot = new Telegraf(botToken);

      // Set webhook with Telegram API
      await bot.telegram.setWebhook(webhookUrl, {
        allowed_updates: [
          'message',
          'callback_query',
          'chat_member',
          'my_chat_member',
        ],
        drop_pending_updates: false, // Keep pending updates for onboarding bot
      });

      this.logger.log(`Webhook set successfully: ${webhookUrl}`);

      return {
        success: true,
        webhookUrl,
      };
    } catch (error) {
      this.logger.error(
        `Failed to set webhook: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }
}
