import { apiClient } from './client';

export interface SystemStats {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  total_users: number;
  total_projects: number;
  active_projects: number;
  total_members: number;
  total_memberships: number;
  active_memberships: number;
  total_revenue: number;
  total_payments: number;
  successful_payments: number;
}

export interface RevenueStats {
  total_revenue: number;
  monthly_revenue: number;
  yearly_revenue: number;
  average_transaction: number;
  payment_trends: Array<{
    date: string;
    revenue: number;
    payment_count: number;
  }>;
}

export interface TenantActivity {
  tenant_id: string;
  tenant_name: string;
  company_name: string;
  subscription_tier: string;
  subscription_status: string;
  total_projects: number;
  total_members: number;
  total_revenue: number;
  last_activity: Date;
  created_at: Date;
}

export interface Tenant {
  id: string;
  name: string;
  company_name: string;
  subscription_tier: string;
  subscription_status: string;
  max_bots: number;
  max_groups_per_bot: number;
  max_members: number;
  settings: Record<string, any>;
  qpay_merchant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantStats {
  total_projects: number;
  total_groups: number;
  total_members: number;
  active_memberships: number;
  total_revenue: number;
}

export const adminApi = {
  // System statistics
  async getSystemStats(): Promise<SystemStats> {
    return apiClient.get<SystemStats>('/admin/stats');
  },

  async getRevenueStats(days: number = 30): Promise<RevenueStats> {
    return apiClient.get<RevenueStats>(`/admin/revenue?days=${days}`);
  },

  async getTenantActivity(limit: number = 10): Promise<TenantActivity[]> {
    return apiClient.get<TenantActivity[]>(`/admin/tenant-activity?limit=${limit}`);
  },

  // Tenant management
  async getAllTenants(subscriptionStatus?: string): Promise<Tenant[]> {
    const params = subscriptionStatus ? `?subscription_status=${subscriptionStatus}` : '';
    return apiClient.get<Tenant[]>(`/tenants${params}`);
  },

  async getTenant(id: string): Promise<Tenant> {
    return apiClient.get<Tenant>(`/tenants/${id}`);
  },

  async getTenantStats(id: string): Promise<TenantStats> {
    return apiClient.get<TenantStats>(`/tenants/${id}/stats`);
  },

  async createTenant(data: {
    name: string;
    company_name: string;
    subscription_tier?: string;
    subscription_status?: string;
    max_bots?: number;
    max_groups_per_bot?: number;
    max_members?: number;
  }): Promise<Tenant> {
    return apiClient.post<Tenant>('/tenants', data);
  },

  async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
    return apiClient.put<Tenant>(`/tenants/${id}`, data);
  },

  async deleteTenant(id: string): Promise<void> {
    await apiClient.delete(`/tenants/${id}`);
  },
};
