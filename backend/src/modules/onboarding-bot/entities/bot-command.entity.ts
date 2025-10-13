import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TelegramUserAccount } from './telegram-user-account.entity';

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  RATE_LIMITED = 'rate_limited',
}

@Entity('bot_commands')
export class BotCommand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  telegram_user_account_id: string;

  @Column({ type: 'bigint', nullable: false })
  telegram_user_id: number;

  @Column({ type: 'bigint', nullable: false })
  telegram_chat_id: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  command: string;

  @Column({ type: 'jsonb', nullable: false, default: {} })
  parameters: Record<string, any>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  session_step: string;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  response_status: ResponseStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  error_code: string;

  @Column({ type: 'integer', nullable: true })
  response_time_ms: number;

  @Column({ type: 'uuid', nullable: false })
  correlation_id: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;

  // Relationships
  @ManyToOne(() => TelegramUserAccount, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'telegram_user_account_id' })
  telegram_user_account: TelegramUserAccount;
}
