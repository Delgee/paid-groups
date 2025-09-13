import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateBotTokenDto {
  @ApiProperty({
    description: 'Telegram bot token from @BotFather',
    example: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+:[A-Za-z0-9_-]{35}$/, {
    message: 'Invalid bot token format. Token should be in format: {bot_id}:{auth_hash}',
  })
  token: string;
}

export class RegisterBotDto extends ValidateBotTokenDto {
  @ApiProperty({
    description: 'Optional custom name for the bot',
    example: 'My Community Bot',
    required: false,
  })
  @IsString()
  custom_name?: string;
}

export interface BotValidationResult {
  valid: boolean;
  error?: string;
  botInfo?: {
    id: number;
    username: string;
    first_name: string;
    can_join_groups: boolean;
    can_read_all_group_messages: boolean;
    supports_inline_queries: boolean;
  };
  permissions?: {
    has_commands?: boolean;
    admin_rights?: any;
    webhook_set?: boolean;
    error?: string;
  };
  webhookCapable?: boolean;
}

export interface HealthCheck {
  healthy: boolean;
  timestamp?: Date;
  error?: string;
  pending_updates?: number;
}

export interface SecurityAlert {
  type: 'WEBHOOK_TAMPERED' | 'SUSPICIOUS_ACTIVITY' | 'BOT_IDENTITY_CHANGED' | 'TOKEN_REVOKED';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
}

export interface BotHealthStatus {
  botId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  checks: {
    responding: HealthCheck;
    webhook: HealthCheck;
    activity: HealthCheck;
  };
  alerts: SecurityAlert[];
}