# Implementation Plan: Bot Configuration & Automated Payment Management

**Feature Branch**: `001-create-bot-configuration`
**Date**: 2025-10-07
**Specification**: [spec.md](./spec.md)
**Status**: Phase 2 Complete (Task Planning Approach Documented)

---

## Execution Flow

```
✅ 1. Parse user description from Input
   → Bot configuration with automatic Telegram sync + automated payment/membership flow
✅ 2. Extract key concepts
   → Actors: SaaS users, end users | Actions: Configure, pay, grant access
✅ 3. Resolve clarifications
   → 7 NEEDS CLARIFICATION resolved (see research.md)
✅ 4. Fill User Scenarios & Testing
   → 9 acceptance scenarios documented
✅ 5. Generate Functional Requirements
   → 37 functional requirements across 5 categories
✅ 6. Identify Key Entities
   → 5 entities: BotConfiguration, MembershipPlan, PaymentTransaction, ChannelMember, BotEventLog
✅ 7. Design data model and contracts
   → data-model.md + 3 OpenAPI contracts + quickstart.md
✅ 8. Document task planning approach
   → Task generation strategy for Phase 3
```

---

## Summary

This feature enables SaaS users (content creators) to configure Telegram bots that automatically process membership payments and grant channel access. When a bot is configured, changes immediately reflect on the live Telegram bot. After creating membership plans (maximum 5 per bot, MNT currency only), the bot becomes fully automated: end users select plans, complete payments via QPay, receive private invite links, and gain channel access without manual intervention.

The system includes comprehensive automation: renewal reminders sent 3 days before expiration, automatic member removal upon expiration, bot permission monitoring with alerts, and payment retry support. All operations are logged for audit trails and debugging.

**Key Capabilities**:
- Real-time bot configuration synchronization to Telegram
- Up to 5 membership plans per bot with flexible pricing/duration
- Automated payment processing via QPay Mongolia (MNT only)
- Single-use private invite link generation with 7-day grace period
- Scheduled membership expiration and renewal reminder jobs
- Bot permission monitoring with dashboard alerts
- Complete audit trail via event logging

---

## Technical Context

**Language/Version**: TypeScript 5.1+ (Node.js 18+)

**Primary Dependencies**: NestJS 10, Telegraf 4.15, TypeORM 0.3, BullMQ, Redis, PostgreSQL; Next.js 14, React 18, Radix UI, TanStack Query 5, Zod 3.25

**Storage**: PostgreSQL 15+ (multi-tenant with RLS), Redis 7.x (caching + BullMQ)

**Testing**: Jest 29, Supertest (API contracts), Playwright 1.55 (E2E)

**Target Platform**: Linux server (backend/worker), Web browsers (Chrome 120+, Firefox 120+, Safari 17+)

**Project Type**: Web application (backend + frontend + worker)

**Performance Goals**: <200ms p95 API latency, 1-hour Telegram cache TTL, 30 req/sec Telegram rate limit

**Constraints**: RLS for multi-tenant isolation, MNT currency only, max 5 plans/bot, single-use invite links, 7-day grace period

**Scale/Scope**: 100 SaaS users, 1000 end users, 4 new tables, ~12 API endpoints, 7 frontend pages, 3 worker jobs

---

## Constitution Check

This plan has been validated against the **Telegram Groups SaaS Platform Constitution v1.2.0** (ratified 2025-01-20).

### Principle I: Multi-Tenancy First ✅ COMPLIANT

**Evidence**:
- All 5 entities include `tenant_id` field with NOT NULL constraint
- RLS policies defined for SELECT, INSERT, UPDATE, DELETE on all tables
- Global TenantInterceptor sets PostgreSQL session variable: `SET LOCAL app.current_tenant`
- Composite indexes on `(tenant_id, ...)` for query optimization
- No manual tenant filtering required (defense-in-depth via RLS)

### Principle II: Test-First Development ✅ COMPLIANT

**Evidence**:
- Contract tests defined first in `contracts/*.openapi.yaml` (3 files, 12 endpoints)
- `quickstart.md` provides 5 test scenarios with curl commands
- TDD workflow documented: Contract tests → fail → implement → pass
- Integration tests planned with real PostgreSQL/Redis (no mocks)
- E2E tests for complete payment flow planned

### Principle III: Type Safety & Linting ✅ COMPLIANT

**Evidence**:
- TypeScript strict mode enabled (no `any` types)
- DTOs with class-validator decorators (`IsEmail`, `MinLength`, etc.)
- Zod schemas for frontend validation
- Entity validation rules documented in `data-model.md`
- Enum types for status fields (payment: pending/completed/failed/refunded)

### Principle IV: Performance & Caching ✅ COMPLIANT

**Evidence**:
- Redis caching documented (cache key pattern: `telegram:{operation}:{identifier}`)
- TTL strategy: 1 hour (metadata), 5 minutes (member count)
- Rate limiting: Token bucket algorithm (30 req/sec per bot)
- Performance target: <200ms p95 API latency
- Composite database indexes with partial indexes for status-based queries

### Principle V: Security by Design ✅ COMPLIANT

**Evidence**:
- JWT authentication with role-based guards (`@UseGuards(JwtAuthGuard, RoleGuard('owner'))`)
- QPay webhook HMAC signature verification (SHA-256)
- Bot token validation before saving (Telegram API `getMe` call)
- Audit logging via `bot_event_logs` table (90-day retention)
- Sensitive field encryption: `bot_token` (AES-256-GCM)
- Idempotency: `qpay_invoice_id` unique constraint

### Principle VI: Pattern Consistency ✅ COMPLIANT

**Evidence**:
- Reference modules analyzed: `user-management`, `telegram-groups`
- Controller pattern: `@Controller('bots')` (global `/v1` prefix in main.ts)
- DTO validation: Class-validator decorators with ApiProperty
- Service layer: Repository pattern with TypeORM
- Error responses: Consistent `{ error: { code, message, details } }` format
- **Deviations**: None

### Principle VII: Error Handling & User Communication ✅ COMPLIANT

**Evidence**:
- Structured error format in `data-model.md` and OpenAPI contracts
- HTTP status codes: 400 (validation), 401 (auth), 403 (bot permission), 409 (duplicate), 422 (business rule), 500 (system)
- User-friendly messages: "Bot token is invalid or revoked. Please verify the token from @BotFather."
- Payment errors include transaction ID for support tracking
- No stack traces exposed (logged with correlation ID)

### Principle VIII: Observability & Monitoring ✅ COMPLIANT

**Evidence**:
- Structured logging: `logger.telegram(operation, metadata, level)` pattern
- Metrics planned: `payments_total`, `telegram_api_calls_total`, `http_request_duration_seconds`
- Correlation IDs: Generated for all requests, passed to services
- Alerts defined: Payment failure rate >5%, API latency p95 >500ms, bot permission lost
- Event logs: All bot/payment operations logged with severity (info/warning/error/critical)

### Summary: ALL GATES PASS ✅

No constitutional violations detected. All 8 principles satisfied.

---

## Project Structure

### Documentation (this feature)
```
specs/001-create-bot-configuration/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (complete)
├── data-model.md        # Phase 1 output (complete)
├── quickstart.md        # Phase 1 output (complete)
├── contracts/           # Phase 1 output (complete)
│   ├── bot-configuration.openapi.yaml
│   ├── membership-plan.openapi.yaml
│   └── payment-webhook.openapi.yaml
└── tasks.md             # Phase 2 output (/tasks command - NOT created yet)
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── modules/
│   │   ├── bot-configuration/       # NEW: Bot CRUD + Telegram sync
│   │   │   ├── bot-configuration.controller.ts
│   │   │   ├── bot-configuration.service.ts
│   │   │   ├── entities/bot-configuration.entity.ts
│   │   │   ├── dto/ (create, update DTOs)
│   │   │   └── __tests__/ (contract, integration tests)
│   │   ├── membership-plan/         # NEW: Plan CRUD + pricing
│   │   │   ├── membership-plan.controller.ts
│   │   │   ├── membership-plan.service.ts
│   │   │   ├── entities/membership-plan.entity.ts
│   │   │   ├── dto/ (create, update DTOs)
│   │   │   └── __tests__/
│   │   ├── payment/                 # NEW: QPay integration + webhooks
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   ├── qpay.service.ts
│   │   │   ├── entities/ (payment-transaction, channel-member)
│   │   │   ├── dto/ (qpay-webhook DTO)
│   │   │   └── __tests__/
│   │   └── telegram-bot/            # NEW: Bot handlers + scenes
│   │       ├── telegram-bot.service.ts
│   │       ├── telegram-api.service.ts
│   │       ├── handlers/ (start, rejoin)
│   │       ├── scenes/ (plan-selection, payment)
│   │       └── __tests__/
│   └── workers/
│       └── jobs/                    # NEW: Background jobs
│           ├── membership-expiration.processor.ts
│           ├── renewal-reminder.processor.ts
│           └── bot-permission-monitor.processor.ts
└── migrations/                      # NEW: 5 tables + RLS policies
    ├── [timestamp]-create-bot-configurations-table.ts
    ├── [timestamp]-create-membership-plans-table.ts
    ├── [timestamp]-create-payment-transactions-table.ts
    ├── [timestamp]-create-channel-members-table.ts
    └── [timestamp]-create-bot-event-logs-table.ts

frontend/
├── app/dashboard/bots/              # NEW: Bot management pages
│   ├── page.tsx                    # Bot list
│   ├── create/page.tsx             # Create bot
│   ├── [id]/edit/page.tsx          # Edit bot
│   ├── [id]/plans/page.tsx         # Plan list
│   ├── [id]/plans/create/page.tsx  # Create plan
│   ├── [id]/plans/[planId]/edit/page.tsx  # Edit plan
│   └── [id]/payments/page.tsx      # Payment history
├── components/bot-management/       # NEW: Bot UI components
│   ├── BotConfigurationForm.tsx
│   ├── BotList.tsx
│   ├── BotCard.tsx
│   ├── MembershipPlanForm.tsx
│   ├── PlanList.tsx
│   ├── PlanCard.tsx
│   ├── PaymentHistory.tsx
│   └── EventLogViewer.tsx
├── lib/api/                         # NEW: API clients
│   ├── bots.ts                     # Bot CRUD with React Query
│   ├── plans.ts                    # Plan CRUD with React Query
│   └── payments.ts                 # Payment queries with React Query
└── tests/e2e/                       # NEW: E2E tests
    ├── bot-configuration.spec.ts
    ├── membership-plan.spec.ts
    ├── payment-flow.spec.ts
    └── expiration.spec.ts
```

**Structure Decision**: Web application (backend + frontend + worker monorepo). Backend REST API for SaaS user dashboard, frontend Next.js app, background worker for scheduled jobs. Telegram bot runs as part of backend (webhook mode). Shared codebase simplifies deployment and type sharing.

---

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

All 7 NEEDS CLARIFICATION items from `spec.md` resolved in `research.md`:

1. **FR-002: Bot Configuration Synchronization** → Immediate sync with 5s timeout
2. **FR-004: Configuration History** → Store in `bot_event_logs`, 90-day retention
3. **FR-005: Staging/Preview Mode** → Deferred (out of MVP scope)
4. **FR-017: Payment Webhook Retry** → 3 retries with exponential backoff (1s, 5s, 15s)
5. **FR-022: Refunds & Disputes** → Out of MVP scope (manual handling)
6. **FR-037: Additional Bot Commands** → MVP: `/start`, `/rejoin` only
7. **Edge Case: Invalid Bot Token** → Detect on first API call failure (401)

Research completed on: QPay integration, Telegraf patterns, Telegram invite links, BullMQ jobs, RLS policies, rate limiting.

**Output**: research.md (500+ lines) with all decisions documented

---

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

### Data Model Design

**File**: `data-model.md` (470+ lines)

**Entities Defined**: 5 tables
1. **BotConfiguration** (12 fields) - Bot settings, token, channel ID, sync status
2. **MembershipPlan** (10 fields) - Plan name, price (MNT), duration, sort order
3. **PaymentTransaction** (17 fields) - QPay invoice, status, amount, expiration
4. **ChannelMember** (13 fields) - Membership status, invite link, expiration
5. **BotEventLog** (8 fields) - Audit trail, event data (JSONB), severity

**RLS Policies**: All tables have SELECT, INSERT, UPDATE, DELETE policies scoped by `tenant_id`

**Performance**: Composite indexes on `(tenant_id, frequently_queried_column)`, partial indexes for status queries

### API Contracts

**OpenAPI Specifications**: 3 files, 12 endpoints total

1. **bot-configuration.openapi.yaml** (696 lines)
   - GET /v1/bots (list), POST /v1/bots (create), GET /v1/bots/{id} (get), PUT /v1/bots/{id} (update), DELETE /v1/bots/{id} (delete), GET /v1/bots/{id}/events (logs)

2. **membership-plan.openapi.yaml** (~500 lines estimated)
   - GET /v1/bots/{botId}/plans (list), POST /v1/bots/{botId}/plans (create), GET/PUT/DELETE /v1/bots/{botId}/plans/{id}

3. **payment-webhook.openapi.yaml** (~300 lines estimated)
   - POST /v1/webhooks/qpay (HMAC verification)

### Quickstart Test Scenarios

**File**: `quickstart.md` (761 lines)

5 complete test scenarios with curl commands:
1. Bot Configuration Synchronization (create → update → verify sync)
2. Membership Plan Creation (3 plans → test 5-plan limit)
3. Automated Payment & Access Grant (payment → invite link → channel access)
4. Payment Failure Handling (failed payment → retry → invalid signature)
5. Membership Expiration & Renewal (reminder → expiration → removal)

### CLAUDE.md Updates

**Status**: ✅ COMPLETE - Feature context added to project guidelines

### Post-Design Constitution Check

**Status**: ✅ PASS (no new violations)

---

## Phase 2: Task Planning Approach

**Status**: ✅ COMPLETE (Phase 3 will generate tasks.md)

### Task Generation Strategy

When `/tasks` command is executed, tasks will be generated from Phase 1 artifacts:

**Input Sources**: `data-model.md`, `contracts/*.openapi.yaml`, `quickstart.md`, `research.md`

**Task Generation Steps** (12 phases):

1. **Database Migrations** (sequential) - 6 tasks: 5 tables + RLS policies
2. **Entities & DTOs** (parallel [P]) - 15 tasks: entities + create/update DTOs
3. **Contract Tests** (parallel [P]) - 12 tasks: 1 per endpoint
4. **Services & Controllers** (module-sequential) - 9 tasks: bot, plan, payment, qpay, telegram-bot services + controllers
5. **Bot Handlers** (sequential) - 4 tasks: /start, /rejoin handlers + scenes
6. **Integration Tests** (parallel [P]) - 6 tasks: major flows
7. **Worker Jobs** (sequential) - 3 tasks: expiration, renewal, permission monitor
8. **Frontend API Clients** (parallel [P]) - 3 tasks: bots, plans, payments
9. **Frontend Components** (parallel [P]) - 8 tasks: forms, lists, cards, viewers
10. **Frontend Pages** (sequential) - 7 tasks: bot pages + plan pages
11. **E2E Tests** (parallel [P]) - 4 tasks: major scenarios
12. **Module Registration** (sequential) - 1 task: wire up in app.module.ts

**Ordering Principles**: Migrations → Entities → Services → Controllers → Integration → Worker → Frontend → E2E → Integration

**Estimated Output**: 75-85 numbered tasks in tasks.md, ~40% parallelizable (marked [P])

**IMPORTANT**: This phase is executed by the `/tasks` command, NOT by `/plan`

---

## Phase 3+: Future Implementation

**Phase 3**: Task generation (`/tasks` command creates tasks.md)
**Phase 4**: Implementation (TDD cycle: contract test fail → implement → pass → refactor)
**Phase 5**: Validation (run tests, execute quickstart.md, verify performance)

---

## Complexity Tracking

**Status**: No violations detected

| Deviation | Justification | Complexity Rating | Mitigation |
|-----------|---------------|-------------------|------------|
| (none) | - | - | - |

---

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete
- [x] Phase 1: Design complete
- [x] Phase 2: Task planning complete (approach described)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---

*Based on Constitution v1.2.0 - See `.specify/memory/constitution.md`*
