import { TenantScopedEntity, PaymentStatus } from './common';

export interface Payment extends TenantScopedEntity {
  member_id: string;
  membership_id?: string;
  qpay_invoice_id: string;
  qpay_payment_id?: string;
  amount_mnt: number;
  status: PaymentStatus;
  payment_method?: string;
  webhook_received_at?: string;
  webhook_payload?: Record<string, any>;
  idempotency_key: string;
}

export interface QPayWebhookPayload {
  invoice_id: string;
  payment_id?: string;
  amount: number;
  status: 'completed' | 'failed';
  payment_method?: 'card' | 'qpay_wallet' | 'bank_transfer';
  customer?: {
    phone?: string;
    email?: string;
    name?: string;
  };
  metadata?: {
    tenant_id: string;
    member_telegram_id: number;
    plan_id: string;
  };
  paid_at?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface Invoice extends TenantScopedEntity {
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  total_transactions: number;
  total_revenue_mnt: number;
  service_fee_mnt: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  due_date: string;
  paid_at?: string;
  payment_reference?: string;
}

export interface CreatePaymentRequest {
  plan_id: string;
  member_telegram_id: number;
}

export interface PaymentStats {
  total_revenue: number;
  total_transactions: number;
  successful_payments: number;
  failed_payments: number;
  average_transaction: number;
  monthly_revenue: number[];
}