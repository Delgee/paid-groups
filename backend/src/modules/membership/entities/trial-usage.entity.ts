import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { Member } from './member.entity';
import { MembershipPlan } from '../../membership-plan/entities/membership-plan.entity';
import { Membership } from './membership.entity';

/**
 * TrialUsage Entity
 *
 * Tracks which members have used trial periods for specific membership plans.
 * Prevents users from using the same trial multiple times.
 * One trial usage per member per plan (enforced by unique constraint).
 */
@Entity('trial_usage')
@Index(['tenant_id'])
@Index(['member_id'])
@Index(['membership_plan_id'])
@Index(['trial_ends_at'])
@Index(['member_id', 'membership_plan_id'], { unique: true })
export class TrialUsage {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenant isolation', format: 'uuid' })
  @Column('uuid')
  tenant_id: string;

  @ApiProperty({ description: 'Member who used the trial', format: 'uuid' })
  @Column('uuid')
  member_id: string;

  @ApiProperty({ description: 'Membership plan for which trial was used', format: 'uuid' })
  @Column('uuid')
  membership_plan_id: string;

  @ApiProperty({ description: 'The trial membership that was created', format: 'uuid' })
  @Column('uuid')
  membership_id: string;

  @ApiProperty({ description: 'When the trial was activated' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  trial_started_at: Date;

  @ApiProperty({ description: 'When the trial expires' })
  @Column('timestamp')
  trial_ends_at: Date;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  created_at: Date;

  // Relationships
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @ManyToOne(() => MembershipPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membership_plan_id' })
  membership_plan: MembershipPlan;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membership_id' })
  membership: Membership;
}
