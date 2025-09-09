# Tasks: Telegram Groups SaaS Platform MVP

**Input**: Design documents from `/specs/001-goal-build-a/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✓ Tech stack: NestJS, Next.js 14, PostgreSQL, Redis
   → ✓ Structure: Web app (backend/, frontend/, worker/)
2. Load optional design documents:
   → data-model.md: 13 entities identified
   → contracts/: 3 API contracts (auth, bot, webhook)
   → research.md: Technical decisions loaded
3. Generate tasks by category:
   → Setup: 8 tasks
   → Tests: 15 tasks (contract + integration)
   → Core: 42 tasks (models, services, endpoints)
   → Integration: 12 tasks
   → Polish: 8 tasks
4. Apply task rules:
   → Parallel tasks marked with [P]
   → TDD enforced (tests before implementation)
5. Total tasks: 85 for MVP
6. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/app/`, `frontend/components/`
- **Worker**: `worker/src/`, `worker/tests/`

## Phase 3.1: Setup (Foundation)

### Project Initialization
- [x] T001 Create project structure: backend/, frontend/, worker/ directories
- [x] T002 Initialize NestJS backend with TypeScript configuration in backend/
- [x] T003 Initialize Next.js 14 frontend with App Router in frontend/
- [x] T004 Initialize worker service with BullMQ in worker/
- [x] T005 [P] Setup Docker Compose with PostgreSQL 15 and Redis 7
- [x] T006 [P] Configure ESLint and Prettier for all projects
- [x] T007 [P] Setup environment variables (.env.example for all services)
- [x] T008 Create shared types package in packages/shared-types/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

### Contract Tests - Authentication API
- [x] T009 [P] Contract test POST /v1/auth/register in backend/tests/contract/auth/register.spec.ts
- [x] T010 [P] Contract test POST /v1/auth/login in backend/tests/contract/auth/login.spec.ts
- [x] T011 [P] Contract test POST /v1/auth/refresh in backend/tests/contract/auth/refresh.spec.ts
- [x] T012 [P] Contract test GET /v1/auth/me in backend/tests/contract/auth/me.spec.ts
- [x] T013 [P] Contract test POST /v1/auth/logout in backend/tests/contract/auth/logout.spec.ts

### Contract Tests - Bot Management API
- [x] T014 [P] Contract test GET /v1/bots in backend/tests/contract/bots/list.spec.ts
- [x] T015 [P] Contract test POST /v1/bots in backend/tests/contract/bots/create.spec.ts
- [x] T016 [P] Contract test GET /v1/bots/{id} in backend/tests/contract/bots/get.spec.ts
- [x] T017 [P] Contract test POST /v1/bots/{id}/messages in backend/tests/contract/bots/messages.spec.ts

### Contract Tests - Payment Webhooks
- [x] T018 [P] Contract test QPay payment.completed webhook in backend/tests/contract/webhooks/payment-completed.spec.ts
- [x] T019 [P] Contract test QPay payment.failed webhook in backend/tests/contract/webhooks/payment-failed.spec.ts

### Integration Tests - Critical User Flows
- [x] T020 [P] Integration test: Tenant registration flow in backend/tests/integration/tenant-registration.spec.ts
- [x] T021 [P] Integration test: Bot creation and group connection in backend/tests/integration/bot-setup.spec.ts
- [x] T022 [P] Integration test: Payment processing to membership grant in backend/tests/integration/payment-flow.spec.ts
- [x] T023 [P] Integration test: Membership expiration workflow in backend/tests/integration/membership-lifecycle.spec.ts
- [x] T024 [P] Integration test: Multi-tenant data isolation in backend/tests/integration/tenant-isolation.spec.ts

## Phase 3.3: Core Implementation - Database & Models

### Database Setup
- [x] T025 Create database migration system in backend/src/database/migrations/
- [x] T026 Migration: Create tenants table with RLS in backend/src/database/migrations/001-tenants.ts
- [x] T027 Migration: Create users table with tenant_id in backend/src/database/migrations/002-users.ts
- [x] T028 Migration: Create telegram_bots table in backend/src/database/migrations/003-telegram-bots.ts
- [x] T029 Migration: Create telegram_groups table in backend/src/database/migrations/004-telegram-groups.ts
- [x] T030 Migration: Create membership_plans table in backend/src/database/migrations/005-membership-plans.ts
- [x] T031 Migration: Create members table in backend/src/database/migrations/006-members.ts
- [x] T032 Migration: Create memberships table in backend/src/database/migrations/007-memberships.ts
- [x] T033 Migration: Create payments table in backend/src/database/migrations/008-payments.ts
- [x] T034 Migration: Create audit_logs table in backend/src/database/migrations/009-audit-logs.ts
- [x] T035 Setup Row Level Security policies in backend/src/database/migrations/010-rls-policies.ts

### Entity Models
- [x] T036 [P] Tenant entity model in backend/src/modules/tenant/entities/tenant.entity.ts
- [x] T037 [P] User entity model in backend/src/modules/auth/entities/user.entity.ts
- [x] T038 [P] TelegramBot entity model in backend/src/modules/bot/entities/telegram-bot.entity.ts
- [x] T039 [P] TelegramGroup entity model in backend/src/modules/bot/entities/telegram-group.entity.ts
- [x] T040 [P] MembershipPlan entity model in backend/src/modules/membership/entities/membership-plan.entity.ts
- [x] T041 [P] Member entity model in backend/src/modules/membership/entities/member.entity.ts
- [x] T042 [P] Membership entity model in backend/src/modules/membership/entities/membership.entity.ts
- [x] T043 [P] Payment entity model in backend/src/modules/payment/entities/payment.entity.ts

## Phase 3.4: Core Implementation - Services & Business Logic

### Authentication Module
- [x] T044 JWT authentication service in backend/src/modules/auth/services/auth.service.ts
- [x] T045 JWT auth guard in backend/src/common/guards/jwt-auth.guard.ts
- [x] T046 Tenant context guard in backend/src/common/guards/tenant.guard.ts
- [x] T047 Auth controller with register/login endpoints in backend/src/modules/auth/auth.controller.ts

### Tenant Management Module
- [x] T048 Tenant service with CRUD operations in backend/src/modules/tenant/services/tenant.service.ts
- [x] T049 Tenant isolation interceptor in backend/src/common/interceptors/tenant.interceptor.ts
- [x] T050 Tenant controller in backend/src/modules/tenant/tenant.controller.ts

### Bot Management Module
- [x] T051 Telegram bot service in backend/src/modules/bot/services/telegram-bot.service.ts
- [x] T052 Telegraph bot framework setup in backend/src/modules/bot/services/bot-framework.service.ts
- [ ] T053 Bot webhook handler in backend/src/modules/bot/services/webhook.service.ts
- [x] T054 Bot controller with CRUD endpoints in backend/src/modules/bot/bot.controller.ts
- [x] T055 Group management service in backend/src/modules/bot/services/group.service.ts

### Payment Processing Module
- [x] T056 QPay integration service in backend/src/modules/payment/services/qpay.service.ts
- [x] T056 Payment webhook controller in backend/src/modules/payment/webhook.controller.ts
- [x] T057 Webhook signature verification in backend/src/modules/payment/guards/webhook.guard.ts
- [ ] T058 Payment processing queue in worker/src/queues/payment.queue.ts
- [x] T059 Idempotency middleware in backend/src/common/middleware/idempotency.middleware.ts

### Membership Management Module
- [x] T060 Membership service with lifecycle management in backend/src/modules/membership/services/membership.service.ts
- [x] T061 Membership expiration job in backend/src/modules/membership/jobs/membership-expiration.job.ts
- [x] T062 Member management service in backend/src/modules/membership/services/member.service.ts
- [x] T063 Membership plan service in backend/src/modules/membership/services/membership-plan.service.ts

## Phase 3.5: Frontend Implementation

### Authentication Pages
- [ ] T064 [P] Login page component in frontend/app/(auth)/login/page.tsx
- [ ] T065 [P] Register page component in frontend/app/(auth)/register/page.tsx
- [ ] T066 [P] Auth layout with redirect logic in frontend/app/(auth)/layout.tsx

### Dashboard Core
- [ ] T067 Dashboard layout with sidebar in frontend/app/(dashboard)/layout.tsx
- [ ] T068 Dashboard overview page in frontend/app/(dashboard)/page.tsx
- [ ] T069 [P] API client service with auth in frontend/lib/api/client.ts
- [ ] T070 [P] Auth context provider in frontend/components/providers/auth-provider.tsx

### Bot Management UI
- [ ] T071 Bots list page in frontend/app/(dashboard)/bots/page.tsx
- [ ] T072 Bot creation form in frontend/components/features/bots/create-bot-form.tsx
- [ ] T073 Bot detail page in frontend/app/(dashboard)/bots/[id]/page.tsx
- [ ] T074 Group connection modal in frontend/components/features/bots/connect-group-modal.tsx

### Member Management UI
- [ ] T075 Members list with filters in frontend/app/(dashboard)/members/page.tsx
- [ ] T076 Member detail view in frontend/app/(dashboard)/members/[id]/page.tsx
- [ ] T077 Membership plans page in frontend/app/(dashboard)/plans/page.tsx

## Phase 3.6: Integration & Infrastructure

### Background Jobs
- [ ] T078 BullMQ setup with Redis in worker/src/config/queue.config.ts
- [ ] T079 Scheduled job for membership expiration checks in worker/src/schedulers/membership.scheduler.ts
- [ ] T080 Analytics aggregation job in worker/src/jobs/analytics.job.ts

### Monitoring & Logging
- [ ] T081 [P] Structured logging with Winston in backend/src/common/logging/logger.service.ts
- [ ] T082 [P] Request/response logging middleware in backend/src/common/middleware/logging.middleware.ts
- [ ] T083 [P] Error handling filter in backend/src/common/filters/http-exception.filter.ts
- [x] T084 [P] Health check endpoints in backend/src/modules/health/health.controller.ts

## Phase 3.7: Polish & Documentation

### Testing & Quality
- [ ] T085 [P] E2E test: Complete tenant onboarding flow in e2e/tests/tenant-onboarding.spec.ts
- [ ] T086 [P] Performance test: API response times in backend/tests/performance/api-latency.spec.ts
- [ ] T087 [P] Load test: Concurrent bot operations in backend/tests/load/bot-concurrency.spec.ts

### Documentation
- [ ] T088 [P] API documentation with Swagger in backend/src/main.ts
- [ ] T089 [P] Deployment guide in docs/deployment.md
- [ ] T090 [P] Environment setup guide in docs/setup.md

## Dependencies

### Critical Path
1. **Setup (T001-T008)** → Everything else
2. **Tests (T009-T023)** → Implementation (T024-T077)
3. **Database (T024-T034)** → Models (T035-T042)
4. **Models (T035-T042)** → Services (T043-T063)
5. **Auth (T043-T046)** → All protected endpoints
6. **Backend services** → Frontend implementation

### Parallel Execution Groups

**Group 1: Initial Tests (After Setup)**
```bash
# Can run T009-T023 in parallel
Task agent="contract-test" prompt="Write contract test for POST /v1/auth/register"
Task agent="contract-test" prompt="Write contract test for POST /v1/auth/login"
Task agent="contract-test" prompt="Write integration test for tenant registration"
# ... continue for all test tasks
```

**Group 2: Entity Models (After Database)**
```bash
# Can run T035-T042 in parallel
Task agent="implementation" prompt="Create Tenant entity model with TypeORM decorators"
Task agent="implementation" prompt="Create User entity model with tenant_id field"
Task agent="implementation" prompt="Create TelegramBot entity model"
# ... continue for all model tasks
```

**Group 3: Frontend Components (After API)**
```bash
# Can run T064-T066, T069-T070 in parallel
Task agent="frontend" prompt="Create login page with Shadcn/UI form"
Task agent="frontend" prompt="Create register page with validation"
Task agent="frontend" prompt="Create API client with axios and auth interceptor"
```

## MVP Scope Boundaries

### Included in MVP
- ✅ Multi-tenant architecture with RLS
- ✅ Basic authentication (JWT)
- ✅ Bot creation and management
- ✅ Group connection
- ✅ Payment webhook processing
- ✅ Membership lifecycle
- ✅ Basic dashboard UI

### Excluded from MVP (Phase 2)
- ❌ Advanced analytics dashboards
- ❌ Export functionality
- ❌ Super admin panel
- ❌ Invoice generation
- ❌ Bot message customization UI
- ❌ Detailed reporting

## Validation Checklist
- [x] All contracts have corresponding tests (T009-T018)
- [x] All entities have model tasks (T035-T042)
- [x] All tests come before implementation
- [x] Parallel tasks are truly independent
- [x] Each task specifies exact file path
- [x] No parallel task modifies same file

## Success Criteria for MVP
1. User can register and create a tenant account
2. User can add a Telegram bot
3. User can connect Telegram groups
4. System processes QPay webhooks
5. Members are added/removed automatically
6. Basic dashboard shows member count

---

**Total Tasks**: 90
**Estimated Duration**: 2-3 weeks with 2 developers
**Next Step**: Begin with Phase 3.1 Setup tasks (T001-T008)