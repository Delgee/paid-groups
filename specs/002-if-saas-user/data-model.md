# Data Model: Owner User Management

## Entity Overview

### User Entity (Existing - Extended)
The existing `users` table supports the owner user management feature through its role-based architecture.

```sql
-- Existing table from specs/001-goal-build-a/data-model.md
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('owner', 'admin', 'moderator') DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);
```

**Role Definitions**:
- **owner**: Can create admin and moderator users, full system access
- **admin**: Can manage bots, groups, membership plans, view analytics
- **moderator**: Can manage groups and memberships only (no bots or financial data)

### Request/Response DTOs

#### CreateUserRequestDto
```typescript
interface CreateUserRequestDto {
  email: string;           // Required, valid email format
  password: string;        // Required, min 8 chars with complexity rules
  name: string;           // Required, 2-100 characters
  role: 'admin' | 'moderator'; // Required, owner cannot create other owners
}
```

**Validation Rules**:
- `email`: RFC 5322 format, unique within tenant
- `password`: Min 8 chars, must contain uppercase, lowercase, number
- `name`: 2-100 characters, no special characters except spaces, hyphens
- `role`: Must be either 'admin' or 'moderator' (owners cannot create owners)

#### CreateUserResponseDto
```typescript
interface CreateUserResponseDto {
  id: string;              // UUID of created user
  email: string;           // Email address
  name: string;            // Full name
  role: 'admin' | 'moderator'; // Assigned role
  isActive: boolean;       // Account status (always true on creation)
  createdAt: string;       // ISO timestamp
}
```

#### GetUsersResponseDto
```typescript
interface GetUsersResponseDto {
  users: Array<{
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'moderator';
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

## Validation Rules

### Business Rules
1. **Role Hierarchy**: Only owners can create admin and moderator users
2. **Email Uniqueness**: Email must be unique within the tenant scope
3. **Tenant Isolation**: Users can only manage users within their own tenant
4. **Active Status**: New users are created with `is_active = true`
5. **Default Permissions**: New users get role-specific default permissions

### Data Validation
1. **Email Validation**: Must match RFC 5322 email format
2. **Password Security**: Minimum 8 characters with complexity requirements
3. **Name Format**: Must be 2-100 characters, alphanumeric plus spaces and hyphens
4. **Role Restriction**: Cannot create users with 'owner' role through this feature

### Security Constraints
1. **Authentication**: JWT token required for all operations
2. **Authorization**: Only 'owner' role can access user management endpoints
3. **Tenant Context**: All queries automatically scoped by tenant_id
4. **Input Sanitization**: All string inputs sanitized to prevent XSS/injection

## State Transitions

### User Creation Flow
```
[Form Submission] → [Validation] → [Duplicate Check] → [Password Hash] → [Database Insert] → [Audit Log] → [Response]
```

**States**:
- **Pending**: Form submitted, validation in progress
- **Validated**: Input validation passed
- **Verified**: Duplicate email check passed
- **Secured**: Password hashed with bcrypt
- **Created**: User record inserted to database
- **Logged**: Audit log entry created
- **Complete**: Success response sent to client

**Error States**:
- **Invalid Input**: Validation errors (400 Bad Request)
- **Duplicate Email**: Email already exists (409 Conflict)
- **Unauthorized**: Non-owner attempting access (403 Forbidden)
- **Server Error**: Database or system error (500 Internal Server Error)

## Database Operations

### Create User Operation
```sql
-- With tenant isolation through RLS
INSERT INTO users (
  tenant_id, email, password_hash, name, role, is_active, permissions, created_at, updated_at
) VALUES (
  $1, $2, $3, $4, $5, true, '{}', NOW(), NOW()
)
RETURNING id, email, name, role, is_active, created_at;
```

### List Users Operation
```sql
-- Paginated list with role filtering
SELECT id, email, name, role, is_active, last_login_at, created_at
FROM users
WHERE tenant_id = $1
  AND is_active = true
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

### Duplicate Check Operation
```sql
-- Check email uniqueness within tenant
SELECT COUNT(*)
FROM users
WHERE tenant_id = $1 AND email = $2;
```

## Indexing Strategy

### Existing Indexes (from data-model.md)
```sql
-- Performance indexes already available
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
```

### Additional Indexes (if needed for performance)
```sql
-- For role-based queries
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role) WHERE is_active = true;

-- For user listing with pagination
CREATE INDEX idx_users_tenant_created ON users(tenant_id, created_at DESC) WHERE is_active = true;
```

## Row Level Security

### Existing RLS Policies
```sql
-- Policy already in place for tenant isolation
CREATE POLICY tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Policy for super admins (bypass RLS)
CREATE POLICY super_admin_bypass ON users
  FOR ALL
  USING (current_setting('app.is_super_admin')::boolean = true);
```

### Additional Considerations
- RLS automatically enforces tenant isolation for all user operations
- Application sets tenant context via `SET LOCAL app.current_tenant TO 'uuid'`
- No additional RLS policies needed for role-based access (handled in application layer)

## Audit Logging

### Audit Log Entry for User Creation
```sql
-- Entry in audit_logs table
INSERT INTO audit_logs (
  tenant_id, user_id, user_type, action, resource_type, resource_id,
  changes, ip_address, user_agent, created_at
) VALUES (
  $tenant_id, $creator_user_id, 'tenant_user', 'user_created', 'user', $new_user_id,
  jsonb_build_object(
    'email', $email,
    'name', $name,
    'role', $role,
    'created_by', $creator_email
  ),
  $ip_address, $user_agent, NOW()
);
```

## Error Handling

### Validation Errors
```typescript
interface ValidationError {
  statusCode: 400;
  message: string[];
  error: 'Bad Request';
  details: {
    field: string;
    constraint: string;
    value: any;
  }[];
}
```

### Business Logic Errors
```typescript
interface BusinessLogicError {
  statusCode: 409 | 403;
  message: string;
  error: 'Conflict' | 'Forbidden';
  code: 'DUPLICATE_EMAIL' | 'INSUFFICIENT_PERMISSIONS';
}
```

### System Errors
```typescript
interface SystemError {
  statusCode: 500;
  message: 'Internal server error';
  error: 'Internal Server Error';
  requestId: string;
}
```

## Performance Considerations

### Query Performance
- Email uniqueness check uses existing `idx_users_tenant_email` index
- User listing leverages tenant_id index with pagination
- Role-based filtering benefits from enum field performance

### Caching Strategy
- User lists cached with 5-minute TTL
- Form validation results cached client-side
- JWT tokens cached with automatic refresh

### Scaling Considerations
- Database connection pooling handles concurrent user creation
- Rate limiting prevents abuse of user creation endpoints
- Pagination prevents large result sets from impacting performance