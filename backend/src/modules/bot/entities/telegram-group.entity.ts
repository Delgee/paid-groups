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
import { TelegramBot } from './telegram-bot.entity';
import { MembershipPlan } from '../../membership/entities/membership-plan.entity';
import { Membership } from '../../membership/entities/membership.entity';

export enum GroupType {
  GROUP = 'group',
  SUPERGROUP = 'supergroup',
  CHANNEL = 'channel',
}

@Entity('telegram_groups')
@Index(['tenant_id'])
@Index(['bot_id'])
@Index(['telegram_chat_id'])
export class TelegramGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  bot_id: string;

  @Column('bigint', { unique: true })
  telegram_chat_id: number;

  @Column({ length: 255 })
  group_name: string;

  @Column({
    type: 'enum',
    enum: GroupType,
  })
  group_type: GroupType;

  @Column({ length: 255, nullable: true })
  username: string;

  @Column({ length: 500, nullable: true })
  invite_link: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 0 })
  member_count: number;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant, tenant => tenant.telegram_groups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => TelegramBot, bot => bot.groups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bot_id' })
  bot: TelegramBot;

  @OneToMany(() => MembershipPlan, plan => plan.group)
  membership_plans: MembershipPlan[];

  @OneToMany(() => Membership, membership => membership.group)
  memberships: Membership[];
}