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
  bot_configuration_id: string;
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

export interface CreatePaymentTransactionDto {
  membership_plan_id: string;
  bot_configuration_id: string;
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
  getAll: async (params?: {
    bot_configuration_id?: string;
    membership_plan_id?: string;
    telegram_user_id?: string;
    status?: PaymentStatus;
  }): Promise<PaymentTransaction[]> => {
    const response = await apiClient.get('/payments', { params });
    return response.data;
  },

  getById: async (id: string): Promise<PaymentTransaction> => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data;
  },

  initiate: async (
    data: CreatePaymentTransactionDto
  ): Promise<{ transaction: PaymentTransaction; payment_link: string }> => {
    const response = await apiClient.post('/payments/initiate', data);
    return response.data;
  },
};
