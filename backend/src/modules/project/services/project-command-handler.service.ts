import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { TelegramApiService } from '../../../integrations/telegram/telegram-api.service';

export interface CommandContext {
  project: Project;
  message: any;
  chatId: number;
  userId: number;
  args: string[];
}

/**
 * ProjectCommandHandlerService
 *
 * Handles admin commands for project bots in Telegram groups.
 * Commands: /ban, /extend, /stats, /members
 *
 * Note: Some commands require MembershipService integration which should be
 * added when the membership module is fully integrated with projects.
 */
@Injectable()
export class ProjectCommandHandlerService {
  private readonly logger = new Logger(ProjectCommandHandlerService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly telegramApiService: TelegramApiService,
  ) {}

  /**
   * Check if user is a Telegram chat administrator
   */
  private async isChatAdmin(
    botToken: string,
    chatId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      const chatMember = await this.telegramApiService.getChatMember(
        botToken,
        chatId,
        userId,
      );

      if (!chatMember) {
        return false;
      }

      return (
        chatMember.status === 'creator' || chatMember.status === 'administrator'
      );
    } catch (error) {
      this.logger.error(
        `Error checking chat admin status for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Handle /ban command
   * Usage: /ban @username [reason]
   *
   * Kicks a user from the group. Requires chat admin privileges.
   */
  async handleBanCommand(ctx: CommandContext): Promise<void> {
    const { project, message, chatId, userId, args } = ctx;
    const botToken = project.bot_token;

    // Check if command is used in a group
    if (message.chat.type === 'private') {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ This command can only be used in group chats.',
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(botToken, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ You must be a group administrator to use this command.',
      );
      return;
    }

    // Check if target user is specified
    if (args.length === 0) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '❌ Usage: /ban @username [reason]\n\nExample: /ban @spammer Posting ads',
      );
      return;
    }

    const targetUsername = args[0].replace('@', '');
    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      // Note: In a full implementation, you would look up the user by username
      // For now, this is a placeholder that shows the command structure
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        `⚠️ Ban command received for @${targetUsername}.\n\nReason: ${reason}\n\n` +
        `This feature requires full membership integration to be completed.`,
        { parse_mode: 'Markdown' },
      );

      this.logger.log(
        `Ban command issued for @${targetUsername} in chat ${chatId} by ${userId}. Reason: ${reason}`,
      );
    } catch (error) {
      this.logger.error(`Error processing ban command for @${targetUsername}:`, error);
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        `❌ Error processing command. Please try again.`,
      );
    }
  }

  /**
   * Handle /extend command
   * Usage: /extend @username <days>
   *
   * Extends a user's membership. Requires chat admin privileges and
   * membership service integration.
   */
  async handleExtendCommand(ctx: CommandContext): Promise<void> {
    const { project, message, chatId, userId, args } = ctx;
    const botToken = project.bot_token;

    // Check if command is used in a group
    if (message.chat.type === 'private') {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ This command can only be used in group chats.',
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(botToken, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ You must be a group administrator to use this command.',
      );
      return;
    }

    // Validate arguments
    if (args.length < 2) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '❌ Usage: /extend @username <days>\n\nExample: /extend @user123 30',
      );
      return;
    }

    const targetUsername = args[0].replace('@', '');
    const days = parseInt(args[1], 10);

    if (isNaN(days) || days <= 0) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '❌ Days must be a positive number.',
      );
      return;
    }

    try {
      // Note: Full implementation requires membership service integration
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        `⚠️ Extend command received for @${targetUsername} (${days} days).\n\n` +
        `This feature requires full membership integration to be completed.`,
        { parse_mode: 'Markdown' },
      );

      this.logger.log(
        `Extend command issued for @${targetUsername} (${days} days) in chat ${chatId} by ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing extend command for @${targetUsername}:`,
        error,
      );
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        `❌ Error processing command. Please try again.`,
      );
    }
  }

  /**
   * Handle /stats command
   * Shows group statistics
   *
   * Requires membership service integration for full functionality.
   */
  async handleStatsCommand(ctx: CommandContext): Promise<void> {
    const { project, message, chatId, userId } = ctx;
    const botToken = project.bot_token;

    // Check if command is used in a group
    if (message.chat.type === 'private') {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ This command can only be used in group chats.',
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(botToken, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ You must be a group administrator to use this command.',
      );
      return;
    }

    try {
      // Get basic chat info
      const chatInfo = await this.telegramApiService.getChatInfo(
        botToken,
        chatId,
      );

      const statsMessage = `
📊 <b>Group Statistics</b>

<b>Group:</b> ${chatInfo?.title || 'Unknown'}
<b>Type:</b> ${chatInfo?.type || 'Unknown'}
<b>Members:</b> ${chatInfo?.member_count || 'Unknown'}

<i>Full membership statistics require membership service integration.</i>
      `.trim();

      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        statsMessage,
        { parse_mode: 'HTML' },
      );

      this.logger.log(`Stats command executed in chat ${chatId} by ${userId}`);
    } catch (error) {
      this.logger.error(`Error processing stats command:`, error);
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        `❌ Error retrieving statistics. Please try again.`,
      );
    }
  }

  /**
   * Handle /members command
   * Lists group members with pagination
   *
   * Requires membership service integration for full functionality.
   */
  async handleMembersCommand(ctx: CommandContext): Promise<void> {
    const { project, message, chatId, userId, args } = ctx;
    const botToken = project.bot_token;

    // Check if command is used in a group
    if (message.chat.type === 'private') {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ This command can only be used in group chats.',
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(botToken, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ You must be a group administrator to use this command.',
      );
      return;
    }

    const page = args.length > 0 ? parseInt(args[0], 10) : 1;

    if (isNaN(page) || page < 1) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '❌ Invalid page number. Usage: /members [page]',
      );
      return;
    }

    try {
      // Get basic chat info
      const chatInfo = await this.telegramApiService.getChatInfo(
        botToken,
        chatId,
      );

      const membersMessage = `
👥 <b>Group Members</b>

<b>Group:</b> ${chatInfo?.title || 'Unknown'}
<b>Total Members:</b> ${chatInfo?.member_count || 'Unknown'}

<i>Full member listing with membership details requires membership service integration.</i>

<i>Page ${page} - Use /members [page] for pagination</i>
      `.trim();

      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        membersMessage,
        { parse_mode: 'HTML' },
      );

      this.logger.log(
        `Members command executed in chat ${chatId} by ${userId} (page ${page})`,
      );
    } catch (error) {
      this.logger.error(`Error processing members command:`, error);
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        `❌ Error retrieving members. Please try again.`,
      );
    }
  }
}
