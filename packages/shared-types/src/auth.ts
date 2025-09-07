import { BaseEntity, UserRole } from './common';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  company_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  tenant_id: string;
  is_active: boolean;
  permissions: string[];
  last_login_at?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenant_id: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}