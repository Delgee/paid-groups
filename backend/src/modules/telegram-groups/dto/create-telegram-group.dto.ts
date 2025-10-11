import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  MinLength,
  MaxLength,
  IsNotEmpty,
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