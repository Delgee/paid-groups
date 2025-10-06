import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BotConfiguration } from './bot-configuration.entity';

export enum EventSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

@Entity('bot_event_logs')
@Index(['tenant_id', 'occurred_at'])
@Index(['tenant_id', 'bot_configuration_id', 'occurred_at'])
@Index(['tenant_id', 'event_type', 'occurred_at'])
@Index(['tenant_id', 'severity', 'occurred_at'])
export class BotEventLog {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenant isolation', format: 'uuid' })
  @Column('uuid')
  tenant_id: string;

  @ApiPropertyOptional({ description: 'Associated bot configuration ID', format: 'uuid' })
  @Column('uuid', { nullable: true })
  bot_configuration_id?: string;

  @ApiProperty({ description: 'Event type identifier', maxLength: 100 })
  @Column({ type: 'varchar', length: 100 })
  event_type: string;

  @ApiProperty({ description: 'Event payload as JSON', type: 'object' })
  @Column({ type: 'jsonb', default: {} })
  event_data: Record<string, any>;

  @ApiProperty({ description: 'Event severity level', enum: EventSeverity })
  @Column({ type: 'enum', enum: EventSeverity, default: EventSeverity.INFO })
  severity: EventSeverity;

  @ApiPropertyOptional({ description: 'Telegram user ID if user-related event' })
  @Column({ type: 'bigint', nullable: true })
  telegram_user_id?: string;

  @ApiPropertyOptional({ description: 'Correlation ID for distributed tracing', maxLength: 255 })
  @Column({ type: 'varchar', length: 255, nullable: true })
  correlation_id?: string;

  @ApiProperty({ description: 'Event occurrence timestamp' })
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  occurred_at: Date;

  // Relationships
  @ManyToOne(() => BotConfiguration, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'bot_configuration_id' })
  bot_configuration?: BotConfiguration;
}
