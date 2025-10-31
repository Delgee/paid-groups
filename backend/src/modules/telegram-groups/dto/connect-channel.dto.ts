import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class ConnectChannelDto {
  @ApiProperty({
    description: 'Telegram chat ID (as string, negative for groups/channels)',
    example: '-1001234567890',
    pattern: '^-?\\d+$',
  })
  @IsString()
  @Matches(/^-?\d+$/, {
    message: 'telegram_chat_id must be a valid numeric string',
  })
  telegram_chat_id: string;

  @ApiPropertyOptional({
    description: 'Verify bot admin permissions before connecting',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  verify_permissions?: boolean = true;
}