import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Telegraf } from 'telegraf';
import { LoggerService } from '../../../common/logger/logger.service';

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
  private readonly logger: LoggerService;
  private bots: Map<string, Telegraf> = new Map();

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('TelegramApiService');
  }

  private getBotInstance(botToken: string): Telegraf {
    if (!this.bots.has(botToken)) {
      const bot = new Telegraf(botToken);
      this.bots.set(botToken, bot);
    }
    return this.bots.get(botToken)!;
  }

  private generateCacheKey(prefix: string, ...args: (string | number)[]): string {
    return `telegram:${prefix}:${args.join(':')}`;
  }

  private async invalidateChatCache(chatId: string | number): Promise<void> {
    try {
      const keys = [
        this.generateCacheKey('chat:info', chatId),
        this.generateCacheKey('channel:info', chatId),
        this.generateCacheKey('chat:members:count', chatId),
      ];

      await Promise.all(keys.map(key => this.cacheManager.del(key)));
      this.logger.debug(`Cache invalidated for chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for chat ${chatId}: ${error.message}`);
    }
  }

  /**
   * Rate limiter using token bucket algorithm
   * Telegram allows 30 requests per second per bot
   * @param botToken - The bot token to rate limit
   * @returns Promise<boolean> - True if request is allowed, false if rate limited
   */
  private async checkRateLimit(botToken: string): Promise<boolean> {
    const rateLimitKey = this.generateCacheKey('ratelimit', botToken.slice(-8));
    const maxTokens = 30; // Max requests per second
    const refillRate = 30; // Tokens refilled per second
    const now = Date.now();

    try {
      const cached = await this.cacheManager.get<{ tokens: number; lastRefill: number }>(rateLimitKey);

      let tokens = maxTokens;
      let lastRefill = now;

      if (cached) {
        // Calculate tokens to refill based on time elapsed
        const timePassed = (now - cached.lastRefill) / 1000; // Convert to seconds
        const tokensToAdd = Math.floor(timePassed * refillRate);
        tokens = Math.min(cached.tokens + tokensToAdd, maxTokens);
        lastRefill = cached.lastRefill + (tokensToAdd * 1000 / refillRate);
      }

      // Check if we have tokens available
      if (tokens < 1) {
        this.logger.telegram('RateLimitExceeded', {
          botToken: botToken.slice(-8),
          tokensAvailable: tokens,
        }, 'warn');
        return false;
      }

      // Consume one token
      tokens -= 1;

      // Update cache with new token count
      await this.cacheManager.set(rateLimitKey, { tokens, lastRefill }, 60000); // 1 minute TTL

      return true;
    } catch (error) {
      this.logger.error(`Rate limit check failed: ${error.message}`);
      // On error, allow the request (fail open)
      return true;
    }
  }

  /**
   * Executes a Telegram API call with rate limiting
   * @param botToken - The bot token
   * @param operation - The operation to execute
   * @returns Promise<T> - The result of the operation
   */
  private async executeWithRateLimit<T>(
    botToken: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const isAllowed = await this.checkRateLimit(botToken);

    if (!isAllowed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    return operation();
  }

  async verifyBotToken(botToken: string): Promise<TelegramUser | null> {
    const cacheKey = this.generateCacheKey('bot:verify', botToken.slice(-8));

    try {
      // Check cache first
      const cached = await this.cacheManager.get<TelegramUser>(cacheKey);
      if (cached) {
        this.logger.debug(`Bot verification cache hit for key: ${cacheKey}`);
        return cached;
      }

      const bot = this.getBotInstance(botToken);
      const botInfo = await bot.telegram.getMe();

      const result: TelegramUser = {
        id: botInfo.id,
        first_name: botInfo.first_name,
        last_name: botInfo.last_name,
        username: botInfo.username,
        is_bot: botInfo.is_bot,
      };

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, result, 3600000);

      return result;
    } catch (error) {
      this.logger.error(`Failed to verify bot token: ${error.message}`);
      return null;
    }
  }

  async getChatInfo(botToken: string, chatId: string | number): Promise<TelegramChat | null> {
    const cacheKey = this.generateCacheKey('chat:info', chatId);

    try {
      // Check cache first
      const cached = await this.cacheManager.get<TelegramChat>(cacheKey);
      if (cached) {
        this.logger.debug(`Chat info cache hit for ${chatId}`);
        return cached;
      }

      const bot = this.getBotInstance(botToken);
      const chat = await bot.telegram.getChat(chatId);

      const result: TelegramChat = {
        id: chat.id,
        type: chat.type,
        title: 'title' in chat ? chat.title : undefined,
        username: 'username' in chat ? chat.username : undefined,
        description: 'description' in chat ? chat.description : undefined,
        member_count: await this.getChatMemberCount(botToken, chatId),
      };

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, result, 3600000);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get chat info for ${chatId}: ${error.message}`);
      return null;
    }
  }

  async getChatMemberCount(botToken: string, chatId: string | number): Promise<number> {
    const cacheKey = this.generateCacheKey('chat:members:count', chatId);

    try {
      // Check cache first - shorter TTL for member count (5 minutes)
      const cached = await this.cacheManager.get<number>(cacheKey);
      if (cached !== undefined && cached !== null) {
        this.logger.debug(`Chat member count cache hit for ${chatId}`);
        return cached;
      }

      const bot = this.getBotInstance(botToken);
      const count = await bot.telegram.getChatMembersCount(chatId);

      // Cache for 5 minutes (member count changes more frequently)
      await this.cacheManager.set(cacheKey, count, 300000);

      return count;
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
    const startTime = Date.now();
    try {
      await this.executeWithRateLimit(botToken, async () => {
        const bot = this.getBotInstance(botToken);
        await bot.telegram.sendMessage(chatId, message, options);
      });

      const duration = Date.now() - startTime;
      this.logger.telegram('SendMessage', {
        chatId,
        messageLength: message.length,
        duration,
        success: true,
      });

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.telegram('SendMessage', {
        chatId,
        error: error.message,
        duration,
        success: false,
      }, 'error');

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
    const startTime = Date.now();
    try {
      await this.executeWithRateLimit(botToken, async () => {
        const bot = this.getBotInstance(botToken);
        await bot.telegram.setChatTitle(chatId, title);
      });

      // Invalidate cache after update
      await this.invalidateChatCache(chatId);

      const duration = Date.now() - startTime;
      this.logger.telegram('SetChatTitle', {
        chatId,
        title,
        duration,
        success: true,
      });

      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.telegram('SetChatTitle', {
        chatId,
        error: error.message,
        duration,
        success: false,
      }, 'error');

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
      await this.executeWithRateLimit(botToken, async () => {
        const bot = this.getBotInstance(botToken);
        await bot.telegram.setChatDescription(chatId, description);
      });

      // Invalidate cache after update
      await this.invalidateChatCache(chatId);

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
    const cacheKey = this.generateCacheKey('channel:info', channelId);

    try {
      // Check cache first
      const cached = await this.cacheManager.get<TelegramChat>(cacheKey);
      if (cached) {
        this.logger.debug(`Channel info cache hit for ${channelId}`);
        return cached;
      }

      const bot = this.getBotInstance(botToken);
      const chat = await bot.telegram.getChat(channelId);

      // Verify it's actually a channel
      if (chat.type !== 'channel') {
        this.logger.warn(`Chat ${channelId} is not a channel, type: ${chat.type}`);
        return null;
      }

      const result: TelegramChat = {
        id: chat.id,
        type: chat.type,
        title: 'title' in chat ? chat.title : undefined,
        username: 'username' in chat ? chat.username : undefined,
        description: 'description' in chat ? chat.description : undefined,
        member_count: await this.getChatMemberCount(botToken, channelId),
      };

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, result, 3600000);

      return result;
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
      const sentMessage = await this.executeWithRateLimit(botToken, async () => {
        const bot = this.getBotInstance(botToken);
        return await bot.telegram.sendMessage(channelId, message, options);
      });

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