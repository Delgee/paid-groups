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
import { Membership } from './membership.entity';
import { Payment } from '../../payment/entities/payment.entity';

@Entity('members')
@Index(['tenant_id'])
@Index(['telegram_user_id'])
@Index(['tenant_id', 'telegram_user_id'], { unique: true })
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('bigint')
  telegram_user_id: number;

  @Column({ length: 255, nullable: true })
  username: string;

  @Column({ length: 255, nullable: true })
  first_name: string;

  @Column({ length: 255, nullable: true })
  last_name: string;

  @Column({ length: 50, nullable: true })
  phone_number: string;

  @Column({ length: 10, nullable: true })
  language_code: string;

  @Column({ default: false })
  is_bot: boolean;

  @Column({ default: false })
  is_premium: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant, tenant => tenant.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => Membership, membership => membership.member)
  memberships: Membership[];

  @OneToMany(() => Payment, payment => payment.member)
  payments: Payment[];
}