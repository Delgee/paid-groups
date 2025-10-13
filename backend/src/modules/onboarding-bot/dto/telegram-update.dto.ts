import { IsNumber, IsObject, IsOptional, ValidateNested, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class TelegramUser {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsOptional()
  @IsBoolean()
  is_bot?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  language_code?: string;

  // Allow any other properties
  [key: string]: any;
}

class TelegramChat {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  last_name?: string;

  // Allow any other properties
  [key: string]: any;
}

class TelegramMessage {
  @ApiProperty()
  @IsNumber()
  message_id: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => TelegramUser)
  from: TelegramUser;

  @ApiProperty()
  @ValidateNested()
  @Type(() => TelegramChat)
  chat: TelegramChat;

  @ApiProperty()
  @IsNumber()
  date: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  text?: string;

  // Allow any other properties Telegram might send
  [key: string]: any;
}

export class TelegramUpdateDto {
  @ApiProperty({ description: 'Update ID from Telegram' })
  @IsNumber()
  update_id: number;

  @ApiProperty({ description: 'Message object', required: false })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => TelegramMessage)
  message?: TelegramMessage;

  @ApiProperty({ description: 'Callback query', required: false })
  @IsOptional()
  callback_query?: any;
}
