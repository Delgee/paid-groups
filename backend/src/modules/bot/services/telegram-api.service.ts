import { Injectable, Logger } from '@nestjs/common';
import { Telegraf } from 'telegraf';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_bot: boolean;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  description?: string;
  member_count?: number;
}

export interface SendMessageOptions {
  reply_markup?: any;
  parse_mode?: 'HTML' | 'Markdown';
  disable_web_page_preview?: boolean;
}

@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);
  private bots: Map<string, Telegraf> = new Map();

  private getBotInstance(botToken: string): Telegraf {
    if (!this.bots.has(botToken)) {
      const bot = new Telegraf(botToken);
      this.bots.set(botToken, bot);
    }
    return this.bots.get(botToken)!;
  }

  async verifyBotToken(botToken: string): Promise<TelegramUser | null> {
    try {
      const bot = this.getBotInstance(botToken);
      const botInfo = await bot.telegram.getMe();
      
      return {
        id: botInfo.id,
        first_name: botInfo.first_name,
        last_name: botInfo.last_name,
        username: botInfo.username,
        is_bot: botInfo.is_bot,
      };
    } catch (error) {
      this.logger.error(`Failed to verify bot token: ${error.message}`);
      return null;
    }
  }

  async getChatInfo(botToken: string, chatId: string | number): Promise<TelegramChat | null> {
    try {
      const bot = this.getBotInstance(botToken);
      const chat = await bot.telegram.getChat(chatId);
      
      return {
        id: chat.id,
        type: chat.type,
        title: 'title' in chat ? chat.title : undefined,
        username: 'username' in chat ? chat.username : undefined,
        description: 'description' in chat ? chat.description : undefined,
        member_count: await this.getChatMemberCount(botToken, chatId),
      };
    } catch (error) {
      this.logger.error(`Failed to get chat info for ${chatId}: ${error.message}`);
      return null;
    }
  }

  async getChatMemberCount(botToken: string, chatId: string | number): Promise<number> {
    try {
      const bot = this.getBotInstance(botToken);
      return await bot.telegram.getChatMembersCount(chatId);
    } catch (error) {
      this.logger.error(`Failed to get chat member count for ${chatId}: ${error.message}`);
      return 0;
    }
  }

  async sendMessage(
    botToken: string, 
    chatId: string | number, 
    message: string, 
    options?: SendMessageOptions
  ): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      await bot.telegram.sendMessage(chatId, message, options);
      this.logger.log(`Message sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message to chat ${chatId}: ${error.message}`);
      return false;
    }
  }

  async kickChatMember(
    botToken: string, 
    chatId: string | number, 
    userId: number
  ): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      await bot.telegram.banChatMember(chatId, userId);
      
      // Immediately unban to allow them to rejoin later if needed
      await bot.telegram.unbanChatMember(chatId, userId);
      
      this.logger.log(`User ${userId} removed from chat ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove user ${userId} from chat ${chatId}: ${error.message}`);
      return false;
    }
  }

  async restrictChatMember(
    botToken: string,
    chatId: string | number,
    userId: number,
    permissions: {
      can_send_messages?: boolean;
      can_send_media_messages?: boolean;
      can_send_other_messages?: boolean;
      can_add_web_page_previews?: boolean;
    }
  ): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      await bot.telegram.restrictChatMember(chatId, userId, { permissions });
      this.logger.log(`User ${userId} restricted in chat ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to restrict user ${userId} in chat ${chatId}: ${error.message}`);
      return false;
    }
  }

  async getChatMember(
    botToken: string,
    chatId: string | number,
    userId: number
  ): Promise<any> {
    try {
      const bot = this.getBotInstance(botToken);
      return await bot.telegram.getChatMember(chatId, userId);
    } catch (error) {
      this.logger.error(`Failed to get chat member ${userId} in chat ${chatId}: ${error.message}`);
      return null;
    }
  }

  async isBotAdminInChat(botToken: string, chatId: string | number): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      const botInfo = await bot.telegram.getMe();
      const member = await bot.telegram.getChatMember(chatId, botInfo.id);
      
      return ['creator', 'administrator'].includes(member.status);
    } catch (error) {
      this.logger.error(`Failed to check bot admin status in chat ${chatId}: ${error.message}`);
      return false;
    }
  }

  async generateInviteLink(
    botToken: string,
    chatId: string | number,
    expireDate?: Date,
    memberLimit?: number
  ): Promise<string | null> {
    try {
      const bot = this.getBotInstance(botToken);
      const options: any = {};
      
      if (expireDate) {
        options.expire_date = Math.floor(expireDate.getTime() / 1000);
      }
      
      if (memberLimit) {
        options.member_limit = memberLimit;
      }
      
      const link = await bot.telegram.createChatInviteLink(chatId, options);
      return link.invite_link;
    } catch (error) {
      this.logger.error(`Failed to generate invite link for chat ${chatId}: ${error.message}`);
      return null;
    }
  }

  async revokeInviteLink(botToken: string, inviteLink: string): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      await bot.telegram.revokeChatInviteLink(inviteLink.split('/').pop()!, inviteLink);
      return true;
    } catch (error) {
      this.logger.error(`Failed to revoke invite link ${inviteLink}: ${error.message}`);
      return false;
    }
  }

  async setWebhook(botToken: string, webhookUrl: string): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      await bot.telegram.setWebhook(webhookUrl);
      this.logger.log(`Webhook set for bot: ${webhookUrl}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set webhook: ${error.message}`);
      return false;
    }
  }

  async deleteWebhook(botToken: string): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      await bot.telegram.deleteWebhook();
      this.logger.log('Webhook deleted for bot');
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete webhook: ${error.message}`);
      return false;
    }
  }

  async getWebhookInfo(botToken: string): Promise<any> {
    try {
      const bot = this.getBotInstance(botToken);
      return await bot.telegram.getWebhookInfo();
    } catch (error) {
      this.logger.error(`Failed to get webhook info: ${error.message}`);
      return null;
    }
  }

  cleanupBotInstance(botToken: string): void {
    if (this.bots.has(botToken)) {
      const bot = this.bots.get(botToken)!;
      bot.stop();
      this.bots.delete(botToken);
    }
  }


  async answerCallbackQuery(
    botToken: string,
    callbackQueryId: string,
    text?: string
  ): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      await bot.telegram.answerCbQuery(callbackQueryId, text);
      return true;
    } catch (error) {
      this.logger.error(`Failed to answer callback query ${callbackQueryId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Sets the title of a chat/channel
   * @param botToken - The bot token
   * @param chatId - The chat/channel ID
   * @param title - The new title (1-128 characters)
   * @returns Promise<boolean> - True if successful, false otherwise
   */
  async setChatTitle(botToken: string, chatId: string | number, title: string): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      await bot.telegram.setChatTitle(chatId, title);
      this.logger.log(`Chat title updated successfully for chat ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set chat title for chat ${chatId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Sets the description of a chat/channel
   * @param botToken - The bot token
   * @param chatId - The chat/channel ID
   * @param description - The new description (0-255 characters)
   * @returns Promise<boolean> - True if successful, false otherwise
   */
  async setChatDescription(botToken: string, chatId: string | number, description: string): Promise<boolean> {
    try {
      const bot = this.getBotInstance(botToken);
      await bot.telegram.setChatDescription(chatId, description);
      this.logger.log(`Chat description updated successfully for chat ${chatId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to set chat description for chat ${chatId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Gets channel information specifically for channels
   * @param botToken - The bot token
   * @param channelId - The channel ID (must be a channel)
   * @returns Promise<TelegramChat | null> - Channel info if successful, null otherwise
   */
  async getChannelInfo(botToken: string, channelId: string | number): Promise<TelegramChat | null> {
    try {
      const bot = this.getBotInstance(botToken);
      const chat = await bot.telegram.getChat(channelId);

      // Verify it's actually a channel
      if (chat.type !== 'channel') {
        this.logger.warn(`Chat ${channelId} is not a channel, type: ${chat.type}`);
        return null;
      }

      return {
        id: chat.id,
        type: chat.type,
        title: 'title' in chat ? chat.title : undefined,
        username: 'username' in chat ? chat.username : undefined,
        description: 'description' in chat ? chat.description : undefined,
        member_count: await this.getChatMemberCount(botToken, channelId),
      };
    } catch (error) {
      this.logger.error(`Failed to get channel info for ${channelId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Verifies bot permissions in a channel
   * @param botToken - The bot token
   * @param channelId - The channel ID
   * @returns Promise<object> - Bot permissions in the channel
   */
  async verifyBotPermissionsInChannel(
    botToken: string,
    channelId: string | number
  ): Promise<{
    isAdmin: boolean;
    canPostMessages: boolean;
    canEditMessages: boolean;
    canDeleteMessages: boolean
  }> {
    try {
      const bot = this.getBotInstance(botToken);
      const botInfo = await bot.telegram.getMe();
      const member = await bot.telegram.getChatMember(channelId, botInfo.id);

      const isAdmin = ['creator', 'administrator'].includes(member.status);

      // For administrators, check specific permissions
      let canPostMessages = false;
      let canEditMessages = false;
      let canDeleteMessages = false;

      if (member.status === 'creator') {
        // Creator has all permissions
        canPostMessages = true;
        canEditMessages = true;
        canDeleteMessages = true;
      } else if (member.status === 'administrator') {
        // Check specific admin permissions
        canPostMessages = member.can_post_messages !== false;
        canEditMessages = member.can_edit_messages !== false;
        canDeleteMessages = member.can_delete_messages !== false;
      }

      this.logger.log(`Bot permissions verified for channel ${channelId}: admin=${isAdmin}, post=${canPostMessages}, edit=${canEditMessages}, delete=${canDeleteMessages}`);

      return {
        isAdmin,
        canPostMessages,
        canEditMessages,
        canDeleteMessages,
      };
    } catch (error) {
      this.logger.error(`Failed to verify bot permissions in channel ${channelId}: ${error.message}`);
      return {
        isAdmin: false,
        canPostMessages: false,
        canEditMessages: false,
        canDeleteMessages: false,
      };
    }
  }

  /**
   * Posts a message to a channel
   * @param botToken - The bot token
   * @param channelId - The channel ID
   * @param message - The message text
   * @param options - Additional message options
   * @returns Promise<object> - Success status and message ID if successful
   */
  async postToChannel(
    botToken: string,
    channelId: string | number,
    message: string,
    options?: SendMessageOptions
  ): Promise<{ success: boolean; messageId?: number }> {
    try {
      const bot = this.getBotInstance(botToken);
      const sentMessage = await bot.telegram.sendMessage(channelId, message, options);

      this.logger.log(`Message posted successfully to channel ${channelId}, message ID: ${sentMessage.message_id}`);

      return {
        success: true,
        messageId: sentMessage.message_id,
      };
    } catch (error) {
      this.logger.error(`Failed to post message to channel ${channelId}: ${error.message}`);
      return {
        success: false,
      };
    }
  }
}