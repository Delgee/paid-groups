import { Injectable, Logger } from '@nestjs/common';
import { TelegramApiService } from '../../integrations/telegram/telegram-api.service';

export interface ForwardedMessageInfo {
  forward_from_chat?: {
    id: number;
    title?: string;
    username?: string;
    type?: string;
  };
  sender_chat?: {
    id: number;
    title?: string;
    username?: string;
    type?: string;
  };
}

export interface BotResponse {
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

@Injectable()
export class ChannelIdBotService {
  private readonly logger = new Logger(ChannelIdBotService.name);

  constructor(private readonly telegramApiService: TelegramApiService) {}

  /**
   * Handle forwarded messages from channels/groups
   * Extracts and returns the channel/chat ID
   */
  async handleForwardedMessage(
    forwardedInfo: ForwardedMessageInfo,
    correlationId: string,
  ): Promise<BotResponse> {
    this.logger.log(`Processing forwarded message - Correlation ID: ${correlationId}`, {
      hasForwardFromChat: !!forwardedInfo.forward_from_chat,
      hasSenderChat: !!forwardedInfo.sender_chat,
    });

    // Check for forward_from_chat (messages forwarded from channels)
    if (forwardedInfo.forward_from_chat) {
      const chat = forwardedInfo.forward_from_chat;

      return this.formatChannelIdResponse(
        chat.id,
        chat.title,
        chat.username,
        chat.type,
      );
    }

    // Check for sender_chat (messages sent on behalf of a channel)
    if (forwardedInfo.sender_chat) {
      const chat = forwardedInfo.sender_chat;

      return this.formatChannelIdResponse(
        chat.id,
        chat.title,
        chat.username,
        chat.type,
      );
    }

    // No channel information found
    return {
      text: this.formatNoChannelFoundResponse(),
      parse_mode: 'HTML',
    };
  }

  /**
   * Handle /start command
   */
  handleStartCommand(): BotResponse {
    const text = `
<b>🤖 Welcome to Channel ID Bot!</b>

This bot helps you find the ID of your Telegram channels and groups.

<b>How to use:</b>
1️⃣ Forward any message from your channel to this bot
2️⃣ The bot will reply with the channel ID

<b>Supported sources:</b>
✅ Public channels
✅ Private channels (where you're admin)
✅ Groups and supergroups

<b>Need help?</b>
Send /help to see this message again.
    `.trim();

    return {
      text,
      parse_mode: 'HTML',
    };
  }

  /**
   * Handle /help command
   */
  handleHelpCommand(): BotResponse {
    return this.handleStartCommand();
  }

  /**
   * Handle unknown commands or text messages
   */
  handleUnknownInput(): BotResponse {
    const text = `
<b>ℹ️ How to use this bot:</b>

To get a channel ID, please <b>forward a message</b> from that channel to this bot.

<i>Tip: You can't send regular text messages. Only forwarded messages are accepted.</i>

Send /help for more information.
    `.trim();

    return {
      text,
      parse_mode: 'HTML',
    };
  }

  /**
   * Format channel ID response with detailed information
   */
  private formatChannelIdResponse(
    chatId: number,
    title?: string,
    username?: string,
    type?: string,
  ): BotResponse {
    let text = '<b>✅ Channel/Chat ID Found!</b>\n\n';

    // Channel ID (most important info)
    text += `<b>ID:</b> <code>${chatId}</code>\n`;

    // Additional information if available
    if (title) {
      text += `<b>Title:</b> ${this.escapeHtml(title)}\n`;
    }

    if (username) {
      text += `<b>Username:</b> @${username}\n`;
      text += `<b>Link:</b> https://t.me/${username}\n`;
    }

    if (type) {
      const typeLabel = this.getTypeLabel(type);
      text += `<b>Type:</b> ${typeLabel}\n`;
    }

    text += '\n<i>💡 You can use this ID to connect your channel in the dashboard.</i>';

    return {
      text,
      parse_mode: 'HTML',
    };
  }

  /**
   * Format response when no channel info is found
   */
  private formatNoChannelFoundResponse(): string {
    return `
<b>⚠️ No Channel Information Found</b>

The forwarded message doesn't contain channel information.

<b>Please make sure you:</b>
1️⃣ Forward a message from a channel (not a private user)
2️⃣ Have admin access to the channel
3️⃣ Forward from the channel, not from a personal chat

Send /help for more information.
    `.trim();
  }

  /**
   * Get human-readable type label
   */
  private getTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      channel: '📢 Channel',
      supergroup: '👥 Supergroup',
      group: '👥 Group',
      private: '🔒 Private',
    };

    return typeMap[type] || type;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
