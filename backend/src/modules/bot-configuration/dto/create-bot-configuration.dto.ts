import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  Matches,
  IsBoolean,
  MinLength,
} from 'class-validator';

export class CreateBotConfigurationDto {
  @ApiProperty({
    description: 'Telegram bot API token from @BotFather',
    example: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^\d+:[A-Za-z0-9_-]+$/, {
    message: 'bot_token must be a valid Telegram bot token format (numeric_id:alphanumeric_secret)',
  })
  bot_token: string;

  @ApiProperty({
    description: "Bot's @username from Telegram",
    example: 'my_payment_bot',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9_]{5,32}$/, {
    message: 'bot_username must be 5-32 characters, alphanumeric with underscores only',
  })
  bot_username: string;

  @ApiProperty({
    description: 'Bot display name shown to users',
    example: 'Premium Content Bot',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  display_name: string;

  @ApiPropertyOptional({
    description: 'Bot description for users',
    example: 'Get access to exclusive content with automated payments',
    maxLength: 512,
  })
  @IsString()
  @IsOptional()
  @MaxLength(512)
  description?: string;

  @ApiProperty({
    description: 'Message sent when users start the bot with /start',
    example: 'Welcome! Choose a membership plan to access our premium channel.',
    maxLength: 4096,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(4096)
  welcome_message: string;

  @ApiPropertyOptional({
    description: 'Telegram channel ID (negative number for channels)',
    example: '-1001234567890',
  })
  @IsString()
  @IsOptional()
  @Matches(/^-\d{10,}$/, {
    message: 'channel_id must be a negative number representing a Telegram channel',
  })
  channel_id?: string;

  @ApiPropertyOptional({
    description: 'Channel @username for verification',
    example: 'my_premium_channel',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9_]{5,32}$/, {
    message: 'channel_username must be 5-32 characters, alphanumeric with underscores only',
  })
  channel_username?: string;

  @ApiPropertyOptional({
    description: 'Bot operational status',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
