import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('telegram_user_accounts')
export class TelegramUserAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, unique: true })
  user_id: string;

  @Column({ type: 'bigint', nullable: false, unique: true })
  telegram_user_id: number;

  @Column({ type: 'bigint', nullable: true })
  telegram_chat_id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_username: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_first_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_last_name: string;

  @Column({ type: 'timestamp', nullable: false, default: () => 'CURRENT_TIMESTAMP' })
  linked_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_interaction_at: Date;

  @Column({ type: 'boolean', nullable: false, default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', nullable: false, default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
