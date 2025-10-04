import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramBot } from '../entities/telegram-bot.entity';
import { TelegramGroup } from '../../telegram-groups/telegram-groups.entity';
import { User } from '../../auth/entities/user.entity';
import { TelegramApiService } from './telegram-api.service';
import { MemberService } from '../../membership/services/member.service';
import { MembershipService } from '../../membership/services/membership.service';

export interface CommandContext {
  bot: TelegramBot;
  message: any;
  chatId: number;
  userId: number;
  args: string[];
}

@Injectable()
export class BotCommandHandlerService {
  private readonly logger = new Logger(BotCommandHandlerService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TelegramGroup)
    private readonly telegramGroupRepository: Repository<TelegramGroup>,
    private readonly telegramApiService: TelegramApiService,
    private readonly memberService: MemberService,
    private readonly membershipService: MembershipService,
  ) {}

  /**
   * Check if user is an admin (owner/admin role in the platform)
   * Currently unused but kept for future platform-level admin checks
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async isAdmin(userId: number, tenantId: string): Promise<boolean> {
    try {
      // Find member by telegram user ID
      const member = await this.memberService.findByTelegramUserId(userId, tenantId);

      if (!member) {
        return false;
      }

      // Check if there's a user account linked (owners/admins have user accounts)
      const user = await this.userRepository.findOne({
        where: {
          tenant_id: tenantId,
          email: `tg_${userId}@temp.local`, // This is a placeholder - you may need a proper user-member link table
        },
      });

      return user && (user.role === 'owner' || user.role === 'admin');
    } catch (error) {
      this.logger.error(`Error checking admin status for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user is a Telegram chat administrator
   */
  private async isChatAdmin(botToken: string, chatId: number, userId: number): Promise<boolean> {
    try {
      const chatMember = await this.telegramApiService.getChatMember(botToken, chatId, userId);

      if (!chatMember) {
        return false;
      }

      return chatMember.status === 'creator' || chatMember.status === 'administrator';
    } catch (error) {
      this.logger.error(`Error checking chat admin status for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Handle /ban command
   * Usage: /ban @username [reason]
   */
  async handleBanCommand(ctx: CommandContext): Promise<void> {
    const { bot, message, chatId, userId, args } = ctx;

    // Check if command is used in a group
    if (message.chat.type === 'private') {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '⚠️ This command can only be used in group chats.'
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(bot.bot_token, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '⚠️ You must be a group administrator to use this command.'
      );
      return;
    }

    // Check if target user is specified
    if (args.length === 0) {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '❌ Usage: /ban @username [reason]\n\nExample: /ban @spammer Posting ads'
      );
      return;
    }

    const targetUsername = args[0].replace('@', '');
    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      // Find target member by username
      const targetMember = await this.memberService.findByUsername(targetUsername, bot.tenant_id);

      if (!targetMember) {
        await this.telegramApiService.sendMessage(
          bot.bot_token,
          chatId,
          `❌ User @${targetUsername} not found in our system.`
        );
        return;
      }

      // Ban user from the chat
      const banned = await this.telegramApiService.kickChatMember(
        bot.bot_token,
        chatId,
        targetMember.telegram_user_id
      );

      if (banned) {
        // Cancel their active memberships for this group
        await this.membershipService.cancelMembershipsByMemberAndChat(
          targetMember.id,
          chatId,
          reason
        );

        await this.telegramApiService.sendMessage(
          bot.bot_token,
          chatId,
          `✅ User @${targetUsername} has been banned.\n\nReason: ${reason}`,
          { parse_mode: 'Markdown' }
        );

        this.logger.log(`User @${targetUsername} (${targetMember.telegram_user_id}) banned from chat ${chatId} by ${userId}. Reason: ${reason}`);
      }
    } catch (error) {
      this.logger.error(`Error banning user @${targetUsername}:`, error);
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        `❌ Error banning user. Please try again.`
      );
    }
  }

  /**
   * Handle /extend command
   * Usage: /extend @username <days>
   */
  async handleExtendCommand(ctx: CommandContext): Promise<void> {
    const { bot, message, chatId, userId, args } = ctx;

    // Check if command is used in a group
    if (message.chat.type === 'private') {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '⚠️ This command can only be used in group chats.'
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(bot.bot_token, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '⚠️ You must be a group administrator to use this command.'
      );
      return;
    }

    // Validate arguments
    if (args.length < 2) {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '❌ Usage: /extend @username <days>\n\nExample: /extend @user123 30'
      );
      return;
    }

    const targetUsername = args[0].replace('@', '');
    const days = parseInt(args[1], 10);

    if (isNaN(days) || days <= 0) {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '❌ Days must be a positive number.'
      );
      return;
    }

    try {
      // Find target member
      const targetMember = await this.memberService.findByUsername(targetUsername, bot.tenant_id);

      if (!targetMember) {
        await this.telegramApiService.sendMessage(
          bot.bot_token,
          chatId,
          `❌ User @${targetUsername} not found in our system.`
        );
        return;
      }

      // Find the group
      const group = await this.telegramGroupRepository.findOne({
        where: {
          telegram_chat_id: chatId,
          bot_id: bot.id,
          tenant_id: bot.tenant_id,
        },
        relations: ['membership_plans'],
      });

      if (!group || !group.membership_plans || group.membership_plans.length === 0) {
        await this.telegramApiService.sendMessage(
          bot.bot_token,
          chatId,
          '❌ No membership plans found for this group.'
        );
        return;
      }

      // Get active membership or create one
      let membership = await this.membershipService.getActiveMembershipForGroupAndMember(
        targetMember.id,
        group.id
      );

      if (!membership) {
        // Create a new membership with the default plan
        const defaultPlan = group.membership_plans[0];
        membership = await this.membershipService.createMembership({
          member_id: targetMember.id,
          plan_id: defaultPlan.id,
          status: 'active',
          tenant_id: bot.tenant_id,
        });
      }

      // Extend membership
      const newExpiryDate = await this.membershipService.extendMembership(membership.id, days);

      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        `✅ Membership extended for @${targetUsername}\n\n` +
        `Extension: ${days} days\n` +
        `New expiry date: ${newExpiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
        { parse_mode: 'Markdown' }
      );

      this.logger.log(`Membership extended for @${targetUsername} (${targetMember.id}) by ${days} days in group ${group.id}`);
    } catch (error) {
      this.logger.error(`Error extending membership for @${targetUsername}:`, error);
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        `❌ Error extending membership. Please try again.`
      );
    }
  }

  /**
   * Handle /stats command
   * Shows group statistics
   */
  async handleStatsCommand(ctx: CommandContext): Promise<void> {
    const { bot, message, chatId, userId } = ctx;

    // Check if command is used in a group
    if (message.chat.type === 'private') {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '⚠️ This command can only be used in group chats.'
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(bot.bot_token, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '⚠️ You must be a group administrator to use this command.'
      );
      return;
    }

    try {
      // Find the group
      const group = await this.telegramGroupRepository.findOne({
        where: {
          telegram_chat_id: chatId,
          bot_id: bot.id,
          tenant_id: bot.tenant_id,
        },
      });

      if (!group) {
        await this.telegramApiService.sendMessage(
          bot.bot_token,
          chatId,
          '❌ Group not found in our system.'
        );
        return;
      }

      // Get group statistics
      const stats = await this.membershipService.getGroupStatistics(group.id);

      let statsText = `📊 *Group Statistics*\n\n`;
      statsText += `*${group.group_name}*\n\n`;
      statsText += `👥 Total Members: ${stats.total_members}\n`;
      statsText += `✅ Active Memberships: ${stats.active_memberships}\n`;
      statsText += `⏳ Trial Memberships: ${stats.trial_memberships}\n`;
      statsText += `❌ Expired: ${stats.expired_memberships}\n`;
      statsText += `💰 Total Revenue: ${stats.total_revenue.toLocaleString()} MNT\n`;
      statsText += `📅 This Month: ${stats.monthly_revenue.toLocaleString()} MNT\n`;

      if (stats.churn_rate !== undefined) {
        statsText += `\n📉 Churn Rate: ${stats.churn_rate.toFixed(2)}%\n`;
      }

      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        statsText,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error(`Error getting group stats for chat ${chatId}:`, error);
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '❌ Error retrieving statistics. Please try again.'
      );
    }
  }

  /**
   * Handle /members command
   * Lists active members
   */
  async handleMembersCommand(ctx: CommandContext): Promise<void> {
    const { bot, message, chatId, userId, args } = ctx;

    // Check if command is used in a group
    if (message.chat.type === 'private') {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '⚠️ This command can only be used in group chats.'
      );
      return;
    }

    // Check if user is admin
    const isAdmin = await this.isChatAdmin(bot.bot_token, chatId, userId);

    if (!isAdmin) {
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '⚠️ You must be a group administrator to use this command.'
      );
      return;
    }

    try {
      // Find the group
      const group = await this.telegramGroupRepository.findOne({
        where: {
          telegram_chat_id: chatId,
          bot_id: bot.id,
          tenant_id: bot.tenant_id,
        },
      });

      if (!group) {
        await this.telegramApiService.sendMessage(
          bot.bot_token,
          chatId,
          '❌ Group not found in our system.'
        );
        return;
      }

      // Get filter from args (default: active)
      const filter = args[0] || 'active';
      const validFilters = ['active', 'trial', 'expired', 'all'];

      if (!validFilters.includes(filter)) {
        await this.telegramApiService.sendMessage(
          bot.bot_token,
          chatId,
          `❌ Invalid filter. Use: ${validFilters.join(', ')}`
        );
        return;
      }

      // Get members list
      const members = await this.membershipService.getMembersByGroup(group.id, filter);

      if (members.length === 0) {
        await this.telegramApiService.sendMessage(
          bot.bot_token,
          chatId,
          `📋 No ${filter} members found.`
        );
        return;
      }

      let membersText = `👥 *${filter.toUpperCase()} Members* (${members.length})\n\n`;

      members.slice(0, 20).forEach((member, index) => {
        const username = member.username ? `@${member.username}` : member.first_name;
        const expiryDate = member.membership?.expires_at
          ? new Date(member.membership.expires_at).toLocaleDateString()
          : 'N/A';

        membersText += `${index + 1}. ${username}\n`;
        membersText += `   Status: ${member.membership?.status || 'Unknown'}\n`;
        membersText += `   Expires: ${expiryDate}\n`;
      });

      if (members.length > 20) {
        membersText += `\n_... and ${members.length - 20} more_`;
      }

      membersText += `\n\n💡 Filters: ${validFilters.join(', ')}`;

      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        membersText,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error(`Error listing members for chat ${chatId}:`, error);
      await this.telegramApiService.sendMessage(
        bot.bot_token,
        chatId,
        '❌ Error retrieving member list. Please try again.'
      );
    }
  }
}
