import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { TelegramBot } from '../bot/entities/telegram-bot.entity';
import { Project } from '../project/entities/project.entity';

export enum GroupType {
  GROUP = 'group',
  SUPERGROUP = 'supergroup',
  CHANNEL = 'channel',
}

export enum ConnectionStatus {
  PENDING = 'pending',
  CONNECTED = 'connected',
  FAILED = 'failed',
  DISCONNECTED = 'disconnected',
}

@Entity('telegram_groups')
@Index(['tenant_id'])
@Index(['project_id'])
@Index(['telegram_chat_id'])
@Index(['bot_assigned'])
@Index(['sync_enabled'])
@Index(['connection_status'])
export class TelegramGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  project_id: string;

  @Column({ type: 'bigint', nullable: true, unique: true })
  telegram_chat_id: number | null;

  @Column({ length: 255 })
  group_name: string;

  @Column({
    type: 'enum',
    enum: GroupType,
    default: GroupType.GROUP,
  })
  group_type: GroupType;

  @Column({ length: 255, nullable: true })
  username: string | null;

  @Column({ length: 500, nullable: true })
  invite_link: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  member_count: number;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, any>;

  // New fields for enhanced functionality
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: false })
  bot_assigned: boolean;

  @Column({ type: 'timestamp', nullable: true })
  last_sync_at: Date | null;

  @Column({ type: 'boolean', default: false })
  sync_enabled: boolean;

  @Column({
    type: 'enum',
    enum: ConnectionStatus,
    default: ConnectionStatus.PENDING,
  })
  connection_status: ConnectionStatus;

  @Column({ type: 'text', nullable: true })
  sync_errors: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Project, { eager: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // Keep bot relation for backward compatibility during migration (will be deprecated)
  @ManyToOne(() => TelegramBot, { eager: false })
  @JoinColumn({ name: 'bot_id' })
  bot?: TelegramBot;

  @OneToMany('Membership', 'group')
  memberships: any[];

  // Note: membership_plans relation updated to many-to-many in MembershipPlan entity
  @OneToMany('MembershipPlan', 'group')
  membership_plans: any[];

  tenant: any; // Add tenant relation placeholder for compatibility

  // Virtual properties for API responses
  get telegram_chat_id_string(): string | null {
    return this.telegram_chat_id ? this.telegram_chat_id.toString() : null;
  }

  // Helper methods
  isConnected(): boolean {
    return this.connection_status === ConnectionStatus.CONNECTED;
  }

  canSync(): boolean {
    return this.isConnected() && this.bot_assigned;
  }

  canEnableSync(): boolean {
    return this.canSync();
  }

  // Method to safely update sync status
  updateSyncStatus(success: boolean, error?: string): void {
    if (success) {
      this.last_sync_at = new Date();
      this.sync_errors = null;
    } else {
      this.sync_errors = error || 'Sync failed';
    }
  }

  // Method to connect to Telegram channel
  connectToChannel(
    chatId: number,
    groupType: GroupType,
    username?: string,
    inviteLink?: string,
  ): void {
    this.telegram_chat_id = chatId;
    this.group_type = groupType;
    this.username = username || null;
    this.invite_link = inviteLink || null;
    this.connection_status = ConnectionStatus.CONNECTED;
    this.updated_at = new Date();
  }

  // Method to disconnect from Telegram channel
  disconnectFromChannel(): void {
    this.telegram_chat_id = null;
    this.username = null;
    this.invite_link = null;
    this.connection_status = ConnectionStatus.DISCONNECTED;
    this.bot_assigned = false;
    this.sync_enabled = false;
    this.last_sync_at = null;
    this.sync_errors = null;
    this.updated_at = new Date();
  }

  // Method to set bot assignment status
  setBotAssigned(assigned: boolean): void {
    this.bot_assigned = assigned;
    if (!assigned) {
      // If bot is no longer assigned, disable sync
      this.sync_enabled = false;
    }
    this.updated_at = new Date();
  }

  // Method to set connection failed status
  setConnectionFailed(error?: string): void {
    this.connection_status = ConnectionStatus.FAILED;
    this.bot_assigned = false;
    this.sync_enabled = false;
    this.sync_errors = error || 'Connection failed';
    this.updated_at = new Date();
  }
}