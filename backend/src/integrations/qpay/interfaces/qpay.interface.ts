/**
 * QPay API Interfaces
 * Based on QPay v2 API documentation
 */

export interface QPayTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface QPayAuthCredentials {
  username: string;
  password: string;
  terminal_id: string;
}

export interface QPayBankAccount {
  account_bank_code: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
}

export interface QPayInvoiceRequest {
  merchant_id: string;
  branch_code?: string;
  amount: number;
  currency: string;
  customer_name?: string;
  customer_logo?: string;
  callback_url?: string;
  description?: string;
  mcc_code?: string;
  bank_accounts: QPayBankAccount[];
}

export interface QPayInvoiceUrl {
  name: string;
  description: string;
  logo: string;
  link: string;
}

export interface QPayInvoiceResponse {
  id: string;
  invoice_status: 'OPEN' | 'CLOSED',
  invoice_status_date: string;
  qr_code: string;
  qr_image: string;
}

export interface QPayInvoiceDetails {
  invoice_id: string;
  merchant_id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  description?: string;
  created_at: string;
  paid_at?: string;
  qr_text: string;
  qr_image: string;
}

export interface QPayPaymentCheckRequest {
  invoice_id: string;
}

export interface QPayPaymentCheckResponse {
  id: string;
  invoice_status: "OPEN" | "CLOSED";
  invoice_status_date: string;
}

export interface QPayWebhookPayload {
  invoice_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: 'PAID';
  paid_at: string;
  transaction_id: string;
  signature: string;
}

export interface QPayMerchantCompany {
  owner_first_name?: string;
  owner_last_name?: string;
  register_number: string;
  company_name: string;
  name: string;
  name_eng?: string;
  mcc_code: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
}

export interface QPayMerchantPerson {
  register_number: string;
  first_name: string;
  last_name: string;
  name: string;
  name_eng?: string;
  business_name: string;
  business_name_eng?: string;
  mcc_code: string;
  city: string;
  district: string;
  address: string;
  phone: string;
  email: string;
}

export interface QPayMerchantResponse {
  id: string;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

export interface QPayErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
