import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { TelegramBot } from '../entities/telegram-bot.entity';
import { BotValidationResult } from '../dto/bot-validation.dto';
import { EncryptionService } from '../../../common/services/encryption.service';

@Injectable()
export class BotValidationService {
  private readonly logger = new Logger(BotValidationService.name);

  constructor(
    @InjectRepository(TelegramBot)
    private botRepository: Repository<TelegramBot>,
    private encryptionService: EncryptionService,
    private configService: ConfigService,
  ) {}

  async validateBotToken(token: string): Promise<BotValidationResult> {
    try {
      // 1. Check token format
      if (!this.isValidTokenFormat(token)) {
        return { valid: false, error: 'Invalid token format. Expected format: {bot_id}:{auth_hash}' };
      }

      // 2. Test API call - Get bot info
      const bot = new Telegraf(token);
      const botInfo = await bot.telegram.getMe();

      // 3. Verify bot permissions and capabilities
      const permissions = await this.checkBotPermissions(bot);

      // 4. Test webhook capability
      const webhookTest = await this.testWebhookCapability(bot);

      // 5. Check if bot is already in use
      const existing = await this.checkBotNotInUse(botInfo.id.toString());
      if (existing) {
        return {
          valid: false,
          error: `Bot @${botInfo.username} is already registered by another tenant`
        };
      }

      // 6. Verify bot can receive updates
      await this.verifyBotCanReceiveUpdates(bot);

      return {
        valid: true,
        botInfo: {
          id: botInfo.id,
          username: botInfo.username || 'unknown',
          first_name: botInfo.first_name,
          can_join_groups: botInfo.can_join_groups || false,
          can_read_all_group_messages: botInfo.can_read_all_group_messages || false,
          supports_inline_queries: botInfo.supports_inline_queries || false
        },
        permissions,
        webhookCapable: webhookTest.success
      };
    } catch (error) {
      return this.handleValidationError(error);
    }
  }

  private isValidTokenFormat(token: string): boolean {
    // Telegram bot token format: {bot_id}:{auth_hash}
    const tokenRegex = /^\d+:[A-Za-z0-9_-]{35}$/;
    return tokenRegex.test(token);
  }

  private async checkBotPermissions(bot: Telegraf) {
    try {
      // Check what the bot can do
      const commands = await bot.telegram.getMyCommands();

      let adminRights = null;
      try {
        adminRights = await bot.telegram.getMyDefaultAdministratorRights();
      } catch (error) {
        // Not all bots support this, it's optional
        this.logger.debug('Bot does not support administrator rights API');
      }

      return {
        has_commands: commands.length > 0,
        admin_rights: adminRights,
        webhook_set: false // Will check separately
      };
    } catch (error) {
      return { error: `Failed to check permissions: ${error.message}` };
    }
  }

  private async testWebhookCapability(bot: Telegraf): Promise<{ success: boolean; current_webhook?: string; pending_updates?: number; error?: string }> {
    try {
      // Check current webhook status
      const webhookInfo = await bot.telegram.getWebhookInfo();

      // Generate test webhook URL
      const baseUrl = this.configService.get<string>('BASE_URL') || 'https://example.com';
      const testUrl = `${baseUrl}/webhooks/test/${Date.now()}`;

      // Try to set webhook
      await bot.telegram.setWebhook(testUrl);

      // Verify it was set
      const verifyWebhook = await bot.telegram.getWebhookInfo();
      const webhookSet = verifyWebhook.url === testUrl;

      // Clean up - remove test webhook
      await bot.telegram.deleteWebhook();

      return {
        success: webhookSet,
        current_webhook: webhookInfo.url,
        pending_updates: webhookInfo.pending_update_count
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async verifyBotCanReceiveUpdates(bot: Telegraf): Promise<void> {
    try {
      // Check for pending updates without long polling
      await bot.telegram.getUpdates(1, 1, 0, undefined);
    } catch (error) {
      // If unauthorized, token is invalid
      if (error.response?.error_code === 401) {
        throw new Error('Bot token is invalid or has been revoked');
      }
      if (error.response?.error_code === 403) {
        throw new Error('Bot token access forbidden - bot may be blocked');
      }
      // Other errors are acceptable for this test
    }
  }

  private async checkBotNotInUse(botId: string): Promise<TelegramBot | null> {
    // Check if any bot with this ID already exists
    const existingBot = await this.botRepository.findOne({
      where: {
        bot_token: botId // We'll need to update this to search by bot_id
      },
      relations: ['tenant']
    });

    return existingBot;
  }

  private handleValidationError(error: any): BotValidationResult {
    this.logger.error('Bot validation error:', error);

    // Handle specific Telegram API errors
    if (error.response?.error_code === 401) {
      return { valid: false, error: 'Invalid or revoked bot token' };
    }
    if (error.response?.error_code === 404) {
      return { valid: false, error: 'Bot not found. Please check your token.' };
    }
    if (error.response?.error_code === 429) {
      return { valid: false, error: 'Rate limited by Telegram API. Please try again later.' };
    }
    if (error.code === 'ETIMEOUT' || error.code === 'ENOTFOUND') {
      return { valid: false, error: 'Network error connecting to Telegram API' };
    }

    return { valid: false, error: `Validation failed: ${error.message}` };
  }

  async validateExistingBot(botId: string): Promise<BotValidationResult> {
    try {
      const bot = await this.botRepository.findOne({
        where: { id: botId },
        relations: ['tenant']
      });

      if (!bot) {
        return { valid: false, error: 'Bot not found' };
      }

      // Decrypt and validate the stored token
      const decryptedToken = this.encryptionService.decrypt(bot.bot_token);
      return await this.validateBotToken(decryptedToken);
    } catch (error) {
      this.logger.error(`Failed to validate existing bot ${botId}:`, error);
      return { valid: false, error: `Failed to validate bot: ${error.message}` };
    }
  }

  async getBotInfo(token: string): Promise<any> {
    try {
      const bot = new Telegraf(token);
      return await bot.telegram.getMe();
    } catch (error) {
      this.logger.error('Failed to get bot info:', error);
      throw error;
    }
  }

  async setupBotWebhook(token: string, tenantId: string, botId: string, webhookSecret: string): Promise<boolean> {
    try {
      const bot = new Telegraf(token);
      const baseUrl = this.configService.get<string>('BASE_URL');
      const webhookUrl = `${baseUrl}/webhooks/telegram/${tenantId}/${botId}`;

      await bot.telegram.setWebhook(webhookUrl, {
        secret_token: webhookSecret,
        allowed_updates: ['message', 'callback_query', 'chat_member', 'my_chat_member'],
        drop_pending_updates: true, // Clear any pending updates
      });

      this.logger.log(`Webhook set for bot ${botId}: ${webhookUrl}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set webhook for bot ${botId}:`, error);
      return false;
    }
  }

  async removeWebhook(token: string): Promise<boolean> {
    try {
      const bot = new Telegraf(token);
      await bot.telegram.deleteWebhook({ drop_pending_updates: true });
      this.logger.log('Webhook removed successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to remove webhook:', error);
      return false;
    }
  }
}