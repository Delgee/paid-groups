import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsUUID,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreateMembershipPlanDto {
  @ApiProperty({
    description: 'Project ID that this plan belongs to',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty({
    description: 'Array of Telegram Group IDs that this plan grants access to (at least one required)',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one Telegram group must be selected for this membership plan' })
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  telegram_group_ids: string[];

  @ApiProperty({
    description: 'Plan display name',
    example: 'Monthly Premium',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Plan description with benefits',
    example: 'Access to all premium content, priority support, and exclusive updates',
    maxLength: 1024,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1024)
  description?: string;

  @ApiProperty({
    description: 'Price in MNT (Mongolian Tugrik)',
    example: 50000,
    minimum: 1000,
    maximum: 10000000,
  })
  @IsInt()
  @Min(1000, { message: 'Price must be at least 1,000 MNT' })
  @Max(10000000, { message: 'Price cannot exceed 10,000,000 MNT' })
  price: number;

  @ApiProperty({
    description: 'Membership duration in days',
    example: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsInt()
  @Min(1, { message: 'Duration must be at least 1 day' })
  @Max(365, { message: 'Duration cannot exceed 365 days' })
  duration_days: number;

  @ApiPropertyOptional({
    description: 'Whether trial period is enabled for this plan',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  trial_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Trial duration in seconds (default: 300 = 5 minutes)',
    example: 300,
    default: 300,
    minimum: 60,
    maximum: 86400,
  })
  @IsInt()
  @IsOptional()
  @Min(60, { message: 'Trial duration must be at least 60 seconds' })
  @Max(86400, { message: 'Trial duration cannot exceed 86400 seconds (24 hours)' })
  trial_duration_seconds?: number;

  @ApiPropertyOptional({
    description: 'Plan availability status',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Display order (lower values appear first)',
    default: 0,
    minimum: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  sort_order?: number;
}
