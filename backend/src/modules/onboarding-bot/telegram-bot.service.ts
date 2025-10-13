import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramBotService {
  private readonly botToken: string;
  private readonly telegramApiUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_ONBOARDING_BOT_TOKEN || '';
    this.telegramApiUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId: number, text: string, replyMarkup?: any): Promise<void> {
    try {
      const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      };

      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      await axios.post(`${this.telegramApiUrl}/sendMessage`, payload);
    } catch (error) {
      console.error('Failed to send Telegram message:', error.message);
      throw error;
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    try {
      await axios.post(`${this.telegramApiUrl}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text,
      });
    } catch (error) {
      console.error('Failed to answer callback query:', error.message);
      throw error;
    }
  }

  async setWebhook(webhookUrl: string): Promise<void> {
    try {
      await axios.post(`${this.telegramApiUrl}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      });
    } catch (error) {
      console.error('Failed to set webhook:', error.message);
      throw error;
    }
  }

  async deleteWebhook(): Promise<void> {
    try {
      await axios.post(`${this.telegramApiUrl}/deleteWebhook`);
    } catch (error) {
      console.error('Failed to delete webhook:', error.message);
      throw error;
    }
  }

  async getMe(): Promise<any> {
    try {
      const response = await axios.get(`${this.telegramApiUrl}/getMe`);
      return response.data.result;
    } catch (error) {
      console.error('Failed to get bot info:', error.message);
      throw error;
    }
  }
}
