import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramBotService {
  private getTelegramApiUrl(botToken: string): string {
    return `https://api.telegram.org/bot${botToken}`;
  }

  async sendMessage(botToken: string, chatId: number, text: string, replyMarkup?: any): Promise<void> {
    try {
      const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      };

      if (replyMarkup) {
        payload.reply_markup = replyMarkup;
      }

      const apiUrl = this.getTelegramApiUrl(botToken);
      await axios.post(`${apiUrl}/sendMessage`, payload);
    } catch (error) {
      console.error('Failed to send Telegram message:', error.message);
      throw error;
    }
  }

  async answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string): Promise<void> {
    try {
      const apiUrl = this.getTelegramApiUrl(botToken);
      await axios.post(`${apiUrl}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text,
      });
    } catch (error) {
      console.error('Failed to answer callback query:', error.message);
      throw error;
    }
  }

  async setWebhook(botToken: string, webhookUrl: string): Promise<void> {
    try {
      const apiUrl = this.getTelegramApiUrl(botToken);
      await axios.post(`${apiUrl}/setWebhook`, {
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
      });
    } catch (error) {
      console.error('Failed to set webhook:', error.message);
      throw error;
    }
  }

  async deleteWebhook(botToken: string): Promise<void> {
    try {
      const apiUrl = this.getTelegramApiUrl(botToken);
      await axios.post(`${apiUrl}/deleteWebhook`);
    } catch (error) {
      console.error('Failed to delete webhook:', error.message);
      throw error;
    }
  }

  async getMe(botToken: string): Promise<any> {
    try {
      const apiUrl = this.getTelegramApiUrl(botToken);
      const response = await axios.get(`${apiUrl}/getMe`);
      return response.data.result;
    } catch (error) {
      console.error('Failed to get bot info:', error.message);
      throw error;
    }
  }
}
