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
  created_at: string;
  updated_at: string;
}

export interface CreateProjectDto {
  bot_token: string;
  bot_username: string;
  display_name: string;
  description?: string;
  welcome_message: string;
  is_active?: boolean;
}

export interface UpdateProjectDto {
  bot_token?: string;
  bot_username?: string;
  display_name?: string;
  description?: string;
  welcome_message?: string;
  is_active?: boolean;
}

export const projectApi = {
  getAll: async (): Promise<Project[]> => {
    return apiClient.get<Project[]>('/projects');
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
};
