import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentTransaction } from './payment-transaction.entity';
import { Project } from '../../project/entities/project.entity';

export enum MembershipStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

@Entity('channel_members')
@Check('"telegram_user_id" > 0')
@Check('"channel_id" < 0')
export class ChannelMember {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenant isolation', format: 'uuid' })
  @Column('uuid')
  tenant_id: string;

  @ApiProperty({ description: 'Associated payment transaction ID', format: 'uuid' })
  @Column('uuid')
  payment_transaction_id: string;

  @ApiProperty({ description: 'Project that manages membership', format: 'uuid' })
  @Column('uuid')
  project_id: string;

  @ApiProperty({ description: "Member's Telegram user ID" })
  @Column({ type: 'bigint' })
  telegram_user_id: string;

  @ApiProperty({ description: 'Telegram channel ID' })
  @Column({ type: 'bigint' })
  channel_id: string;

  @ApiPropertyOptional({ description: 'Generated invite link (if not yet joined)' })
  @Column({ type: 'text', nullable: true })
  invite_link?: string;

  @ApiProperty({ description: 'Membership status', enum: MembershipStatus })
  @Column({ type: 'enum', enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  status: MembershipStatus;

  @ApiPropertyOptional({ description: 'When member joined channel' })
  @Column({ type: 'timestamp', nullable: true })
  joined_at?: Date;

  @ApiProperty({ description: 'Membership expiration date' })
  @Column({ type: 'timestamp with time zone' })
  expires_at: Date;

  @ApiPropertyOptional({ description: 'When member was removed from channel' })
  @Column({ type: 'timestamp', nullable: true })
  removed_at?: Date;

  @ApiPropertyOptional({ description: 'When 3-day reminder was sent' })
  @Column({ type: 'timestamp', nullable: true })
  renewal_reminder_sent_at?: Date;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updated_at: Date;

  // Relationships
  @ManyToOne(() => PaymentTransaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_transaction_id' })
  payment_transaction: PaymentTransaction;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}
