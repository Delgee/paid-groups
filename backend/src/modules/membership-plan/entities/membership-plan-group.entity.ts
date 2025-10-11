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
import { MembershipPlan } from './membership-plan.entity';
import { TelegramGroup } from '../../telegram-groups/telegram-groups.entity';

/**
 * MembershipPlanGroup Junction Entity
 *
 * Enables many-to-many relationship between MembershipPlans and TelegramGroups.
 * One membership plan can grant access to multiple Telegram groups.
 * This allows flexible membership configurations like:
 * - "Premium Plan" grants access to Group A + Group B
 * - "VIP Plan" grants access to Group A + Group B + Group C
 */
@Entity('membership_plan_groups')
@Index(['membership_plan_id', 'telegram_group_id'], { unique: true })
@Index(['membership_plan_id'])
@Index(['telegram_group_id'])
export class MembershipPlanGroup {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Membership Plan ID', format: 'uuid' })
  @Column('uuid')
  membership_plan_id: string;

  @ApiProperty({ description: 'Telegram Group ID', format: 'uuid' })
  @Column('uuid')
  telegram_group_id: string;

  @ApiProperty({ description: 'Association creation timestamp' })
  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => MembershipPlan, plan => plan.group_associations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'membership_plan_id' })
  membership_plan: MembershipPlan;

  @ManyToOne(() => TelegramGroup, group => group.plan_associations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'telegram_group_id' })
  telegram_group: TelegramGroup;
}
