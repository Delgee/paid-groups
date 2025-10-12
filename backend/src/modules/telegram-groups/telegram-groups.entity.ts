import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Project } from '../project/entities/project.entity';

export enum GroupType {
  GROUP = 'group',
  SUPERGROUP = 'supergroup',
  CHANNEL = 'channel',
}

@Entity('telegram_groups')
@Index(['tenant_id'])
@Index(['project_id'])
@Index(['telegram_chat_id'])
export class TelegramGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid')
  project_id: string;

  @Column({ type: 'bigint', nullable: true, unique: true })
  telegram_chat_id: number | null;

  @Column({ length: 255 })
  group_name: string;

  @Column({
    type: 'enum',
    enum: GroupType,
    default: GroupType.GROUP,
  })
  group_type: GroupType;

  @Column({ length: 255, nullable: true })
  username: string | null;

  @Column({ length: 500, nullable: true })
  invite_link: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  member_count: number;

  @Column({ type: 'jsonb', default: '{}' })
  settings: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Project, { eager: true })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToMany('Membership', 'group')
  memberships: any[];

  // Many-to-many relationship with MembershipPlans
  @OneToMany('MembershipPlanGroup', 'telegram_group')
  plan_associations: any[];

  // Legacy one-to-many (deprecated)
  @OneToMany('MembershipPlan', 'group')
  membership_plans: any[];

  tenant: any; // Add tenant relation placeholder for compatibility

  // Virtual properties for API responses
  get telegram_chat_id_string(): string | null {
    return this.telegram_chat_id ? this.telegram_chat_id.toString() : null;
  }
}