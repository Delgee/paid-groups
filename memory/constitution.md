# Telegram Groups SaaS Constitution

## Core Principles

### I. Multi-Tenant Architecture First
Every feature must respect tenant isolation. All database queries include `tenant_id`, Row-Level Security policies enforce data boundaries, and tenant context is set via middleware. No data may be exposed across tenant boundaries. Multi-tenant considerations are non-negotiable.

### II. Test-Driven Development (NON-NEGOTIABLE)
TDD is mandatory: Contract tests → Integration tests → E2E tests → Unit tests. Tests written first, user approved, tests fail, then implement. Red-Green-Refactor cycle strictly enforced. Real dependencies required (PostgreSQL, Redis) - no mocks for external services.

### III. Security-First Implementation
All endpoints require authentication and authorization. JWT tokens with role-based guards, input validation on all inputs, rate limiting per tenant, audit logging for sensitive operations. Payment webhooks must verify HMAC signatures. Security checklist compliance required for all features.

### IV. Modular Library Structure
Every feature implemented as standalone NestJS module or Next.js component library. Modules must be self-contained, independently testable, and documented. Clear separation of concerns: auth, tenant management, bot operations, payment processing, analytics. No cross-module dependencies without explicit interfaces.

### V. Real-Time & Queue-Based Processing
Telegram bot operations, payment webhooks, and membership management use queue-based processing with BullMQ. Real-time updates via WebSocket for dashboard. All async operations must be idempotent and include retry logic with exponential backoff.

## Technology Stack Requirements

### Backend Stack
- **Framework**: NestJS with TypeScript for enterprise features and multi-tenancy support
- **Database**: PostgreSQL 15+ with Row-Level Security for tenant isolation
- **Cache/Queue**: Redis 7+ for session caching and BullMQ job processing
- **Bot Integration**: Telegraph library for Telegram Bot API interactions
- **Payment**: QPay Mongolia API with webhook verification

### Frontend Stack
- **Framework**: Next.js 14 with App Router for server-side rendering and performance
- **UI Components**: Shadcn/UI with Tailwind CSS for consistent design system
- **State Management**: React Query for server state, Zustand for client state
- **Authentication**: JWT with refresh token rotation

### Infrastructure Requirements
- **Containerization**: Docker with docker-compose for development
- **Monitoring**: Structured logging with Winston, OpenTelemetry for tracing
- **Performance**: <100ms P50 API latency, <500ms P95, 1000 req/s target
- **Scale**: Support 100+ tenants, 10k+ end users, 1M+ messages/month

## Development Workflow

### Feature Development Process
1. **Specification**: Create detailed spec in `/specs/[feature]/spec.md` with business requirements
2. **Planning**: Generate implementation plan in `/specs/[feature]/plan.md` with technical design
3. **Contracts**: Define API contracts in `/specs/[feature]/contracts/` before implementation
4. **TDD Implementation**: Write tests first, implement to pass, refactor for quality
5. **Integration**: Ensure multi-tenant isolation and security compliance

### Code Quality Gates
- All PRs must pass contract tests, integration tests, and E2E tests
- TypeScript typecheck and ESLint must pass after every code change
- Avoid using 'any' type - use specific types, interfaces, or generics instead
- Database changes require migration scripts and RLS policy updates
- Security-sensitive features require audit logging and role-based access
- Performance-critical paths require load testing with realistic data volumes
- No feature ships without tenant isolation verification

### Review Requirements
- Architecture decisions documented in feature research.md
- Multi-tenant data access patterns reviewed for security
- API changes validated against existing contracts
- Bot integration tested with real Telegram API (sandbox)
- Payment flows tested with QPay sandbox environment

## Governance

### Constitutional Authority
This constitution supersedes all other development practices and guidelines. All feature development, code reviews, and architectural decisions must comply with these principles. Any violation must be justified with explicit business requirements and technical necessity.

### Amendment Process
Constitutional amendments require:
1. Documentation of the proposed change and rationale
2. Impact assessment on existing codebase and processes
3. Update of dependent templates and documentation (see `/memory/constitution_update_checklist.md`)
4. Verification that all examples and references remain consistent

### Compliance Verification
- All PRs must verify multi-tenant isolation compliance
- TypeScript typecheck (`npm run type-check`) and ESLint (`npm run lint`) required after every code change
- Strict TypeScript configuration enforced - no 'any' types allowed without explicit justification
- Security checklist completion required for auth/payment features
- Performance targets validated for user-facing features
- Test coverage requirements enforced via CI/CD pipeline
- Architecture decisions must reference constitutional principles

### Runtime Development Guidance
Use `/CLAUDE.md` for detailed implementation guidance, development commands, and debugging procedures. The constitution defines "what" and "why" - CLAUDE.md defines "how" and "when".

**Version**: 1.0.0 | **Ratified**: 2025-09-14 | **Last Amended**: 2025-09-14