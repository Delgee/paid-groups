import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotConfiguration } from '../entities/bot-configuration.entity';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';
import { PaymentTransactionService } from '../../payment/services/payment-transaction.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TelegramBotHandlerService, BotConfiguration as TelegramBotConfig } from '../../../integrations/telegram/telegram-bot-handler.service';

/**
 * TelegramBotHandler (Legacy)
 *
 * @deprecated This handler is for legacy BotConfiguration entities.
 * New implementations should use Project entities and ProjectBotHandler.
 * Uses centralized TelegramBotHandlerService for bot instance management.
 */
@Injectable()
export class TelegramBotHandler implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotHandler.name);

  constructor(
    @InjectRepository(BotConfiguration)
    private readonly botConfigRepository: Repository<BotConfiguration>,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly paymentTransactionService: PaymentTransactionService,
    @InjectQueue('membership') private membershipQueue: Queue,
    private readonly telegramBotHandler: TelegramBotHandlerService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Telegram bots...');
    // Don't block app startup - initialize bots in background
    this.initializeBots().catch((error) => {
      this.logger.error('Failed to initialize bots during startup', error.stack);
    });
  }

  async initializeBots() {
    try {
      const activeBots = await this.botConfigRepository.find({
        where: { is_active: true },
      });

      for (const botConfig of activeBots) {
        await this.createBotInstance(botConfig);
      }

      this.logger.log(`Initialized ${activeBots.length} active bots`);
    } catch (error) {
      this.logger.error('Failed to initialize bots', error.stack);
    }
  }

  async createBotInstance(botConfig: BotConfiguration): Promise<void> {
    try {
      const config: TelegramBotConfig = {
        id: botConfig.id,
        botToken: botConfig.bot_token,
        botUsername: botConfig.bot_username,
        welcomeMessage: botConfig.welcome_message,
        tenantId: botConfig.tenant_id,
      };

      // Register command handlers
      this.telegramBotHandler.registerCommandHandler(
        botConfig.id,
        'start',
        (ctx) => this.handleStartCommand(ctx, botConfig)
      );

      this.telegramBotHandler.registerCommandHandler(
        botConfig.id,
        'buy',
        (ctx) => this.handleBuyCommand(ctx, botConfig)
      );

      this.telegramBotHandler.registerCommandHandler(
        botConfig.id,
        'status',
        (ctx) => this.handleStatusCommand(ctx, botConfig)
      );

      // Register callback query handlers
      this.telegramBotHandler.registerCallbackQueryHandler(
        botConfig.id,
        'show_plans',
        (ctx) => this.handleBuyCommand(ctx, botConfig)
      );

      this.telegramBotHandler.registerCallbackQueryHandler(
        botConfig.id,
        'my_status',
        (ctx) => this.handleStatusCommand(ctx, botConfig)
      );

      this.telegramBotHandler.registerCallbackQueryHandler(
        botConfig.id,
        /^buy_plan_/,
        async (ctx, _config, data) => {
          const planId = data.replace('buy_plan_', '');
          const telegramUserId = ctx.from?.id.toString();
          if (telegramUserId) {
            await this.initiatePayment(ctx, botConfig, planId, telegramUserId);
          }
        }
      );

      // Create and launch bot instance
      await this.telegramBotHandler.createBotInstance(config);

      this.logger.log(`Bot @${botConfig.bot_username} launched successfully`);
    } catch (error) {
      this.logger.error(`Failed to create bot instance for ${botConfig.bot_username}`, error.stack);
    }
  }

  async handleStartCommand(ctx: Context, botConfig: BotConfiguration) {
    try {
      const telegramUserId = ctx.from.id.toString();
      const userName = ctx.from.first_name;

      this.logger.log(`Start command from user ${telegramUserId} on bot ${botConfig.bot_username}`);

      // Send welcome message
      await ctx.reply(
        botConfig.welcome_message.replace('{name}', userName),
        Markup.inlineKeyboard([
          [Markup.button.callback('🛒 View Plans', 'show_plans')],
          [Markup.button.callback('📊 My Status', 'my_status')],
        ])
      );
    } catch (error) {
      this.logger.error('Error handling start command', error.stack);
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  async handleBuyCommand(ctx: Context, botConfig: BotConfiguration) {
    try {
      const telegramUserId = ctx.from.id.toString();

      // Fetch active membership plans for this bot
      const plans = await this.membershipPlanService.findActiveByBot(
        botConfig.tenant_id,
        botConfig.id
      );

      if (plans.length === 0) {
        await ctx.reply('No membership plans are currently available. Please check back later.');
        return;
      }

      // Create inline keyboard with plan options
      const keyboard = plans.map((plan) => [
        Markup.button.callback(
          `${plan.name} - ${plan.price_mnt.toLocaleString()} MNT (${plan.duration_days} days)`,
          `buy_plan_${plan.id}`
        ),
      ]);

      await ctx.reply(
        '🎯 *Choose a Membership Plan:*\n\nSelect a plan to get started with premium access!',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(keyboard),
        }
      );

      this.logger.log(`Showed ${plans.length} plans to user ${telegramUserId}`);
    } catch (error) {
      this.logger.error('Error handling buy command', error.stack);
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  async handleStatusCommand(ctx: Context, botConfig: BotConfiguration) {
    try {
      const telegramUserId = ctx.from.id.toString();

      // TODO: Check user's active memberships
      // const activeMemberships = await this.channelMemberService.findByTelegramUser(
      //   botConfig.tenant_id,
      //   telegramUserId,
      //   botConfig.channel_id
      // );

      await ctx.reply(
        '📊 *Your Membership Status*\n\n' +
        'Status: Checking...\n' +
        'Use /buy to purchase a membership plan.',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error('Error handling status command', error.stack);
      await ctx.reply('An error occurred. Please try again later.');
    }
  }


  async initiatePayment(
    ctx: Context,
    botConfig: BotConfiguration,
    planId: string,
    telegramUserId: string
  ) {
    try {
      // Get plan details
      const plan = await this.membershipPlanService.findOne(botConfig.tenant_id, planId);

      if (!plan.is_active) {
        await ctx.reply('This plan is no longer available. Please choose another plan.');
        return;
      }

      // Create payment transaction
      const result = await this.paymentTransactionService.initiatePayment(
        botConfig.tenant_id,
        {
          membership_plan_id: plan.id,
          project_id: botConfig.id, // Using bot_configuration_id as project_id for legacy compatibility
          telegram_user_id: telegramUserId,
          telegram_username: ctx.from.username,
          telegram_first_name: ctx.from.first_name,
          telegram_last_name: ctx.from.last_name,
          amount: plan.price_mnt,
          snapshot_plan_name: plan.name,
          snapshot_price: plan.price_mnt,
          snapshot_duration_days: plan.duration_days,
        }
      );

      this.logger.log(`Payment initiated for user ${telegramUserId}, transaction ${result.transaction.id}`);

      // Send payment link to user
      await ctx.reply(
        `💳 *Payment for ${plan.name}*\n\n` +
        `Price: ${plan.price_mnt.toLocaleString()} MNT\n` +
        `Duration: ${plan.duration_days} days\n\n` +
        `Click the button below to complete your payment:`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('💰 Pay Now', result.payment_link)],
          ]),
        }
      );
    } catch (error) {
      this.logger.error('Error initiating payment', error.stack);
      await ctx.reply(
        '❌ Failed to initiate payment. Please try again or contact support.'
      );
    }
  }

  async stopBot(botConfigId: string) {
    await this.telegramBotHandler.stopBot(botConfigId);
    this.logger.log(`Bot ${botConfigId} stopped`);
  }

  async restartBot(botConfig: BotConfiguration) {
    await this.stopBot(botConfig.id);
    await this.createBotInstance(botConfig);
  }

  getBotInstance(botConfigId: string) {
    return this.telegramBotHandler.getBotInstance(botConfigId);
  }
}
