import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TelegramUpdateDto } from './dto/telegram-update.dto';
import { RegistrationHandler } from './handlers/registration.handler';
import { HelpHandler } from './handlers/help.handler';
import { CancelHandler } from './handlers/cancel.handler';
import { BotCommandLogger, LogCommandRequest } from './bot-command-logger.service';
import { ResponseStatus } from './entities/bot-command.entity';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Onboarding Bot')
@Controller('onboarding-bot')
export class OnboardingBotController {
  private readonly validBotToken = process.env.TELEGRAM_ONBOARDING_BOT_TOKEN || 'test-onboarding-bot-token-123';

  constructor(
    private readonly registrationHandler: RegistrationHandler,
    private readonly helpHandler: HelpHandler,
    private readonly cancelHandler: CancelHandler,
    private readonly botCommandLogger: BotCommandLogger,
  ) {}

  @Post('webhook/:botToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Telegram webhook updates' })
  @ApiResponse({ status: 200, description: 'Update processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Invalid bot token' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async handleWebhook(
    @Param('botToken') botToken: string,
    @Body() update: TelegramUpdateDto,
  ): Promise<{ ok: boolean }> {
    const startTime = Date.now();
    const correlationId = uuidv4();

    // Validate bot token
    if (botToken !== this.validBotToken) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_BOT_TOKEN',
          message: 'Invalid bot token provided.',
        },
      });
    }

    // Validate update structure
    if (!update.message) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid update format - message is required.',
        },
      });
    }

    const telegramUserId = update.message.from.id;
    const telegramChatId = update.message.chat.id;
    const messageText = update.message.text || '';

    let response: string;
    let command = 'unknown';
    let responseStatus = ResponseStatus.SUCCESS;

    try {
      // Route command
      if (messageText.startsWith('/')) {
        const cmd = messageText.split(' ')[0].substring(1).toLowerCase();
        command = cmd;

        switch (cmd) {
          case 'start':
            response = await this.registrationHandler.handleStart(
              telegramUserId,
              telegramChatId,
              correlationId,
            );
            break;
          case 'help':
            response = this.helpHandler.getHelpMessage();
            break;
          case 'cancel':
            response = await this.cancelHandler.handleCancel(telegramUserId);
            break;
          default:
            response = `Unknown command. Send /help to see available commands.`;
        }
      } else {
        // Handle text input based on session state
        command = 'text_input';
        response = await this.registrationHandler.handleRegistrationFlow(
          telegramUserId,
          telegramChatId,
          messageText,
          correlationId,
        );
      }

      // Log command
      const logRequest: LogCommandRequest = {
        telegram_user_id: telegramUserId,
        telegram_chat_id: telegramChatId,
        command,
        parameters: { text: messageText },
        response_status: responseStatus,
        response_time_ms: Date.now() - startTime,
        correlation_id: correlationId,
      };

      await this.botCommandLogger.log(logRequest);

      // In real implementation, send response via Telegram Bot API
      // await this.telegram.sendMessage(telegramChatId, response);

      return { ok: true };
    } catch (error) {
      responseStatus = ResponseStatus.ERROR;

      // Log error
      await this.botCommandLogger.log({
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
}
