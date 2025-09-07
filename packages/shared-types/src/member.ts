import { TenantScopedEntity, MembershipStatus } from './common';

export interface Member extends TenantScopedEntity {
  telegram_user_id: number;
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
  is_banned: boolean;
  ban_reason?: string;
}

export interface Membership extends TenantScopedEntity {
  member_id: string;
  plan_id: string;
  group_id: string;
  status: MembershipStatus;
  starts_at: string;
  expires_at: string;
  is_auto_renew: boolean;
}

export interface MembershipPlan extends TenantScopedEntity {
  group_id: string;
  name: string;
  description?: string;
  price_mnt: number;
  duration_days: number;
  trial_days: number;
  is_bundle: boolean;
  bundle_groups: string[];
  features: string[];
  is_active: boolean;
  max_members?: number;
}

export interface CreateMembershipPlanRequest {
  group_id: string;
  name: string;
  description?: string;
  price_mnt: number;
  duration_days: number;
  trial_days?: number;
  is_bundle?: boolean;
  bundle_groups?: string[];
  features?: string[];
  max_members?: number;
}

export interface UpdateMembershipPlanRequest {
  name?: string;
  description?: string;
  price_mnt?: number;
  duration_days?: number;
  trial_days?: number;
  features?: string[];
  is_active?: boolean;
  max_members?: number;
}

export interface MemberWithMemberships extends Member {
  memberships: (Membership & {
    plan: MembershipPlan;
    group: { id: string; group_name: string };
  })[];
}