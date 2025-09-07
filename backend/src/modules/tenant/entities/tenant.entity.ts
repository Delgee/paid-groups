import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { TelegramBot } from '../../bot/entities/telegram-bot.entity';
import { TelegramGroup } from '../../bot/entities/telegram-group.entity';
import { MembershipPlan } from '../../membership/entities/membership-plan.entity';
import { Member } from '../../membership/entities/member.entity';
import { Membership } from '../../membership/entities/membership.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { AuditLog } from '../../audit/entities/audit-log.entity';

export enum SubscriptionTier {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255 })
  company_name: string;

  @Column({
    type: 'enum',
    enum: SubscriptionTier,
    default: SubscriptionTier.FREE,
  })
  subscription_tier: SubscriptionTier;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  subscription_status: SubscriptionStatus;

  @Column({ default: 1 })
  max_bots: number;

  @Column({ default: 5 })
  max_groups_per_bot: number;

  @Column({ default: 1000 })
  max_members: number;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => User, user => user.tenant)
  users: User[];

  @OneToMany(() => TelegramBot, bot => bot.tenant)
  telegram_bots: TelegramBot[];

  @OneToMany(() => TelegramGroup, group => group.tenant)
  telegram_groups: TelegramGroup[];

  @OneToMany(() => MembershipPlan, plan => plan.tenant)
  membership_plans: MembershipPlan[];

  @OneToMany(() => Member, member => member.tenant)
  members: Member[];

  @OneToMany(() => Membership, membership => membership.tenant)
  memberships: Membership[];

  @OneToMany(() => Payment, payment => payment.tenant)
  payments: Payment[];

  @OneToMany(() => AuditLog, auditLog => auditLog.tenant)
  audit_logs: AuditLog[];
}