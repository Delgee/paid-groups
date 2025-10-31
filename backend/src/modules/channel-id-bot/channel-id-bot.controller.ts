import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelIdBotService, BotResponse } from './channel-id-bot.service';
import { BotCommand, ResponseStatus } from '../onboarding-bot/entities/bot-command.entity';
import { TelegramApiService } from '../../integrations/telegram/telegram-api.service';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Channel ID Bot')
@Controller('channel-id-bot')
export class ChannelIdBotController {
  private readonly logger = new Logger(ChannelIdBotController.name);
  private readonly validBotToken =
    process.env.TELEGRAM_CHANNEL_ID_BOT_TOKEN || 'test-channel-id-bot-token-123';

  constructor(
    private readonly channelIdBotService: ChannelIdBotService,
    private readonly telegramApiService: TelegramApiService,
    @InjectRepository(BotCommand)
    private readonly botCommandRepository: Repository<BotCommand>,
  ) {}

  @Post('webhook/:botToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Telegram webhook updates for Channel ID Bot' })
  @ApiResponse({ status: 200, description: 'Update processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Invalid bot token' })
  async handleWebhook(
    @Param('botToken') botToken: string,
    @Body() update: any,
  ): Promise<{ ok: boolean }> {
    const startTime = Date.now();
    const correlationId = uuidv4();

    // Validate bot token
    if (botToken !== this.validBotToken) {
      this.logger.warn('Invalid bot token attempted', { correlationId });
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_BOT_TOKEN',
          message: 'Invalid bot token provided.',
        },
      });
    }

    // Validate message update structure
    if (!update || !update.message || !update.message.from || !update.message.chat) {
      this.logger.warn('Invalid update format', { correlationId, update });
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update format - message, from, and chat are required.',
        },
      });
    }

    const telegramUserId = update.message.from.id;
    const telegramChatId = update.message.chat.id;
    const messageText = update.message.text || '';

    let botResponse: BotResponse;
    let command = 'unknown';
    let responseStatus = ResponseStatus.SUCCESS;

    try {
      // Handle forwarded messages (primary use case)
      if (
        update.message.forward_from_chat ||
        update.message.sender_chat
      ) {
        command = 'forwarded_message';
        this.logger.log('Processing forwarded message', {
          correlationId,
          telegramUserId,
          hasForwardFromChat: !!update.message.forward_from_chat,
          hasSenderChat: !!update.message.sender_chat,
        });

        const forwardedInfo = {
          forward_from_chat: update.message.forward_from_chat,
          sender_chat: update.message.sender_chat,
        };

        botResponse = await this.channelIdBotService.handleForwardedMessage(
          forwardedInfo,
          correlationId,
        );
      }
      // Handle /start command
      else if (messageText === '/start') {
        command = 'start';
        this.logger.log('Processing /start command', { correlationId, telegramUserId });
        botResponse = this.channelIdBotService.handleStartCommand();
      }
      // Handle /help command
      else if (messageText === '/help') {
        command = 'help';
        this.logger.log('Processing /help command', { correlationId, telegramUserId });
        botResponse = this.channelIdBotService.handleHelpCommand();
      }
      // Handle all other input (guide user to forward messages)
      else {
        command = 'unknown_input';
        this.logger.log('Processing unknown input', { correlationId, telegramUserId, messageText });
        botResponse = this.channelIdBotService.handleUnknownInput();
      }

      // Log command to database
      await this.logCommand({
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        command,
        parameters: {
          text: messageText,
          has_forward: !!(update.message.forward_from_chat || update.message.sender_chat),
        },
        response_status: responseStatus,
        response_time_ms: Date.now() - startTime,
        correlation_id: correlationId,
      });

      // Send response via Telegram Bot API
      await this.sendMessage(botToken, telegramChatId, botResponse);

      this.logger.log('Webhook processed successfully', {
        correlationId,
        command,
        responseTimeMs: Date.now() - startTime,
      });

      return { ok: true };
    } catch (error) {
      responseStatus = ResponseStatus.ERROR;
      this.logger.error('Error processing webhook', {
        correlationId,
        command,
        error: error.message,
        stack: error.stack,
      });

      // Log error to database
      await this.logCommand({
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        command,
        response_status: ResponseStatus.ERROR,
        error_code: error.response?.error?.code || 'INTERNAL_ERROR',
        response_time_ms: Date.now() - startTime,
        correlation_id: correlationId,
      });

      throw error;
    }
  }

  /**
   * Send message via Telegram API
   */
  private async sendMessage(
    botToken: string,
    chatId: number,
    response: BotResponse,
  ): Promise<void> {
    const success = await this.telegramApiService.sendMessage(
      botToken,
      chatId,
      response.text,
      {
        parse_mode: response.parse_mode || 'HTML',
      },
    );

    if (!success) {
      throw new Error('Failed to send Telegram message');
    }
  }

  /**
   * Log command to database
   */
  private async logCommand(data: {
    telegram_user_id: number;
    telegram_chat_id: number;
    command: string;
    parameters?: Record<string, any>;
    response_status: ResponseStatus;
    error_code?: string;
    response_time_ms: number;
    correlation_id: string;
  }): Promise<void> {
    try {
      const botCommand = this.botCommandRepository.create({
        telegram_user_account_id: null, // Channel ID bot doesn't track user accounts
        telegram_user_id: data.telegram_user_id,
        telegram_chat_id: data.telegram_chat_id,
        command: data.command,
        parameters: data.parameters || {},
        response_status: data.response_status,
        error_code: data.error_code,
        response_time_ms: data.response_time_ms,
        correlation_id: data.correlation_id,
      });

      await this.botCommandRepository.save(botCommand);
    } catch (error) {
      // Don't fail the request if logging fails
      this.logger.error('Failed to log command', {
        error: error.message,
        correlationId: data.correlation_id,
      });
    }
  }
}
