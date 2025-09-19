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

## Recent Changes (Feature 002)
- Added user management API endpoints with role-based access
- Created user management UI components with form validation
- Implemented tenant-scoped user creation with audit logging
- Added OpenAPI contract specifications for user endpoints

Remember: Follow TDD, maintain tenant isolation, validate all inputs, and audit sensitive operations.

## React/Frontend Best Practices & Anti-Patterns

### ✅ **Required Patterns**

#### 1. **Proper useEffect Dependencies**
```typescript
// ❌ WRONG - Missing dependencies
useEffect(() => {
  fetchData();
}, []); // fetchData not in deps

// ✅ CORRECT - All dependencies included
const fetchData = useCallback(async () => {
  // fetch logic
}, []);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

#### 2. **Separation of Concerns in Context Providers**
```typescript
// ❌ WRONG - Mixed responsibilities
const login = async (creds) => {
  const response = await apiClient.login(creds);
  setUser(response.user);
  router.push('/dashboard'); // Navigation mixed with auth
};

// ✅ CORRECT - Pure auth logic
const login = async (creds) => {
  const response = await apiClient.login(creds);
  setUser(response.user);
  return response; // Let caller handle navigation
};
```

#### 3. **Error Boundaries for Context Providers**
```typescript
// ✅ REQUIRED - Wrap providers with error boundaries
export function AuthProvider({ children }) {
  return (
    <AuthErrorBoundary>
      <AuthProviderCore>{children}</AuthProviderCore>
    </AuthErrorBoundary>
  );
}
```

#### 4. **Proper Loading State Management**
```typescript
// ❌ WRONG - Multiple loading states conflict
const [isLoading, setIsLoading] = useState(false); // Component level
// AND auth provider also sets loading

// ✅ CORRECT - Single source of truth
// Either use context loading OR component loading, not both
```

### 🚫 **Anti-Patterns to Avoid**

#### 1. **The `isClient` Anti-Pattern**
```typescript
// ❌ NEVER DO THIS
const [isClient, setIsClient] = useState(false);
useEffect(() => {
  setIsClient(true);
}, []);

// ✅ CORRECT - useEffect handles client-side automatically
useEffect(() => {
  // This only runs on client
  fetchData();
}, [fetchData]);
```

#### 2. **Missing Error Handling in Forms**
```typescript
// ❌ WRONG - No error display
const onSubmit = async (data) => {
  try {
    await authProvider.login(data);
  } catch (err) {
    // Error not shown to user
  }
};

// ✅ CORRECT - Proper error state
const [error, setError] = useState(null);
const onSubmit = async (data) => {
  setError(null);
  try {
    await apiClient.login(data);
    window.location.href = '/dashboard';
  } catch (err) {
    setError(err.message);
  }
};
```

#### 3. **Hardcoded Routes in Providers**
```typescript
// ❌ WRONG - Hardcoded navigation
router.push('/dashboard'); // In auth provider

// ✅ CORRECT - Let components handle navigation
// Return success and let calling component decide where to go
```

### 🔧 **Error Handling Standards**

#### 1. **Form Error Display**
- Always show API errors to users with proper styling
- Use `setError(null)` before new requests
- Handle both network and validation errors

#### 2. **Context Provider Error Handling**
- Wrap providers with error boundaries
- Don't mix provider errors with component errors
- Log errors for debugging but show user-friendly messages

#### 3. **Loading State Management**
- Avoid multiple conflicting loading states
- Use context loading for global state
- Use component loading for local operations

### 🎯 **TypeScript Standards**

#### 1. **Avoid `any` Type**
```typescript
// ❌ WRONG - Using any defeats TypeScript purpose
const handleError = (error: any) => {
  console.log(error.message); // No type safety
};

// ✅ CORRECT - Proper typing
const handleError = (error: unknown) => {
  if (error instanceof Error) {
    console.log(error.message); // Type-safe
  } else {
    console.log('An unknown error occurred');
  }
};

// ✅ CORRECT - Specific types when possible
interface ApiError {
  message: string;
  statusCode: number;
}

const handleApiError = (error: ApiError) => {
  console.log(`${error.statusCode}: ${error.message}`);
};
```

#### 2. **Type Assertions vs Type Guards**
```typescript
// ❌ WRONG - Type assertion without validation
const user = response.data as User;

// ✅ CORRECT - Type guard with validation
const isUser = (data: unknown): data is User => {
  return typeof data === 'object' &&
         data !== null &&
         'id' in data &&
         'email' in data;
};

if (isUser(response.data)) {
  const user = response.data; // Type-safe
}
```

### 🔍 **Code Quality & Linting**

#### **MANDATORY: Run Linting After Every Change**
```bash
# ALWAYS run these after code changes:
npm run lint          # Check for linting errors
npm run type-check     # Check TypeScript errors
npm run format         # Auto-fix formatting issues

# Or run all at once:
npm run lint && npm run type-check
```

#### **Pre-Commit Checklist**
After EVERY code change, you MUST:
1. ✅ Run `npm run lint` - Fix all linting errors
2. ✅ Run `npm run type-check` - Fix all TypeScript errors
3. ✅ Test the functionality manually
4. ✅ Check browser console for errors
5. ✅ Verify error handling works correctly

#### **Common Linting Fixes**
```typescript
// ❌ WRONG - Unused variables
const { user, isLoading, unused } = useAuth(); // 'unused' triggers lint error

// ✅ CORRECT - Remove or prefix with underscore
const { user, isLoading } = useAuth();
// OR
const { user, isLoading, _unused } = useAuth();

// ❌ WRONG - Missing return types
const fetchData = async () => { // No return type

// ✅ CORRECT - Explicit return types
const fetchData = async (): Promise<User[]> => {
```

### 📋 **Review Checklist**

Before shipping any React component:
- [ ] All useEffect dependencies are included
- [ ] Error boundaries are implemented for providers
- [ ] Loading states don't conflict
- [ ] Navigation logic is separated from business logic
- [ ] Error messages are displayed to users
- [ ] No `isClient` anti-pattern usage
- [ ] TypeScript types are properly defined (no `any` usage)
- [ ] Hardcoded routes are avoided in reusable components
- [ ] **Linting passes**: `npm run lint` shows no errors
- [ ] **Type checking passes**: `npm run type-check` shows no errors
- [ ] All variables are used (no unused variable warnings)
- [ ] Proper error types used (`Error`, `unknown`, not `any`)

### 🐛 **Common Issues Fixed**

1. **Auth Provider Loading Conflicts** - Separated component-level and provider-level loading states
2. **Missing Error Display** - Added proper error state management in forms
3. **Mixed Responsibilities** - Removed navigation logic from auth provider
4. **Race Conditions** - Fixed useEffect dependencies and removed isClient pattern
5. **Missing Error Boundaries** - Added AuthErrorBoundary for robust error handling

These patterns prevent authentication errors, state management issues, and user experience problems.

## ⚠️ **CRITICAL WORKFLOW REQUIREMENT**

### **ALWAYS Run Linting After Code Changes**

Every time you modify code, you MUST immediately run:
```bash
npm run lint && npm run type-check
```

**Why this is critical:**
- **Prevents type safety issues** that can cause runtime errors
- **Catches unused variables** that indicate incomplete refactoring
- **Enforces consistent code style** across the team
- **Identifies `any` type usage** that defeats TypeScript's purpose
- **Prevents deployment of broken code**

**Example: The linting check found 8+ issues including:**
- Unused `useRef` import in layout.tsx
- Multiple `any` types in dashboard components
- Type safety violations in API client

**🚨 Never commit code that fails linting!** This leads to:
- Runtime errors in production
- Type safety violations
- Maintenance debt
- Poor developer experience

**Best practice:** Set up your IDE to show linting errors inline and auto-fix on save.