import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Check,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipPlan } from '../../membership-plan/entities/membership-plan.entity';
import { Project } from '../../project/entities/project.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('payment_transactions')
@Check('"amount" > 0')
export class PaymentTransaction {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenant isolation', format: 'uuid' })
  @Column('uuid')
  tenant_id: string;

  @ApiProperty({ description: 'Selected membership plan ID', format: 'uuid' })
  @Column('uuid')
  membership_plan_id: string;

  @ApiProperty({ description: 'Project that processed payment', format: 'uuid' })
  @Column('uuid')
  project_id: string;

  @ApiProperty({ description: "Payer's Telegram user ID" })
  @Column({ type: 'bigint' })
  telegram_user_id: string;

  @ApiPropertyOptional({ description: "Payer's Telegram @username", maxLength: 255 })
  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_username?: string;

  @ApiPropertyOptional({ description: "Payer's first name from Telegram", maxLength: 255 })
  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_first_name?: string;

  @ApiPropertyOptional({ description: "Payer's last name from Telegram", maxLength: 255 })
  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram_last_name?: string;

  @ApiProperty({ description: 'Amount paid in MNT' })
  @Column({ type: 'integer' })
  amount: number;

  @ApiProperty({ description: 'Plan name snapshot at time of purchase', maxLength: 255 })
  @Column({ type: 'varchar', length: 255 })
  snapshot_plan_name: string;

  @ApiProperty({ description: 'Price snapshot at time of purchase' })
  @Column({ type: 'integer' })
  snapshot_price: number;

  @ApiProperty({ description: 'Duration snapshot at time of purchase' })
  @Column({ type: 'integer' })
  snapshot_duration_days: number;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiPropertyOptional({ description: 'QPay invoice identifier', maxLength: 255 })
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  qpay_invoice_id?: string;

  @ApiPropertyOptional({ description: 'QPay transaction identifier', maxLength: 255 })
  @Column({ type: 'varchar', length: 255, nullable: true })
  qpay_transaction_id?: string;

  @ApiPropertyOptional({ description: 'Payment method used', maxLength: 100 })
  @Column({ type: 'varchar', length: 100, nullable: true })
  qpay_payment_method?: string;

  @ApiPropertyOptional({ description: 'QPay payment link sent to user' })
  @Column({ type: 'text', nullable: true })
  payment_link?: string;

  @ApiPropertyOptional({ description: 'Membership start date' })
  @Column({ type: 'timestamp', nullable: true })
  membership_starts_at?: Date;

  @ApiPropertyOptional({ description: 'Membership expiration date' })
  @Column({ type: 'timestamp', nullable: true })
  membership_expires_at?: Date;

  @ApiPropertyOptional({ description: 'Payment completion timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  completed_at?: Date;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updated_at: Date;

  // Relationships
  @ManyToOne(() => MembershipPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'membership_plan_id' })
  membership_plan: MembershipPlan;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // @OneToOne(() => ChannelMember, member => member.payment_transaction)
  // channel_member: ChannelMember;
}
