import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf, Context, Markup } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotConfiguration } from '../entities/bot-configuration.entity';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';
import { PaymentTransactionService } from '../../payment/services/payment-transaction.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class TelegramBotHandler implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotHandler.name);
  private bots: Map<string, Telegraf> = new Map();

  constructor(
    @InjectRepository(BotConfiguration)
    private readonly botConfigRepository: Repository<BotConfiguration>,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly paymentTransactionService: PaymentTransactionService,
    @InjectQueue('membership') private membershipQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Telegram bots...');
    await this.initializeBots();
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
      const bot = new Telegraf(botConfig.bot_token);

      // Start command handler
      bot.start(async (ctx) => {
        await this.handleStartCommand(ctx, botConfig);
      });

      // Buy command handler
      bot.command('buy', async (ctx) => {
        await this.handleBuyCommand(ctx, botConfig);
      });

      // My membership command handler
      bot.command('status', async (ctx) => {
        await this.handleStatusCommand(ctx, botConfig);
      });

      // Callback query handler for plan selection
      bot.on('callback_query', async (ctx) => {
        await this.handleCallbackQuery(ctx, botConfig);
      });

      // Launch bot
      await bot.launch();
      this.bots.set(botConfig.id, bot);

      this.logger.log(`Bot @${botConfig.bot_username} launched successfully`);

      // Enable graceful stop
      process.once('SIGINT', () => bot.stop('SIGINT'));
      process.once('SIGTERM', () => bot.stop('SIGTERM'));
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
          `${plan.name} - ${plan.price.toLocaleString()} MNT (${plan.duration_days} days)`,
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

  async handleCallbackQuery(ctx: Context, botConfig: BotConfiguration) {
    try {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const data = ctx.callbackQuery.data;
      const telegramUserId = ctx.from.id.toString();

      await ctx.answerCbQuery();

      if (data === 'show_plans') {
        await this.handleBuyCommand(ctx, botConfig);
        return;
      }

      if (data === 'my_status') {
        await this.handleStatusCommand(ctx, botConfig);
        return;
      }

      if (data.startsWith('buy_plan_')) {
        const planId = data.replace('buy_plan_', '');
        await this.initiatePayment(ctx, botConfig, planId, telegramUserId);
        return;
      }
    } catch (error) {
      this.logger.error('Error handling callback query', error.stack);
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
          bot_configuration_id: botConfig.id,
          telegram_user_id: telegramUserId,
          telegram_username: ctx.from.username,
          telegram_first_name: ctx.from.first_name,
          telegram_last_name: ctx.from.last_name,
          amount: plan.price,
          snapshot_plan_name: plan.name,
          snapshot_price: plan.price,
          snapshot_duration_days: plan.duration_days,
        }
      );

      this.logger.log(`Payment initiated for user ${telegramUserId}, transaction ${result.transaction.id}`);

      // Send payment link to user
      await ctx.reply(
        `💳 *Payment for ${plan.name}*\n\n` +
        `Price: ${plan.price.toLocaleString()} MNT\n` +
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
    const bot = this.bots.get(botConfigId);
    if (bot) {
      bot.stop();
      this.bots.delete(botConfigId);
      this.logger.log(`Bot ${botConfigId} stopped`);
    }
  }

  async restartBot(botConfig: BotConfiguration) {
    await this.stopBot(botConfig.id);
    await this.createBotInstance(botConfig);
  }

  getBotInstance(botConfigId: string): Telegraf | undefined {
    return this.bots.get(botConfigId);
  }
}
