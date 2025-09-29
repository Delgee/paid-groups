import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramBot } from '../entities/telegram-bot.entity';
import { TelegramGroup } from '../../telegram-groups/telegram-groups.entity';
import { TelegramApiService } from './telegram-api.service';
import { MemberService } from '../../membership/services/member.service';
import { MembershipService } from '../../membership/services/membership.service';

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: 'private' | 'group' | 'supergroup' | 'channel';
      title?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
    };
    date: number;
    text?: string;
    new_chat_members?: Array<{
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    }>;
    left_chat_member?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: any;
    data?: string;
  };
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(TelegramBot)
    private readonly telegramBotRepository: Repository<TelegramBot>,
    @InjectRepository(TelegramGroup)
    private readonly telegramGroupRepository: Repository<TelegramGroup>,
    private readonly telegramApiService: TelegramApiService,
    private readonly memberService: MemberService,
    private readonly membershipService: MembershipService,
  ) {}

  /**
   * Process incoming Telegram webhook updates
   */
  async processUpdate(botToken: string, update: TelegramUpdate): Promise<void> {
    try {
      this.logger.debug(`Processing update ${update.update_id} for bot token: ${botToken.substring(0, 10)}...`);
      
      // Find the bot by token
      const bot = await this.telegramBotRepository.findOne({
        where: { bot_token: botToken },
        relations: ['tenant'],
      });

      if (!bot) {
        this.logger.warn(`Bot not found for token: ${botToken.substring(0, 10)}...`);
        return;
      }

      if (!bot.is_active) {
        this.logger.debug(`Bot ${bot.id} is inactive, ignoring update`);
        return;
      }

      // Set tenant context for database operations
      await this.setTenantContext(bot.tenant_id);

      // Handle different types of updates
      if (update.message) {
        await this.handleMessage(bot, update.message);
      }

      if (update.callback_query) {
        await this.handleCallbackQuery(bot, update.callback_query);
      }

    } catch (error) {
      this.logger.error(`Error processing update ${update.update_id}:`, error);
      throw error;
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(bot: TelegramBot, message: any): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from.id;

    this.logger.debug(`Handling message from user ${userId} in chat ${chatId}`);

    // Handle new chat members
    if (message.new_chat_members) {
      await this.handleNewChatMembers(bot, message);
      return;
    }

    // Handle left chat member
    if (message.left_chat_member) {
      await this.handleLeftChatMember(bot, message);
      return;
    }

    // Handle text commands
    if (message.text) {
      await this.handleTextCommand(bot, message);
    }
  }

  /**
   * Handle new members joining a group
   */
  private async handleNewChatMembers(bot: TelegramBot, message: any): Promise<void> {
    const chatId = message.chat.id;
    const newMembers = message.new_chat_members;

    // Find the group
    const group = await this.telegramGroupRepository.findOne({
      where: { 
        telegram_chat_id: chatId,
        bot_id: bot.id,
        tenant_id: bot.tenant_id,
      },
    });

    if (!group) {
      this.logger.warn(`Group not found for chat ${chatId} and bot ${bot.id}`);
      return;
    }

    for (const newMember of newMembers) {
      if (newMember.is_bot) {
        continue; // Skip bots
      }

      try {
        // Create or update member record
        const member = await this.memberService.createOrUpdateMember({
          telegram_user_id: newMember.id,
          first_name: newMember.first_name,
          last_name: newMember.last_name,
          username: newMember.username,
          is_bot: newMember.is_bot,
          tenant_id: bot.tenant_id,
        });

        // Check if member has valid membership for this group
        const hasValidMembership = await this.membershipService.hasValidMembershipForGroup(
          member.id,
          group.id
        );

        if (!hasValidMembership) {
          // Send welcome message with payment instructions
          await this.sendWelcomeMessage(bot, chatId, newMember.first_name);
          
          // Optional: Remove member if they don't have valid membership
          // await this.telegramApiService.kickChatMember(bot.bot_token, chatId, newMember.id);
        } else {
          // Send welcome message for valid members
          await this.sendMemberWelcomeMessage(bot, chatId, newMember.first_name);
        }

        this.logger.log(`Processed new member ${newMember.id} in group ${group.id}`);
      } catch (error) {
        this.logger.error(`Error processing new member ${newMember.id}:`, error);
      }
    }
  }

  /**
   * Handle members leaving a group
   */
  private async handleLeftChatMember(bot: TelegramBot, message: any): Promise<void> {
    const chatId = message.chat.id;
    const leftMember = message.left_chat_member;

    if (leftMember.is_bot) {
      return; // Skip bots
    }

    try {
      // Find the member
      const member = await this.memberService.findByTelegramUserId(leftMember.id, bot.tenant_id);
      
      if (member) {
        // Update member status or handle membership cleanup
        await this.memberService.handleMemberLeft(member.id, chatId);
        this.logger.log(`Processed left member ${leftMember.id} from chat ${chatId}`);
      }
    } catch (error) {
      this.logger.error(`Error processing left member ${leftMember.id}:`, error);
    }
  }

  /**
   * Handle text commands
   */
  private async handleTextCommand(bot: TelegramBot, message: any): Promise<void> {
    const text = message.text.toLowerCase().trim();
    const userId = message.from.id;

    // Handle common commands
    switch (text) {
      case '/start':
        await this.handleStartCommand(bot, message);
        break;
      
      case '/help':
        await this.handleHelpCommand(bot, message);
        break;
      
      case '/status':
        await this.handleStatusCommand(bot, message);
        break;
      
      case '/subscribe':
        await this.handleSubscribeCommand(bot, message);
        break;
      
      default:
        // Handle other text or ignore
        this.logger.debug(`Unhandled text command: ${text} from user ${userId}`);
        break;
    }
  }

  /**
   * Handle /start command
   */
  private async handleStartCommand(bot: TelegramBot, message: any): Promise<void> {
    const chatId = message.chat.id;
    const firstName = message.from.first_name;

    const welcomeText = `
Hello ${firstName}! 👋

Welcome to our premium Telegram group management bot.

Commands:
/help - Show available commands
/status - Check your membership status
/subscribe - Get subscription information

For support, contact our team.
    `.trim();

    await this.telegramApiService.sendMessage(bot.bot_token, chatId, welcomeText);
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(bot: TelegramBot, message: any): Promise<void> {
    const chatId = message.chat.id;

    const helpText = `
🤖 *Available Commands*

/start - Welcome message
/help - Show this help message
/status - Check your membership status
/subscribe - View available subscription plans

*Group Commands:*
When you join a group, I'll automatically check your membership status.

*Support:*
If you need help, please contact our support team.
    `.trim();

    await this.telegramApiService.sendMessage(bot.bot_token, chatId, helpText, {
      parse_mode: 'Markdown',
    });
  }

  /**
   * Handle /status command
   */
  private async handleStatusCommand(bot: TelegramBot, message: any): Promise<void> {
    const chatId = message.chat.id;
    const userId = message.from.id;

    try {
      // Find member
      const member = await this.memberService.findByTelegramUserId(userId, bot.tenant_id);
      
      if (!member) {
        await this.telegramApiService.sendMessage(
          bot.bot_token, 
          chatId, 
          'You are not registered in our system yet. Join a group to get started!'
        );
        return;
      }

      // Get active memberships
      const memberships = await this.membershipService.getActiveMembershipsForMember(member.id);
      
      let statusText = `👤 *Your Status*\n\n`;
      statusText += `Name: ${member.first_name}${member.last_name ? ' ' + member.last_name : ''}\n`;
      statusText += `Username: ${member.username ? '@' + member.username : 'Not set'}\n`;
      statusText += `Status: ✅ Active\n\n`;

      if (memberships.length > 0) {
        statusText += `*Active Memberships:*\n`;
        for (const membership of memberships) {
          statusText += `• ${membership.plan.name} (expires: ${new Date(membership.expires_at).toLocaleDateString()})\n`;
        }
      } else {
        statusText += `*No active memberships*\n`;
        statusText += `Use /subscribe to view available plans.\n`;
      }

      await this.telegramApiService.sendMessage(bot.bot_token, chatId, statusText, {
        parse_mode: 'Markdown',
      });

    } catch (error) {
      this.logger.error(`Error handling status command:`, error);
      await this.telegramApiService.sendMessage(
        bot.bot_token, 
        chatId, 
        'Sorry, there was an error checking your status. Please try again later.'
      );
    }
  }

  /**
   * Handle /subscribe command
   */
  private async handleSubscribeCommand(bot: TelegramBot, message: any): Promise<void> {
    const chatId = message.chat.id;

    try {
      // Get available membership plans
      const plans = await this.membershipService.getActivePlansForTenant(bot.tenant_id);

      if (plans.length === 0) {
        await this.telegramApiService.sendMessage(
          bot.bot_token, 
          chatId, 
          'No subscription plans are currently available. Please contact support.'
        );
        return;
      }

      let subscribeText = `💳 *Available Subscription Plans*\n\n`;
      
      for (const plan of plans) {
        subscribeText += `*${plan.name}*\n`;
        subscribeText += `Price: $${plan.price} ${plan.currency}\n`;
        subscribeText += `Duration: ${plan.duration_days} days\n`;
        if (plan.description) {
          subscribeText += `${plan.description}\n`;
        }
        subscribeText += `\n`;
      }

      subscribeText += `To subscribe, please contact our support team or visit our website.`;

      await this.telegramApiService.sendMessage(bot.bot_token, chatId, subscribeText, {
        parse_mode: 'Markdown',
      });

    } catch (error) {
      this.logger.error(`Error handling subscribe command:`, error);
      await this.telegramApiService.sendMessage(
        bot.bot_token, 
        chatId, 
        'Sorry, there was an error loading subscription plans. Please try again later.'
      );
    }
  }

  /**
   * Handle callback queries (inline keyboard button presses)
   */
  private async handleCallbackQuery(bot: TelegramBot, callbackQuery: any): Promise<void> {
    const queryId = callbackQuery.id;
    const data = callbackQuery.data;
    const chatId = callbackQuery.message?.chat?.id;
    const userId = callbackQuery.from.id;

    this.logger.debug(`Handling callback query: ${data} from user ${userId}`);

    try {
      // Answer the callback query to stop loading indicator
      await this.telegramApiService.answerCallbackQuery(bot.bot_token, queryId);

      // Handle different callback data
      if (data.startsWith('subscribe_')) {
        const planId = data.replace('subscribe_', '');
        await this.handleSubscriptionCallback(bot, chatId, userId, planId);
      }

    } catch (error) {
      this.logger.error(`Error handling callback query:`, error);
    }
  }

  /**
   * Handle subscription callback
   */
  private async handleSubscriptionCallback(
    bot: TelegramBot, 
    chatId: number, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: number, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _planId: string
  ): Promise<void> {
    // This would typically redirect to payment processing
    await this.telegramApiService.sendMessage(
      bot.bot_token,
      chatId,
      'Please visit our website to complete your subscription payment.'
    );
  }

  /**
   * Send welcome message to new members
   */
  private async sendWelcomeMessage(bot: TelegramBot, chatId: number, firstName: string): Promise<void> {
    const welcomeText = `
Welcome ${firstName}! 👋

To access this premium group, you need an active membership.

Use /subscribe to view available plans or contact our support team.
    `.trim();

    await this.telegramApiService.sendMessage(bot.bot_token, chatId, welcomeText);
  }

  /**
   * Send welcome message to valid members
   */
  private async sendMemberWelcomeMessage(bot: TelegramBot, chatId: number, firstName: string): Promise<void> {
    const welcomeText = `
Welcome ${firstName}! ✅

You have access to this premium group. Enjoy the exclusive content!

Use /status to check your membership details.
    `.trim();

    await this.telegramApiService.sendMessage(bot.bot_token, chatId, welcomeText);
  }

  /**
   * Set tenant context for database operations
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async setTenantContext(_tenantId: string): Promise<void> {
    // This should be implemented based on your RLS setup
    // For now, we'll assume the context is set at the request level
  }

  /**
   * Validate webhook signature (if needed)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateWebhookSignature(_body: string, _signature: string, _botToken: string): boolean {
    // Telegram doesn't require webhook signature validation like other services
    // The security comes from the secret URL path that includes the bot token
    return true;
  }
}