import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  Matches,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { MembershipStatus } from '../entities/channel-member.entity';

export class CreateChannelMemberDto {
  @ApiProperty({
    description: 'Associated payment transaction ID',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  payment_transaction_id: string;

  @ApiProperty({
    description: 'Project managing this membership',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsNotEmpty()
  project_id: string;

  @ApiProperty({
    description: "Member's Telegram user ID",
    example: '123456789',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+$/, { message: 'telegram_user_id must be a positive number' })
  telegram_user_id: string;

  @ApiProperty({
    description: 'Telegram channel ID (negative for channels)',
    example: '-1001234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^-\d{10,}$/, { message: 'channel_id must be a negative number' })
  channel_id: string;

  @ApiPropertyOptional({
    description: 'Generated invite link if user not yet joined',
    example: 'https://t.me/+AbCdEfGhIjKlMnOp',
  })
  @IsString()
  @IsOptional()
  invite_link?: string;

  @ApiPropertyOptional({
    description: 'Membership status',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  @IsEnum(MembershipStatus)
  @IsOptional()
  status?: MembershipStatus;

  @ApiProperty({
    description: 'Membership expiration date',
    example: '2024-02-20T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  expires_at: string;

  @ApiPropertyOptional({
    description: 'Timestamp when member joined channel',
    example: '2024-01-20T10:05:00Z',
  })
  @IsDateString()
  @IsOptional()
  joined_at?: string;
}
