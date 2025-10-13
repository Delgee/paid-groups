# Implementation Plan: Telegram Bot Onboarding for SaaS Users

**Branch**: `002-in-this-app` | **Date**: 2025-01-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-in-this-app/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded from /specs/002-in-this-app/spec.md
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ All clarifications resolved in spec (5 questions answered)
   → ✅ Project Type detected: Web application (backend + frontend)
3. Fill Constitution Check section
   → ✅ Evaluated against Constitution v1.2.0
4. Evaluate Constitution Check section
   → ✅ No constitutional violations identified
   → ✅ Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   → ✅ Completed: All technical unknowns resolved
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ Completed: All design artifacts generated
7. Re-evaluate Constitution Check section
   → ✅ Post-design check: Still PASS (no new violations)
   → ✅ Progress Tracking: Post-Design Constitution Check PASS
8. Plan Phase 2 → Describe task generation approach
   → ✅ Completed below in "Phase 2: Task Planning Approach"
9. STOP - Ready for /tasks command
   → ✅ Plan complete, ready for task generation
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

---

## Summary

**Primary Requirement**: Enable content creators (SaaS users) to register for the platform and set up paid Telegram groups entirely through a conversational Telegram bot, providing a faster and more mobile-friendly alternative to web-based onboarding.

**Technical Approach**:
- Leverage existing Telegraf bot framework for conversational flows
- Use Redis for 1-hour session state management
- Create 2 new persistent entities (TelegramUserAccount, BotCommand) + 1 transient (OnboardingSession)
- Integrate with existing auth, project, telegram-groups, and membership-plan modules
- Follow TDD workflow with contract tests first
- Implement rate limiting (20 cmd/min/user) and multi-tenant isolation via RLS

**Value Proposition**: 50% faster onboarding (5 min vs 10-15 min), mobile-friendly, no password/email verification required, Telegram-native experience.

---

## Technical Context

**Language/Version**: TypeScript 5.x (NestJS backend), TypeScript 5.x + React (Next.js 14 frontend)
**Primary Dependencies**:
  - Backend: NestJS 10.x, Telegraf 4.x, PostgreSQL 14.x, Redis 7.x, TypeORM, BullMQ
  - Frontend: Next.js 14, React 18, Tailwind CSS, Shadcn/UI
**Storage**: PostgreSQL with Row-Level Security (RLS), Redis for sessions and caching
**Testing**: Jest 29.x + Supertest (backend), Playwright (E2E frontend)
**Target Platform**: Node.js 18+ on Linux server (Docker), modern browsers
**Project Type**: Web application (backend + frontend)
**Performance Goals**:
  - Bot response time <3s (95th percentile)
  - Telegram API validation <5s
  - Support 50 concurrent onboarding sessions
**Constraints**:
  - Multi-tenant isolation (RLS enforcement)
  - Rate limiting: 20 commands/minute per user
  - Session timeout: 1 hour of inactivity
**Scale/Scope**:
  - 1000+ SaaS users
  - 50+ concurrent onboarding sessions
  - 2 new database tables, 1 new module

---

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Research) ✅ PASS

#### Principle I: Multi-Tenancy First
- ✅ **COMPLIANT**: TelegramUserAccount table will include FK to users(tenant_id)
- ✅ **COMPLIANT**: RLS policies planned for both new tables
- ✅ **COMPLIANT**: TenantInterceptor will set session context for all queries
- ✅ **COMPLIANT**: Bot-created tenants follow same isolation rules as web

#### Principle II: Test-First Development
- ✅ **COMPLIANT**: Contract tests for webhook endpoint planned first
- ✅ **COMPLIANT**: Service contract tests before implementation
- ✅ **COMPLIANT**: No mocks for PostgreSQL/Redis (real dependencies)
- ✅ **COMPLIANT**: E2E tests defined in quickstart.md

#### Principle III: Type Safety & Linting
- ✅ **COMPLIANT**: All new services will use strict TypeScript
- ✅ **COMPLIANT**: Zod schemas for all user inputs (email, bot token, etc.)
- ✅ **COMPLIANT**: No `any` types planned, only specific interfaces

#### Principle IV: Performance & Caching
- ✅ **COMPLIANT**: Redis caching for session state (1-hour TTL)
- ✅ **COMPLIANT**: Redis used for rate limiting (token bucket)
- ✅ **COMPLIANT**: Telegram API validation results not cached (one-time operations)
- ✅ **COMPLIANT**: Performance targets defined (< 3s bot response, < 5s API calls)

#### Principle V: Security by Design
- ✅ **COMPLIANT**: Bot tokens encrypted before storage (existing EncryptionService)
- ✅ **COMPLIANT**: Email verification for account linking (6-digit codes, 10-min TTL)
- ✅ **COMPLIANT**: Rate limiting enforced (20 cmd/min/user)
- ✅ **COMPLIANT**: Audit logging via BotCommand table
- ✅ **COMPLIANT**: Input validation with Zod schemas

#### Principle VI: Pattern Consistency
- ✅ **COMPLIANT**: Following existing bot module patterns (Telegraph, Redis, rate limiting)
- ✅ **COMPLIANT**: Service layer structure matches existing modules (auth, telegram-groups)
- ✅ **COMPLIANT**: DTOs follow existing validation patterns
- ✅ **COMPLIANT**: Test structure matches existing contract/integration/e2e patterns

#### Principle VII: Error Handling & User Communication
- ✅ **COMPLIANT**: Error responses follow constitution format:
  ```typescript
  { error: { code: 'INVALID_BOT_TOKEN', message: 'Invalid bot token. Please check and try again.', details: {} } }
  ```
- ✅ **COMPLIANT**: HTTP status codes: 400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 429 rate limit, 500 system error
- ✅ **COMPLIANT**: User-friendly error messages without exposing internals
- ✅ **COMPLIANT**: Stack traces never exposed to users

#### Principle VIII: Observability & Monitoring
- ✅ **COMPLIANT**: Correlation IDs for all bot interactions
- ✅ **COMPLIANT**: Structured logging with logger.telegram() method
- ✅ **COMPLIANT**: Metrics planned:
  - `onboarding_bot_commands_total{command, status}`
  - `onboarding_registrations_total{status}`
  - `onboarding_session_duration_seconds`
- ✅ **COMPLIANT**: Log levels: INFO (commands), WARN (rate limits), ERROR (failures)

### Post-Design Check (After Phase 1) ✅ PASS

#### Data Model Review
- ✅ **COMPLIANT**: No new constitutional violations introduced
- ✅ **COMPLIANT**: RLS policies defined for both new tables
- ✅ **COMPLIANT**: Foreign key constraints enforce referential integrity
- ✅ **COMPLIANT**: Indexes support expected query patterns

#### Contract Review
- ✅ **COMPLIANT**: Error responses follow constitutional format
- ✅ **COMPLIANT**: Service interfaces use strong typing
- ✅ **COMPLIANT**: No `any` types in contracts

#### Quickstart Review
- ✅ **COMPLIANT**: All 7 test scenarios follow TDD principles
- ✅ **COMPLIANT**: Error handling validated in scenario 7
- ✅ **COMPLIANT**: Performance validation included
- ✅ **COMPLIANT**: Multi-tenant isolation verified

---

## Project Structure

### Documentation (this feature)
```
specs/002-in-this-app/
├── spec.md              # Feature specification (input)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output - technical decisions
├── data-model.md        # Phase 1 output - entity definitions
├── quickstart.md        # Phase 1 output - integration test scenarios
├── contracts/           # Phase 1 output - API contracts
│   ├── webhook-contract.yaml       # Telegram webhook endpoint
│   └── service-contracts.yaml      # Internal service interfaces
└── tasks.md             # Phase 2 output (/tasks command - NOT YET CREATED)
```

### Source Code (repository root)

```
backend/
├── src/
│   ├── modules/
│   │   ├── onboarding-bot/                # NEW MODULE
│   │   │   ├── onboarding-bot.module.ts
│   │   │   ├── onboarding-bot.controller.ts   # Webhook endpoint
│   │   │   ├── onboarding-bot.service.ts      # Business logic
│   │   │   ├── onboarding-session.service.ts  # Redis session management
│   │   │   ├── telegram-user-account.service.ts  # Account linking
│   │   │   ├── bot-command-logger.service.ts   # Audit logging
│   │   │   ├── entities/
│   │   │   │   ├── telegram-user-account.entity.ts
│   │   │   │   └── bot-command.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── register-user.dto.ts
│   │   │   │   ├── link-account.dto.ts
│   │   │   │   ├── create-project.dto.ts
│   │   │   │   ├── connect-group.dto.ts
│   │   │   │   ├── create-plan.dto.ts
│   │   │   │   └── telegram-update.dto.ts
│   │   │   ├── handlers/
│   │   │   │   ├── registration.handler.ts
│   │   │   │   ├── project-creation.handler.ts
│   │   │   │   ├── group-connection.handler.ts
│   │   │   │   ├── plan-creation.handler.ts
│   │   │   │   ├── account-linking.handler.ts
│   │   │   │   └── status.handler.ts
│   │   │   └── __tests__/
│   │   │       ├── onboarding-bot.service.spec.ts
│   │   │       ├── onboarding-session.service.spec.ts
│   │   │       └── telegram-user-account.service.spec.ts
│   │   ├── auth/                  # EXISTING - will integrate
│   │   ├── project/               # EXISTING - will integrate
│   │   ├── telegram-groups/       # EXISTING - will integrate
│   │   └── membership/            # EXISTING - will integrate
│   └── integrations/
│       └── telegram/              # EXISTING - will use
└── test/
    ├── contract/onboarding-bot/           # NEW CONTRACT TESTS
    │   ├── webhook.contract.spec.ts
    │   ├── registration.contract.spec.ts
    │   ├── project-creation.contract.spec.ts
    │   ├── group-connection.contract.spec.ts
    │   └── plan-creation.contract.spec.ts
    └── integration/onboarding-bot/        # NEW INTEGRATION TESTS
        ├── registration-flow.integration.spec.ts
        ├── session-management.integration.spec.ts
        ├── rate-limiting.integration.spec.ts
        └── multi-tenant-isolation.integration.spec.ts

frontend/
├── app/dashboard/
│   └── (existing web dashboard - no changes needed for v1)
└── (no frontend changes required - bot-only feature)

migrations/
└── {timestamp}-create-onboarding-bot-tables.ts  # NEW MIGRATION
```

**Structure Decision**: This is a **web application** project with separate backend and frontend directories. The new onboarding bot feature is backend-only (no frontend UI changes required in v1). The bot integrates with existing modules (auth, project, telegram-groups, membership) and follows the established NestJS module pattern.

---

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

**Output**: [research.md](./research.md)

### Key Decisions Made

1. **Bot Framework**: Telegraf 4.x (already in use)
2. **Session Storage**: Redis with 1-hour TTL
3. **State Machine**: Step-based routing with SessionStep enum
4. **Email Verification**: 6-digit codes, 10-min TTL, rate-limited
5. **Bot Token Validation**: Direct Telegram API `getMe` call
6. **Permission Verification**: Telegram `getChatMember` API
7. **Rate Limiting**: Token bucket algorithm, 20 cmd/min/user, Redis-backed
8. **Multi-Tenant Isolation**: Existing RLS policies + TenantInterceptor
9. **Logging**: Structured logging with correlation IDs, `logger.telegram()` method
10. **Testing**: TDD workflow, no mocks for PostgreSQL/Redis

### Technology Stack Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Bot Framework | Telegraf | 4.x | Already in use, TypeScript-first |
| Session Storage | Redis | 7.x | Fast, TTL support, existing infra |
| Database | PostgreSQL + RLS | 14.x | Multi-tenant isolation |
| Email Service | NodeMailer | Existing | Already configured |
| Rate Limiting | Redis + Token Bucket | Custom | Constitution-compliant |
| Testing | Jest + Supertest | 29.x | Project standard |
| Logging | Winston | Existing | Structured logging |

---

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

**Outputs**:
- [data-model.md](./data-model.md) - 2 persistent + 1 transient entity
- [contracts/webhook-contract.yaml](./contracts/webhook-contract.yaml) - Telegram webhook API
- [contracts/service-contracts.yaml](./contracts/service-contracts.yaml) - Internal service interfaces
- [quickstart.md](./quickstart.md) - 7 integration test scenarios
- CLAUDE.md updated with feature context

### Entity Summary

1. **TelegramUserAccount** (persistent)
   - Links Telegram users to platform Users
   - Bidirectional mapping: telegram_user_id ↔ user_id
   - RLS enforced via users.tenant_id FK

2. **BotCommand** (persistent)
   - Audit log for all bot interactions
   - Analytics + debugging support
   - Retention: same as web audit logs

3. **OnboardingSession** (transient, Redis)
   - Tracks multi-step conversation state
   - TTL: 1 hour (3600 seconds)
   - 16 possible SessionStep values

### Service Interfaces

1. **IOnboardingBotService** - Business logic coordination
2. **IOnboardingSessionService** - Redis session management
3. **ITelegramUserAccountService** - Account linking
4. **IBotCommandLogger** - Audit logging

### Contract Tests Planned

- `/v1/onboarding-bot/webhook/:botToken` - Telegram update webhook
- Registration flow contract
- Project creation contract
- Group connection contract
- Plan creation contract

### Integration Test Scenarios

7 comprehensive scenarios in quickstart.md:
1. New user registration
2. Project creation with bot token
3. Group connection with permission verification
4. Membership plan creation
5. Account linking (existing web user)
6. Status command
7. Error handling & edge cases (7 sub-scenarios)

---

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

The `/tasks` command will load the `.specify/templates/tasks-template.md` and generate ordered tasks based on Phase 1 design artifacts.

**Source Material**:
- `data-model.md` → Entity/migration tasks
- `contracts/` → Contract test tasks
- `quickstart.md` → Integration test tasks
- `research.md` → Implementation guidance

**Task Categories** (TDD order):

1. **Database Setup** (Foundation)
   - [P] T001: Create migration for telegram_user_accounts table
   - [P] T002: Create migration for bot_commands table
   - [P] T003: Apply RLS policies to new tables

2. **Contract Tests** (Tests First, Per Constitution)
   - [P] T004: Write webhook endpoint contract test (MUST FAIL)
   - [P] T005: Write registration service contract test (MUST FAIL)
   - [P] T006: Write project creation service contract test (MUST FAIL)
   - [P] T007: Write group connection service contract test (MUST FAIL)
   - [P] T008: Write plan creation service contract test (MUST FAIL)

3. **Entity Layer** (Foundation for Services)
   - [P] T009: Create TelegramUserAccount entity
   - [P] T010: Create BotCommand entity
   - [P] T011: Define OnboardingSession interface (TypeScript)
   - [P] T012: Create DTOs (RegisterUserDto, CreateProjectDto, etc.)

4. **Core Services** (Business Logic)
   - T013: Implement OnboardingSessionService (Redis operations)
   - T014: Implement TelegramUserAccountService (CRUD operations)
   - T015: Implement BotCommandLogger (async logging)
   - T016: Implement OnboardingBotService (coordination layer)

5. **Bot Handlers** (Command Processing)
   - T017: Implement RegistrationHandler (/start → REGISTRATION flow)
   - T018: Implement ProjectCreationHandler (/newproject flow)
   - T019: Implement GroupConnectionHandler (/addgroup flow)
   - T020: Implement PlanCreationHandler (/createplan flow)
   - T021: Implement AccountLinkingHandler (/link flow)
   - T022: Implement StatusHandler (/status command)
   - T023: Implement HelpHandler (/help command)
   - T024: Implement CancelHandler (/cancel command)

6. **Rate Limiting** (Security)
   - T025: Implement rate limiting middleware (token bucket, Redis)
   - T026: Add rate limit tests

7. **Webhook Controller** (Entry Point)
   - T027: Implement OnboardingBotController (webhook endpoint)
   - T028: Implement bot token validation middleware
   - T029: Implement Telegram signature verification

8. **Integration Tests** (End-to-End Validation)
   - T030: Write registration flow integration test
   - T031: Write project creation integration test
   - T032: Write group connection integration test
   - T033: Write plan creation integration test
   - T034: Write account linking integration test
   - T035: Write session timeout integration test
   - T036: Write rate limiting integration test
   - T037: Write multi-tenant isolation integration test

9. **Error Handling** (Per Constitution Principle VII)
   - T038: Implement error response formatters
   - T039: Add error handling tests for all 7 edge cases
   - T040: Validate error messages are user-friendly

10. **Module Integration** (NestJS Wiring)
    - T041: Create OnboardingBotModule
    - T042: Register module in app.module.ts
    - T043: Configure Telegraf bot instance
    - T044: Set up webhook route in main.ts

11. **Observability** (Per Constitution Principle VIII)
    - T045: Add structured logging to all services
    - T046: Implement correlation ID middleware
    - T047: Add Prometheus metrics endpoints
    - T048: Create monitoring dashboard config

12. **Validation & Cleanup** (Final Steps)
    - T049: Run quickstart.md scenarios (all 7 must pass)
    - T050: Verify performance targets (<3s response, <5s API calls)
    - T051: Run lint + type-check (must pass)
    - T052: Update CLAUDE.md with implementation status
    - T053: Write feature completion summary

### Ordering Strategy

**Dependencies**:
- Database migrations → Entities → Services → Handlers → Controller
- Contract tests → Implementation (per TDD)
- Integration tests → After services implemented

**Parallel Execution** [P]:
- Tasks marked [P] can run in parallel (independent files)
- Example: All contract tests can be written simultaneously
- Example: All entity files can be created simultaneously

**Sequential**:
- Controller depends on handlers
- Handlers depend on services
- Services depend on entities
- Entities depend on migrations

### Estimated Task Count

**Total**: ~53 tasks

**Breakdown**:
- Database: 3 tasks
- Contract Tests: 5 tasks (parallel)
- Entity Layer: 4 tasks (parallel)
- Core Services: 4 tasks
- Bot Handlers: 8 tasks
- Rate Limiting: 2 tasks
- Webhook Controller: 3 tasks
- Integration Tests: 8 tasks
- Error Handling: 3 tasks
- Module Integration: 4 tasks
- Observability: 4 tasks
- Validation: 5 tasks

**Estimated Duration**:
- With parallelization: 15-20 working days for 1 developer
- Critical path: Database → Entities → Services → Handlers → Controller → Tests

---

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md with detailed task breakdown)

**Phase 4**: Implementation (execute tasks.md following TDD workflow)
- Write failing contract test
- Implement minimal code to pass test
- Refactor while keeping tests green
- Move to next task

**Phase 5**: Validation
- Execute quickstart.md scenarios (all 7 must pass)
- Performance validation (response times, concurrency)
- Security validation (RLS, rate limiting, encryption)
- Lint + type-check (zero errors)
- Update documentation with final implementation notes

---

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: ✅ NO VIOLATIONS

This feature fully complies with all constitutional principles. No complexity tracking needed.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

---

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command) - **NEXT STEP**
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (5 clarifications from spec)
- [x] Complexity deviations documented (N/A - no violations)

**Artifacts Generated**:
- [x] research.md (Phase 0)
- [x] data-model.md (Phase 1)
- [x] contracts/webhook-contract.yaml (Phase 1)
- [x] contracts/service-contracts.yaml (Phase 1)
- [x] quickstart.md (Phase 1)
- [x] CLAUDE.md updated (Phase 1)
- [x] plan.md (this file)
- [ ] tasks.md (**Next**: run `/tasks` command)

---

## Next Steps

1. **Run `/tasks` command** to generate detailed task breakdown in `tasks.md`
2. **Begin TDD implementation**:
   - Start with T004 (webhook contract test)
   - Follow red-green-refactor cycle
   - Run tests frequently
3. **Track progress** via tasks.md checkboxes
4. **Validate incrementally** using quickstart.md scenarios
5. **Monitor** constitutional compliance during implementation

---

*Based on Constitution v1.2.0 - See `.specify/memory/constitution.md`*
*Feature Spec: [spec.md](./spec.md)*
*Research: [research.md](./research.md)*
*Data Model: [data-model.md](./data-model.md)*
*Contracts: [contracts/](./contracts/)*
*Quickstart: [quickstart.md](./quickstart.md)*
