import { Injectable } from '@nestjs/common';
import { TelegramApiService } from '../../integrations/telegram/telegram-api.service';

/**
 * TelegramBotService
 *
 * Wrapper service for onboarding bot operations.
 * Uses TelegramApiService for consistent Telegraf-based API calls.
 *
 * @deprecated This service is a thin wrapper. Consider using TelegramApiService directly.
 */
@Injectable()
export class TelegramBotService {
  constructor(private readonly telegramApiService: TelegramApiService) {}

  async sendMessage(botToken: string, chatId: number, text: string, replyMarkup?: any): Promise<void> {
    try {
      const success = await this.telegramApiService.sendMessage(
        botToken,
        chatId,
        text,
        {
          reply_markup: replyMarkup,
          parse_mode: 'HTML',
        }
      );

      if (!success) {
        throw new Error('Failed to send Telegram message');
      }
    } catch (error) {
      console.error('Failed to send Telegram message:', error.message);
      throw error;
    }
  }

  async answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string): Promise<void> {
    try {
      const success = await this.telegramApiService.answerCallbackQuery(
        botToken,
        callbackQueryId,
        text
      );

      if (!success) {
        throw new Error('Failed to answer callback query');
      }
    } catch (error) {
      console.error('Failed to answer callback query:', error.message);
      throw error;
    }
  }

  async setWebhook(botToken: string, webhookUrl: string): Promise<void> {
    try {
      const success = await this.telegramApiService.setWebhook(botToken, webhookUrl);

      if (!success) {
        throw new Error('Failed to set webhook');
      }
    } catch (error) {
      console.error('Failed to set webhook:', error.message);
      throw error;
    }
  }

  async deleteWebhook(botToken: string): Promise<void> {
    try {
      const success = await this.telegramApiService.deleteWebhook(botToken);

      if (!success) {
        throw new Error('Failed to delete webhook');
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error.message);
      throw error;
    }
  }

  async getMe(botToken: string): Promise<any> {
    try {
      const botInfo = await this.telegramApiService.verifyBotToken(botToken);

      if (!botInfo) {
        throw new Error('Failed to get bot info');
      }

      return botInfo;
    } catch (error) {
      console.error('Failed to get bot info:', error.message);
      throw error;
    }
  }
}
