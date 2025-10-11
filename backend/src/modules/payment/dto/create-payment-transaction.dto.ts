import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class CreatePaymentTransactionDto {
  @ApiProperty({
    description: 'Selected membership plan ID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  membership_plan_id: string;

  @ApiProperty({
    description: 'Project that processes this payment',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  project_id: string;

  // Legacy field for backward compatibility
  @ApiPropertyOptional({
    description: 'DEPRECATED: Use project_id instead. Bot configuration ID for backward compatibility.',
    format: 'uuid',
    deprecated: true,
  })
  @IsUUID()
  @IsOptional()
  bot_configuration_id?: string;

  @ApiProperty({
    description: "Payer's Telegram user ID",
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'telegram_user_id must be a positive number' })
  telegram_user_id: string;

  @ApiPropertyOptional({
    description: "Payer's Telegram @username",
    example: 'john_doe',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  telegram_username?: string;

  @ApiPropertyOptional({
    description: "Payer's first name from Telegram",
    example: 'John',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  telegram_first_name?: string;

  @ApiPropertyOptional({
    description: "Payer's last name from Telegram",
    example: 'Doe',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  telegram_last_name?: string;

  @ApiProperty({
    description: 'Amount to be paid in MNT',
    example: 50000,
    minimum: 1,
  })
  @IsInt()
  @Min(1, { message: 'Amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    description: 'Plan name snapshot at purchase time',
    example: 'Monthly Premium',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  snapshot_plan_name: string;

  @ApiProperty({
    description: 'Price snapshot at purchase time',
    example: 50000,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  snapshot_price: number;

  @ApiProperty({
    description: 'Duration snapshot at purchase time (in days)',
    example: 30,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  snapshot_duration_days: number;
}
