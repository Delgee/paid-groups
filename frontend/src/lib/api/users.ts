import { z } from 'zod';

// Types matching backend DTOs
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

export type CreateUserRequest = z.infer<typeof CreateUserRequestSchema>;

export interface CreateUserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  role: AllUserRoles;
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
  role?: AllUserRoles;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string;
  details?: Array<{
    field: string;
    constraint: string;
    value: any;
  }>;
}

class UsersApiClient {
  private baseUrl: string;
  private getAuthHeaders: () => Record<string, string>;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.getAuthHeaders = () => {
      const token = localStorage.getItem('accessToken');
      return token ? { Authorization: `Bearer ${token}` } : {};
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          statusCode: response.status,
          message: response.statusText,
          error: 'Unknown Error',
        }));
        throw new ApiClientError(errorData);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      // Network or other errors
      throw new ApiClientError({
        statusCode: 0,
        message: 'Network error occurred',
        error: 'NetworkError',
      });
    }
  }

  async createUser(userData: CreateUserRequest): Promise<CreateUserResponse> {
    return this.request<CreateUserResponse>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getUsers(query: GetUsersQuery = {}): Promise<GetUsersResponse> {
    const searchParams = new URLSearchParams();

    if (query.page !== undefined) {
      searchParams.append('page', query.page.toString());
    }
    if (query.limit !== undefined) {
      searchParams.append('limit', query.limit.toString());
    }
    if (query.role) {
      searchParams.append('role', query.role);
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/api/users?${queryString}` : '/api/users';

    return this.request<GetUsersResponse>(endpoint);
  }
}

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly error: string;
  public readonly code?: string;
  public readonly details?: Array<{
    field: string;
    constraint: string;
    value: any;
  }>;

  constructor(apiError: ApiError) {
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

// Singleton instance
export const usersApi = new UsersApiClient();

// React Query keys
export const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (filters: GetUsersQuery) => [...userQueryKeys.lists(), filters] as const,
};