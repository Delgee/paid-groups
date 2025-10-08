import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('membership_plans')
@Check('"price_mnt" > 0')
@Check('"duration_days" > 0')
export class MembershipPlan {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenant isolation', format: 'uuid' })
  @Column('uuid')
  tenant_id: string;

  @ApiPropertyOptional({ description: 'Telegram group ID', format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  group_id?: string;

  @ApiProperty({ description: 'Plan display name', maxLength: 255 })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'Plan description/benefits', maxLength: 1024 })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Price in MNT (Mongolian Tugrik)', minimum: 1000, maximum: 10000000 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_mnt: number;

  @ApiProperty({ description: 'Currency code', default: 'MNT' })
  @Column({ type: 'varchar', length: 3, default: 'MNT' })
  currency: string;

  @ApiProperty({ description: 'Membership duration in days', minimum: 1, maximum: 365 })
  @Column({ type: 'integer' })
  duration_days: number;

  @ApiProperty({ description: 'Trial period in days', default: 0 })
  @Column({ type: 'integer', default: 0 })
  trial_days: number;

  @ApiProperty({ description: 'Plan features in JSON format', default: {} })
  @Column({ type: 'jsonb', default: {} })
  features: Record<string, any>;

  @ApiProperty({ description: 'Plan availability status', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of members', nullable: true })
  @Column({ type: 'integer', nullable: true })
  max_members?: number;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updated_at: Date;

  // Relationships can be added here as needed
  // @ManyToOne(() => TelegramGroup, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'group_id' })
  // telegram_group: TelegramGroup;
}
