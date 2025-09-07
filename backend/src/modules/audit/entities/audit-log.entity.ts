import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { User } from '../../auth/entities/user.entity';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PAYMENT = 'payment',
  WEBHOOK = 'webhook',
  ERROR = 'error',
}

@Entity('audit_logs')
@Index(['tenant_id'])
@Index(['user_id'])
@Index(['entity_type', 'entity_id'])
@Index(['action'])
@Index(['created_at'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenant_id: string;

  @Column('uuid', { nullable: true })
  user_id: string;

  @Column({ length: 100 })
  entity_type: string;

  @Column({ length: 255 })
  entity_id: string;

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'inet', nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Tenant, tenant => tenant.audit_logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @ManyToOne(() => User, user => user.audit_logs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}