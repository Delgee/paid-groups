import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf, Context, Markup } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';
import { PaymentTransactionService } from '../../payment/services/payment-transaction.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * Project Bot Handler
 *
 * Manages Telegram bot instances for projects.
 * Replaces the old TelegramBotHandler that used BotConfiguration.
 * Handles bot commands, payment initiation, and user interactions.
 */
@Injectable()
export class ProjectBotHandler implements OnModuleInit {
  private readonly logger = new Logger(ProjectBotHandler.name);
  private bots: Map<string, Telegraf> = new Map(); // Map of project_id -> Telegraf instance

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly paymentTransactionService: PaymentTransactionService,
    @InjectQueue('membership') private membershipQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Telegram bots for projects...');
    // Don't block app startup - initialize bots in background
    this.initializeBots().catch((error) => {
      this.logger.error('Failed to initialize project bots during startup', error.stack);
    });
  }

  async initializeBots() {
    try {
      const activeProjects = await this.projectRepository.find({
        where: { is_active: true },
      });

      for (const project of activeProjects) {
        await this.createBotInstance(project);
      }

      this.logger.log(`Initialized ${activeProjects.length} active project bots`);
    } catch (error) {
      this.logger.error('Failed to initialize project bots', error.stack);
    }
  }

  async createBotInstance(project: Project): Promise<void> {
    try {
      const bot = new Telegraf(project.bot_token);

      // Start command handler
      bot.start(async (ctx) => {
        await this.handleStartCommand(ctx, project);
      });

      // Buy command handler
      bot.command('buy', async (ctx) => {
        await this.handleBuyCommand(ctx, project);
      });

      // My membership command handler
      bot.command('status', async (ctx) => {
        await this.handleStatusCommand(ctx, project);
      });

      // Callback query handler for plan selection
      bot.on('callback_query', async (ctx) => {
        await this.handleCallbackQuery(ctx, project);
      });

      // Launch bot
      await bot.launch();
      this.bots.set(project.id, bot);

      this.logger.log(`Project bot @${project.bot_username} launched successfully (project: ${project.id})`);

      // Enable graceful stop
      process.once('SIGINT', () => bot.stop('SIGINT'));
      process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
      this.logger.error(`Failed to create bot instance for project ${project.id} (@${project.bot_username})`, error.stack);
    }
  }

  async handleStartCommand(ctx: Context, project: Project) {
    try {
      const telegramUserId = ctx.from.id.toString();
      const userName = ctx.from.first_name;

      this.logger.log(`Start command from user ${telegramUserId} on project bot ${project.bot_username}`);

      // Send welcome message from project configuration
      await ctx.reply(
        project.welcome_message.replace('{name}', userName),
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

  async handleBuyCommand(ctx: Context, project: Project) {
    try {
      const telegramUserId = ctx.from.id.toString();

      // Fetch active membership plans for this project
      const plans = await this.membershipPlanService.findActiveByProject(
        project.tenant_id,
        project.id
      );

      if (plans.length === 0) {
        await ctx.reply('No membership plans are currently available. Please check back later.');
        return;
      }

      // Create inline keyboard with plan options showing number of groups
      const keyboard = plans.map((plan) => {
        const groupCount = plan.telegram_groups?.length || 0;
        const groupText = groupCount > 0 ? ` • ${groupCount} group${groupCount > 1 ? 's' : ''}` : '';

        return [
          Markup.button.callback(
            `${plan.name} - ${plan.price_mnt.toLocaleString()} MNT (${plan.duration_days} days)${groupText}`,
            `buy_plan_${plan.id}`
          ),
        ];
      });

      await ctx.reply(
        '🎯 *Choose a Membership Plan:*\n\nSelect a plan to get started with premium access!',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(keyboard),
        }
      );

      this.logger.log(`Showed ${plans.length} plans to user ${telegramUserId} on project ${project.id}`);
    } catch (error) {
      this.logger.error('Error handling buy command', error.stack);
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  async handleStatusCommand(ctx: Context, project: Project) {
    try {
      const telegramUserId = ctx.from.id.toString();

      // TODO: Check user's active memberships across all groups in this project
      // const activeMemberships = await this.channelMemberService.findByTelegramUserAndProject(
      //   project.tenant_id,
      //   telegramUserId,
      //   project.id
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

  async handleCallbackQuery(ctx: Context, project: Project) {
    try {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const data = ctx.callbackQuery.data;
      const telegramUserId = ctx.from.id.toString();

      await ctx.answerCbQuery();

      if (data === 'show_plans') {
        await this.handleBuyCommand(ctx, project);
        return;
      }

      if (data === 'my_status') {
        await this.handleStatusCommand(ctx, project);
        return;
      }

      if (data.startsWith('buy_plan_')) {
        const planId = data.replace('buy_plan_', '');
        await this.initiatePayment(ctx, project, planId, telegramUserId);
        return;
      }
    } catch (error) {
      this.logger.error('Error handling callback query', error.stack);
      await ctx.reply('An error occurred. Please try again later.');
    }
  }

  async initiatePayment(
    ctx: Context,
    project: Project,
    planId: string,
    telegramUserId: string
  ) {
    try {
      // Get plan details with telegram_groups relation
      const plan = await this.membershipPlanService.findOne(project.tenant_id, planId);

      if (!plan.is_active) {
        await ctx.reply('This plan is no longer available. Please choose another plan.');
        return;
      }

      // Show groups included in the plan
      const groupCount = plan.telegram_groups?.length || 0;
      const groupText = groupCount > 0
        ? `\nAccess to ${groupCount} group${groupCount > 1 ? 's' : ''}`
        : '';

      // Create payment transaction with project_id
      const result = await this.paymentTransactionService.initiatePayment(
        project.tenant_id,
        {
          membership_plan_id: plan.id,
          project_id: project.id,
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

      this.logger.log(`Payment initiated for user ${telegramUserId}, transaction ${result.transaction.id}, project ${project.id}`);

      // Send payment link to user
      await ctx.reply(
        `💳 *Payment for ${plan.name}*\n\n` +
        `Price: ${plan.price_mnt.toLocaleString()} MNT\n` +
        `Duration: ${plan.duration_days} days${groupText}\n\n` +
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

  async stopBot(projectId: string) {
    const bot = this.bots.get(projectId);
    if (bot) {
      bot.stop();
      this.bots.delete(projectId);
      this.logger.log(`Project bot ${projectId} stopped`);
    }
  }

  async restartBot(project: Project) {
    await this.stopBot(project.id);
    await this.createBotInstance(project);
  }

  getBotInstance(projectId: string): Telegraf | undefined {
    return this.bots.get(projectId);
  }
}
