import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class CreateTelegramGroupDto {
  @ApiProperty({
    description: 'Display name for the telegram group',
    example: 'VIP Premium Group',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  group_name: string;

  @ApiPropertyOptional({
    description: 'Optional description for the telegram group',
    example: 'Premium content for VIP members',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'UUID of the associated project',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  project_id: string;

  @ApiProperty({
    description: 'Telegram chat ID (negative number for groups/channels)',
    example: '-1001234567890',
    pattern: '^-?\\d+$',
  })
  @IsString()
  @Matches(/^-?\d+$/, {
    message: 'telegram_chat_id must be a valid numeric string',
  })
  telegram_chat_id: string;

  @ApiPropertyOptional({
    description: 'Optional Telegram invite link',
    example: 'https://t.me/+AbCdEfGhIjKlMnOp',
    pattern: '^https:\\/\\/t\\.me\\/',
  })
  @IsOptional()
  @IsString()
  @Matches(/^https:\/\/t\.me\//, {
    message: 'invite_link must be a valid Telegram invite link starting with https://t.me/',
  })
  invite_link?: string;

  @ApiPropertyOptional({
    description: 'Additional settings for the telegram group',
    example: {
      welcome_message: 'Welcome to our VIP group!',
      auto_approve: false,
    },
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}