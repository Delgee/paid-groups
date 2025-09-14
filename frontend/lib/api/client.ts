import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';
import { z } from 'zod';

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

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'moderator';
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'moderator';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface GetUsersResponse {
  users: UserSummary[];
  pagination: Pagination;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  role?: 'owner' | 'admin' | 'moderator';
}

// Zod schemas for validation
export const UserRoleSchema = z.enum(['admin', 'moderator']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AllUserRolesSchema = z.enum(['owner', 'admin', 'moderator']);
export type AllUserRoles = z.infer<typeof AllUserRolesSchema>;

export const CreateUserRequestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-]+$/, 'Name can only contain letters, numbers, spaces, and hyphens'),
  role: UserRoleSchema,
});

export interface CreateUserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
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

export interface Member {
  id: string;
  telegram_user_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  phone_number?: string;
  is_bot: boolean;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  memberships?: Membership[];
}

export interface MembershipPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration_days: number;
  is_active: boolean;
  features?: string[];
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  member_id: string;
  plan_id: string;
  group_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  started_at?: string;
  expires_at?: string;
  payment_id?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  member?: Member;
  plan?: MembershipPlan;
  group?: TelegramGroup;
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

        // Don't attempt token refresh for auth endpoints
        const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                               originalRequest.url?.includes('/auth/register');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Only redirect to login if not already on auth pages
            if (typeof window !== 'undefined' &&
                !window.location.pathname.includes('/login') &&
                !window.location.pathname.includes('/register')) {
              this.logout();
            }
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
    try {
      const response = await this.instance.post<AuthTokens>('/v1/auth/login', credentials);

      const { access_token, refresh_token } = response.data;
      setCookie('access_token', access_token, { maxAge: 60 * 15 }); // 15 minutes
      setCookie('refresh_token', refresh_token, { maxAge: 60 * 60 * 24 * 7 }); // 7 days

      return response.data;
    } catch (error: any) {
      // Extract error message from API response
      const message = error.response?.data?.message ||
                     error.response?.data?.error ||
                     error.message ||
                     'Invalid email or password';
      throw new Error(message);
    }
  }

  async register(data: RegisterData): Promise<AuthTokens> {
    try {
      const response = await this.instance.post<AuthTokens>('/v1/auth/register', data);

      const { access_token, refresh_token } = response.data;
      setCookie('access_token', access_token, { maxAge: 60 * 15 });
      setCookie('refresh_token', refresh_token, { maxAge: 60 * 60 * 24 * 7 });

      return response.data;
    } catch (error: any) {
      // Extract error message from API response
      const message = error.response?.data?.message ||
                     error.response?.data?.error ||
                     error.message ||
                     'Registration failed';
      throw new Error(message);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.instance.post('/v1/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      deleteCookie('access_token');
      deleteCookie('refresh_token');

      // Redirect to login page only if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
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

  // Member management methods
  async getMembers(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    group_id?: string;
  }): Promise<{ members: Member[]; total: number }> {
    const response = await this.instance.get<{ members: Member[]; total: number }>('/v1/members', {
      params
    });
    return response.data;
  }

  async getMember(id: string): Promise<Member> {
    const response = await this.instance.get<Member>(`/v1/members/${id}`);
    return response.data;
  }

  // Membership management methods
  async getMemberships(params?: {
    limit?: number;
    offset?: number;
    member_id?: string;
    group_id?: string;
    status?: string;
  }): Promise<{ memberships: Membership[]; total: number }> {
    const response = await this.instance.get<{ memberships: Membership[]; total: number }>('/v1/memberships', {
      params
    });
    return response.data;
  }

  // Membership plans methods
  async getMembershipPlans(): Promise<{ plans: MembershipPlan[] }> {
    const response = await this.instance.get<{ plans: MembershipPlan[] }>('/v1/membership-plans');
    return response.data;
  }

  async createMembershipPlan(data: {
    name: string;
    description?: string;
    price: number;
    currency: string;
    duration_days: number;
    features?: string[];
  }): Promise<MembershipPlan> {
    const response = await this.instance.post<MembershipPlan>('/v1/membership-plans', data);
    return response.data;
  }

  async updateMembershipPlan(id: string, data: Partial<{
    name: string;
    description?: string;
    price: number;
    duration_days: number;
    features?: string[];
    is_active: boolean;
  }>): Promise<MembershipPlan> {
    const response = await this.instance.put<MembershipPlan>(`/v1/membership-plans/${id}`, data);
    return response.data;
  }

  // User management methods
  async createUser(userData: CreateUserRequest): Promise<UserSummary> {
    const response = await this.instance.post<UserSummary>('/v1/users', userData);
    return response.data;
  }

  async getUsers(query: GetUsersQuery = {}): Promise<GetUsersResponse> {
    const response = await this.instance.get<GetUsersResponse>('/v1/users', {
      params: query
    });
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

// Error class for API errors
export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly error: string;
  public readonly code?: string;
  public readonly details?: Array<{
    field: string;
    constraint: string;
    value: unknown;
  }>;

  constructor(apiError: { statusCode: number; message: string | string[]; error: string; code?: string; details?: any }) {
    const message = Array.isArray(apiError.message)
      ? apiError.message.join(', ')
      : apiError.message;

    super(message);

    this.name = 'ApiClientError';
    this.statusCode = apiError.statusCode;
    this.error = apiError.error;
    this.code = apiError.code;
    this.details = apiError.details;
  }

  get isValidationError(): boolean {
    return this.statusCode === 400;
  }

  get isDuplicateError(): boolean {
    return this.statusCode === 409 && this.code === 'DUPLICATE_EMAIL';
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  getFieldErrors(): Record<string, string> {
    if (!this.details) return {};

    return this.details.reduce((acc, detail) => {
      acc[detail.field] = detail.constraint;
      return acc;
    }, {} as Record<string, string>);
  }
}

// React Query keys
export const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (filters: GetUsersQuery) => [...userQueryKeys.lists(), filters] as const,
};

export const apiClient = new ApiClient();
export default apiClient;