import { Injectable, Logger } from '@nestjs/common';
import { TelegramApiService, TelegramChat } from '../../modules/bot/services/telegram-api.service';

export interface ChannelConnectionResult {
  success: boolean;
  channelInfo?: TelegramChat;
  error?: string;
}

export interface ChannelValidationResult {
  isValid: boolean;
  permissions: {
    isAdmin: boolean;
    canPostMessages: boolean;
    canEditMessages: boolean;
    canDeleteMessages: boolean;
  };
  error?: string;
}

export interface BotPermissionAnalysis {
  canManage: boolean;
  missingPermissions: string[];
}

export interface WelcomeMessageSettings {
  includeGroupName?: boolean;
  customText?: string;
  parseMode?: 'HTML' | 'Markdown';
  pinMessage?: boolean;
}

/**
 * Service for managing Telegram channel operations
 * Provides high-level business logic for channel management using TelegramApiService
 */
@Injectable()
export class TelegramChannelService {
  private readonly logger = new Logger(TelegramChannelService.name);

  constructor(private readonly telegramApiService: TelegramApiService) {}

  /**
   * Connect to a Telegram channel and optionally verify permissions
   * @param botToken - The bot token to use for connection
   * @param chatId - The channel ID to connect to
   * @param verifyPermissions - Whether to verify bot permissions (default: true)
   * @returns Promise with connection result including channel info or error
   */
  async connectToChannel(
    botToken: string,
    chatId: string,
    verifyPermissions: boolean = true,
  ): Promise<ChannelConnectionResult> {
    try {
      this.logger.log(`Attempting to connect to channel ${chatId}`);

      // First verify the bot token is valid
      const botInfo = await this.telegramApiService.verifyBotToken(botToken);
      if (!botInfo) {
        return {
          success: false,
          error: 'Invalid bot token provided',
        };
      }

      // Get channel information
      const channelInfo = await this.telegramApiService.getChannelInfo(botToken, chatId);
      if (!channelInfo) {
        return {
          success: false,
          error: 'Channel not found or bot cannot access the channel',
        };
      }

      // Verify it's actually a channel
      if (channelInfo.type !== 'channel') {
        return {
          success: false,
          error: `Chat type is '${channelInfo.type}', expected 'channel'`,
        };
      }

      // Optionally verify permissions
      if (verifyPermissions) {
        const permissionCheck = await this.verifyBotCanManageChannel(botToken, chatId);
        if (!permissionCheck.canManage) {
          return {
            success: false,
            error: `Bot lacks required permissions: ${permissionCheck.missingPermissions.join(', ')}`,
          };
        }
      }

      this.logger.log(`Successfully connected to channel ${chatId}: ${channelInfo.title}`);

      return {
        success: true,
        channelInfo,
      };
    } catch (error) {
      this.logger.error(`Failed to connect to channel ${chatId}: ${error.message}`);
      return {
        success: false,
        error: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * Validate channel connection and check bot permissions
   * @param botToken - The bot token to use
   * @param chatId - The channel ID to validate
   * @returns Promise with validation result including permissions
   */
  async validateChannelConnection(
    botToken: string,
    chatId: string,
  ): Promise<ChannelValidationResult> {
    try {
      this.logger.log(`Validating channel connection for ${chatId}`);

      // Verify bot token
      const botInfo = await this.telegramApiService.verifyBotToken(botToken);
      if (!botInfo) {
        return {
          isValid: false,
          permissions: {
            isAdmin: false,
            canPostMessages: false,
            canEditMessages: false,
            canDeleteMessages: false,
          },
          error: 'Invalid bot token',
        };
      }

      // Check if channel exists and is accessible
      const channelInfo = await this.telegramApiService.getChannelInfo(botToken, chatId);
      if (!channelInfo) {
        return {
          isValid: false,
          permissions: {
            isAdmin: false,
            canPostMessages: false,
            canEditMessages: false,
            canDeleteMessages: false,
          },
          error: 'Channel not found or inaccessible',
        };
      }

      // Get bot permissions in the channel
      const permissions = await this.telegramApiService.verifyBotPermissionsInChannel(
        botToken,
        chatId,
      );

      this.logger.log(`Channel validation completed for ${chatId}: valid=${true}, admin=${permissions.isAdmin}`);

      return {
        isValid: true,
        permissions,
      };
    } catch (error) {
      this.logger.error(`Failed to validate channel connection for ${chatId}: ${error.message}`);
      return {
        isValid: false,
        permissions: {
          isAdmin: false,
          canPostMessages: false,
          canEditMessages: false,
          canDeleteMessages: false,
        },
        error: `Validation failed: ${error.message}`,
      };
    }
  }

  /**
   * Update channel information (title and/or description)
   * @param botToken - The bot token to use
   * @param chatId - The channel ID to update
   * @param title - New title for the channel (optional)
   * @param description - New description for the channel (optional)
   * @returns Promise<boolean> - True if successful, false otherwise
   */
  async updateChannelInfo(
    botToken: string,
    chatId: string,
    title?: string,
    description?: string,
  ): Promise<boolean> {
    try {
      this.logger.log(`Updating channel info for ${chatId}`);

      // Verify bot has admin permissions
      const permissionCheck = await this.verifyBotCanManageChannel(botToken, chatId);
      if (!permissionCheck.canManage) {
        this.logger.error(`Bot lacks permissions to update channel ${chatId}: ${permissionCheck.missingPermissions.join(', ')}`);
        return false;
      }

      let titleUpdated = true;
      let descriptionUpdated = true;

      // Update title if provided
      if (title) {
        if (title.length < 1 || title.length > 128) {
          this.logger.error(`Invalid title length for channel ${chatId}: ${title.length} characters`);
          return false;
        }
        titleUpdated = await this.telegramApiService.setChatTitle(botToken, chatId, title);
      }

      // Update description if provided
      if (description) {
        if (description.length > 255) {
          this.logger.error(`Invalid description length for channel ${chatId}: ${description.length} characters`);
          return false;
        }
        descriptionUpdated = await this.telegramApiService.setChatDescription(botToken, chatId, description);
      }

      const success = titleUpdated && descriptionUpdated;

      if (success) {
        this.logger.log(`Channel info updated successfully for ${chatId}`);
      } else {
        this.logger.error(`Failed to update channel info for ${chatId}`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to update channel info for ${chatId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Post a welcome message to the channel
   * @param botToken - The bot token to use
   * @param chatId - The channel ID to post to
   * @param groupName - Name of the group for the welcome message
   * @param settings - Optional settings for the welcome message
   * @returns Promise<boolean> - True if successful, false otherwise
   */
  async postWelcomeMessage(
    botToken: string,
    chatId: string,
    groupName: string,
    settings?: WelcomeMessageSettings,
  ): Promise<boolean> {
    try {
      this.logger.log(`Posting welcome message to channel ${chatId} for group ${groupName}`);

      // Verify bot can post messages
      const permissions = await this.telegramApiService.verifyBotPermissionsInChannel(
        botToken,
        chatId,
      );

      if (!permissions.canPostMessages) {
        this.logger.error(`Bot cannot post messages to channel ${chatId}`);
        return false;
      }

      // Build welcome message
      let message = '';

      if (settings?.customText) {
        message = settings.customText;
        if (settings.includeGroupName !== false) {
          message = message.replace('{groupName}', groupName);
        }
      } else {
        // Default welcome message
        message = `🎉 Welcome to ${groupName}!\n\n` +
                 `This is your exclusive paid Telegram group. ` +
                 `Enjoy the premium content and community discussions!\n\n` +
                 `📱 Stay active and engage with fellow members\n` +
                 `💎 Access to exclusive content and updates\n` +
                 `🚀 Join the conversation and grow together!`;
      }

      // Post the message
      const result = await this.telegramApiService.postToChannel(
        botToken,
        chatId,
        message,
        {
          parse_mode: settings?.parseMode || 'HTML',
        },
      );

      if (result.success) {
        this.logger.log(`Welcome message posted successfully to channel ${chatId}, message ID: ${result.messageId}`);

        // TODO: Implement message pinning if requested
        // Note: Pinning requires additional permissions check and API call
        if (settings?.pinMessage && result.messageId) {
          this.logger.log(`Message pinning requested for message ${result.messageId} but not yet implemented`);
        }
      } else {
        this.logger.error(`Failed to post welcome message to channel ${chatId}`);
      }

      return result.success;
    } catch (error) {
      this.logger.error(`Failed to post welcome message to channel ${chatId}: ${error.message}`);
      return false;
    }
  }

  /**
   * Verify if bot can manage the channel and return detailed permission analysis
   * @param botToken - The bot token to use
   * @param chatId - The channel ID to check
   * @returns Promise with management capability and missing permissions
   */
  async verifyBotCanManageChannel(
    botToken: string,
    chatId: string,
  ): Promise<BotPermissionAnalysis> {
    try {
      this.logger.log(`Verifying bot management permissions for channel ${chatId}`);

      const permissions = await this.telegramApiService.verifyBotPermissionsInChannel(
        botToken,
        chatId,
      );

      const missingPermissions: string[] = [];

      // Check essential permissions for channel management
      if (!permissions.isAdmin) {
        missingPermissions.push('administrator_status');
      }

      if (!permissions.canPostMessages) {
        missingPermissions.push('post_messages');
      }

      if (!permissions.canEditMessages) {
        missingPermissions.push('edit_messages');
      }

      if (!permissions.canDeleteMessages) {
        missingPermissions.push('delete_messages');
      }

      const canManage = missingPermissions.length === 0;

      this.logger.log(`Bot management verification for channel ${chatId}: canManage=${canManage}, missing=[${missingPermissions.join(', ')}]`);

      return {
        canManage,
        missingPermissions,
      };
    } catch (error) {
      this.logger.error(`Failed to verify bot management permissions for channel ${chatId}: ${error.message}`);
      return {
        canManage: false,
        missingPermissions: ['verification_failed'],
      };
    }
  }
}