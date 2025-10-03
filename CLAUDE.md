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
- Frontend: User management pages in dashboard/users route group

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
@Controller('users')  // NOT 'v1/users' - global prefix handles this!
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
const users = await this.userRepository.find({
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
  order: { created_at: 'DESC' }
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

frontend
├── app/dashboard/users/    # NEW: User management pages
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

### 6. Telegram Group Management (Current Feature: 003-create-telegram-group)
- Owner users can create/update/delete telegram groups via POST/PUT/DELETE /api/telegram-groups
- Telegram channel connection with bot permission validation
- Auto-sync group details to Telegram channels when bot_assigned=true
- Enhanced TelegramApiService with setChatTitle, setChatDescription methods
- Redis caching for Telegram API responses (TTL: 1 hour)
- Frontend: Telegram group management pages in dashboard/telegram-groups route group

**TELEGRAM GROUPS FEATURE - FULLY IMPLEMENTED ✅ (2025-01-20)**

🎉 **Feature 003-create-telegram-group is COMPLETE and PRODUCTION-READY!**

✅ **Backend Implementation (100% Complete)**:
- **T015-T018**: TelegramGroup entity + comprehensive DTOs ✅
- **T019-T021**: Telegram integration services (API, Channel, Sync) ✅
- **T022-T023**: Core business logic (Service + Controller with REST API) ✅
- **T024-T025**: Input validation + bot permission verification ✅
- **T026**: Database migration for enhanced schema ✅
- **T035**: Module registration in app.module.ts ✅

✅ **Frontend Implementation (100% Complete)**:
- **T034**: Telegram Groups API client with React Query integration ✅
- **T027**: TelegramGroupForm component (create/edit modes) ✅
- **T028**: TelegramGroupList component (filtering, pagination, actions) ✅
- **T029**: TelegramGroupCard component (status indicators, actions) ✅
- **T030**: ChannelConnectionForm component (bot permission verification) ✅
- **T031**: Main listing page (/dashboard/telegram-groups) ✅
- **T032**: Creation page (/dashboard/telegram-groups/create) ✅
- **T033**: Edit page (/dashboard/telegram-groups/[id]/edit) ✅
- **T036**: Navigation integration (dashboard sidebar) ✅

✅ **Integration Status**:
- Module properly registered and injectable
- Navigation links active in dashboard
- API endpoints accessible at /v1/telegram-groups/*
- Frontend routes functional with proper authentication
- Database schema ready with migration
- No critical TypeScript compilation errors

## Telegram Groups Feature Summary

The complete telegram group management system is now functional with:

**🔧 Backend Capabilities:**
- Full CRUD operations for telegram groups
- Telegram Bot API integration with channel management
- Bot permission verification and validation
- Auto-sync functionality between groups and channels
- Multi-tenant isolation with proper security
- Comprehensive input validation and error handling
- OpenAPI documentation for all endpoints

**🎨 Frontend Capabilities:**
- Complete UI for managing telegram groups
- Channel connection workflow with guidance
- Real-time status indicators and sync controls
- Responsive design with mobile support
- Integration with existing dashboard navigation
- Form validation and user feedback
- Loading states and error handling

**🚀 Ready for Use:**
- Navigate to `/dashboard/telegram-groups` to manage groups
- Create new groups with bot assignment
- Connect groups to Telegram channels
- Enable auto-sync between groups and channels
- Monitor connection status and sync operations

## Recent Changes (Feature 003 - COMPLETE)
- **Backend**: Complete business logic with Telegram Bot API integration
- **Frontend**: Full UI with forms, lists, cards, and navigation integration
- **Database**: Enhanced schema with migration for new functionality
- **API**: REST endpoints with OpenAPI documentation and validation
- **Integration**: Module registration and navigation system integration
- **Security**: Multi-tenant isolation and bot permission verification
- **Performance**: Redis caching for Telegram API responses (T042)
- **Rate Limiting**: Token bucket algorithm for Telegram API calls (T047)
- **Logging**: Structured logging for all telegram operations (T048)
- **Tenant Context**: RLS policies and global tenant interceptor (T044)

## Implementation Best Practices

### Redis Caching for Telegram API

**Implementation Pattern:**
```typescript
// TelegramApiService uses Redis caching for read operations
async getChatInfo(botToken: string, chatId: string | number): Promise<TelegramChat | null> {
  const cacheKey = this.generateCacheKey('chat:info', chatId);

  // Check cache first
  const cached = await this.cacheManager.get<TelegramChat>(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from Telegram API
  const result = await bot.telegram.getChat(chatId);

  // Cache for 1 hour
  await this.cacheManager.set(cacheKey, result, 3600000);

  return result;
}

// Invalidate cache after write operations
await this.invalidateChatCache(chatId);
```

**Cache TTL Guidelines:**
- Bot verification: 1 hour (rarely changes)
- Chat info: 1 hour (metadata changes infrequently)
- Member count: 5 minutes (changes more frequently)
- Channel info: 1 hour (same as chat info)

### Rate Limiting for Telegram Bot API

**Implementation Pattern:**
```typescript
// Token bucket algorithm: 30 requests per second per bot
private async executeWithRateLimit<T>(
  botToken: string,
  operation: () => Promise<T>
): Promise<T> {
  const isAllowed = await this.checkRateLimit(botToken);

  if (!isAllowed) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  return operation();
}

// Apply to all write operations
await this.executeWithRateLimit(botToken, async () => {
  const bot = this.getBotInstance(botToken);
  await bot.telegram.sendMessage(chatId, message, options);
});
```

**Rate Limit Configuration:**
- Max tokens: 30 requests/second (Telegram's limit)
- Refill rate: 30 tokens/second
- Tracked per bot token (not global)
- Stored in Redis for distributed rate limiting

### Structured Logging for Telegram Operations

**Implementation Pattern:**
```typescript
// Use LoggerService with telegram() method
this.logger.telegram('SendMessage', {
  chatId,
  messageLength: message.length,
  duration: Date.now() - startTime,
  success: true,
});

// Log errors with context
this.logger.telegram('SendMessage', {
  chatId,
  error: error.message,
  duration,
  success: false,
}, 'error');

// Log rate limit events
this.logger.telegram('RateLimitExceeded', {
  botToken: botToken.slice(-8),
  tokensAvailable: tokens,
}, 'warn');
```

**Logged Metrics:**
- Operation name and type
- Performance duration (ms)
- Success/failure status
- Error messages and stack traces
- Rate limiting events
- Chat/channel IDs

### Tenant Isolation with RLS

**Implementation Pattern:**
```typescript
// Global TenantInterceptor automatically sets tenant context
// in app.module.ts:
{
  provide: APP_INTERCEPTOR,
  useClass: TenantInterceptor,
}

// Interceptor sets PostgreSQL session variable:
await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

// RLS policies automatically filter by tenant_id:
CREATE POLICY tenant_isolation_select ON telegram_groups
FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant', true));
```

**Security Requirements:**
- All database queries automatically scoped by tenant_id
- No need to manually add tenant_id to WHERE clauses
- RLS enforced at database level (defense in depth)
- Tenant context extracted from JWT token

### Test Data Management

**Example Test User Setup:**
```bash
# Create test owner user for E2E tests
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testowner@tenant1.com",
    "password": "OwnerPass123",
    "name": "Test Owner",
    "company_name": "Test Company"
  }'
```

## Reference Implementations

**⚠️ CRITICAL: Before implementing any new module, analyze these reference implementations for established patterns.**

### CRUD Operations & Multi-Tenant Access Control
**Reference Module**: `backend/src/modules/user-management/`

**Analyze for**:
- Controller structure with role-based guards: `@UseGuards(JwtAuthGuard, RoleGuard('owner'))`
- DTO validation patterns (CreateUserDto, GetUsersDto)
- Service layer CRUD operations with tenant isolation
- Response format consistency (201 for create, 200 for list, pagination structure)
- Error handling (400/409/403 status codes)
- Audit logging with `@UseInterceptors(AuditLogInterceptor)`

**Test Patterns** (`backend/src/modules/user-management/__tests__/`):
- Contract test structure: One file per endpoint, schema validation
- Integration test setup: Database seeding, tenant context, cleanup
- Helper functions: `createTestUser()`, `setupTestTenant()`
- beforeAll/beforeEach patterns: Database connection, test data setup
- Assertion patterns: Status codes, response shape, error messages

### External API Integration with Caching & Rate Limiting
**Reference Module**: `backend/src/modules/telegram-groups/`

**Analyze for**:
- Service architecture: TelegramApiService, TelegramChannelService, TelegramSyncService separation
- Redis caching pattern: Cache key generation, TTL strategy, cache invalidation
- Rate limiting implementation: Token bucket algorithm with Redis storage
- Structured logging: `logger.telegram(operation, metadata, level)`
- Error handling for external APIs: Retry logic, timeout handling
- Bot permission verification patterns

**Test Patterns** (`backend/src/modules/telegram-groups/__tests__/`):
- External API integration tests with real Telegram Bot API
- Cache verification tests: Check cache hits/misses
- Rate limiting tests: Verify token bucket behavior
- Error scenario tests: API timeouts, rate limit exceeded
- Mock strategy: No mocks for Redis/PostgreSQL, mock only Telegram API when needed

### Frontend CRUD UI Components
**Reference Implementation**: `frontend/app/dashboard/users/` and `frontend/components/user-management/`

**Analyze for**:
- Form structure: react-hook-form + Zod validation
- API client patterns with React Query: `useMutation`, `useQuery`, cache invalidation
- Error handling: Toast notifications, inline error display
- Loading states: Button disabled states, skeleton loaders
- Pagination components: Page size, current page, total count
- data-testid patterns for E2E tests

### E2E Test Patterns
**Reference Tests**: `frontend/tests/e2e/user-management.spec.ts`

**Analyze for**:
- Test data setup: Creating test users, authentication flow
- Page object patterns: Selectors, actions, assertions
- Navigation testing: Desktop vs mobile viewport handling
- Form interaction patterns: Fill, submit, verify success/error
- data-testid usage: Consistent naming conventions
- Cleanup patterns: Delete test data after tests

### Database Migrations & RLS Policies
**Reference Migration**: `backend/migrations/[timestamp]-create-telegram-groups-table.ts`

**Analyze for**:
- Table creation with tenant_id column (uuid NOT NULL)
- RLS policy patterns: tenant_isolation_select, tenant_isolation_insert
- Index creation: tenant_id + frequently queried columns
- Foreign key constraints with CASCADE behavior
- Timestamp columns: created_at, updated_at with default values

### DTO & Validation Patterns
**Reference DTOs**: `backend/src/modules/user-management/dto/`

**Analyze for**:
- Class validator decorators: `@IsEmail()`, `@MinLength()`, `@IsEnum()`
- Custom validation decorators for business rules
- Transform decorators: `@Transform()`, `@Type()`
- ApiProperty decorators for OpenAPI documentation
- Nested DTO validation with `@ValidateNested()`

---

**Workflow for New Module Implementation**:

1. **Identify the closest reference module** based on feature requirements
2. **Read the reference implementation files** (controller, service, DTOs, tests)
3. **Document observed patterns** in task planning comments
4. **Copy the structure, not the code** - adapt patterns to new domain
5. **Maintain consistency** in naming, error handling, response formats
6. **Verify pattern compliance** before marking tasks as complete

**Deviation Protocol**:
- If you need to deviate from established patterns, document WHY in code comments
- Add justification to plan.md Complexity Tracking table
- Propose pattern update if the deviation should become the new standard

---

**NOTE**: Core development standards, best practices, and governance rules are defined in `.specify/memory/constitution.md`. This file contains project-specific context and current feature implementation status only. When conflicts arise, the constitution takes precedence.
