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
    return apiClient.get<BotConfiguration[]>('/bot-configurations');
  },

  getById: async (id: string): Promise<BotConfiguration> => {
    return apiClient.get<BotConfiguration>(`/bot-configurations/${id}`);
  },

  create: async (data: CreateBotConfigurationDto): Promise<BotConfiguration> => {
    return apiClient.post<BotConfiguration>('/bot-configurations', data);
  },

  update: async (id: string, data: UpdateBotConfigurationDto): Promise<BotConfiguration> => {
    return apiClient.put<BotConfiguration>(`/bot-configurations/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bot-configurations/${id}`);
  },

  sync: async (id: string): Promise<BotConfiguration> => {
    return apiClient.post<BotConfiguration>(`/bot-configurations/${id}/sync`);
  },
};
