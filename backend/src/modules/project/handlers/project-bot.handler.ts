import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';
import { PaymentTransactionService } from '../../payment/services/payment-transaction.service';
import { TrialUsageService } from '../../membership/services/trial-usage.service';
import { MemberService } from '../../membership/services/member.service';
import { MembershipService } from '../../membership/services/membership.service';
import { MembershipStatus } from '../../membership/entities/membership.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import {
  TelegramBotHandlerService,
  BotConfiguration,
} from '../../../integrations/telegram/telegram-bot-handler.service';

/**
 * Project Bot Handler
 *
 * Manages Telegram bot instances for projects using centralized TelegramBotHandlerService.
 * Replaces the old TelegramBotHandler that used BotConfiguration.
 * Handles bot commands, payment initiation, and user interactions.
 */
@Injectable()
export class ProjectBotHandler implements OnModuleInit {
  private readonly logger = new Logger(ProjectBotHandler.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly trialUsageService: TrialUsageService,
    private readonly memberService: MemberService,
    private readonly membershipService: MembershipService,
    @InjectQueue('membership') private membershipQueue: Queue,
    private readonly telegramBotHandler: TelegramBotHandlerService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Telegram bots for projects...');
    // Don't block app startup - initialize bots in background
    this.initializeBots().catch((error) => {
      this.logger.error(
        'Failed to initialize project bots during startup',
        error.stack,
      );
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

      this.logger.log(
        `Initialized ${activeProjects.length} active project bots`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize project bots', error.stack);
    }
  }

  async createBotInstance(project: Project): Promise<void> {
    try {
      const config: BotConfiguration = {
        id: project.id,
        botToken: project.bot_token,
        botUsername: project.bot_username,
        welcomeMessage: project.welcome_message,
        tenantId: project.tenant_id,
      };

      // Register command handlers
      this.telegramBotHandler.registerCommandHandler(
        project.id,
        'start',
        (ctx) => this.handleStartCommand(ctx, project),
      );

      this.telegramBotHandler.registerCommandHandler(project.id, 'buy', (ctx) =>
        this.handleBuyCommand(ctx, project),
      );

      this.telegramBotHandler.registerCommandHandler(
        project.id,
        'status',
        (ctx) => this.handleStatusCommand(ctx, project),
      );

      // Register callback query handlers
      this.telegramBotHandler.registerCallbackQueryHandler(
        project.id,
        'show_plans',
        (ctx) => this.handleBuyCommand(ctx, project),
      );

      this.telegramBotHandler.registerCallbackQueryHandler(
        project.id,
        'my_status',
        (ctx) => this.handleStatusCommand(ctx, project),
      );

      this.telegramBotHandler.registerCallbackQueryHandler(
        project.id,
        /^buy_plan_/,
        async (ctx, _config, data) => {
          const planId = data.replace('buy_plan_', '');
          const telegramUserId = ctx.from?.id.toString();
          if (telegramUserId) {
            await this.initiatePayment(ctx, project, planId, telegramUserId);
          }
        },
      );

      this.telegramBotHandler.registerCallbackQueryHandler(
        project.id,
        /^trial_plan_/,
        async (ctx, _config, data) => {
          const planId = data.replace('trial_plan_', '');
          const telegramUserId = ctx.from?.id;
          if (telegramUserId) {
            await this.activateTrial(ctx, project, planId, telegramUserId);
          }
        },
      );

      // Create and launch bot instance
      await this.telegramBotHandler.createBotInstance(config);

      this.logger.log(
        `Project bot @${project.bot_username} launched successfully (project: ${project.id})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create bot instance for project ${project.id} (@${project.bot_username})`,
        error.stack,
      );
    }
  }

  async handleStartCommand(ctx: Context, project: Project) {
    try {
      const telegramUserId = ctx.from.id.toString();
      const userName = ctx.from.first_name;

      this.logger.log(
        `Start command from user ${telegramUserId} on project bot ${project.bot_username}`,
      );

      // Send welcome message from project configuration
      await ctx.reply(
        project.welcome_message.replace('{name}', userName),
        Markup.inlineKeyboard([
          [Markup.button.callback('🛒 View Plans', 'show_plans')],
          [Markup.button.callback('📊 My Status', 'my_status')],
        ]),
      );
    } catch (error) {
      this.logger.error('Error handling start command', error.stack);
      await ctx.reply('Алдаа гарлаа. Дараа дахин оролдоно уу.');
    }
  }

  async handleBuyCommand(ctx: Context, project: Project) {
    try {
      const telegramUserId = ctx.from.id;

      // Fetch active membership plans for this project
      const plans = await this.membershipPlanService.findActiveByProject(
        project.tenant_id,
        project.id,
      );

      if (plans.length === 0) {
        await ctx.reply(
          'Одоогоор багц байхгүй байна. Дараа дахин шалгана уу.',
        );
        return;
      }

      // Create inline keyboard with plan options showing number of groups and trial buttons
      const keyboard = [];

      for (const plan of plans) {
        const groupCount = plan.telegram_groups?.length || 0;
        const groupText =
          groupCount > 0
            ? ` • ${groupCount} group${groupCount > 1 ? 's' : ''}`
            : '';

        const planButtons = [];

        // Buy button (always shown)
        planButtons.push(
          Markup.button.callback(
            `💳 Buy ${plan.name} - ${plan.price.toLocaleString()} MNT`,
            `buy_plan_${plan.id}`,
          ),
        );

        // Trial button (only if trial is enabled and user hasn't used it)
        if (plan.trial_enabled) {
          const hasUsedTrial = await this.trialUsageService.hasUsedTrial(
            project.tenant_id,
            telegramUserId,
            plan.id,
          );

          if (!hasUsedTrial) {
            const trialDurationMinutes = Math.floor(plan.trial_duration_seconds / 60);
            const trialDurationText =
              trialDurationMinutes < 60
                ? `${trialDurationMinutes}min`
                : `${Math.floor(trialDurationMinutes / 60)}h`;

            planButtons.push(
              Markup.button.callback(
                `🎁 Try Free (${trialDurationText})`,
                `trial_plan_${plan.id}`,
              ),
            );
          }
        }

        keyboard.push(planButtons);
      }

      await ctx.reply(
        '🎯 *Багц сонгох:*\n\nПремиум эрх авахын тулд багц сонгоно уу!\n\n' +
          '💳 *Худалдан авах* - Төлбөртэй бүрэн эрх\n' +
          '🎁 *Үнэгүй туршилт* - Хязгаарлагдмал хугацаа (ганцхан удаа)',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(keyboard),
        },
      );

      this.logger.log(
        `Showed ${plans.length} plans to user ${telegramUserId} on project ${project.id}`,
      );
    } catch (error) {
      this.logger.error('Error handling buy command', error.stack);
      await ctx.reply('Алдаа гарлаа. Дараа дахин оролдоно уу.');
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
        '📊 *Таны гишүүнчлэлийн төлөв*\n\n' +
          'Төлөв: Шалгаж байна...\n' +
          'Багц худалдан авахын тулд /buy командыг ашигла.',
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error('Error handling status command', error.stack);
      await ctx.reply('Алдаа гарлаа. Дараа дахин оролдоно уу.');
    }
  }

  async initiatePayment(
    ctx: Context,
    project: Project,
    planId: string,
    telegramUserId: string,
  ) {
    try {
      // Get plan details with telegram_groups relation
      const plan = await this.membershipPlanService.findOne(
        project.tenant_id,
        planId,
      );

      if (!plan.is_active) {
        await ctx.reply(
          'Энэ багц боломжгүй болсон байна. Өөр багц сонгоно уу.',
        );
        return;
      }

      // Show groups included in the plan
      const groupCount = plan.telegram_groups?.length || 0;
      const groupText =
        groupCount > 0
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
          amount: plan.price,
          snapshot_plan_name: plan.name,
          snapshot_price: plan.price,
          snapshot_duration_days: plan.duration_days,
        },
      );

      this.logger.log(
        `Payment initiated for user ${telegramUserId}, transaction ${result.transaction.id}, project ${project.id}`,
      );

      // Send payment link to user
      await ctx.reply(
        `💳 *${plan.name}-ийн төлбөр*\n\n` +
          `Үнэ: ${plan.price.toLocaleString()} MNT\n` +
          `Хугацаа: ${plan.duration_days} хоног${groupText}\n\n` +
          `Төлбөрөө төлөхийн тулд доорх товчийг дарна уу:`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('💰 Төлбөр төлөх', result.payment_link)],
          ]),
        },
      );
    } catch (error) {
      this.logger.error('Error initiating payment', error.stack);
      await ctx.reply(
        '❌ Төлбөр эхлүүлэхэд алдаа гарлаа. Дахин оролдох эсвэл тусламжид хандана уу.',
      );
    }
  }

  async stopBot(projectId: string) {
    await this.telegramBotHandler.stopBot(projectId);
    this.logger.log(`Project bot ${projectId} stopped`);
  }

  async restartBot(project: Project) {
    await this.stopBot(project.id);
    await this.createBotInstance(project);
  }

  getBotInstance(projectId: string) {
    return this.telegramBotHandler.getBotInstance(projectId);
  }

  /**
   * Activate trial membership for a user
   *
   * Creates a TRIAL membership without payment and adds user to Telegram channels.
   * Tracks trial usage to prevent reuse.
   */
  async activateTrial(
    ctx: Context,
    project: Project,
    planId: string,
    telegramUserId: number,
  ) {
    try {
      // Get plan details with telegram_groups relation
      const plan = await this.membershipPlanService.findOne(
        project.tenant_id,
        planId,
      );

      if (!plan.is_active) {
        await ctx.reply(
          '❌ Энэ багц боломжгүй болсон байна. Өөр багц сонгоно уу.',
        );
        return;
      }

      if (!plan.trial_enabled) {
        await ctx.reply(
          '❌ Энэ багцад туршилт байхгүй байна. Бүрэн гишүүнчлэл худалдан авна уу.',
        );
        return;
      }

      // Check if user already used trial
      const hasUsedTrial = await this.trialUsageService.hasUsedTrial(
        project.tenant_id,
        telegramUserId,
        plan.id,
      );

      if (hasUsedTrial) {
        await ctx.reply(
          '❌ Та энэ багцын туршилтыг аль хэдийн ашигласан байна. Үргэлжлүүлэхийн тулд бүрэн гишүүнчлэл худалдан авна уу.',
        );
        return;
      }

      // Get or create member
      let member = await this.memberService.findByTelegramUserId(
        telegramUserId,
        project.tenant_id,
      );

      if (!member) {
        member = await this.memberService.create(project.tenant_id, {
          telegram_user_id: telegramUserId,
          telegram_username: ctx.from.username,
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name,
          is_bot: ctx.from.is_bot,
        });
      }

      // Calculate trial end time
      const trialEndsAt = new Date(Date.now() + plan.trial_duration_seconds * 1000);

      // Create trial memberships for all groups in the plan
      const groupCount = plan.telegram_groups?.length || 0;
      const createdMemberships = [];

      for (const group of plan.telegram_groups) {
        // Create TRIAL membership
        const membership = await this.membershipService.create(project.tenant_id, {
          member_id: member.id,
          group_id: group.id,
          plan_id: plan.id,
          starts_at: new Date(),
          expires_at: trialEndsAt,
        });

        // Update status to TRIAL (create method creates ACTIVE by default)
        await this.membershipService.update(project.tenant_id, membership.id, {
          status: MembershipStatus.TRIAL,
        });
        membership.status = MembershipStatus.TRIAL;

        createdMemberships.push(membership);

        // Create trial usage record (only once per plan, not per group)
        if (createdMemberships.length === 1) {
          await this.trialUsageService.createTrialUsage(
            project.tenant_id,
            member.id,
            plan.id,
            membership.id,
            trialEndsAt,
          );
        }
      }

      // Queue job to add user to Telegram channels
      await this.membershipQueue.add('activate-trial', {
        tenant_id: project.tenant_id,
        project_id: project.id,
        member_id: member.id,
        membership_plan_id: plan.id,
        membership_ids: createdMemberships.map((m) => m.id),
        telegram_user_id: telegramUserId,
        plan_name: plan.name,
        trial_ends_at: trialEndsAt.toISOString(),
      });

      // Calculate trial duration display
      const trialDurationMinutes = Math.floor(plan.trial_duration_seconds / 60);
      const trialDurationText =
        trialDurationMinutes < 60
          ? `${trialDurationMinutes} minutes`
          : `${Math.floor(trialDurationMinutes / 60)} hours`;

      this.logger.log(
        `Trial activated for user ${telegramUserId}, plan ${planId}, project ${project.id}, expires ${trialEndsAt.toISOString()}`,
      );

      // Send success message
      await ctx.reply(
        `🎉 *Туршилт идэвхжлээ!*\n\n` +
          `Багц: *${plan.name}*\n` +
          `Хугацаа: ${trialDurationText}\n` +
          `Дуусах огноо: ${trialEndsAt.toLocaleString()}\n` +
          `Бүлгүүд: ${groupCount}\n\n` +
          `✅ Таныг удахгүй бүлгүүдэд нэмнэ.\n\n` +
          `⚠️ *Анхаар:* Туршилт дууссаны дараа бүрэн гишүүнчлэл худалдан авахгүй бол таныг бүлгүүдээс автоматаар хасна.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('💳 Бүрэн гишүүнчлэл авах', `buy_plan_${plan.id}`)],
            [Markup.button.callback('📊 Миний төлөв', 'my_status')],
          ]),
        },
      );
    } catch (error) {
      this.logger.error('Error activating trial', error.stack);

      if (error.response?.error?.code === 'TRIAL_ALREADY_USED') {
        await ctx.reply(
          '❌ Та энэ багцын туршилтыг аль хэдийн ашигласан байна. Үргэлжлүүлэхийн тулд бүрэн гишүүнчлэл худалдан авна уу.',
        );
      } else {
        await ctx.reply(
          '❌ Туршилт идэвхжүүлэхэд алдаа гарлаа. Дахин оролдох эсвэл тусламжид хандана уу.',
        );
      }
    }
  }
}
