# Claude Code Agent Instructions: Telegram Groups SaaS

## Project Context

You're working on a multi-tenant SaaS platform for managing paid Telegram groups with automated payment processing via QPay Mongolia. The platform has three user types: super admins (platform owners), SaaS users (content creators), and end users (group members).

## Architecture Overview

- **Backend**: NestJS with TypeScript, PostgreSQL with Row-Level Security, Redis for caching/queues
- **Frontend**: Next.js 14 with App Router, Tailwind CSS, Shadcn/UI components
- **Infrastructure**: Docker, multi-tenant with tenant isolation, BullMQ for job processing
- **Integrations**: Telegram Bot API (Telegraph), QPay Mongolia payment gateway

## Key Implementation Guidelines

### 1. Multi-Tenancy
- ALWAYS include `tenant_id` in database queries
- Use RLS policies for data isolation
- Set tenant context in middleware: `SET LOCAL app.current_tenant TO 'uuid'`
- Never expose data across tenant boundaries

### 2. User Management (Current Feature: 002-if-saas-user)
- Owner users can create admin/moderator users via POST /api/users
- Role-based access control: owner > admin > moderator
- Email uniqueness enforced per tenant (tenant_id, email) constraint
- Password validation: min 8 chars with complexity requirements
- Frontend: User management pages in (dashboard)/users route group

### 3. Authentication & Authorization
- JWT tokens with role-based guards
- @UseGuards(JwtAuthGuard, RoleGuard('owner')) for user management endpoints
- Tenant context extracted from JWT and set in request
- Audit logging for user creation/modification operations

### 4. Telegram Bot Management
- Each tenant gets unique bot instance
- Use Telegraph library for bot interactions
- Implement rate limiting per bot
- Cache Telegram API responses in Redis (TTL: 1 hour)

### 5. Payment Processing
- QPay webhooks MUST verify HMAC signature
- Use idempotency keys to prevent duplicate processing
- Queue webhook processing with BullMQ
- Log all payment events for audit trail

## Development Workflow

### Current Feature Branch
```bash
# You're on branch: 002-if-saas-user
# Spec location: /specs/002-if-saas-user/spec.md
# Plan location: /specs/002-if-saas-user/plan.md
# Contracts: /specs/002-if-saas-user/contracts/

# Run tests first (TDD)
npm run test:watch

# Start development servers
npm run dev          # Backend on :3001
cd frontend && npm run dev  # Frontend on :3000
```

### Testing Strategy
- Contract tests FIRST (validate API schema)
- Integration tests with real PostgreSQL/Redis
- E2E tests for complete user workflows
- No mocks for external dependencies

## Common Patterns

### User Management API Endpoints
```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, RoleGuard('owner'))
@ApiTags('User Management')
export class UserController {
  @Post()
  @UseInterceptors(AuditLogInterceptor)
  async createUser(@TenantId() tenantId: string, @Body() dto: CreateUserDto) {
    // Validate role (admin/moderator only)
    // Check email uniqueness within tenant
    // Hash password with bcrypt
    // Create user record with tenant_id
  }

  @Get()
  async getUsers(@TenantId() tenantId: string, @Query() query: GetUsersDto) {
    // Paginated list scoped by tenant_id
    // Optional role filtering
  }
}
```

### Frontend User Forms
```typescript
// User creation form with Zod validation
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'moderator'])
});

// Form component in components/user-management/CreateUserForm.tsx
// Uses react-hook-form + Shadcn/UI components
```

### Database Query Pattern
```typescript
// Always scope by tenant
const users = await this.prisma.user.findMany({
  where: {
    tenant_id: tenantId,
    is_active: true
  },
  select: {
    id: true,
    email: true,
    name: true,
    role: true,
    created_at: true,
    last_login_at: true
  },
  orderBy: { created_at: 'desc' }
});
```

## File Structure Updates

```
backend/src/modules/
├── user-management/          # NEW: Owner user management
│   ├── user-management.controller.ts
│   ├── user-management.service.ts
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── get-users.dto.ts
│   └── __tests__/
│       ├── user-management.controller.spec.ts
│       └── user-management.service.spec.ts

frontend/src/
├── app/(dashboard)/users/    # NEW: User management pages
│   ├── page.tsx             # User list page
│   └── create/page.tsx      # Create user page
├── components/user-management/  # NEW: User UI components
│   ├── CreateUserForm.tsx
│   ├── UserList.tsx
│   └── UserManagementCard.tsx
└── lib/api/
    └── users.ts             # User API client methods
```

## API Contracts

### POST /api/users (Create User)
- **Auth**: JWT token with 'owner' role required
- **Request**: email, password, name, role (admin|moderator)
- **Response**: 201 with user object, 400/409/403 for errors
- **Validation**: Email format, password complexity, role enum

### GET /api/users (List Users)
- **Auth**: JWT token with 'owner' role required
- **Query**: page, limit, role filter
- **Response**: 200 with users array + pagination

## Security Checklist
- [x] JWT tokens with role-based guards
- [x] Input validation on user creation
- [x] Password hashing with bcrypt
- [x] Tenant isolation via RLS
- [x] Audit logging for user operations
- [x] Rate limiting on user creation endpoints

## Testing Requirements
- Contract tests for POST/GET /api/users endpoints
- Integration tests for user creation with tenant isolation
- E2E tests for complete owner → create user → success workflow
- Validation error scenarios (weak password, duplicate email)
- Authorization tests (non-owner access prevention)

## Recent Changes (Feature 002)
- Added user management API endpoints with role-based access
- Created user management UI components with form validation
- Implemented tenant-scoped user creation with audit logging
- Added OpenAPI contract specifications for user endpoints

Remember: Follow TDD, maintain tenant isolation, validate all inputs, and audit sensitive operations.