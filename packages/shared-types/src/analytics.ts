import { TenantScopedEntity } from './common';

export interface AnalyticsEvent extends TenantScopedEntity {
  event_type: string;
  event_data: Record<string, any>;
  member_id?: string;
  group_id?: string;
}

export interface DashboardMetrics {
  active_members: number;
  total_revenue: number;
  monthly_revenue: number;
  churn_rate: number;
  trial_conversion_rate: number;
  top_performing_groups: GroupMetrics[];
}

export interface GroupMetrics {
  group_id: string;
  group_name: string;
  member_count: number;
  revenue: number;
  conversion_rate: number;
}

export interface RevenueMetrics {
  current_period: number;
  previous_period: number;
  growth_percentage: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  daily_revenue: DailyRevenue[];
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  transaction_count: number;
}

export interface MembershipMetrics {
  total_memberships: number;
  active_memberships: number;
  trial_memberships: number;
  expired_memberships: number;
  churn_rate: number;
  average_lifetime_value: number;
}

export interface TenantAnalytics {
  date: string;
  active_members: number;
  payments_count: number;
  revenue_mnt: number;
  trials_started: number;
  trials_converted: number;
}

export interface ExportRequest {
  type: 'members' | 'payments' | 'analytics';
  format: 'csv' | 'excel';
  date_from?: string;
  date_to?: string;
  group_id?: string;
}

export interface ExportResponse {
  download_url: string;
  expires_at: string;
}