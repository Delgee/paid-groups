import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { TelegramGroup } from './telegram-group.entity';

@Entity('telegram_bots')
@Index(['tenant_id'])
@Index(['bot_token'])
@Index(['is_active'])
export class TelegramBot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column({ length: 255, unique: true })
  bot_token: string;

  @Column({ length: 255, nullable: true })
  bot_username: string;

  @Column({ length: 255 })
  bot_name: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ length: 500, nullable: true })
  webhook_url: string;

  @Column({ length: 255, nullable: true })
  webhook_secret: string;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  message_templates: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant, tenant => tenant.telegram_bots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => TelegramGroup, group => group.bot)
  groups: TelegramGroup[];
}