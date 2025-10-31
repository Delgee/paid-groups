import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Tenant } from '../../tenant/entities/tenant.entity';

// Forward declarations to avoid circular dependencies
// These will be imported properly when the modules are fully integrated
type TelegramGroup = any;
type MembershipPlan = any;

/**
 * Project Entity
 *
 * Replaces both BotConfiguration and TelegramBot entities.
 * Represents a tenant's Telegram bot project with all configuration and settings.
 * One project = One bot instance + Multiple telegram groups + Multiple membership plans
 */
@Entity('projects')
@Index(['tenant_id'])
@Index(['bot_token'])
@Index(['is_active'])
@Index(['tenant_id', 'is_active'])
export class Project {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenant isolation', format: 'uuid' })
  @Column('uuid')
  tenant_id: string;

  // Bot Configuration Fields (from BotConfiguration)
  @ApiProperty({ description: 'Telegram bot API token (encrypted)', maxLength: 500 })
  @Column({ type: 'varchar', length: 500, unique: true })
  bot_token: string; // Stores encrypted token - use EncryptionService to decrypt

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

  @ApiProperty({ description: 'Bot operational status', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiPropertyOptional({ description: 'Last successful Telegram API sync timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  last_sync_at?: Date;

  @ApiPropertyOptional({ description: 'Telegram file_id for bot profile photo', maxLength: 255 })
  @Column({ type: 'varchar', length: 255, nullable: true })
  bot_avatar_file_id?: string;

  @ApiPropertyOptional({ description: 'Full download URL for bot profile photo from Telegram CDN' })
  @Column({ type: 'text', nullable: true })
  bot_avatar_url?: string;

  // Bot Infrastructure Fields (from TelegramBot)
  @ApiPropertyOptional({ description: 'Webhook URL for bot updates', maxLength: 500 })
  @Column({ type: 'varchar', length: 500, nullable: true })
  webhook_url?: string;

  @ApiPropertyOptional({ description: 'Webhook secret token for verification', maxLength: 255 })
  @Column({ type: 'varchar', length: 255, nullable: true })
  webhook_secret?: string;

  @ApiProperty({ description: 'Bot settings in JSON format', default: {} })
  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Message templates for bot responses', default: {} })
  @Column({ type: 'jsonb', default: {} })
  message_templates: Record<string, any>;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Tenant, tenant => tenant.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany('TelegramGroup', 'project')
  telegram_groups: TelegramGroup[];

  @OneToMany('MembershipPlan', 'project')
  membership_plans: MembershipPlan[];

  /**
   * Custom toJSON to exclude sensitive fields
   */
  toJSON() {
    const { bot_token, webhook_secret, ...rest } = this;
    return {
      ...rest,
      bot_token: bot_token ? '***' : undefined, // Mask bot token
      webhook_secret: webhook_secret ? '***' : undefined, // Mask webhook secret
    };
  }
}
