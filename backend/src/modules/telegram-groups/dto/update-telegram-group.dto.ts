import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class UpdateTelegramGroupDto {
  @ApiPropertyOptional({
    description: 'Display name for the telegram group',
    example: 'Updated VIP Premium Group',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  group_name?: string;

  @ApiPropertyOptional({
    description: 'Description for the telegram group',
    example: 'Updated premium content for VIP members',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Additional settings for the telegram group',
    example: {
      welcome_message: 'Updated welcome message!',
      auto_approve: true,
      notify_on_join: false,
    },
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}