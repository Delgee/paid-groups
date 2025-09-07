// Common types used across the application

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

export type UserRole = 'owner' | 'admin' | 'moderator';

export type MembershipStatus = 'trial' | 'active' | 'expired' | 'cancelled';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export type TenantStatus = 'active' | 'suspended' | 'cancelled';

export type GroupType = 'channel' | 'group' | 'supergroup';

export type MessageType = 'welcome' | 'expiry_reminder' | 'expired' | 'payment_confirm' | 'custom';

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface TenantScopedEntity extends BaseEntity {
  tenant_id: string;
}