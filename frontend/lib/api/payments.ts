import { apiClient } from './client';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export interface PaymentTransaction {
  id: string;
  tenant_id: string;
  membership_plan_id: string;
  project_id: string;
  telegram_user_id: string;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
  amount: number;
  snapshot_plan_name: string;
  snapshot_price: number;
  snapshot_duration_days: number;
  status: PaymentStatus;
  qpay_invoice_id?: string;
  qpay_transaction_id?: string;
  qpay_payment_method?: string;
  payment_link?: string;
  membership_starts_at?: string;
  membership_expires_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  totalRevenue: number;
}

export interface PaymentFilters {
  project_id?: string;
  membership_plan_id?: string;
  telegram_user_id?: string;
  status?: PaymentStatus;
}

export interface CreatePaymentTransactionDto {
  membership_plan_id: string;
  project_id: string;
  telegram_user_id: string;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
  amount: number;
  snapshot_plan_name: string;
  snapshot_price: number;
  snapshot_duration_days: number;
}

export const paymentApi = {
  getAll: async (params?: PaymentFilters): Promise<PaymentTransaction[]> => {
    return apiClient.get<PaymentTransaction[]>('/payments', { params });
  },

  getById: async (id: string): Promise<PaymentTransaction> => {
    return apiClient.get<PaymentTransaction>(`/payments/${id}`);
  },

  initiate: async (
    data: CreatePaymentTransactionDto
  ): Promise<{ transaction: PaymentTransaction; payment_link: string }> => {
    return apiClient.post<{ transaction: PaymentTransaction; payment_link: string }>(
      '/payments/initiate',
      data
    );
  },

  // Calculate stats from payments array (since backend doesn't expose this endpoint yet)
  calculateStats: (payments: PaymentTransaction[]): PaymentStats => {
    return {
      total: payments.length,
      completed: payments.filter((p) => p.status === PaymentStatus.COMPLETED).length,
      pending: payments.filter((p) => p.status === PaymentStatus.PENDING).length,
      failed: payments.filter((p) => p.status === PaymentStatus.FAILED).length,
      totalRevenue: payments
        .filter((p) => p.status === PaymentStatus.COMPLETED)
        .reduce((sum, p) => sum + p.amount, 0),
    };
  },
};

// React Query keys
export const paymentQueryKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentQueryKeys.all, 'list'] as const,
  list: (filters?: PaymentFilters) => [...paymentQueryKeys.lists(), filters] as const,
  detail: (id: string) => [...paymentQueryKeys.all, 'detail', id] as const,
};
