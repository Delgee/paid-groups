import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { MembershipStatus } from '../entities/channel-member.entity';

export class UpdateChannelMemberDto {
  @ApiPropertyOptional({
    description: 'Updated invite link',
    example: 'https://t.me/+NewInviteLink123',
  })
  @IsString()
  @IsOptional()
  invite_link?: string;

  @ApiPropertyOptional({
    description: 'Membership status',
    enum: MembershipStatus,
    example: MembershipStatus.EXPIRED,
  })
  @IsEnum(MembershipStatus)
  @IsOptional()
  status?: MembershipStatus;

  @ApiPropertyOptional({
    description: 'Timestamp when member joined channel',
    example: '2024-01-20T10:05:00Z',
  })
  @IsDateString()
  @IsOptional()
  joined_at?: string;

  @ApiPropertyOptional({
    description: 'Updated membership expiration date',
    example: '2024-03-20T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when member was removed from channel',
    example: '2024-02-20T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  removed_at?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when renewal reminder was sent',
    example: '2024-02-17T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  renewal_reminder_sent_at?: string;
}
