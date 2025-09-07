import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Member } from '../../membership/entities/member.entity';
import { Membership } from '../../membership/entities/membership.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

@Entity('payments')
@Index(['tenant_id'])
@Index(['member_id'])
@Index(['membership_id'])
@Index(['status'])
@Index(['qpay_invoice_id'])
@Index(['webhook_event_id'])
@Index(['created_at'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid', { nullable: true })
  member_id: string;

  @Column('uuid', { nullable: true })
  membership_id: string;

  @Column({ length: 255, unique: true })
  qpay_invoice_id: string;

  @Column({ length: 255, nullable: true })
  qpay_payment_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount_mnt: number;

  @Column({ length: 3, default: 'MNT' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ length: 50, nullable: true })
  payment_method: string;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  failed_at: Date;

  @Column({ type: 'text', nullable: true })
  failure_reason: string;

  @Column({ type: 'timestamp', nullable: true })
  refunded_at: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refund_amount: number;

  @Column({ length: 255, nullable: true })
  webhook_event_id: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tenant, tenant => tenant.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Member, member => member.payments, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => Membership, membership => membership.payments, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'membership_id' })
  membership: Membership;
}