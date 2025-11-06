import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Project } from '../../project/entities/project.entity';
import { TelegramGroup } from '../../telegram-groups/telegram-groups.entity';
import { MembershipPlanGroup } from './membership-plan-group.entity';

@Entity('membership_plans')
@Check('"price" > 0')
@Check('"duration_days" > 0')
export class MembershipPlan {
  @ApiProperty({ description: 'Unique identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Tenant ID for multi-tenant isolation', format: 'uuid' })
  @Column('uuid')
  tenant_id: string;

  @ApiProperty({ description: 'Project ID', format: 'uuid' })
  @Column('uuid')
  project_id: string;

  @ApiProperty({ description: 'Plan display name', maxLength: 255 })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({ description: 'Plan description/benefits', maxLength: 1024 })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Price in MNT (Mongolian Tugrik)', minimum: 1000, maximum: 10000000 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ description: 'Currency code', default: 'MNT' })
  @Column({ type: 'varchar', length: 3, default: 'MNT' })
  currency: string;

  @ApiProperty({ description: 'Membership duration in days', minimum: 1, maximum: 365 })
  @Column({ type: 'integer' })
  duration_days: number;

  @ApiProperty({ description: 'Whether trial period is enabled', default: false })
  @Column({ type: 'boolean', default: false })
  trial_enabled: boolean;

  @ApiProperty({ description: 'Trial duration in seconds (default: 300 = 5 minutes)', default: 300, minimum: 60, maximum: 86400 })
  @Column({ type: 'integer', default: 300 })
  trial_duration_seconds: number;

  @ApiProperty({ description: 'Plan features in JSON format', default: {} })
  @Column({ type: 'jsonb', default: {} })
  features: Record<string, any>;

  @ApiProperty({ description: 'Plan availability status', default: true })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiPropertyOptional({ description: 'Maximum number of members', nullable: true })
  @Column({ type: 'integer', nullable: true })
  max_members?: number;

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn()
  updated_at: Date;

  // Relationships
  @ManyToOne(() => Project, project => project.membership_plans, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // Many-to-many relationship with TelegramGroups via explicit junction entity
  // NOTE: We don't use @JoinTable here because we have an explicit MembershipPlanGroup entity
  // TypeORM will manage the relationship through the OneToMany/ManyToOne in the junction entity
  @ManyToMany(() => TelegramGroup, group => group.membership_plans)
  telegram_groups: TelegramGroup[];

  // Junction table associations (explicit entity for better control)
  @OneToMany(() => MembershipPlanGroup, association => association.membership_plan)
  group_associations: MembershipPlanGroup[];
}
