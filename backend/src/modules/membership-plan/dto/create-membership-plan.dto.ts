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
} from 'class-validator';

export class CreateMembershipPlanDto {
  @ApiProperty({
    description: 'Parent bot configuration ID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  bot_configuration_id: string;

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
