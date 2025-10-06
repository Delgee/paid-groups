import { apiClient } from './client';

export interface BotConfiguration {
  id: string;
  tenant_id: string;
  bot_token: string;
  bot_username: string;
  display_name: string;
  description?: string;
  welcome_message: string;
  channel_id?: string;
  channel_username?: string;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBotConfigurationDto {
  bot_token: string;
  bot_username: string;
  display_name: string;
  description?: string;
  welcome_message: string;
  channel_id?: string;
  channel_username?: string;
  is_active?: boolean;
}

export interface UpdateBotConfigurationDto {
  bot_token?: string;
  bot_username?: string;
  display_name?: string;
  description?: string;
  welcome_message?: string;
  channel_id?: string;
  channel_username?: string;
  is_active?: boolean;
  last_sync_at?: string;
}

export const botConfigurationApi = {
  getAll: async (): Promise<BotConfiguration[]> => {
    const response = await apiClient.get('/bot-configurations');
    return response.data;
  },

  getById: async (id: string): Promise<BotConfiguration> => {
    const response = await apiClient.get(`/bot-configurations/${id}`);
    return response.data;
  },

  create: async (data: CreateBotConfigurationDto): Promise<BotConfiguration> => {
    const response = await apiClient.post('/bot-configurations', data);
    return response.data;
  },

  update: async (id: string, data: UpdateBotConfigurationDto): Promise<BotConfiguration> => {
    const response = await apiClient.put(`/bot-configurations/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bot-configurations/${id}`);
  },

  sync: async (id: string): Promise<BotConfiguration> => {
    const response = await apiClient.post(`/bot-configurations/${id}/sync`);
    return response.data;
  },
};
