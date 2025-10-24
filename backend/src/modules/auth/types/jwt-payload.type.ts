import { UserRole } from '../entities/user.entity';

/**
 * JWT Access Token Payload
 * This payload is embedded in the JWT access token and contains
 * the minimum required information for authentication and authorization.
 */
export interface JwtPayload {
  /** User ID (JWT standard 'sub' claim) */
  sub: string;

  /** User email address */
  email: string;

  /** Tenant ID for multi-tenant isolation */
  tenant_id: string;

  /** User role for authorization */
  role: UserRole;
}

/**
 * Extended JWT Payload (with additional claims)
 * Used when JWT tokens include extra metadata like issued-at time and JWT ID
 */
export interface ExtendedJwtPayload extends JwtPayload {
  /** Issued at timestamp (seconds since epoch) */
  iat?: number;

  /** JWT ID (unique token identifier) */
  jti?: string;

  /** Expiration timestamp (seconds since epoch) */
  exp?: number;
}
