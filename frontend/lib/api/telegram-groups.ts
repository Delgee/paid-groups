import { apiClient } from './client';

// Enums matching backend
export enum GroupType {
  GROUP = 'group',
  SUPERGROUP = 'supergroup',
  CHANNEL = 'channel',
}

/**
 * Telegram Group entity interface
 */
export interface TelegramGroup {
  id: string;
  tenant_id: string;
  project_id: string;
  telegram_chat_id: number | null;
  group_name: string;
  group_type: GroupType;
  username: string | null;
  invite_link: string | null;
  is_active: boolean;
  member_count: number;
  settings: Record<string, any>;
  description: string | null;
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    display_name: string;
    bot_username: string;
    is_active: boolean;
  };
}

/**
 * Request interface for creating a new telegram group
 */
export interface CreateTelegramGroupData {
  group_name: string;
  description?: string;
  project_id: string;
  telegram_chat_id: string;
  invite_link?: string;
  settings?: Record<string, any>;
}

/**
 * Request interface for updating an existing telegram group
 */
export interface UpdateTelegramGroupData {
  group_name?: string;
  description?: string;
  settings?: Record<string, any>;
}

/**
 * Request interface for connecting a channel to a telegram group
 */
export interface ConnectChannelData {
  telegram_chat_id: string;
  invite_link?: string;
  verify_permissions?: boolean;
}

/**
 * Query parameters for listing telegram groups
 */
export interface ListTelegramGroupsParams {
  page?: number;
  limit?: number;
  project_id?: string;
}

/**
 * Pagination metadata for paginated responses
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

/**
 * Response interface for paginated telegram groups list
 */
export interface TelegramGroupsListResponse {
  data: TelegramGroup[];
  pagination: PaginationMeta;
}

/**
 * Response interface for channel connection operation
 */
export interface ConnectChannelResponse {
  success: boolean;
  message: string;
  channel_info?: {
    id: string;
    username: string | null;
    title: string;
    type: string;
    member_count: number | null;
  };
}

/**
 * Response interface for sync operation
 */
export interface SyncResponse {
  success: boolean;
  message: string;
  sync_id: string;
  started_at: string;
  estimated_duration: string;
  members_to_sync: number;
}

/**
 * API client for Telegram Groups management
 */
export class TelegramGroupsApi {
  /**
   * List telegram groups with optional filtering and pagination
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Promise resolving to paginated list of telegram groups
   *
   * @example
   * ```typescript
   * const { data, pagination } = await telegramGroupsApi.listTelegramGroups({
   *   page: 1,
   *   limit: 20
   * });
   * ```
   */
  async listTelegramGroups(params: ListTelegramGroupsParams = {}): Promise<TelegramGroupsListResponse> {
    try {
      const response = await apiClient.get<TelegramGroupsListResponse>('/telegram-groups', {
        params,
      });
      return response;
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to fetch telegram groups';
      throw new Error(message);
    }
  }

  /**
   * Create a new telegram group
   *
   * @param data - Telegram group creation data
   * @returns Promise resolving to the created telegram group
   *
   * @example
   * ```typescript
   * const group = await telegramGroupsApi.createTelegramGroup({
   *   group_name: 'VIP Premium Group',
   *   description: 'Exclusive content for premium members',
   *   project_id: 'project-uuid-here',
   *   telegram_chat_id: '-1001234567890',
   *   invite_link: 'https://t.me/+AbCdEfGhIjKlMnOp',
   *   settings: { welcome_message: 'Welcome to our VIP group!' }
   * });
   * ```
   */
  async createTelegramGroup(data: CreateTelegramGroupData): Promise<TelegramGroup> {
    try {
      const response = await apiClient.post<TelegramGroup>('/telegram-groups', data);
      return response;
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to create telegram group';
      throw new Error(message);
    }
  }

  /**
   * Get a specific telegram group by ID
   *
   * @param id - UUID of the telegram group
   * @returns Promise resolving to the telegram group
   *
   * @example
   * ```typescript
   * const group = await telegramGroupsApi.getTelegramGroup('group-uuid-here');
   * ```
   */
  async getTelegramGroup(id: string): Promise<TelegramGroup> {
    try {
      const response = await apiClient.get<TelegramGroup>(`/telegram-groups/${id}`);
      return response;
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to fetch telegram group';
      throw new Error(message);
    }
  }

  /**
   * Update an existing telegram group
   *
   * @param id - UUID of the telegram group to update
   * @param data - Telegram group update data
   * @returns Promise resolving to the updated telegram group
   *
   * @example
   * ```typescript
   * const updatedGroup = await telegramGroupsApi.updateTelegramGroup('group-uuid-here', {
   *   group_name: 'Updated VIP Group',
   *   settings: { auto_approve: false }
   * });
   * ```
   */
  async updateTelegramGroup(id: string, data: UpdateTelegramGroupData): Promise<TelegramGroup> {
    try {
      const response = await apiClient.put<TelegramGroup>(`/telegram-groups/${id}`, data);
      return response;
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to update telegram group';
      throw new Error(message);
    }
  }

  /**
   * Delete a telegram group
   *
   * @param id - UUID of the telegram group to delete
   * @returns Promise that resolves when deletion is complete
   *
   * @example
   * ```typescript
   * await telegramGroupsApi.deleteTelegramGroup('group-uuid-here');
   * ```
   */
  async deleteTelegramGroup(id: string): Promise<void> {
    try {
      await apiClient.delete(`/telegram-groups/${id}`);
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to delete telegram group';
      throw new Error(message);
    }
  }

  /**
   * Connect a telegram group to a Telegram channel
   *
   * @param id - UUID of the telegram group
   * @param data - Channel connection data
   * @returns Promise resolving to connection response
   *
   * @example
   * ```typescript
   * const result = await telegramGroupsApi.connectChannel('group-uuid-here', {
   *   telegram_chat_id: '-1001234567890',
   *   invite_link: 'https://t.me/+AbCdEfGhIjKlMnOp',
   *   verify_permissions: true
   * });
   * ```
   */
  async connectChannel(id: string, data: ConnectChannelData): Promise<ConnectChannelResponse> {
    try {
      const response = await apiClient.post<ConnectChannelResponse>(
        `/telegram-groups/${id}/connect-channel`,
        data
      );
      return response;
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to connect channel';
      throw new Error(message);
    }
  }

  /**
   * Trigger manual synchronization of a telegram group to its connected channel
   *
   * @param id - UUID of the telegram group
   * @returns Promise resolving to sync operation response
   *
   * @example
   * ```typescript
   * const syncResult = await telegramGroupsApi.syncGroup('group-uuid-here');
   * console.log(`Sync started: ${syncResult.sync_id}`);
   * ```
   */
  async syncGroup(id: string): Promise<SyncResponse> {
    try {
      const response = await apiClient.post<SyncResponse>(`/telegram-groups/${id}/sync`);
      return response;
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Failed to sync group';
      throw new Error(message);
    }
  }
}

// Export singleton instance
export const telegramGroupsApi = new TelegramGroupsApi();

// React Query keys for cache management
export const telegramGroupsQueryKeys = {
  all: ['telegram-groups'] as const,
  lists: () => [...telegramGroupsQueryKeys.all, 'list'] as const,
  list: (filters: ListTelegramGroupsParams) =>
    [...telegramGroupsQueryKeys.lists(), filters] as const,
  details: () => [...telegramGroupsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...telegramGroupsQueryKeys.details(), id] as const,
};

// Export default
export default telegramGroupsApi;