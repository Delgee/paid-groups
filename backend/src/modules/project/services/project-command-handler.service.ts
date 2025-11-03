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
        '⚠️ Энэ командыг зөвхөн бүлгийн чатад ашиглаж болно.',
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(botToken, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ Энэ командыг ашиглахын тулд бүлгийн админ байх ёстой.',
      );
      return;
    }

    // Check if target user is specified
    if (args.length === 0) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '❌ Хэрэглээ: /ban @хэрэглэгч [шалтгаан]\n\nЖишээ: /ban @spammer Зар сурталчилгаа хийсэн',
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
        `⚠️ @${targetUsername}-г хориглох командыг хүлээн авлаа.\n\nШалтгаан: ${reason}\n\n` +
        `Энэ функц нь бүрэн гишүүнчлэлийн интеграци хийгдэх шаардлагатай.`,
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
        `❌ Команд боловсруулахад алдаа гарлаа. Дахин оролдоно уу.`,
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
        '⚠️ Энэ командыг зөвхөн бүлгийн чатад ашиглаж болно.',
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(botToken, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ Энэ командыг ашиглахын тулд бүлгийн админ байх ёстой.',
      );
      return;
    }

    // Validate arguments
    if (args.length < 2) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '❌ Хэрэглээ: /extend @хэрэглэгч <хоног>\n\nЖишээ: /extend @user123 30',
      );
      return;
    }

    const targetUsername = args[0].replace('@', '');
    const days = parseInt(args[1], 10);

    if (isNaN(days) || days <= 0) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '❌ Хоног нь эерэг тоо байх ёстой.',
      );
      return;
    }

    try {
      // Note: Full implementation requires membership service integration
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        `⚠️ @${targetUsername}-ийн хугацаа сунгах командыг хүлээн авлаа (${days} хоног).\n\n` +
        `Энэ функц нь бүрэн гишүүнчлэлийн интеграци хийгдэх шаардлагатай.`,
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
        `❌ Команд боловсруулахад алдаа гарлаа. Дахин оролдоно уу.`,
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
        '⚠️ Энэ командыг зөвхөн бүлгийн чатад ашиглаж болно.',
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(botToken, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ Энэ командыг ашиглахын тулд бүлгийн админ байх ёстой.',
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
📊 <b>Бүлгийн статистик</b>

<b>Бүлэг:</b> ${chatInfo?.title || 'Тодорхойгүй'}
<b>Төрөл:</b> ${chatInfo?.type || 'Тодорхойгүй'}
<b>Гишүүд:</b> ${chatInfo?.member_count || 'Тодорхойгүй'}

<i>Бүрэн гишүүнчлэлийн статистик нь гишүүнчлэлийн үйлчилгээний интеграци шаардлагатай.</i>
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
        `❌ Статистик татахад алдаа гарлаа. Дахин оролдоно уу.`,
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
        '⚠️ Энэ командыг зөвхөн бүлгийн чатад ашиглаж болно.',
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(botToken, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '⚠️ Энэ командыг ашиглахын тулд бүлгийн админ байх ёстой.',
      );
      return;
    }

    const page = args.length > 0 ? parseInt(args[0], 10) : 1;

    if (isNaN(page) || page < 1) {
      await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        '❌ Хуудасны дугаар буруу байна. Хэрэглээ: /members [хуудас]',
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
👥 <b>Бүлгийн гишүүд</b>

<b>Бүлэг:</b> ${chatInfo?.title || 'Тодорхойгүй'}
<b>Нийт гишүүд:</b> ${chatInfo?.member_count || 'Тодорхойгүй'}

<i>Гишүүнчлэлийн дэлгэрэнгүй мэдээлэлтэй гишүүдийн бүрэн жагсаалт нь гишүүнчлэлийн үйлчилгээний интеграци шаардлагатай.</i>

<i>Хуудас ${page} - Хуудаслалтын тулд /members [хуудас] ашигла</i>
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
        `❌ Гишүүд татахад алдаа гарлаа. Дахин оролдоно уу.`,
      );
    }
  }
}
