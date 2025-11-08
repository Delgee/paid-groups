import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getCookie, setCookie, deleteCookie } from 'cookies-next';
import { z } from 'zod';

export interface ApiResponse<T = unknown> {
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
  phone: string;
  register_number: string;
  company_name?: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'moderator';
}

export interface UpdateUserRequest {
  email?: string;
  password?: string;
  name?: string;
  role?: 'admin' | 'moderator';
  is_active?: boolean;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'moderator';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
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
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must not exceed 100 characters')
    .regex(
      /^[a-zA-Z0-9\s\-]+$/,
      'Name can only contain letters, numbers, spaces, and hyphens',
    ),
  role: UserRoleSchema,
});

export interface CreateUserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
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
  project_id: string;
  tenant_id: string;
  synced_at?: string;
  settings?: Record<string, unknown>;
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
  is_premium?: boolean;
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
  private instance!: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;
  private static singleton: ApiClient | null = null;

  constructor() {
    // Enforce singleton pattern
    if (ApiClient.singleton) {
      return ApiClient.singleton;
    }

    this.instance = axios.create({
      baseURL: typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
    ApiClient.singleton = this;
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
      (error) => Promise.reject(error),
    );

    // Response interceptor to handle token refresh
    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Don't attempt token refresh or logout for auth endpoints
        const isAuthEndpoint =
          originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/logout');


        // If it's an auth endpoint, just reject the error without any additional handling
        if (isAuthEndpoint) {
          return Promise.reject(error);
        }

        // Handle 401 errors for non-auth endpoints
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newAccessToken = await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return this.instance(originalRequest);
          } catch (refreshError) {
            // Only redirect to login if not already on auth pages
            if (
              typeof window !== 'undefined' &&
              !window.location.pathname.includes('/login') &&
              !window.location.pathname.includes('/register')
            ) {
              this.logout();
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
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
        `${typeof window !== 'undefined' ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1')}/auth/refresh`,
        { refresh_token: refreshToken },
      );

      const { access_token, refresh_token: newRefreshToken } = response.data;

      setCookie('access_token', access_token, {
        maxAge: 60 * 15,
        path: '/',
        sameSite: 'lax',
        secure: false, // Set to false to work with both HTTP and HTTPS
      });
      setCookie('refresh_token', newRefreshToken, {
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'lax',
        secure: false, // Set to false to work with both HTTP and HTTPS
      });

      this.refreshTokenPromise = null;
      return access_token;
    })().finally(() => {
      this.refreshTokenPromise = null;
    });

    return this.refreshTokenPromise;
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      const response = await this.instance.post<AuthTokens>(
        '/auth/login',
        credentials,
      );

      const { access_token, refresh_token } = response.data;
      setCookie('access_token', access_token, {
        maxAge: 60 * 15,
        path: '/',
        sameSite: 'lax',
        secure: false, // Set to false to work with both HTTP and HTTPS
      });
      setCookie('refresh_token', refresh_token, {
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'lax',
        secure: false, // Set to false to work with both HTTP and HTTPS
      });

      return response.data;
    } catch (error) {
      // Extract error message from API response
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Invalid email or password';
      throw new Error(message);
    }
  }

  async register(data: RegisterData): Promise<AuthTokens> {
    try {
      const response = await this.instance.post<AuthTokens>(
        '/auth/register',
        data,
      );

      const { access_token, refresh_token } = response.data;
      setCookie('access_token', access_token, {
        maxAge: 60 * 15,
        path: '/',
        sameSite: 'lax',
        secure: false, // Set to false to work with both HTTP and HTTPS
      });
      setCookie('refresh_token', refresh_token, {
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        sameSite: 'lax',
        secure: false, // Set to false to work with both HTTP and HTTPS
      });

      return response.data;
    } catch (error) {
      // Extract error message from API response
      const axiosError = error as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Registration failed';
      throw new Error(message);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.instance.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      deleteCookie('access_token');
      deleteCookie('refresh_token');

      // Redirect to login page only if not already there
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.includes('/login')
      ) {
        // Force hard navigation to clear all state
        window.location.href = '/login';
      }
    }
  }

  async me(): Promise<User> {
    const response = await this.instance.get<User>('/auth/me');
    return response.data;
  }

  // Bot management methods
  async getBots(): Promise<{ bots: Bot[] }> {
    const response = await this.instance.get<{ bots: Bot[] }>('/bots');
    return response.data;
  }

  async getBot(id: string): Promise<Bot> {
    const response = await this.instance.get<Bot>(`/bots/${id}`);
    return response.data;
  }

  async createBot(data: { bot_token: string; bot_name: string }): Promise<Bot> {
    const response = await this.instance.post<Bot>('/bots', data);
    return response.data;
  }

  async updateBot(
    id: string,
    data: Partial<{ bot_name: string; is_active: boolean }>,
  ): Promise<Bot> {
    const response = await this.instance.put<Bot>(`/bots/${id}`, data);
    return response.data;
  }

  async deleteBot(id: string): Promise<void> {
    await this.instance.delete(`/bots/${id}`);
  }

  // Group management methods
  async getBotGroups(botId: string): Promise<{ groups: TelegramGroup[] }> {
    const response = await this.instance.get<{ groups: TelegramGroup[] }>(
      `/bots/${botId}/groups`,
    );
    return response.data;
  }

  async connectGroup(
    botId: string,
    data: {
      telegram_chat_id: number;
      group_name: string;
      group_type: 'channel' | 'group' | 'supergroup';
    },
  ): Promise<TelegramGroup> {
    const response = await this.instance.post<TelegramGroup>(
      `/bots/${botId}/groups`,
      data,
    );
    return response.data;
  }

  async disconnectGroup(botId: string, groupId: string): Promise<void> {
    await this.instance.delete(`/bots/${botId}/groups/${groupId}`);
  }

  // Bot messages methods
  async createBotMessage(
    botId: string,
    data: {
      message_type: string;
      content: string;
      variables?: Record<string, string>;
    },
  ): Promise<unknown> {
    const response = await this.instance.post(
      `/bots/${botId}/messages`,
      data,
    );
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
    const response = await this.instance.get<{
      members: Member[];
      total: number;
    }>('/members', {
      params,
    });
    return response.data;
  }

  async getMember(id: string): Promise<Member> {
    const response = await this.instance.get<Member>(`/members/${id}`);
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
    const response = await this.instance.get<{
      memberships: Membership[];
      total: number;
    }>('/memberships', {
      params,
    });
    return response.data;
  }

  // Membership plans methods
  async getMembershipPlans(): Promise<{ plans: MembershipPlan[] }> {
    const response = await this.instance.get<{ plans: MembershipPlan[] }>(
      '/membership-plans',
    );
    return response.data;
  }

  async createMembershipPlan(data: {
    name: string;
    description?: string;
    price: number;
    currency: string;
    duration_days: number;
    features?: string[];
    project_id?: string;
    telegram_group_ids?: string[];
  }): Promise<MembershipPlan> {
    // Backend expects price (integer in MNT)
    // project_id is required by backend but optional in frontend for backwards compatibility
    const requestData: any = {
      name: data.name,
      description: data.description,
      price: data.price,
      duration_days: data.duration_days,
    };

    // Add optional fields only if they're provided
    if (data.project_id) {
      requestData.project_id = data.project_id;
    }
    if (data.features) {
      requestData.features = data.features;
    }
    if (data.telegram_group_ids && data.telegram_group_ids.length > 0) {
      requestData.telegram_group_ids = data.telegram_group_ids;
    }

    const response = await this.instance.post<MembershipPlan>(
      '/membership-plans',
      requestData,
    );
    return response.data;
  }

  async updateMembershipPlan(
    id: string,
    data: Partial<{
      name: string;
      description?: string;
      price: number;
      duration_days: number;
      features?: string[];
      is_active: boolean;
    }>,
  ): Promise<MembershipPlan> {
    // Backend expects price (Mongolian Tugrik)
    const requestData: any = { ...data };

    const response = await this.instance.put<MembershipPlan>(
      `/membership-plans/${id}`,
      requestData,
    );
    return response.data;
  }

  async deleteMembershipPlan(id: string): Promise<void> {
    await this.instance.delete(`/membership-plans/${id}`);
  }

  async getMembershipPlanStats(id: string): Promise<{
    total_members: number;
    active_members: number;
    total_revenue: number;
  }> {
    const response = await this.instance.get<{
      total_members: number;
      active_members: number;
      total_revenue: number;
    }>(`/membership-plans/${id}/stats`);
    return response.data;
  }

  // User management methods
  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    const response = await this.instance.post<CreateUserResponse>(
      '/users',
      userData,
    );
    return response.data;
  }

  async getUsers(query: GetUsersQuery = {}): Promise<GetUsersResponse> {
    const response = await this.instance.get<GetUsersResponse>('/users', {
      params: query,
    });
    return response.data;
  }

  async updateUser(
    userId: string,
    userData: UpdateUserRequest,
  ): Promise<CreateUserResponse> {
    const response = await this.instance.put<CreateUserResponse>(
      `/users/${userId}`,
      userData,
    );
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.instance.delete(`/users/${userId}`);
  }

  // Analytics methods
  async getDashboardMetrics(): Promise<{
    active_members: number;
    total_revenue: number;
    monthly_revenue: number;
    churn_rate: number;
    trial_conversion_rate: number;
    top_performing_groups: {
      group_id: string;
      group_name: string;
      member_count: number;
      revenue: number;
      conversion_rate: number;
    }[];
  }> {
    const response = await this.instance.get('/analytics/dashboard');
    return response.data;
  }

  async getRevenueMetrics(days?: number): Promise<{
    current_period: number;
    previous_period: number;
    growth_percentage: number;
    mrr: number;
    arr: number;
    daily_revenue: {
      date: string;
      revenue: number;
      transaction_count: number;
    }[];
  }> {
    const response = await this.instance.get('/analytics/revenue', {
      params: days ? { days } : undefined,
    });
    return response.data;
  }

  async getMembershipMetrics(): Promise<{
    total_memberships: number;
    active_memberships: number;
    trial_memberships: number;
    expired_memberships: number;
    churn_rate: number;
    average_lifetime_value: number;
  }> {
    const response = await this.instance.get('/analytics/memberships');
    return response.data;
  }

  async getPaymentStats(): Promise<{
    totalRevenue: number;
    totalPayments: number;
    completedPayments: number;
    pendingPayments: number;
    failedPayments: number;
    averagePayment: number;
    revenueGrowth: number;
  }> {
    const response = await this.instance.get('/analytics/payments');
    return response.data;
  }

  // Generic HTTP methods for extensibility
  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config);
    return response.data;
  }

  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.post<T>(url, data, config);
    return response.data;
  }

  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.instance.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
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

  constructor(apiError: {
    statusCode: number;
    message: string | string[];
    error: string;
    code?: string;
    details?: Array<{
      field: string;
      constraint: string;
      value: unknown;
    }>;
  }) {
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

    return this.details.reduce(
      (acc, detail) => {
        acc[detail.field] = detail.constraint;
        return acc;
      },
      {} as Record<string, string>,
    );
  }
}

// React Query keys
export const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (filters: GetUsersQuery) =>
    [...userQueryKeys.lists(), filters] as const,
};

export const apiClient = new ApiClient();
export default apiClient;
