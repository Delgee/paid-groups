import { BaseEntity, TenantStatus } from './common';

export interface Tenant extends BaseEntity {
  name: string;
  slug: string;
  status: TenantStatus;
  subscription_tier: 'starter' | 'growth' | 'enterprise';
  settings: Record<string, any>;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  subscription_tier?: 'starter' | 'growth' | 'enterprise';
}

export interface UpdateTenantRequest {
  name?: string;
  status?: TenantStatus;
  subscription_tier?: 'starter' | 'growth' | 'enterprise';
  settings?: Record<string, any>;
}