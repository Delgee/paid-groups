import { apiClient } from './client';

export interface Project {
  id: string;
  tenant_id: string;
  bot_token: string;
  bot_username: string;
  display_name: string;
  description?: string;
  welcome_message: string;
  is_active: boolean;
  last_sync_at?: string;
  bot_avatar_file_id?: string;
  bot_avatar_url?: string;
  webhook_url?: string;
  account_bank_code: string;
  account_number: string;
  account_name: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedProjectsResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProjectDto {
  bot_token: string;
  bot_username: string;
  display_name: string;
  description?: string;
  welcome_message: string;
  is_active?: boolean;
  account_bank_code: string;
  account_number: string;
  account_name: string;
}

export interface UpdateProjectDto {
  bot_token?: string;
  bot_username?: string;
  display_name?: string;
  description?: string;
  welcome_message?: string;
  is_active?: boolean;
  account_bank_code?: string;
  account_number?: string;
  account_name?: string;
}

export const projectApi = {
  getAll: async (): Promise<PaginatedProjectsResponse> => {
    return apiClient.get<PaginatedProjectsResponse>('/projects');
  },

  getById: async (id: string): Promise<Project> => {
    return apiClient.get<Project>(`/projects/${id}`);
  },

  create: async (data: CreateProjectDto): Promise<Project> => {
    return apiClient.post<Project>('/projects', data);
  },

  update: async (id: string, data: UpdateProjectDto): Promise<Project> => {
    return apiClient.put<Project>(`/projects/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  sync: async (id: string): Promise<Project> => {
    return apiClient.post<Project>(`/projects/${id}/sync`);
  },

  verifyToken: async (botToken: string): Promise<{ username: string; first_name: string; id: number; is_bot: boolean }> => {
    return apiClient.post<{ username: string; first_name: string; id: number; is_bot: boolean }>('/projects/verify-token', { bot_token: botToken });
  },
};
