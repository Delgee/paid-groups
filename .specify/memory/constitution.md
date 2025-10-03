<!--
Sync Impact Report:
Version: 1.2.0 (added error handling and observability principles)
Date: 2025-01-20

Modified Principles:
- Created initial constitution from CLAUDE.md guidance (v1.0.0)
- Added Principle VI: Pattern Consistency (v1.1.0)
- Added Principle VII: Error Handling & User Communication (v1.2.0)
- Added Principle VIII: Observability & Monitoring (v1.2.0)

Added Sections:
- Core Principles: Multi-Tenancy, Test-First Development, Type Safety, Performance & Caching, Security by Design, Pattern Consistency, Error Handling & User Communication, Observability & Monitoring
- Development Standards: Backend API Patterns, Frontend React Best Practices, Code Quality Requirements, Error Response Standards
- Testing Requirements: TDD Workflow, E2E Testing Standards
- Governance: Amendment Process and Compliance

Templates Status:
✅ plan-template.md - Constitution Check section aligned (error handling gates added)
✅ spec-template.md - Requirements alignment verified
✅ tasks-template.md - Task categorization matches principles
✅ All command files reviewed

Follow-up Actions:
- Remove redundant content from CLAUDE.md (best practices sections moved to constitution) ✅
- CLAUDE.md will retain only project-specific context and current feature status ✅
- Add reference implementation section to CLAUDE.md for pattern guidance ✅
- Update error response format across existing modules to match new standard (next sprint)
- Set up monitoring dashboards for payment failures and API performance (next sprint)
-->

# Telegram Groups SaaS Platform Constitution

## Core Principles

### I. Multi-Tenancy First (NON-NEGOTIABLE)
Every feature MUST enforce tenant isolation at all layers. Database queries MUST use Row-Level Security (RLS) policies, and application code MUST set tenant context via `SET LOCAL app.current_tenant TO 'uuid'`. Data MUST NEVER be exposed across tenant boundaries. The `tenant_id` field is mandatory in all queries involving multi-tenant data.

**Rationale**: Data leakage between tenants is a critical security vulnerability in SaaS platforms. Defense-in-depth requires both application-level and database-level enforcement.

### II. Test-First Development (NON-NEGOTIABLE)
TDD is mandatory for all features: Contract tests MUST be written first, approved by stakeholders, MUST fail, then implementation proceeds. Follow Red-Green-Refactor cycle strictly. No mocks for external dependencies (PostgreSQL, Redis) - use real services in integration tests. E2E tests validate complete user workflows.

**Rationale**: Tests written after implementation tend to validate what was built, not what was needed. Pre-written tests ensure requirements drive implementation.

### III. Type Safety & Linting
TypeScript MUST be used without `any` types except where explicitly justified. All code changes MUST pass `npm run lint && npm run type-check` before commit. Unknown types should use `unknown` with type guards. Unused variables and missing return types are forbidden.

**Rationale**: Type safety prevents runtime errors and improves maintainability. Strict linting enforces consistency and catches issues early.

### IV. Performance & Caching
External API calls (Telegram Bot API) MUST be cached in Redis with appropriate TTL (1 hour for metadata, 5 minutes for frequently changing data). Rate limiting MUST use token bucket algorithm (30 req/sec per bot). Performance targets: <200ms p95 for API endpoints.

**Rationale**: External API rate limits and latency impact user experience. Caching reduces costs and improves responsiveness.

### V. Security by Design
Authentication MUST use JWT with role-based guards. Password validation MUST enforce complexity (min 8 chars, mixed case, numbers). Payment webhooks MUST verify HMAC signatures. Audit logging is mandatory for sensitive operations (user management, payment processing). Input validation MUST use Zod schemas.

**Rationale**: Security vulnerabilities in payment and authentication systems have severe business consequences. Multiple layers of validation and logging provide defense-in-depth.

### VI. Pattern Consistency (NON-NEGOTIABLE)
Before implementing any new module, MUST analyze existing reference implementations for established patterns. CRUD operations MUST return consistent response formats across modules. Test structure (describe blocks, beforeAll/beforeEach usage, helper functions) MUST follow patterns from reference modules. DTOs, validators, error handling, and logging patterns MUST be consistent. Deviations from established patterns MUST be justified in code comments and plan.md.

**Rationale**: Inconsistent patterns increase cognitive load, make code reviews harder, introduce bugs, and reduce AI agent effectiveness. Learning from existing implementations is faster and more reliable than creating new patterns.

**Implementation**: See "Reference Implementations" section in CLAUDE.md for module-specific pattern guidance.

### VII. Error Handling & User Communication
All errors MUST be categorized as operational (expected, user-facing) or programmer errors (unexpected, internal). User-facing errors MUST include actionable messages without exposing system internals. HTTP status codes MUST be semantically correct: 400 for validation errors, 401 for authentication failures, 403 for authorization failures, 404 for not found, 409 for conflicts (duplicate email, etc.), 422 for unprocessable entities, 500 for system errors. Error responses MUST follow consistent format: `{ error: { code: string, message: string, details?: object } }`. Payment errors MUST include transaction IDs for support tracking. Stack traces MUST NEVER be exposed to end users.

**Rationale**: Inconsistent error handling leads to poor UX, increased support burden, and security leaks (stack traces exposed to users). Users need actionable guidance, not technical jargon. Payment error traceability is critical for dispute resolution.

### VIII. Observability & Monitoring
All production services MUST emit structured metrics (request count, duration, error rate, status code distribution). Critical operations (payment processing, tenant creation, Telegram Bot API calls, webhook delivery) MUST be traced with correlation IDs for distributed tracing. Alerts MUST be defined for business-critical failures: payment failures >5% in 5min window, API p95 latency >500ms, Telegram rate limit exceeded, database connection pool exhaustion >80%. Dashboards MUST track per-tenant usage metrics (API calls, active groups, bot message count). All async jobs (BullMQ) MUST report success/failure metrics and duration. Log levels MUST be appropriate: ERROR for failures requiring action, WARN for degraded states, INFO for business events, DEBUG for troubleshooting.

**Rationale**: Reactive incident response is too slow for SaaS platforms. Proactive monitoring prevents revenue loss, identifies performance degradation before user complaints, and enables data-driven capacity planning. Correlation IDs enable debugging distributed transactions across services.

## Development Standards

### Backend API Patterns

**Controller Path Configuration**:
- Global prefix `/v1` is set in `main.ts` via `app.setGlobalPrefix('v1')`
- Controllers MUST use base path without version prefix: `@Controller('users')` creates `/v1/users`
- NEVER use `@Controller('v1/users')` as it creates double prefix `/v1/v1/users`

**Database Query Pattern**:
- RLS policies automatically scope queries by `tenant_id`
- TenantInterceptor sets PostgreSQL session variable: `SET LOCAL app.current_tenant = $1`
- No manual `tenant_id` filtering required in WHERE clauses (defense-in-depth)

**Telegram Integration**:
- Use Telegraph library for bot interactions
- Implement Redis caching with cache key pattern: `telegram:{operation}:{identifier}`
- Apply rate limiting via `executeWithRateLimit<T>()` wrapper
- Use structured logging with `logger.telegram(operation, metadata, level)`

### Error Response Standards

**Consistent Error Format**:
```typescript
// All error responses MUST follow this structure
{
  error: {
    code: 'VALIDATION_ERROR' | 'DUPLICATE_EMAIL' | 'PAYMENT_FAILED' | 'TENANT_NOT_FOUND',
    message: 'User-friendly actionable message',
    details?: {
      field?: string,           // For validation errors
      transactionId?: string,   // For payment errors
      retryAfter?: number       // For rate limit errors
    }
  }
}
```

**HTTP Status Code Mapping**:
- `400 Bad Request`: Malformed request, invalid input format
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Valid auth but insufficient permissions (wrong role)
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Duplicate resource (email exists, group name taken)
- `422 Unprocessable Entity`: Valid format but business rule violation
- `429 Too Many Requests`: Rate limit exceeded (include retryAfter)
- `500 Internal Server Error`: Unexpected system failure (log correlation ID)

**Error Categories**:
- **Operational Errors**: Expected failures users can resolve (validation, duplicates, rate limits) - user-friendly messages
- **Programmer Errors**: Unexpected bugs (null reference, type errors) - generic message to user, detailed logs for developers

**Error Logging**:
- User-facing errors (4xx): Log at INFO or WARN level with sanitized details
- System errors (5xx): Log at ERROR level with full stack trace and correlation ID
- Payment errors: Log at ERROR with transaction ID, tenant ID, amount, gateway response

### Monitoring & Alerting Standards

**Required Metrics (Prometheus/StatsD format)**:
```typescript
// Request metrics
http_requests_total{method, path, status, tenant_id}
http_request_duration_seconds{method, path, status}

// Business metrics
payments_total{status, gateway, tenant_id}
telegram_api_calls_total{operation, status, bot_id}
background_jobs_total{queue, status, job_type}

// Resource metrics
database_pool_connections{state: 'active' | 'idle' | 'waiting'}
redis_cache_hit_rate{operation}
```

**Alert Rules**:
```yaml
# Payment failures
- alert: HighPaymentFailureRate
  expr: rate(payments_total{status="failed"}[5m]) > 0.05
  severity: critical

# API performance degradation
- alert: HighAPILatency
  expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
  severity: warning

# Telegram rate limiting
- alert: TelegramRateLimitExceeded
  expr: rate(telegram_api_calls_total{status="rate_limited"}[1m]) > 0
  severity: warning

# Database connection exhaustion
- alert: DatabasePoolExhaustion
  expr: database_pool_connections{state="waiting"} / database_pool_connections > 0.8
  severity: critical
```

**Correlation ID Implementation**:
```typescript
// Generate at request entry point
const correlationId = req.headers['x-correlation-id'] || uuidv4();

// Pass to all services and log messages
logger.info('Processing payment', { correlationId, tenantId, amount });

// Return in error responses for support tracking
{ error: { code: 'PAYMENT_FAILED', correlationId } }
```

### Frontend React Best Practices

**Required Patterns**:
- All `useEffect` dependencies MUST be included (no missing deps)
- Separation of concerns: Auth providers MUST NOT contain navigation logic
- Error boundaries MUST wrap context providers
- Single source of truth for loading states (avoid conflicts between provider and component)
- Direct communication via text output (NEVER use bash echo for explanations)

**Anti-Patterns to Avoid**:
- The `isClient` pattern (useEffect handles client-side automatically)
- Missing error display in forms (always show API errors to users)
- Hardcoded routes in reusable components/providers
- Multiple conflicting loading states
- Type assertions without validation (use type guards with validation)

**E2E Testing Requirements**:
- All interactive elements MUST have `data-testid` attributes
- Naming convention: `{field}-input`, `{action}-button`, `{field}-error`
- Toast notifications MUST have identifiable IDs for state verification
- Complex components (Radix UI) MUST expose test IDs on trigger elements

### Code Quality Requirements

**Pre-Commit Checklist (Mandatory)**:
1. Run `npm run lint` - zero errors allowed
2. Run `npm run type-check` - zero errors allowed
3. Test functionality manually
4. Verify error handling works correctly
5. Check browser console for errors

**TypeScript Standards**:
- Avoid `any` type - use `unknown` with type guards or specific interfaces
- Explicit return types for all functions
- Type guards over type assertions: `(data: unknown): data is User => {...}`
- Remove unused variables or prefix with underscore: `_unused`

## Testing Requirements

### TDD Workflow
1. **Contract Tests First**: Write OpenAPI/schema validation tests that MUST fail
2. **Integration Tests**: Test complete user workflows with real dependencies
3. **Implementation**: Write code to make tests pass (Red-Green-Refactor)
4. **E2E Tests**: Validate end-to-end user scenarios with data-testid selectors

### E2E Testing Standards
- Viewport-specific selectors for responsive designs (desktop vs mobile nav)
- Component library interactions (Radix Select, Toast) with proper selectors
- Test data isolation using dedicated test users/tenants
- Document test credentials in test setup files

### Acceptable Development Errors
During incremental TDD implementation, these errors are temporary and acceptable:
- Import errors for modules planned in future tasks
- Entity relationship errors when entities are validly designed but not yet created
- Module resolution errors for test files referencing planned implementations

These errors MUST be documented with resolution plan and fixed before feature completion.

## Governance

### Amendment Process
1. Constitution updates MUST increment version using semantic versioning:
   - **MAJOR**: Backward incompatible changes (principle removal/redefinition)
   - **MINOR**: New principles or materially expanded guidance
   - **PATCH**: Clarifications, wording fixes, non-semantic refinements

2. All amendments MUST update:
   - Version number and Last Amended date
   - Dependent templates (plan, spec, tasks)
   - Runtime guidance files (CLAUDE.md, README.md)
   - Sync Impact Report (HTML comment at top of constitution)

3. Amendment proposals MUST include:
   - Rationale for change
   - Impact analysis on existing features
   - Migration plan for affected code

### Compliance Review
- All PRs MUST verify constitutional compliance
- Complexity deviations MUST be justified in plan.md Complexity Tracking table
- Template updates MUST reference constitution version
- Use `.specify/scripts/bash/update-agent-context.sh` to propagate changes

### Runtime Development Guidance
- CLAUDE.md contains project-specific context and current feature status
- Constitution contains immutable principles and standards
- When conflict arises, constitution takes precedence over CLAUDE.md

**Version**: 1.2.0 | **Ratified**: 2025-01-20 | **Last Amended**: 2025-01-20
