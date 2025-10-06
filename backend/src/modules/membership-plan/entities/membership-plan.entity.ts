import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Check,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BotConfiguration } from '../../bot-configuration/entities/bot-configuration.entity';

@Entity('membership_plans')
@Check('"price" > 0')
@Check('"duration_days" > 0')
export class MembershipPlan {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenant isolation', format: 'uuid' })
  @Column('uuid')
  tenant_id: string;

  @ApiProperty({ description: 'Parent bot configuration ID', format: 'uuid' })
  @Column('uuid')
  bot_configuration_id: string;

  @ApiProperty({ description: 'Plan display name', maxLength: 255 })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'Plan description/benefits', maxLength: 1024 })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Price in MNT (Mongolian Tugrik)', minimum: 1000, maximum: 10000000 })
  @Column({ type: 'integer' })
  price: number;

  @ApiProperty({ description: 'Membership duration in days', minimum: 1, maximum: 365 })
  @Column({ type: 'integer' })
  duration_days: number;

  @ApiProperty({ description: 'Plan availability status', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({ description: 'Display order (lower = higher priority)', default: 0 })
  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updated_at: Date;

  // Relationships
  @ManyToOne(() => BotConfiguration, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bot_configuration_id' })
  bot_configuration: BotConfiguration;

  // @OneToMany(() => PaymentTransaction, transaction => transaction.membership_plan)
  // payment_transactions: PaymentTransaction[];
}
