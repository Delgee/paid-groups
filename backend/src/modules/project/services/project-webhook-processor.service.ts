import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { Project } from '../entities/project.entity';
import { TelegramUpdate } from '../project-webhook.controller';
import { TelegramApiService } from '../../../integrations/telegram/telegram-api.service';
import { ProjectCommandHandlerService } from './project-command-handler.service';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';
import { PaymentTransactionService } from '../../payment/services/payment-transaction.service';
import { TrialUsageService } from '../../membership/services/trial-usage.service';
import { MemberService } from '../../membership/services/member.service';
import { MembershipService } from '../../membership/services/membership.service';
import { MembershipStatus } from '../../membership/entities/membership.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * ProjectWebhookProcessorService
 *
 * Processes incoming Telegram webhook updates for project bots.
 * Handles commands, messages, and callback queries.
 */
@Injectable()
export class ProjectWebhookProcessorService {
  private readonly logger = new Logger(ProjectWebhookProcessorService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
    private readonly telegramApiService: TelegramApiService,
    private readonly commandHandler: ProjectCommandHandlerService,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly trialUsageService: TrialUsageService,
    private readonly memberService: MemberService,
    private readonly membershipService: MembershipService,
    @InjectQueue('membership') private membershipQueue: Queue,
  ) {}

  /**
   * Process incoming Telegram webhook update
   */
  async processUpdate(
    tenantId: string,
    projectId: string,
    secretToken: string,
    update: TelegramUpdate,
  ): Promise<void> {
    // Find project and validate
    const project = await this.findAndValidateProject(
      tenantId,
      projectId,
      secretToken,
    );

    // Set tenant context for database operations
    await this.setTenantContext(tenantId);

    this.logger.log(
      `Processing update ${update.update_id} for project ${project.display_name} (${projectId})`,
    );

    // Handle different types of updates
    if (update.message) {
      await this.handleMessage(project, update.message);
    }

    if (update.callback_query) {
      await this.handleCallbackQuery(project, update.callback_query);
    }

    if (update.chat_member) {
      await this.handleChatMember(project, update.chat_member);
    }

    if (update.my_chat_member) {
      await this.handleMyChatMember(project, update.my_chat_member);
    }
  }

  /**
   * Find project and validate webhook secret
   */
  private async findAndValidateProject(
    tenantId: string,
    projectId: string,
    secretToken: string,
  ): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        tenant_id: tenantId,
      },
    });

    if (!project) {
      throw new NotFoundException({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: `Project ${projectId} not found in tenant ${tenantId}`,
        },
      });
    }

    // Validate webhook secret
    if (!project.webhook_secret) {
      this.logger.warn(
        `Project ${projectId} has no webhook secret configured`,
      );
      throw new UnauthorizedException({
        error: {
          code: 'WEBHOOK_NOT_CONFIGURED',
          message: 'Webhook secret not configured for this project',
        },
      });
    }

    // Constant-time comparison to prevent timing attacks
    // Note: webhook_secret is stored as plain text, compare directly
    const isValidSecret = crypto.timingSafeEqual(
      Buffer.from(secretToken),
      Buffer.from(project.webhook_secret),
    );

    if (!isValidSecret) {
      this.logger.warn(
        `Invalid webhook secret for project ${projectId} from tenant ${tenantId}`,
      );
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_WEBHOOK_SECRET',
          message: 'Invalid webhook secret token',
        },
      });
    }

    return project;
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(project: Project, message: any): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from?.id;
    const text = message.text || '';

    this.logger.debug(
      `Handling message from user ${userId} in chat ${chatId}: ${text.substring(0, 50)}`,
    );

    // Handle new chat members
    if (message.new_chat_members && message.new_chat_members.length > 0) {
      await this.handleNewChatMembers(project, message);
      return;
    }

    // Handle left chat member
    if (message.left_chat_member) {
      await this.handleLeftChatMember(project, message);
      return;
    }

    // Handle commands
    if (text.startsWith('/')) {
      await this.handleCommand(project, message);
      return;
    }

    // Handle regular text messages (could be used for feedback, etc.)
    this.logger.debug(`Non-command message from user ${userId}: ${text}`);
  }

  /**
   * Handle bot commands
   */
  private async handleCommand(project: Project, message: any): Promise<void> {
    const text = message.text.trim();
    const command = text.split(' ')[0].toLowerCase();
    const args = text.split(' ').slice(1);
    const chatId = message.chat.id;
    const userId = message.from.id;
    const firstName = message.from.first_name;

    this.logger.log(`Processing command ${command} for project ${project.id}`);

    // Build command context for admin commands
    const ctx = {
      project,
      message,
      chatId,
      userId,
      args,
    };

    switch (command) {
      // User commands
      case '/start':
        await this.handleStartCommand(project, chatId, firstName);
        break;

      case '/help':
        await this.handleHelpCommand(project, chatId);
        break;

      case '/status':
        await this.handleStatusCommand(project, chatId, userId);
        break;

      case '/subscribe':
        await this.handleSubscribeCommand(project, chatId);
        break;

      case '/buy':
        await this.handleBuyCommand(project, message);
        break;

      // Admin commands
      case '/ban':
        await this.commandHandler.handleBanCommand(ctx);
        break;

      case '/extend':
        await this.commandHandler.handleExtendCommand(ctx);
        break;

      case '/stats':
        await this.commandHandler.handleStatsCommand(ctx);
        break;

      case '/members':
        await this.commandHandler.handleMembersCommand(ctx);
        break;

      default:
        this.logger.debug(`Unhandled command: ${command}`);
        break;
    }
  }

  /**
   * Handle /start command
   */
  private async handleStartCommand(
    project: Project,
    chatId: number,
    firstName: string,
  ): Promise<void> {
    const welcomeText =
      project.welcome_message ||
      `Hello ${firstName}! 👋\n\nWelcome to ${project.display_name}.\n\nUse /help to see available commands.`;

    await this.telegramApiService.sendMessage(
      project.bot_token,
      chatId,
      welcomeText,
    );

    this.logger.log(`Sent welcome message to user in chat ${chatId}`);
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(
    project: Project,
    chatId: number,
  ): Promise<void> {
    const helpText = `
🤖 *${project.display_name} - Help*

*Available Commands:*
/start - Welcome message
/help - Show this help message
/status - Check your membership status
/subscribe - View available subscription plans

*How it works:*
This bot manages access to premium Telegram groups. Purchase a membership plan to gain access to exclusive content and groups.

For support, please contact the group administrators.
    `.trim();

    await this.telegramApiService.sendMessage(
      project.bot_token,
      chatId,
      helpText,
      { parse_mode: 'Markdown' },
    );

    this.logger.log(`Sent help message to chat ${chatId}`);
  }

  /**
   * Handle /status command
   */
  private async handleStatusCommand(
    project: Project,
    chatId: number,
    userId: number,
  ): Promise<void> {
    // TODO: Implement membership status check
    const statusText = `
👤 *Your Status*

Project: ${project.display_name}
User ID: ${userId}

Status: Active

To check your detailed membership status, please visit the dashboard.
    `.trim();

    await this.telegramApiService.sendMessage(
      project.bot_token,
      chatId,
      statusText,
      { parse_mode: 'Markdown' },
    );

    this.logger.log(`Sent status message to user ${userId} in chat ${chatId}`);
  }

  /**
   * Handle /subscribe command
   */
  private async handleSubscribeCommand(
    project: Project,
    chatId: number,
  ): Promise<void> {
    // TODO: Fetch and display available membership plans
    const subscribeText = `
💳 *Subscription Plans*

To view available subscription plans and purchase membership, please visit our website or contact the group administrators.

Use /status to check your current membership status.
    `.trim();

    await this.telegramApiService.sendMessage(
      project.bot_token,
      chatId,
      subscribeText,
      { parse_mode: 'Markdown' },
    );

    this.logger.log(`Sent subscription info to chat ${chatId}`);
  }

  /**
   * Handle /buy command
   */
  private async handleBuyCommand(
    project: Project,
    message: any,
  ): Promise<void> {
    try {
      const chatId = message.chat.id;
      const userId = message.from.id;

      // Fetch active membership plans for this project
      const plans = await this.membershipPlanService.findActiveByProject(
        project.tenant_id,
        project.id,
      );

      if (plans.length === 0) {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          'Одоогоор багц байхгүй байна. Дараа дахин шалгана уу.',
        );
        return;
      }

      // Create inline keyboard with plan options showing trial buttons
      const keyboard = [];

      for (const plan of plans) {
        const groupCount = plan.telegram_groups?.length || 0;
        const planButtons = [];

        // Buy button (always shown)
        planButtons.push({
          text: `💳 Buy ${plan.name} - ${Number(plan.price).toLocaleString()} MNT`,
          callback_data: `buy_plan_${plan.id}`,
        });

        // Trial button (only if trial is enabled and user hasn't used it)
        if (plan.trial_enabled) {
          const hasUsedTrial = await this.trialUsageService.hasUsedTrial(
            project.tenant_id,
            userId,
            plan.id,
          );

          if (!hasUsedTrial) {
            const trialDurationMinutes = Math.floor(plan.trial_duration_seconds / 60);
            const trialDurationText =
              trialDurationMinutes < 60
                ? `${trialDurationMinutes}min`
                : `${Math.floor(trialDurationMinutes / 60)}h`;

            planButtons.push({
              text: `🎁 Try Free (${trialDurationText})`,
              callback_data: `trial_plan_${plan.id}`,
            });
          }
        }

        keyboard.push(planButtons);
      }

      await this.telegramApiService.sendMessage(
        project.bot_token,
        chatId,
        '🎯 *Багц сонгох:*\n\nПремиум эрх авахын тулд багц сонгоно уу!\n\n' +
          '💳 *Худалдан авах* - Төлбөртэй бүрэн эрх\n' +
          '🎁 *Үнэгүй туршилт* - Хязгаарлагдмал хугацаа (ганцхан удаа)',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboard,
          },
        },
      );

      this.logger.log(
        `Showed ${plans.length} plans to user ${userId} on project ${project.id}`,
      );
    } catch (error) {
      this.logger.error('Error handling buy command', error.stack);
      await this.telegramApiService.sendMessage(
        project.bot_token,
        message.chat.id,
        'Алдаа гарлаа. Дараа дахин оролдоно уу.',
      );
    }
  }

  /**
   * Handle callback queries (inline button presses)
   */
  private async handleCallbackQuery(
    project: Project,
    callbackQuery: any,
  ): Promise<void> {
    const queryId = callbackQuery.id;
    const data = callbackQuery.data;
    const chatId = callbackQuery.message?.chat?.id;
    const userId = callbackQuery.from?.id;

    this.logger.debug(`Handling callback query: ${data} for project ${project.id}`);

    try {
      // Answer the callback query to remove loading indicator
      await this.telegramApiService.answerCallbackQuery(
        project.bot_token,
        queryId,
      );

      // Handle different callback actions
      if (data.startsWith('subscribe_')) {
        const planId = data.replace('subscribe_', '');
        await this.handleSubscriptionCallback(project, chatId, planId);
      } else if (data.startsWith('buy_plan_')) {
        const planId = data.replace('buy_plan_', '');
        if (userId) {
          await this.initiatePayment(project, callbackQuery, planId, userId.toString());
        }
      } else if (data.startsWith('trial_plan_')) {
        const planId = data.replace('trial_plan_', '');
        if (userId) {
          await this.activateTrial(project, callbackQuery, planId, userId);
        }
      } else if (data.startsWith('demo_pay:')) {
        const transactionId = data.replace('demo_pay:', '');
        await this.handleDemoPayment(project, callbackQuery, transactionId);
      } else {
        this.logger.debug(`Unhandled callback query data: ${data}`);
      }
    } catch (error) {
      this.logger.error(
        `Error handling callback query ${queryId}:`,
        error.stack,
      );
    }
  }

  /**
   * Handle subscription callback
   */
  private async handleSubscriptionCallback(
    project: Project,
    chatId: number,
    planId: string,
  ): Promise<void> {
    // TODO: Implement subscription flow
    const message = `To complete your subscription, please visit our payment page.\n\nPlan ID: ${planId}`;

    await this.telegramApiService.sendMessage(
      project.bot_token,
      chatId,
      message,
    );

    this.logger.log(
      `Sent subscription callback response for plan ${planId} to chat ${chatId}`,
    );
  }

  /**
   * Handle new members joining a group
   */
  private async handleNewChatMembers(
    project: Project,
    message: any,
  ): Promise<void> {
    const chatId = message.chat.id;
    const newMembers = message.new_chat_members;

    this.logger.log(
      `Processing ${newMembers.length} new members in chat ${chatId} for project ${project.id}`,
    );

    for (const newMember of newMembers) {
      // Skip bots
      if (newMember.is_bot) {
        this.logger.debug(`Skipping bot member ${newMember.id}`);
        continue;
      }

      try {
        // TODO: When membership module is integrated:
        // 1. Create or update member record
        // 2. Check if member has valid membership for this group
        // 3. If no valid membership, send payment instructions and optionally kick
        // 4. If valid membership, send welcome message

        // For now, send a generic welcome message
        const welcomeText = `👋 Welcome ${newMember.first_name}!\n\nYou've joined ${message.chat.title || 'the group'}.\n\nTo access premium content, you need an active membership. Use /subscribe to view available plans.`;

        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          welcomeText,
        );

        this.logger.log(
          `Processed new member ${newMember.id} (${newMember.first_name}) in chat ${chatId}`,
        );
      } catch (error) {
        this.logger.error(
          `Error processing new member ${newMember.id}:`,
          error.stack,
        );
      }
    }
  }

  /**
   * Handle members leaving a group
   */
  private async handleLeftChatMember(
    project: Project,
    message: any,
  ): Promise<void> {
    const chatId = message.chat.id;
    const leftMember = message.left_chat_member;

    // Skip bots
    if (leftMember.is_bot) {
      this.logger.debug(`Skipping bot leaving chat ${chatId}`);
      return;
    }

    this.logger.log(
      `Member ${leftMember.id} (${leftMember.first_name}) left chat ${chatId} for project ${project.id}`,
    );

    try {
      // TODO: When membership module is integrated:
      // 1. Find member record by telegram_user_id
      // 2. Update member status or handle membership cleanup
      // 3. Log member departure for analytics

      this.logger.debug(
        `Member departure logged for ${leftMember.id} from chat ${chatId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing left member ${leftMember.id}:`,
        error.stack,
      );
    }
  }

  /**
   * Handle chat member updates (users joining/leaving groups)
   */
  private async handleChatMember(
    project: Project,
    chatMember: any,
  ): Promise<void> {
    const chatId = chatMember.chat.id;
    const userId = chatMember.from.id;
    const newStatus = chatMember.new_chat_member.status;
    const oldStatus = chatMember.old_chat_member.status;

    this.logger.log(
      `Chat member update for project ${project.id}: user ${userId} status changed from ${oldStatus} to ${newStatus} in chat ${chatId}`,
    );

    // TODO: Implement membership validation when users join groups
    // TODO: Kick users without valid membership
  }

  /**
   * Handle bot's chat member status updates
   */
  private async handleMyChatMember(
    project: Project,
    myChatMember: any,
  ): Promise<void> {
    const chatId = myChatMember.chat.id;
    const newStatus = myChatMember.new_chat_member.status;
    const oldStatus = myChatMember.old_chat_member.status;

    this.logger.log(
      `Bot status changed in chat ${chatId} for project ${project.id}: ${oldStatus} -> ${newStatus}`,
    );

    // TODO: Handle bot being added/removed from groups
    // TODO: Update group configuration in database
  }

  /**
   * Initiate payment for a membership plan
   */
  private async initiatePayment(
    project: Project,
    callbackQuery: any,
    planId: string,
    telegramUserId: string,
  ): Promise<void> {
    try {
      const chatId = callbackQuery.message?.chat?.id;
      const from = callbackQuery.from;

      // Get plan details with telegram_groups relation
      const plan = await this.membershipPlanService.findOne(
        project.tenant_id,
        planId,
      );

      if (!plan.is_active) {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
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
          telegram_username: from.username,
          telegram_first_name: from.first_name,
          telegram_last_name: from.last_name,
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
      const paymentButtons: any[][] = [
        [{ text: '💳 Төлбөр төлөх', url: result.payment_link }]
      ];

      // Add demo payment button in development mode
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (isDevelopment) {
        paymentButtons.push([
          { text: '🧪 Demo Payment (Dev Only)', callback_data: `demo_pay:${result.transaction.id}` }
        ]);
      }

      // Send QR code image with payment buttons
      if (result.qr_image) {
        try {
          // Convert base64 to buffer and send as photo
          const qrBuffer = Buffer.from(result.qr_image, 'base64');

          await this.telegramApiService.sendPhoto(
            project.bot_token,
            chatId,
            qrBuffer,
            {
              caption:
                `💳 *${plan.name}-ийн төлбөр*\n\n` +
                `Үнэ: ${priceInt.toLocaleString()} MNT\n` +
                `Хугацаа: ${plan.duration_days} хоног${groupText}\n\n` +
                `📱 QR кодыг уншуулж эсвэл доорх товчоор төлбөр төлнө үү:` +
                (isDevelopment ? `\n\n⚠️ *Хөгжүүлэлтийн горим:* Demo payment товч идэвхтэй` : ''),
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: paymentButtons,
              },
            },
          );
        } catch (qrError) {
          this.logger.error('Failed to send QR code image', qrError.stack);
          // Fallback: send payment link as text
          await this.telegramApiService.sendMessage(
            project.bot_token,
            chatId,
            `💳 *Төлбөр төлөх*\n\n` +
              `Үнэ: ${priceInt.toLocaleString()} MNT\n` +
              `Хугацаа: ${plan.duration_days} хоног${groupText}` +
              (isDevelopment ? `\n\n⚠️ *Хөгжүүлэлтийн горим:* Demo payment товч идэвхтэй` : ''),
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: paymentButtons,
              },
            },
          );
        }
      } else {
        // No QR image, send payment link only
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          `💳 *${plan.name}-ийн төлбөр*\n\n` +
            `Үнэ: ${priceInt.toLocaleString()} MNT\n` +
            `Хугацаа: ${plan.duration_days} хоног${groupText}\n\n` +
            `📱 Доорх товчоор төлбөр төлнө үү:` +
            (isDevelopment ? `\n\n⚠️ *Хөгжүүлэлтийн горим:* Demo payment товч идэвхтэй` : ''),
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: paymentButtons,
            },
          },
        );
      }
    } catch (error) {
      this.logger.error('Error initiating payment', error.stack);
      const chatId = callbackQuery.message?.chat?.id;
      if (chatId) {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          '❌ Төлбөр эхлүүлэхэд алдаа гарлаа. Дахин оролдох эсвэл тусламжид хандана уу.',
        );
      }
    }
  }

  /**
   * Handle demo payment simulation (development only)
   */
  private async handleDemoPayment(
    project: Project,
    callbackQuery: any,
    transactionId: string,
  ): Promise<void> {
    try {
      const chatId = callbackQuery.message?.chat?.id;

      // Only allow in development mode
      if (process.env.NODE_ENV !== 'development') {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          'Demo payment is only available in development mode',
        );
        return;
      }

      this.logger.log(`Demo payment triggered for transaction ${transactionId}`);

      // Find the payment transaction
      const transaction = await this.paymentTransactionService.findOne(
        project.tenant_id,
        transactionId,
      );

      if (!transaction) {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          '❌ Төлбөрийн гүйлгээ олдсонгүй.',
        );
        return;
      }

      // Check if already completed
      if (transaction.status === 'completed') {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          '✅ Энэ төлбөр аль хэдийн төлөгдсөн байна.',
        );
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

      await this.telegramApiService.sendMessage(
        project.bot_token,
        chatId,
        `✅ *Demo төлбөр амжилттай!*\n\n` +
          `🧪 Энэ бол тест төлбөр байна.\n` +
          `Таны гишүүнчлэл удахгүй идэвхжинэ.`,
        { parse_mode: 'Markdown' },
      );
    } catch (error) {
      this.logger.error('Error processing demo payment', error.stack);
      const chatId = callbackQuery.message?.chat?.id;
      if (chatId) {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          '❌ Demo төлбөр хийхэд алдаа гарлаа.',
        );
      }
    }
  }

  /**
   * Activate trial membership for a user
   */
  private async activateTrial(
    project: Project,
    callbackQuery: any,
    planId: string,
    telegramUserId: number,
  ): Promise<void> {
    try {
      const chatId = callbackQuery.message?.chat?.id;
      const from = callbackQuery.from;

      // Get plan details with telegram_groups relation
      const plan = await this.membershipPlanService.findOne(
        project.tenant_id,
        planId,
      );

      if (!plan.is_active) {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          '❌ Энэ багц боломжгүй болсон байна. Өөр багц сонгоно уу.',
        );
        return;
      }

      if (!plan.trial_enabled) {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
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
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
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
          telegram_username: from.username,
          first_name: from.first_name,
          last_name: from.last_name,
          is_bot: from.is_bot,
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
      await this.telegramApiService.sendMessage(
        project.bot_token,
        chatId,
        `🎉 *Туршилт идэвхжлээ!*\n\n` +
          `Багц: *${plan.name}*\n` +
          `Хугацаа: ${trialDurationText}\n` +
          `Дуусах огноо: ${trialEndsAt.toLocaleString()}\n` +
          `Бүлгүүд: ${groupCount}\n\n` +
          `✅ Таныг удахгүй бүлгүүдэд нэмнэ.\n\n` +
          `⚠️ *Анхаар:* Туршилт дууссаны дараа бүрэн гишүүнчлэл худалдан авахгүй бол таныг бүлгүүдээс автоматаар хасна.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '💳 Бүрэн гишүүнчлэл авах', callback_data: `buy_plan_${plan.id}` }],
              [{ text: '📊 Миний төлөв', callback_data: 'my_status' }],
            ],
          },
        },
      );
    } catch (error) {
      this.logger.error('Error activating trial', error.stack);
      const chatId = callbackQuery.message?.chat?.id;

      if (error.response?.error?.code === 'TRIAL_ALREADY_USED') {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          '❌ Та энэ багцын туршилтыг аль хэдийн ашигласан байна. Үргэлжлүүлэхийн тулд бүрэн гишүүнчлэл худалдан авна уу.',
        );
      } else {
        await this.telegramApiService.sendMessage(
          project.bot_token,
          chatId,
          '❌ Туршилт идэвхжүүлэхэд алдаа гарлаа. Дахин оролдох эсвэл тусламжид хандана уу.',
        );
      }
    }
  }

  /**
   * Set tenant context for database operations (RLS)
   */
  private async setTenantContext(tenantId: string): Promise<void> {
    try {
      // Validate UUID format to prevent SQL injection
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(tenantId)) {
        throw new Error(`Invalid tenant ID format: ${tenantId}`);
      }

      // Use string interpolation (safe after UUID validation)
      await this.dataSource.query(
        `SET LOCAL app.current_tenant = '${tenantId}'`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to set tenant context for ${tenantId}:`,
        error.stack,
      );
    }
  }
}
