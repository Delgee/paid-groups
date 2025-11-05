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
   * Handle callback queries (inline button presses)
   */
  private async handleCallbackQuery(
    project: Project,
    callbackQuery: any,
  ): Promise<void> {
    const queryId = callbackQuery.id;
    const data = callbackQuery.data;
    const chatId = callbackQuery.message?.chat?.id;

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
