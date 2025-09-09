import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  statusCode?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'moderator';
  tenant_id: string;
  is_active: boolean;
  permissions: string[];
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  company_name: string;
}

export interface Bot {
  id: string;
  bot_token: string;
  bot_name: string;
  bot_username?: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  stats?: {
    groups_count: number;
    members_count: number;
    active_memberships: number;
  };
}

export interface TelegramGroup {
  id: string;
  telegram_chat_id: number;
  group_name: string;
  group_type: 'channel' | 'group' | 'supergroup';
  is_active: boolean;
  member_count: number;
  bot_id: string;
  tenant_id: string;
  synced_at?: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

class ApiClient {
  private instance: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.instance.interceptors.request.use(
      (config) => {
        const token = getCookie('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            this.logout();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      const refreshToken = getCookie('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/auth/refresh`,
        { refresh_token: refreshToken }
      );

      const { access_token, refresh_token: newRefreshToken } = response.data;

      setCookie('access_token', access_token, { maxAge: 60 * 15 }); // 15 minutes
      setCookie('refresh_token', newRefreshToken, { maxAge: 60 * 60 * 24 * 7 }); // 7 days

      this.refreshTokenPromise = null;
      return access_token;
    })();

    return this.refreshTokenPromise;
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const response = await this.instance.post<AuthTokens>('/v1/auth/login', credentials);
    
    const { access_token, refresh_token } = response.data;
    setCookie('access_token', access_token, { maxAge: 60 * 15 }); // 15 minutes
    setCookie('refresh_token', refresh_token, { maxAge: 60 * 60 * 24 * 7 }); // 7 days
    
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthTokens> {
    const response = await this.instance.post<AuthTokens>('/v1/auth/register', data);
    
    const { access_token, refresh_token } = response.data;
    setCookie('access_token', access_token, { maxAge: 60 * 15 });
    setCookie('refresh_token', refresh_token, { maxAge: 60 * 60 * 24 * 7 });
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.instance.post('/v1/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      deleteCookie('access_token');
      deleteCookie('refresh_token');
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  async me(): Promise<User> {
    const response = await this.instance.get<User>('/v1/auth/me');
    return response.data;
  }

  // Bot management methods
  async getBots(): Promise<{ bots: Bot[] }> {
    const response = await this.instance.get<{ bots: Bot[] }>('/v1/bots');
    return response.data;
  }

  async getBot(id: string): Promise<Bot> {
    const response = await this.instance.get<Bot>(`/v1/bots/${id}`);
    return response.data;
  }

  async createBot(data: { bot_token: string; bot_name: string }): Promise<Bot> {
    const response = await this.instance.post<Bot>('/v1/bots', data);
    return response.data;
  }

  async updateBot(id: string, data: Partial<{ bot_name: string; is_active: boolean }>): Promise<Bot> {
    const response = await this.instance.put<Bot>(`/v1/bots/${id}`, data);
    return response.data;
  }

  async deleteBot(id: string): Promise<void> {
    await this.instance.delete(`/v1/bots/${id}`);
  }

  // Group management methods
  async getBotGroups(botId: string): Promise<{ groups: TelegramGroup[] }> {
    const response = await this.instance.get<{ groups: TelegramGroup[] }>(`/v1/bots/${botId}/groups`);
    return response.data;
  }

  async connectGroup(
    botId: string, 
    data: { telegram_chat_id: number; group_name: string; group_type: 'channel' | 'group' | 'supergroup' }
  ): Promise<TelegramGroup> {
    const response = await this.instance.post<TelegramGroup>(`/v1/bots/${botId}/groups`, data);
    return response.data;
  }

  async disconnectGroup(botId: string, groupId: string): Promise<void> {
    await this.instance.delete(`/v1/bots/${botId}/groups/${groupId}`);
  }

  // Bot messages methods
  async createBotMessage(
    botId: string,
    data: { message_type: string; content: string; variables?: Record<string, string> }
  ): Promise<any> {
    const response = await this.instance.post(`/v1/bots/${botId}/messages`, data);
    return response.data;
  }

  // Generic HTTP methods for extensibility
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config);
    return response.data;
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!getCookie('access_token');
  }

  getAccessToken(): string | undefined {
    return getCookie('access_token');
  }
}

export const apiClient = new ApiClient();
export default apiClient;