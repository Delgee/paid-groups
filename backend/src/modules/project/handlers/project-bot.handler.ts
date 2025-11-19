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

      // Register demo payment handler (development only)
      this.telegramBotHandler.registerCallbackQueryHandler(
        project.id,
        /^demo_pay:/,
        async (ctx, _config, data) => {
          const transactionId = data.replace('demo_pay:', '');
          await this.handleDemoPayment(ctx, project, transactionId);
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
      const telegramUserId = ctx.from.id;
      const userName = ctx.from.first_name;

      this.logger.log(
        `Start command from user ${telegramUserId} on project bot ${project.bot_username}`,
      );

      // Check if user has existing memberships
      const member = await this.memberService.findByTelegramUserId(
        telegramUserId,
        project.tenant_id,
      );

      let message = project.welcome_message.replace('{name}', userName);

      // Add status summary for returning users
      if (member) {
        const memberships = await this.membershipService.findByMember(
          project.tenant_id,
          member.id,
        );

        const activeMemberships = memberships.filter(
          (m) =>
            m.status === MembershipStatus.ACTIVE && m.project_id === project.id,
        );
        const trialMemberships = memberships.filter(
          (m) =>
            m.status === MembershipStatus.TRIAL && m.project_id === project.id,
        );

        if (activeMemberships.length > 0 || trialMemberships.length > 0) {
          message += '\n\n📊 *Таны төлөв:*\n';

          if (activeMemberships.length > 0) {
            message += `✅ ${activeMemberships.length} идэвхтэй гишүүнчлэл\n`;
          }

          if (trialMemberships.length > 0) {
            message += `🎁 ${trialMemberships.length} туршилтын гишүүнчлэл\n`;
          }

          // Show soonest expiring membership
          const allActive = [...activeMemberships, ...trialMemberships];
          allActive.sort(
            (a, b) =>
              new Date(a.expires_at).getTime() -
              new Date(b.expires_at).getTime(),
          );

          if (allActive.length > 0) {
            const soonestExpiring = allActive[0];
            const expiresAt = new Date(soonestExpiring.expires_at);
            const daysRemaining = Math.ceil(
              (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );

            if (daysRemaining <= 3) {
              message += `\n⚠️ Дуусах хугацаа: ${daysRemaining} хоног үлдсэн`;
            }
          }
        }
      }

      // Send welcome message with action buttons
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🛒 Багц үзэх', 'show_plans')],
          [Markup.button.callback('📊 Миний төлөв', 'my_status')],
        ]),
      });
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

      // Find member and get their existing memberships
      const member = await this.memberService.findByTelegramUserId(
        telegramUserId,
        project.tenant_id,
      );

      const existingMemberships = member
        ? await this.membershipService.findByMember(project.tenant_id, member.id)
        : [];

      // Build membership lookup map by plan_id
      const membershipByPlanId = new Map<string, any>();
      for (const membership of existingMemberships) {
        if (
          membership.project_id === project.id &&
          (membership.status === MembershipStatus.ACTIVE ||
            membership.status === MembershipStatus.TRIAL)
        ) {
          membershipByPlanId.set(membership.plan_id, membership);
        }
      }

      // Build message with plan details
      let message = '🎯 *Багц сонгох:*\n\n';

      // Create inline keyboard with plan options
      const keyboard = [];

      for (const plan of plans) {
        const groupCount = plan.telegram_groups?.length || 0;
        const existingMembership = membershipByPlanId.get(plan.id);

        // Show plan details in message
        message += `📦 *${plan.name}*\n`;
        message += `💰 ${plan.price.toLocaleString()} MNT / ${plan.duration_days} хоног\n`;
        message += `📺 ${groupCount} group${groupCount > 1 ? 's' : ''}\n`;

        // Show status if user has this plan
        if (existingMembership) {
          if (existingMembership.status === MembershipStatus.ACTIVE) {
            const expiresAt = new Date(existingMembership.expires_at);
            const daysRemaining = Math.ceil(
              (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );
            message += `✅ *Идэвхтэй* - ${daysRemaining} хоног үлдсэн\n`;
          } else if (existingMembership.status === MembershipStatus.TRIAL) {
            const expiresAt = new Date(existingMembership.expires_at);
            const hoursRemaining = Math.ceil(
              (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60),
            );
            message += `🎁 *Туршилт* - ${hoursRemaining < 24 ? hoursRemaining + ' цаг' : Math.floor(hoursRemaining / 24) + ' хоног'} үлдсэн\n`;
          }
        }

        message += '\n';

        const planButtons = [];

        // Buy button (show "Renew" if already active, otherwise "Buy")
        const buyLabel = existingMembership
          ? `🔄 Сунгах - ${plan.price.toLocaleString()} MNT`
          : `💳 Худалдан авах - ${plan.price.toLocaleString()} MNT`;

        planButtons.push(
          Markup.button.callback(buyLabel, `buy_plan_${plan.id}`),
        );

        // Trial button (only if trial is enabled, user hasn't used it, and doesn't have active membership)
        if (plan.trial_enabled && !existingMembership) {
          const hasUsedTrial = await this.trialUsageService.hasUsedTrial(
            project.tenant_id,
            telegramUserId,
            plan.id,
          );

          if (!hasUsedTrial) {
            const trialDurationMinutes = Math.floor(plan.trial_duration_seconds / 60);
            const trialDurationText =
              trialDurationMinutes < 60
                ? `${trialDurationMinutes}мин`
                : `${Math.floor(trialDurationMinutes / 60)}ц`;

            planButtons.push(
              Markup.button.callback(
                `🎁 Үнэгүй (${trialDurationText})`,
                `trial_plan_${plan.id}`,
              ),
            );
          }
        }

        keyboard.push(planButtons);
      }

      message += '\n💡 *Тайлбар:*\n';
      message += '💳 *Худалдан авах* - Бүрэн эрх авах\n';
      message += '🔄 *Сунгах* - Идэвхтэй гишүүнчлэлээ сунгах\n';
      message += '🎁 *Үнэгүй* - Туршилт (ганцхан удаа)';

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard),
      });

      this.logger.log(
        `Showed ${plans.length} plans to user ${telegramUserId} (${existingMemberships.length} existing memberships)`,
      );
    } catch (error) {
      this.logger.error('Error handling buy command', error.stack);
      await ctx.reply('Алдаа гарлаа. Дараа дахин оролдоно уу.');
    }
  }

  async handleStatusCommand(ctx: Context, project: Project) {
    try {
      const telegramUserId = ctx.from.id;

      // Find member by telegram user ID
      const member = await this.memberService.findByTelegramUserId(
        telegramUserId,
        project.tenant_id,
      );

      if (!member) {
        await ctx.reply(
          '📊 *Таны гишүүнчлэлийн төлөв*\n\n' +
            '❌ Та одоогоор ямар нэг гишүүнчлэлгүй байна.\n\n' +
            '💡 Багц худалдан авахын тулд доорх товчыг дарна уу.',
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🛒 Багц үзэх', 'show_plans')],
            ]),
          },
        );
        return;
      }

      // Get all memberships for this member
      const allMemberships = await this.membershipService.findByMember(
        project.tenant_id,
        member.id,
      );

      // Filter memberships by project and categorize by status
      const activeMemberships = allMemberships.filter(
        (m) => m.status === MembershipStatus.ACTIVE && m.project_id === project.id,
      );
      const trialMemberships = allMemberships.filter(
        (m) => m.status === MembershipStatus.TRIAL && m.project_id === project.id,
      );
      const expiredMemberships = allMemberships.filter(
        (m) => m.status === MembershipStatus.EXPIRED && m.project_id === project.id,
      );

      // Build status message
      let message = '📊 *Таны гишүүнчлэлийн төлөв*\n\n';

      // Active memberships
      if (activeMemberships.length > 0) {
        message += '✅ *Идэвхтэй гишүүнчлэл:*\n';
        for (const membership of activeMemberships) {
          const groupName = membership.group?.group_name || 'Unknown Group';
          const planName = membership.plan?.name || 'Unknown Plan';
          const expiresAt = new Date(membership.expires_at);
          const daysRemaining = Math.ceil(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          );

          message += `\n• ${groupName}\n`;
          message += `  Багц: ${planName}\n`;
          message += `  Дуусах хугацаа: ${expiresAt.toLocaleDateString('mn-MN')}\n`;
          message += `  Үлдсэн: ${daysRemaining} хоног\n`;
        }
        message += '\n';
      }

      // Trial memberships
      if (trialMemberships.length > 0) {
        message += '🎁 *Туршилтын гишүүнчлэл:*\n';
        for (const membership of trialMemberships) {
          const groupName = membership.group?.group_name || 'Unknown Group';
          const planName = membership.plan?.name || 'Unknown Plan';
          const expiresAt = new Date(membership.expires_at);
          const hoursRemaining = Math.ceil(
            (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60),
          );

          message += `\n• ${groupName}\n`;
          message += `  Багц: ${planName}\n`;
          message += `  Дуусах: ${expiresAt.toLocaleString('mn-MN')}\n`;
          message += `  Үлдсэн: ${hoursRemaining < 24 ? hoursRemaining + ' цаг' : Math.floor(hoursRemaining / 24) + ' хоног'}\n`;
        }
        message += '\n';
      }

      // Expired memberships (show recent ones)
      if (expiredMemberships.length > 0) {
        const recentExpired = expiredMemberships
          .filter((m) => {
            const expiredDaysAgo = Math.ceil(
              (Date.now() - new Date(m.expires_at).getTime()) / (1000 * 60 * 60 * 24),
            );
            return expiredDaysAgo <= 30; // Show expired within last 30 days
          })
          .slice(0, 3); // Show max 3

        if (recentExpired.length > 0) {
          message += '⏰ *Дууссан гишүүнчлэл:*\n';
          for (const membership of recentExpired) {
            const groupName = membership.group?.group_name || 'Unknown Group';
            const planName = membership.plan?.name || 'Unknown Plan';
            const expiresAt = new Date(membership.expires_at);

            message += `\n• ${groupName}\n`;
            message += `  Багц: ${planName}\n`;
            message += `  Дууссан: ${expiresAt.toLocaleDateString('mn-MN')}\n`;
          }
          message += '\n';
        }
      }

      // If no memberships at all
      if (
        activeMemberships.length === 0 &&
        trialMemberships.length === 0 &&
        expiredMemberships.length === 0
      ) {
        message += '❌ Та одоогоор ямар нэг гишүүнчлэлгүй байна.\n\n';
        message += '💡 Багц худалдан авахын тулд доорх товчыг дарна уу.';
      } else {
        message += '💡 *Шинэ багц худалдан авах эсвэл сунгах уу?*';
      }

      // Build action buttons
      const buttons = [[Markup.button.callback('🛒 Бүх багцууд', 'show_plans')]];

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons),
      });

      this.logger.log(
        `Status shown to user ${telegramUserId}: ${activeMemberships.length} active, ${trialMemberships.length} trial, ${expiredMemberships.length} expired`,
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
      // Convert decimal price to integer (TypeORM returns decimal as string)
      const priceInt = Math.round(Number(plan.price));

      const result = await this.paymentTransactionService.initiatePayment(
        project.tenant_id,
        {
          membership_plan_id: plan.id,
          project_id: project.id,
          telegram_user_id: telegramUserId,
          telegram_username: ctx.from.username,
          telegram_first_name: ctx.from.first_name,
          telegram_last_name: ctx.from.last_name,
          amount: priceInt,
          snapshot_plan_name: plan.name,
          snapshot_price: priceInt,
          snapshot_duration_days: plan.duration_days,
        },
      );

      this.logger.log(
        `Payment initiated for user ${telegramUserId}, transaction ${result.transaction.id}, project ${project.id}`,
      );

      // Build payment buttons
      const paymentButtons: Array<Array<ReturnType<typeof Markup.button.url> | ReturnType<typeof Markup.button.callback>>> = [
        [Markup.button.url('💳 Төлбөр төлөх', result.payment_link)]
      ];

      // Add demo payment button in development mode
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        paymentButtons.push([
          Markup.button.callback('🧪 Demo Payment (Dev Only)', `demo_pay:${result.transaction.id}`)
        ]);
      }

      // Send QR code image with payment buttons
      if (result.qr_image) {
        try {
          // Convert base64 to buffer
          const qrBuffer = Buffer.from(result.qr_image, 'base64');

          await ctx.replyWithPhoto(
            { source: qrBuffer },
            {
              caption:
                `💳 *${plan.name}-ийн төлбөр*\n\n` +
                `Үнэ: ${priceInt.toLocaleString()} MNT\n` +
                `Хугацаа: ${plan.duration_days} хоног${groupText}\n\n` +
                `📱 QR кодыг уншуулж эсвэл доорх товчоор төлбөр төлнө үү:` +
                (isDevelopment ? `\n\n⚠️ *Хөгжүүлэлтийн горим:* Demo payment товч идэвхтэй` : ''),
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard(paymentButtons),
            },
          );
        } catch (qrError) {
          this.logger.error('Failed to send QR code image', qrError.stack);
          // Fallback: send payment link as text
          await ctx.reply(
            `💳 *Төлбөр төлөх*\n\n` +
              `Үнэ: ${priceInt.toLocaleString()} MNT\n` +
              `Хугацаа: ${plan.duration_days} хоног${groupText}` +
              (isDevelopment ? `\n\n⚠️ *Хөгжүүлэлтийн горим:* Demo payment товч идэвхтэй` : ''),
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard(paymentButtons),
            },
          );
        }
      } else {
        // No QR image, send payment link only
        await ctx.reply(
          `💳 *${plan.name}-ийн төлбөр*\n\n` +
            `Үнэ: ${priceInt.toLocaleString()} MNT\n` +
            `Хугацаа: ${plan.duration_days} хоног${groupText}\n\n` +
            `📱 Доорх товчоор төлбөр төлнө үү:` +
            (isDevelopment ? `\n\n⚠️ *Хөгжүүлэлтийн горим:* Demo payment товч идэвхтэй` : ''),
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(paymentButtons),
          },
        );
      }
    } catch (error) {
      this.logger.error('Error initiating payment', error.stack);
      await ctx.reply(
        '❌ Төлбөр эхлүүлэхэд алдаа гарлаа. Дахин оролдох эсвэл тусламжид хандана уу.',
      );
    }
  }

  /**
   * Handle demo payment simulation (development only)
   * Simulates successful payment completion without actual payment
   */
  async handleDemoPayment(ctx: Context, project: Project, transactionId: string) {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV !== 'development') {
        await ctx.answerCbQuery('Demo payment is only available in development mode');
        return;
      }

      await ctx.answerCbQuery('⏳ Processing demo payment...');

      this.logger.log(`Demo payment triggered for transaction ${transactionId}`);

      // Find the payment transaction
      const transaction = await this.paymentTransactionService.findOne(
        project.tenant_id,
        transactionId,
      );

      if (!transaction) {
        await ctx.reply('❌ Төлбөрийн гүйлгээ олдсонгүй.');
        return;
      }

      // Check if already completed
      if (transaction.status === 'completed') {
        await ctx.reply('✅ Энэ төлбөр аль хэдийн төлөгдсөн байна.');
        return;
      }

      // Mark transaction as completed
      await this.paymentTransactionService.markAsCompleted(
        project.tenant_id,
        transactionId,
        {
          qpay_transaction_id: 'DEMO_' + Date.now(),
          qpay_payment_method: 'demo',
        },
      );

      this.logger.log(`Demo payment completed for transaction ${transactionId}`);

      // Queue membership activation job
      await this.membershipQueue.add('activate-membership', {
        tenant_id: transaction.tenant_id,
        project_id: transaction.project_id,
        membership_plan_id: transaction.membership_plan_id,
        telegram_user_id: transaction.telegram_user_id,
        telegram_username: transaction.telegram_username,
        telegram_first_name: transaction.telegram_first_name,
        telegram_last_name: transaction.telegram_last_name,
        transaction_id: transaction.id,
        payment_amount: transaction.amount,
        duration_days: transaction.snapshot_duration_days,
      });

      this.logger.log(`Membership activation job queued for transaction ${transactionId}`);

      await ctx.reply(
        `✅ *Demo төлбөр амжилттай!*\n\n` +
          `🧪 Энэ бол тест төлбөр байна.\n` +
          `Таны гишүүнчлэл удахгүй идэвхжинэ.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error('Error processing demo payment', error.stack);
      await ctx.reply(
        '❌ Demo төлбөр хийхэд алдаа гарлаа.',
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
