import { Request } from 'express';
import { UserRole } from '../../modules/auth/entities/user.entity';

/**
 * Authenticated User in Request
 * This object is attached to the request by JwtAuthGuard after successful authentication.
 */
export interface AuthenticatedUser {
  /** User ID */
  id: string;

  /** User email address */
  email: string;

  /** Tenant ID for multi-tenant isolation */
  tenant_id: string;

  /** User role for authorization */
  role: UserRole;
}

/**
 * Authenticated Request Interface
 * Extends Express Request with authenticated user information.
 * Use this type for @Request() parameters in controllers that are protected by JwtAuthGuard.
 */
export interface AuthenticatedRequest extends Request {
  /** Authenticated user information (populated by JwtAuthGuard) */
  user: AuthenticatedUser;

  /** Tenant context (populated by JwtAuthGuard for RLS) */
  tenant_id?: string;
}