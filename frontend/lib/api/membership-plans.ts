import { apiClient } from './client';

export interface MembershipPlan {
  id: string;
  tenant_id: string;
  bot_configuration_id: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMembershipPlanDto {
  bot_configuration_id: string;
  name: string;
  description?: string;
  price: number;
  duration_days: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateMembershipPlanDto {
  name?: string;
  description?: string;
  price?: number;
  duration_days?: number;
  is_active?: boolean;
  sort_order?: number;
}

export const membershipPlanApi = {
  getAll: async (params?: {
    bot_configuration_id?: string;
    is_active?: boolean;
  }): Promise<MembershipPlan[]> => {
    const response = await apiClient.get('/membership-plans', { params });
    return response.data;
  },

  getById: async (id: string): Promise<MembershipPlan> => {
    const response = await apiClient.get(`/membership-plans/${id}`);
    return response.data;
  },

  create: async (data: CreateMembershipPlanDto): Promise<MembershipPlan> => {
    const response = await apiClient.post('/membership-plans', data);
    return response.data;
  },

  update: async (id: string, data: UpdateMembershipPlanDto): Promise<MembershipPlan> => {
    const response = await apiClient.put(`/membership-plans/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/membership-plans/${id}`);
  },
};
