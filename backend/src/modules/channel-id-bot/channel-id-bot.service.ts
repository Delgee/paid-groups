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
<b>🤖 Канал ID Ботод тавтай морил!</b>

Энэ бот таны Телеграм каналууд болон группуудын ID-г олоход тусална.

<b>Хэрхэн ашиглах вэ:</b>
1️⃣ Таны каналаас ямар нэг мессежийг энэ ботруу дамжуулна уу
2️⃣ Бот каналын ID-г хариултаар илгээнэ

<b>Дэмждэг эх сурвалжууд:</b>
✅ Нийтийн каналууд
✅ Хувийн каналууд (та админ байвал)
✅ Группууд болон супер группууд

<b>Тусламж хэрэгтэй юу?</b>
Энэ мессежийг дахин харахын тулд /help дарна уу.
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
<b>ℹ️ Энэ ботыг хэрхэн ашиглах вэ:</b>

Каналын ID авахын тулд тухайн каналаас <b>мессеж дамжуулна</b> уу.

<i>Зөвлөмж: Энгийн текст мессеж илгээж болохгүй. Зөвхөн дамжуулсан мессеж хүлээн авна.</i>

Дэлгэрэнгүй мэдээлэл авахын тулд /help дарна уу.
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
    let text = '<b>✅ Канал/Чатын ID олдлоо!</b>\n\n';

    // Channel ID (most important info)
    text += `<b>ID:</b> <code>${chatId}</code>\n`;

    // Additional information if available
    if (title) {
      text += `<b>Гарчиг:</b> ${this.escapeHtml(title)}\n`;
    }

    if (username) {
      text += `<b>Хэрэглэгчийн нэр:</b> @${username}\n`;
      text += `<b>Холбоос:</b> https://t.me/${username}\n`;
    }

    if (type) {
      const typeLabel = this.getTypeLabel(type);
      text += `<b>Төрөл:</b> ${typeLabel}\n`;
    }

    text += '\n<i>💡 Та энэ ID-г хяналтын самбараас каналаа холбоход ашиглаж болно.</i>';

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
<b>⚠️ Каналын мэдээлэл олдсонгүй</b>

Дамжуулсан мессеж каналын мэдээлэл агуулаагүй байна.

<b>Дараах зүйлсийг шалгана уу:</b>
1️⃣ Мессежийг каналаас дамжуулсан эсэх (хувийн хэрэглэгчээс биш)
2️⃣ Танд каналын админ эрх байгаа эсэх
3️⃣ Хувийн чатаас биш, каналаас шууд дамжуулсан эсэх

Дэлгэрэнгүй мэдээлэл авахын тулд /help дарна уу.
    `.trim();
  }

  /**
   * Get human-readable type label
   */
  private getTypeLabel(type: string): string {
    const typeMap: Record<string, string> = {
      channel: '📢 Канал',
      supergroup: '👥 Супер групп',
      group: '👥 Групп',
      private: '🔒 Хувийн',
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
