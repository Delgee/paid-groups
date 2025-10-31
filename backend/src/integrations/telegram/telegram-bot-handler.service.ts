import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf, Context, Markup } from 'telegraf';
import { TelegramApiService } from './telegram-api.service';

export interface BotConfiguration {
  id: string;
  botToken: string;
  botUsername?: string;
  welcomeMessage?: string;
  tenantId: string;
}

export interface CommandHandler {
  command: string;
  handler: (ctx: Context, config: BotConfiguration) => Promise<void>;
}

export interface CallbackQueryHandler {
  pattern: RegExp | string;
  handler: (ctx: Context, config: BotConfiguration, data: string) => Promise<void>;
}

/**
 * TelegramBotHandlerService
 *
 * Centralized service for managing Telegram bot instances with long-polling.
 * Provides a unified API for:
 * - Creating and managing bot instances
 * - Registering command handlers
 * - Registering callback query handlers
 * - Lifecycle management (start, stop, restart)
 *
 * This service replaces scattered bot handlers across the application.
 */
@Injectable()
export class TelegramBotHandlerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotHandlerService.name);
  private bots: Map<string, Telegraf> = new Map();
  private botConfigs: Map<string, BotConfiguration> = new Map();
  private commandHandlers: Map<string, CommandHandler[]> = new Map();
  private callbackQueryHandlers: Map<string, CallbackQueryHandler[]> = new Map();

  constructor(private readonly telegramApiService: TelegramApiService) {}

  async onModuleInit() {
    this.logger.log('TelegramBotHandlerService initialized');
  }

  async onModuleDestroy() {
    this.logger.log('Stopping all bot instances...');
    await this.stopAllBots();
  }

  /**
   * Register a command handler for a specific bot
   * @param botId - Unique identifier for the bot
   * @param command - Command name (without /)
   * @param handler - Handler function
   */
  registerCommandHandler(
    botId: string,
    command: string,
    handler: (ctx: Context, config: BotConfiguration) => Promise<void>
  ): void {
    if (!this.commandHandlers.has(botId)) {
      this.commandHandlers.set(botId, []);
    }

    this.commandHandlers.get(botId)!.push({ command, handler });
    this.logger.debug(`Registered command handler /${command} for bot ${botId}`);
  }

  /**
   * Register a callback query handler for a specific bot
   * @param botId - Unique identifier for the bot
   * @param pattern - Pattern to match callback data
   * @param handler - Handler function
   */
  registerCallbackQueryHandler(
    botId: string,
    pattern: RegExp | string,
    handler: (ctx: Context, config: BotConfiguration, data: string) => Promise<void>
  ): void {
    if (!this.callbackQueryHandlers.has(botId)) {
      this.callbackQueryHandlers.set(botId, []);
    }

    this.callbackQueryHandlers.get(botId)!.push({ pattern, handler });
    this.logger.debug(`Registered callback query handler for bot ${botId}`);
  }

  /**
   * Create and launch a bot instance with long-polling
   * @param config - Bot configuration
   */
  async createBotInstance(config: BotConfiguration): Promise<void> {
    try {
      // Verify bot token first
      const botInfo = await this.telegramApiService.verifyBotToken(config.botToken);
      if (!botInfo) {
        throw new Error(`Invalid bot token for bot ${config.id}`);
      }

      // Stop existing instance if any
      if (this.bots.has(config.id)) {
        await this.stopBot(config.id);
      }

      const bot = new Telegraf(config.botToken);

      // Register default /start command if not already registered
      const commandHandlers = this.commandHandlers.get(config.id) || [];
      const hasStartCommand = commandHandlers.some(h => h.command === 'start');

      if (!hasStartCommand) {
        bot.start(async (ctx) => {
          await this.handleDefaultStart(ctx, config);
        });
      } else {
        // Register custom command handlers
        for (const { command, handler } of commandHandlers) {
          bot.command(command, async (ctx) => {
            try {
              await handler(ctx, config);
            } catch (error) {
              this.logger.error(`Error handling command /${command}:`, error.stack);
              await ctx.reply('An error occurred. Please try again later.');
            }
          });
        }
      }

      // Register callback query handlers
      bot.on('callback_query', async (ctx) => {
        await this.handleCallbackQuery(ctx, config);
      });

      // Launch bot with long-polling
      await bot.launch();
      this.bots.set(config.id, bot);
      this.botConfigs.set(config.id, config);

      this.logger.log(`Bot @${botInfo.username} (${config.id}) launched successfully`);

      // Enable graceful stop
      process.once('SIGINT', () => bot.stop('SIGINT'));
      process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
      this.logger.error(`Failed to create bot instance for ${config.id}:`, error.stack);
      throw error;
    }
  }

  /**
   * Stop a specific bot instance
   * @param botId - Bot identifier
   */
  async stopBot(botId: string): Promise<void> {
    const bot = this.bots.get(botId);
    if (bot) {
      try {
        bot.stop();
        this.bots.delete(botId);
        this.botConfigs.delete(botId);
        this.logger.log(`Bot ${botId} stopped`);
      } catch (error) {
        this.logger.error(`Failed to stop bot ${botId}:`, error.stack);
      }
    }
  }

  /**
   * Stop all bot instances
   */
  async stopAllBots(): Promise<void> {
    const stopPromises = Array.from(this.bots.keys()).map(botId => this.stopBot(botId));
    await Promise.allSettled(stopPromises);
    this.logger.log('All bots stopped');
  }

  /**
   * Restart a specific bot instance
   * @param config - Updated bot configuration
   */
  async restartBot(config: BotConfiguration): Promise<void> {
    await this.stopBot(config.id);
    await this.createBotInstance(config);
  }

  /**
   * Get bot instance by ID
   * @param botId - Bot identifier
   */
  getBotInstance(botId: string): Telegraf | undefined {
    return this.bots.get(botId);
  }

  /**
   * Get bot configuration by ID
   * @param botId - Bot identifier
   */
  getBotConfig(botId: string): BotConfiguration | undefined {
    return this.botConfigs.get(botId);
  }

  /**
   * Check if bot is running
   * @param botId - Bot identifier
   */
  isBotRunning(botId: string): boolean {
    return this.bots.has(botId);
  }

  /**
   * Get all running bot IDs
   */
  getRunningBots(): string[] {
    return Array.from(this.bots.keys());
  }

  /**
   * Default /start command handler
   */
  private async handleDefaultStart(ctx: Context, config: BotConfiguration): Promise<void> {
    try {
      const userName = ctx.from?.first_name || 'there';
      const welcomeMessage = config.welcomeMessage?.replace('{name}', userName) ||
        `Welcome ${userName}! 👋`;

      await ctx.reply(
        welcomeMessage,
        Markup.inlineKeyboard([
          [Markup.button.callback('ℹ️ Help', 'help')],
        ])
      );
    } catch (error) {
      this.logger.error('Error handling default start command:', error.stack);
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  /**
   * Handle callback queries
   */
  private async handleCallbackQuery(ctx: Context, config: BotConfiguration): Promise<void> {
    try {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const data = ctx.callbackQuery.data;
      await ctx.answerCbQuery();

      // Find matching handler
      const handlers = this.callbackQueryHandlers.get(config.id) || [];

      for (const { pattern, handler } of handlers) {
        let matches = false;

        if (typeof pattern === 'string') {
          matches = data === pattern || data.startsWith(`${pattern}_`);
        } else {
          matches = pattern.test(data);
        }

        if (matches) {
          await handler(ctx, config, data);
          return;
        }
      }

      // Default handler if no match
      await ctx.reply('Unknown action. Please try again.');
    } catch (error) {
      this.logger.error('Error handling callback query:', error.stack);
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  /**
   * Send message using bot instance
   * @param botId - Bot identifier
   * @param chatId - Chat ID
   * @param text - Message text
   * @param options - Additional options
   */
  async sendMessage(
    botId: string,
    chatId: number | string,
    text: string,
    options?: any
  ): Promise<boolean> {
    const config = this.botConfigs.get(botId);
    if (!config) {
      this.logger.error(`Bot configuration not found for ${botId}`);
      return false;
    }

    return this.telegramApiService.sendMessage(config.botToken, chatId, text, options);
  }

  /**
   * Cleanup bot instance from TelegramApiService
   * @param botId - Bot identifier
   */
  cleanupBotInstance(botId: string): void {
    const config = this.botConfigs.get(botId);
    if (config) {
      this.telegramApiService.cleanupBotInstance(config.botToken);
    }
  }
}
