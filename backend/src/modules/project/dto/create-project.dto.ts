import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  Matches,
  MinLength,
  IsObject,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Telegram bot API token from @BotFather',
    example: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Matches(/^\d+:[A-Za-z0-9_-]+$/, {
    message:
      'bot_token must be a valid Telegram bot token format (numeric_id:alphanumeric_secret)',
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
    message:
      'bot_username must be 5-32 characters, alphanumeric with underscores only',
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
    example:
      'Welcome! Choose a membership plan to access our premium channels.',
    maxLength: 4096,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(4096)
  welcome_message: string;

  @ApiPropertyOptional({
    description: 'Webhook URL for receiving bot updates',
    example: 'https://api.example.com/webhook/telegram',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Matches(/^https?:\/\/.+/, {
    message: 'webhook_url must be a valid HTTP/HTTPS URL',
  })
  webhook_url?: string;

  @ApiPropertyOptional({
    description: 'Webhook secret token for verification',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  webhook_secret?: string;

  @ApiPropertyOptional({
    description: 'Bot settings (JSON object)',
    example: { language: 'en', timezone: 'UTC' },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Message templates for bot responses (JSON object)',
    example: { payment_success: 'Thank you for your payment!' },
  })
  @IsObject()
  @IsOptional()
  message_templates?: Record<string, any>;

  @ApiProperty({
    description: 'Bank code for payment account (6-digit)',
    example: '040000',
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(6)
  @Matches(/^\d{6}$/, {
    message: 'account_bank_code must be a 6-digit bank code',
  })
  account_bank_code: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '490000869',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  account_number: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'test account2',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  account_name: string;
}
