import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotCommand, ResponseStatus } from './entities/bot-command.entity';

export interface LogCommandRequest {
  telegram_user_account_id?: string;
  telegram_user_id: number;
  telegram_chat_id: number;
  command: string;
  parameters?: Record<string, any>;
  session_step?: string;
  response_status: ResponseStatus;
  error_code?: string;
  response_time_ms?: number;
  correlation_id: string;
  user_agent?: string;
}

@Injectable()
export class BotCommandLogger {
  constructor(
    @InjectRepository(BotCommand)
    private readonly botCommandRepository: Repository<BotCommand>,
  ) {}

  async log(request: LogCommandRequest): Promise<void> {
    try {
      const botCommand = this.botCommandRepository.create({
        telegram_user_account_id: request.telegram_user_account_id || null,
        telegram_user_id: request.telegram_user_id,
        telegram_chat_id: request.telegram_chat_id,
        command: request.command,
        parameters: request.parameters || {},
        session_step: request.session_step,
        response_status: request.response_status,
        error_code: request.error_code,
        response_time_ms: request.response_time_ms,
        correlation_id: request.correlation_id,
        user_agent: request.user_agent,
      });

      // Fire-and-forget pattern - don't await to avoid blocking bot responses
      this.botCommandRepository.save(botCommand).catch((error) => {
        console.error('Failed to log bot command:', error.message);
      });
    } catch (error) {
      // Silently fail - logging should not affect bot functionality
      console.error('Bot command logger error:', error.message);
    }
  }
}
