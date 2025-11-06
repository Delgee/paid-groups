import { apiClient } from './client';
import { TelegramGroup } from './telegram-groups';

export interface MembershipPlan {
  id: string;
  tenant_id: string;
  project_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration_days: number;
  trial_enabled: boolean;
  trial_duration_seconds: number;
  features: Record<string, any>;
  is_active: boolean;
  max_members?: number;
  created_at: string;
  updated_at: string;
  telegram_groups?: TelegramGroup[];
}

export interface CreateMembershipPlanDto {
  project_id: string;
  telegram_group_ids: string[];
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  trial_enabled?: boolean;
  trial_duration_seconds?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateMembershipPlanDto {
  telegram_group_ids?: string[];
  name?: string;
  description?: string;
  price?: number;
  duration_days?: number;
  trial_enabled?: boolean;
  trial_duration_seconds?: number;
  is_active?: boolean;
  sort_order?: number;
}

export const membershipPlanApi = {
  getAll: async (params?: {
    project_id?: string;
    is_active?: boolean;
  }): Promise<MembershipPlan[]> => {
    return apiClient.get<MembershipPlan[]>('/membership-plans', { params });
  },

  getById: async (id: string): Promise<MembershipPlan> => {
    return apiClient.get<MembershipPlan>(`/membership-plans/${id}`);
  },

  create: async (data: CreateMembershipPlanDto): Promise<MembershipPlan> => {
    return apiClient.post<MembershipPlan>('/membership-plans', data);
  },

  update: async (id: string, data: UpdateMembershipPlanDto): Promise<MembershipPlan> => {
    return apiClient.put<MembershipPlan>(`/membership-plans/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/membership-plans/${id}`);
  },
};
