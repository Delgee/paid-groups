<!--
Sync Impact Report:
Version: 1.1.0 (added pattern consistency principle)
Date: 2025-01-20

Modified Principles:
- Created initial constitution from CLAUDE.md guidance (v1.0.0)
- Added Principle VI: Pattern Consistency (v1.1.0)

Added Sections:
- Core Principles: Multi-Tenancy, Test-First Development, Type Safety, Performance & Caching, Security by Design, Pattern Consistency
- Development Standards: Backend API Patterns, Frontend React Best Practices, Code Quality Requirements
- Testing Requirements: TDD Workflow, E2E Testing Standards
- Governance: Amendment Process and Compliance

Templates Status:
✅ plan-template.md - Constitution Check section aligned
✅ spec-template.md - Requirements alignment verified
✅ tasks-template.md - Task categorization matches principles
✅ All command files reviewed

Follow-up Actions:
- Remove redundant content from CLAUDE.md (best practices sections moved to constitution) ✅
- CLAUDE.md will retain only project-specific context and current feature status ✅
- Add reference implementation section to CLAUDE.md for pattern guidance ✅
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

**Version**: 1.1.0 | **Ratified**: 2025-01-20 | **Last Amended**: 2025-01-20
