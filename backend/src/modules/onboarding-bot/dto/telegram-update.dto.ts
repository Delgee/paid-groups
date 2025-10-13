import { IsNumber, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class TelegramUser {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsOptional()
  username?: string;

  @ApiProperty()
  @IsOptional()
  first_name?: string;

  @ApiProperty()
  @IsOptional()
  last_name?: string;
}

class TelegramChat {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty()
  @IsOptional()
  type?: string;

  @ApiProperty()
  @IsOptional()
  username?: string;
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
  text?: string;
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
