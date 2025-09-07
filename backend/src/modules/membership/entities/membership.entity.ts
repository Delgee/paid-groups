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
import { Member } from './member.entity';
import { TelegramGroup } from '../../bot/entities/telegram-group.entity';
import { MembershipPlan } from './membership-plan.entity';
import { Payment } from '../../payment/entities/payment.entity';

export enum MembershipStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

@Entity('memberships')
@Index(['tenant_id'])
@Index(['member_id'])
@Index(['group_id'])
@Index(['status'])
@Index(['expires_at'])
@Index(['member_id', 'group_id', 'status'], { 
  unique: true, 
  where: "status IN ('active', 'trial')" 
})
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  member_id: string;

  @Column('uuid')
  group_id: string;

  @Column('uuid')
  plan_id: string;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  status: MembershipStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  starts_at: Date;

  @Column('timestamp')
  expires_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  trial_ends_at: Date;

  @Column({ default: false })
  auto_renew: boolean;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant, tenant => tenant.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Member, member => member.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => TelegramGroup, group => group.memberships, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: TelegramGroup;

  @ManyToOne(() => MembershipPlan, plan => plan.memberships, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: MembershipPlan;

  @OneToMany(() => Payment, payment => payment.membership)
  payments: Payment[];
}