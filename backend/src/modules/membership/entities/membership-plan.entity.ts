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
import { TelegramGroup } from '../../bot/entities/telegram-group.entity';
import { Membership } from './membership.entity';

@Entity('membership_plans')
@Index(['tenant_id'])
@Index(['group_id'])
@Index(['is_active'])
export class MembershipPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  group_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_mnt: number;

  @Column({ length: 3, default: 'MNT' })
  currency: string;

  @Column()
  duration_days: number;

  @Column({ default: 0 })
  trial_days: number;

  @Column({ type: 'jsonb', default: {} })
  features: Record<string, any>;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  max_members: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant, tenant => tenant.membership_plans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => TelegramGroup, group => group.membership_plans, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: TelegramGroup;

  @OneToMany(() => Membership, membership => membership.plan)
  memberships: Membership[];
}