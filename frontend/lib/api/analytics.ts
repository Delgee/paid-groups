import { apiClient } from './client';

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
  mrr: number;
  arr: number;
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

export interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  averagePayment: number;
  revenueGrowth: number;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  duration_ms?: number;
  details?: Record<string, any>;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version?: string;
  checks?: HealthCheck[];
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface QueueStatus {
  name: string;
  stats: QueueStats;
  is_healthy: boolean;
  message: string;
}

export const analyticsApi = {
  /**
   * Get dashboard metrics including MRR, churn rate, and top groups
   */
  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    return apiClient.get<DashboardMetrics>('/analytics/dashboard');
  },

  /**
   * Get revenue metrics including MRR, ARR, and daily revenue
   */
  getRevenueMetrics: async (days: number = 30): Promise<RevenueMetrics> => {
    return apiClient.get<RevenueMetrics>('/analytics/revenue', {
      params: { days },
    });
  },

  /**
   * Get membership metrics including churn rate and lifetime value
   */
  getMembershipMetrics: async (): Promise<MembershipMetrics> => {
    return apiClient.get<MembershipMetrics>('/analytics/memberships');
  },

  /**
   * Get payment statistics including totals, success rates, and growth
   */
  getPaymentStats: async (): Promise<PaymentStats> => {
    return apiClient.get<PaymentStats>('/analytics/payments');
  },
};

export const healthApi = {
  /**
   * Get overall application health status
   */
  getHealthStatus: async (): Promise<HealthStatus> => {
    return apiClient.get<HealthStatus>('/health');
  },

  /**
   * Get database health status
   */
  getDatabaseHealth: async (): Promise<HealthCheck> => {
    return apiClient.get<HealthCheck>('/health/database');
  },

  /**
   * Get Redis health status
   */
  getRedisHealth: async (): Promise<HealthCheck> => {
    return apiClient.get<HealthCheck>('/health/redis');
  },

  /**
   * Get QPay health status
   */
  getQPayHealth: async (): Promise<HealthCheck> => {
    return apiClient.get<HealthCheck>('/health/qpay');
  },

  /**
   * Get Telegram bot connectivity health
   */
  getTelegramHealth: async (): Promise<HealthCheck> => {
    return apiClient.get<HealthCheck>('/health/telegram');
  },

  /**
   * Get worker queue status and statistics
   */
  getQueueStatus: async (): Promise<QueueStatus> => {
    return apiClient.get<QueueStatus>('/health/queue');
  },
};
