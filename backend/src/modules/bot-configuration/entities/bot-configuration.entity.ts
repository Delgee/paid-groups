import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('bot_configurations')
export class BotConfiguration {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenant isolation', format: 'uuid' })
  @Column('uuid')
  tenant_id: string;

  @ApiProperty({ description: 'Telegram bot API token', maxLength: 255 })
  @Column({ type: 'varchar', length: 255, unique: true })
  bot_token: string;

  @ApiProperty({ description: "Bot's @username from Telegram", maxLength: 255 })
  @Column({ type: 'varchar', length: 255 })
  bot_username: string;

  @ApiProperty({ description: 'Bot display name shown to users', maxLength: 255 })
  @Column({ type: 'varchar', length: 255 })
  display_name: string;

  @ApiPropertyOptional({ description: 'Bot description (max 512 chars)', maxLength: 512 })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Message sent on /start command', maxLength: 4096 })
  @Column({ type: 'text' })
  welcome_message: string;

  @ApiPropertyOptional({ description: 'Associated Telegram channel ID' })
  @Column({ type: 'bigint', nullable: true })
  channel_id?: string;

  @ApiPropertyOptional({ description: 'Channel @username for verification', maxLength: 255 })
  @Column({ type: 'varchar', length: 255, nullable: true })
  channel_username?: string;

  @ApiProperty({ description: 'Bot operational status', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiPropertyOptional({ description: 'Last successful Telegram API sync timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  last_sync_at?: Date;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updated_at: Date;

  // Relationships (to be populated when other entities are created)
  // @OneToMany(() => MembershipPlan, plan => plan.bot_configuration)
  // membership_plans: MembershipPlan[];

  // @OneToMany(() => BotEventLog, log => log.bot_configuration)
  // event_logs: BotEventLog[];

  /**
   * Custom toJSON to exclude sensitive fields
   */
  toJSON() {
    const { bot_token, ...rest } = this;
    return {
      ...rest,
      bot_token: bot_token ? '***' : undefined, // Mask bot token
    };
  }
}
