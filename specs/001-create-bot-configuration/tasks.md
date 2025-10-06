# Tasks: Bot Configuration & Automated Payment Management

**Feature**: 001-create-bot-configuration
**Input**: Design documents from `/specs/001-create-bot-configuration/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow

```
✅ 1. Load plan.md → Tech stack: NestJS 10, Next.js 14, Telegraf 4.15, TypeORM, BullMQ
✅ 2. Load design documents:
   → data-model.md: 5 entities (BotConfiguration, MembershipPlan, PaymentTransaction, ChannelMember, BotEventLog)
   → contracts/: 3 files, 12 endpoints total
   → research.md: QPay integration, Telegraf patterns, RLS policies
✅ 3. Generate 82 tasks across 6 phases
✅ 4. Apply rules: Tests before implementation, [P] for different files
✅ 5. Number tasks sequentially (T001-T082)
✅ 6. Dependencies documented
✅ 7. Parallel execution examples provided
✅ 8. Validation: All contracts tested, all entities modeled, TDD enforced
```

---

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute from repository root
- Complete task before moving to next

---

## Phase 3.1: Database Setup (Sequential)

**Dependencies**: None
**Estimated Time**: 2-3 hours

- [ ] **T001** Create migration: `bot_configurations` table
  **File**: `backend/src/database/migrations/[timestamp]-create-bot-configurations-table.ts`
  **Details**: 12 fields (id, tenant_id, bot_token, bot_username, display_name, description, welcome_message, channel_id, channel_username, is_active, last_sync_at, created_at, updated_at), indexes on (tenant_id), (tenant_id, is_active), (bot_token UNIQUE), (channel_id WHERE NOT NULL)

- [ ] **T002** Add RLS policies to `bot_configurations` table
  **File**: Same migration file as T001
  **Details**: Enable RLS, create 4 policies (SELECT, INSERT, UPDATE, DELETE) scoped by `current_setting('app.current_tenant')`

- [ ] **T003** Create migration: `membership_plans` table
  **File**: `backend/src/database/migrations/[timestamp]-create-membership-plans-table.ts`
  **Details**: 10 fields (id, tenant_id, bot_configuration_id FK, name, description, price INTEGER CHECK > 0, duration_days INTEGER CHECK > 0, is_active, sort_order, created_at, updated_at), indexes on (bot_configuration_id, is_active), (tenant_id)

- [ ] **T004** Add RLS policies to `membership_plans` table
  **File**: Same migration file as T003
  **Details**: Enable RLS, create 4 policies scoped by tenant_id

- [ ] **T005** Create migration: `payment_transactions` table
  **File**: `backend/src/database/migrations/[timestamp]-create-payment-transactions-table.ts`
  **Details**: 17 fields including qpay_invoice_id (UNIQUE), qpay_transaction_id, status ENUM, amount, snapshot_plan_name, snapshot_price, snapshot_duration_days, membership_starts_at, membership_expires_at, indexes on (tenant_id, status, created_at DESC), (qpay_invoice_id UNIQUE), (telegram_user_id, status)

- [ ] **T006** Add RLS policies to `payment_transactions` table
  **File**: Same migration file as T005
  **Details**: Enable RLS, create 4 policies scoped by tenant_id

- [ ] **T007** Create migration: `channel_members` table
  **File**: `backend/src/database/migrations/[timestamp]-create-channel-members-table.ts`
  **Details**: 13 fields including transaction_id (UNIQUE FK), telegram_user_id, channel_id, invite_link, status ENUM ('active', 'expired', 'revoked'), joined_at, expires_at, renewal_reminder_sent_at, removed_at, indexes on (tenant_id, status, expires_at), (telegram_user_id, channel_id, status), (transaction_id UNIQUE)

- [ ] **T008** Add RLS policies to `channel_members` table
  **File**: Same migration file as T007
  **Details**: Enable RLS, create 4 policies scoped by tenant_id

- [ ] **T009** Create migration: `bot_event_logs` table
  **File**: `backend/src/database/migrations/[timestamp]-create-bot-event-logs-table.ts`
  **Details**: 8 fields including bot_configuration_id FK (ON DELETE CASCADE), event_type ENUM, event_data JSONB, correlation_id UUID, severity ENUM, occurred_at, indexes on (bot_configuration_id, occurred_at DESC), (tenant_id, event_type, occurred_at DESC), (correlation_id)

- [ ] **T010** Add RLS policies to `bot_event_logs` table
  **File**: Same migration file as T009
  **Details**: Enable RLS, create 4 policies scoped by tenant_id

---

## Phase 3.2: TypeORM Entities (Parallel ✅)

**Dependencies**: T001-T010 complete
**Estimated Time**: 3-4 hours

- [ ] **T011 [P]** Create BotConfiguration entity
  **File**: `backend/src/modules/bot-configuration/entities/bot-configuration.entity.ts`
  **Details**: TypeORM entity with @Entity(), @Column(), @ManyToOne(tenant), @OneToMany(membershipPlans, botEventLogs), validation decorators, toJSON method (exclude bot_token)

- [ ] **T012 [P]** Create MembershipPlan entity
  **File**: `backend/src/modules/membership-plan/entities/membership-plan.entity.ts`
  **Details**: TypeORM entity with @ManyToOne(botConfiguration), @OneToMany(paymentTransactions), price/duration validation

- [ ] **T013 [P]** Create PaymentTransaction entity
  **File**: `backend/src/modules/payment/entities/payment-transaction.entity.ts`
  **Details**: TypeORM entity with @ManyToOne(membershipPlan), @OneToOne(channelMember), status enum, qpay fields, snapshot fields

- [ ] **T014 [P]** Create ChannelMember entity
  **File**: `backend/src/modules/payment/entities/channel-member.entity.ts`
  **Details**: TypeORM entity with @OneToOne(paymentTransaction), status enum, expiration tracking fields

- [ ] **T015 [P]** Create BotEventLog entity
  **File**: `backend/src/modules/bot-configuration/entities/bot-event-log.entity.ts`
  **Details**: TypeORM entity with @ManyToOne(botConfiguration), event_type enum, event_data JSONB, correlation_id

---

## Phase 3.3: DTOs (Parallel ✅)

**Dependencies**: None (DTOs independent of entities)
**Estimated Time**: 2-3 hours

- [ ] **T016 [P]** Create CreateBotConfigurationDto
  **File**: `backend/src/modules/bot-configuration/dto/create-bot-configuration.dto.ts`
  **Details**: Class-validator decorators (@IsString, @Matches for bot_token regex, @IsOptional for description/channel), @ApiProperty for OpenAPI docs

- [ ] **T017 [P]** Create UpdateBotConfigurationDto
  **File**: `backend/src/modules/bot-configuration/dto/update-bot-configuration.dto.ts`
  **Details**: Extends PartialType(CreateBotConfigurationDto), @IsOptional on all fields, @IsBoolean for is_active

- [ ] **T018 [P]** Create GetBotConfigurationsDto
  **File**: `backend/src/modules/bot-configuration/dto/get-bot-configurations.dto.ts`
  **Details**: Pagination DTO with page, limit, is_active filter

- [ ] **T019 [P]** Create CreateMembershipPlanDto
  **File**: `backend/src/modules/membership-plan/dto/create-membership-plan.dto.ts`
  **Details**: @IsString for name, @IsInt @Min(1) for price/duration_days, @IsOptional for description

- [ ] **T020 [P]** Create UpdateMembershipPlanDto
  **File**: `backend/src/modules/membership-plan/dto/update-membership-plan.dto.ts`
  **Details**: Extends PartialType(CreateMembershipPlanDto), all fields optional

- [ ] **T021 [P]** Create GetMembershipPlansDto
  **File**: `backend/src/modules/membership-plan/dto/get-membership-plans.dto.ts`
  **Details**: is_active filter, sort_order ordering

- [ ] **T022 [P]** Create QPayWebhookDto
  **File**: `backend/src/modules/payment/dto/qpay-webhook.dto.ts`
  **Details**: Fields for invoice_id, transaction_id, status enum, amount, payment_method, timestamp, signature; Zod schema validation

---

## Phase 3.4: Contract Tests (Parallel ✅) ⚠️ MUST FAIL INITIALLY

**Dependencies**: T016-T022 (DTOs for request/response schemas)
**Estimated Time**: 4-5 hours
**CRITICAL**: These tests MUST be written and MUST FAIL before ANY service/controller implementation

- [ ] **T023 [P]** Contract test: POST /v1/bots
  **File**: `backend/test/contract/bot-configuration/bot-create.contract.spec.ts`
  **Details**: Test 201 with valid data, 400 with invalid bot_token format, 409 with duplicate name, 422 with invalid Telegram token, verify response schema matches BotConfiguration entity

- [ ] **T024 [P]** Contract test: GET /v1/bots
  **File**: `backend/test/contract/bot-configuration/bot-list.contract.spec.ts`
  **Details**: Test 200 with pagination, is_active filter, verify array schema, pagination metadata

- [ ] **T025 [P]** Contract test: GET /v1/bots/:id
  **File**: `backend/test/contract/bot-configuration/bot-get.contract.spec.ts`
  **Details**: Test 200 with valid ID, 404 with non-existent ID, 403 with other tenant's bot

- [ ] **T026 [P]** Contract test: PUT /v1/bots/:id
  **File**: `backend/test/contract/bot-configuration/bot-update.contract.spec.ts`
  **Details**: Test 200 with valid update, 404 with non-existent ID, 422 with admin permission missing

- [ ] **T027 [P]** Contract test: DELETE /v1/bots/:id
  **File**: `backend/test/contract/bot-configuration/bot-delete.contract.spec.ts`
  **Details**: Test 204 on success, 404 with non-existent ID, verify cascade deletion of plans

- [ ] **T028 [P]** Contract test: GET /v1/bots/:id/events
  **File**: `backend/test/contract/bot-configuration/bot-events.contract.spec.ts`
  **Details**: Test 200 with pagination, event_type filter, verify event log schema

- [ ] **T029 [P]** Contract test: POST /v1/bots/:botId/plans
  **File**: `backend/test/contract/membership-plan/plan-create.contract.spec.ts`
  **Details**: Test 201 with valid data, 409 when exceeding 5-plan limit, 400 with price <= 0

- [ ] **T030 [P]** Contract test: GET /v1/bots/:botId/plans
  **File**: `backend/test/contract/membership-plan/plan-list.contract.spec.ts`
  **Details**: Test 200 with is_active filter, sort_order ordering, verify array schema

- [ ] **T031 [P]** Contract test: GET /v1/plans/:id
  **File**: `backend/test/contract/membership-plan/plan-get.contract.spec.ts`
  **Details**: Test 200 with valid ID, 404 with non-existent ID

- [ ] **T032 [P]** Contract test: PUT /v1/plans/:id
  **File**: `backend/test/contract/membership-plan/plan-update.contract.spec.ts`
  **Details**: Test 200 with valid update (note: existing members retain old pricing), 404 with non-existent ID

- [ ] **T033 [P]** Contract test: DELETE /v1/plans/:id
  **File**: `backend/test/contract/membership-plan/plan-delete.contract.spec.ts`
  **Details**: Test 204 on success, 404 with non-existent ID, verify soft delete (is_active = false)

- [ ] **T034 [P]** Contract test: POST /v1/webhooks/qpay
  **File**: `backend/test/contract/payment-webhook/qpay-webhook.contract.spec.ts`
  **Details**: Test 200 with valid HMAC signature, 400 with invalid signature, 422 with unknown invoice_id, test idempotency (duplicate webhook returns 200 without side effects)

---

## Phase 3.5: Services & Business Logic (Sequential within module)

**Dependencies**: T011-T015 (entities), T023-T034 (failing tests)
**Estimated Time**: 8-10 hours

- [ ] **T035** Create TelegramApiService
  **File**: `backend/src/modules/telegram-bot/telegram-api.service.ts`
  **Details**: Methods for getMe() (bot validation), createChatInviteLink(), banChatMember(), getChatMember() (permission check), setBotDescription(), cache all responses in Redis with TTL (1 hour metadata, 5 min member count), implement rate limiting (token bucket 30 req/sec)

- [ ] **T036** Create BotConfigurationService
  **File**: `backend/src/modules/bot-configuration/bot-configuration.service.ts`
  **Details**: CRUD methods with tenant isolation, create() validates bot_token via TelegramApiService.getMe(), update() syncs to Telegram immediately (5s timeout), logs all changes to bot_event_logs, enforces 5-plan limit check

- [ ] **T037** Create MembershipPlanService
  **File**: `backend/src/modules/membership-plan/membership-plan.service.ts`
  **Details**: CRUD methods, create() enforces 5-plan limit per bot, update() snapshots old pricing (existing members unaffected), list() orders by sort_order

- [ ] **T038** Create QPayService
  **File**: `backend/src/modules/payment/qpay.service.ts`
  **Details**: Methods for createInvoice() (POST /v2/invoice), verifyWebhookSignature() (HMAC-SHA256), generatePaymentLink(), store invoice_id mapping to plan/user

- [ ] **T039** Create PaymentService
  **File**: `backend/src/modules/payment/payment.service.ts`
  **Details**: Methods for initiatePayment() (creates transaction, calls QPayService), processWebhook() (verifies HMAC, updates transaction, creates channel_member, generates invite link via TelegramApiService), implements 3-retry exponential backoff (1s, 5s, 15s), idempotency via qpay_invoice_id

- [ ] **T040** Create TelegramBotService
  **File**: `backend/src/modules/telegram-bot/telegram-bot.service.ts`
  **Details**: Multi-bot instance manager (Map<bot_token, Telegraf>), lazy initialization, webhook setup, handler registration, scene management

---

## Phase 3.6: Controllers & API Endpoints (Sequential within module)

**Dependencies**: T035-T040 (services)
**Estimated Time**: 4-5 hours

- [ ] **T041** Create BotConfigurationController
  **File**: `backend/src/modules/bot-configuration/bot-configuration.controller.ts`
  **Details**: @Controller('bots'), @UseGuards(JwtAuthGuard, RoleGuard('owner')), 6 endpoints (GET /, POST /, GET /:id, PUT /:id, DELETE /:id, GET /:id/events), @ApiTags('Bot Configuration'), inject BotConfigurationService, use @TenantId() decorator. **IMPORTANT**: Extract correlation ID from request headers (x-correlation-id) or generate via uuidv4(), pass to all service methods, log at entry/exit of each endpoint with operation name, duration, status. Return correlation ID in all error responses: `{ error: { code, message, correlationId } }`. Emit metric: `http_requests_total{method="GET", path="/bots", status}`.

- [ ] **T042** Create MembershipPlanController
  **File**: `backend/src/modules/membership-plan/membership-plan.controller.ts`
  **Details**: @Controller('bots/:botId/plans' and 'plans'), @UseGuards(JwtAuthGuard, RoleGuard('owner')), 5 endpoints, inject MembershipPlanService. **IMPORTANT**: Same correlation ID logging as T041 - extract or generate correlation ID, pass to services, log operations, return in errors, emit http_requests_total metric. Ensure 409 error when exceeding 5-plan limit includes correlationId for support debugging.

- [ ] **T043** Create PaymentWebhookController
  **File**: `backend/src/modules/payment/payment.controller.ts`
  **Details**: @Controller('webhooks'), POST /qpay with @SkipAuth() (public endpoint), inject PaymentService. **CRITICAL**: Generate NEW correlation ID for each webhook (QPay doesn't provide one), log with qpay_invoice_id, signature verification result, processing duration. Use correlation ID to trace: webhook receipt → payment update → invite link generation → Telegram message delivery. Store correlationId in bot_event_logs.correlation_id for full payment flow audit trail. Emit metric: `payments_total{status, gateway="qpay"}`.

---

## Phase 3.7: Telegram Bot Handlers (Sequential)

**Dependencies**: T035, T038-T040 (services)
**Estimated Time**: 3-4 hours

- [ ] **T044** Create /start handler
  **File**: `backend/src/modules/telegram-bot/handlers/start.handler.ts`
  **Details**: Telegraf bot.start() handler, fetch active plans for bot, render inline keyboard with plan buttons, send welcome_message, track event in bot_event_logs

- [ ] **T045** Create plan selection handler
  **File**: `backend/src/modules/telegram-bot/handlers/plan-selection.handler.ts`
  **Details**: Telegraf bot.action(/^plan_(.+)$/) handler, extract plan_id, call PaymentService.initiatePayment(), send QPay payment link to user, transition to payment scene

- [ ] **T046** Create /rejoin handler
  **File**: `backend/src/modules/telegram-bot/handlers/rejoin.handler.ts`
  **Details**: Telegraf bot.command('rejoin') handler, check if user has active membership (query channel_members), generate new invite link if valid, send link or error message

- [ ] **T047** Create payment scene
  **File**: `backend/src/modules/telegram-bot/scenes/payment.scene.ts`
  **Details**: Telegraf Scene for payment flow state machine, store session in Redis (1-hour TTL), handle payment status updates, no resume on bot close (per FR-021)

---

## Phase 3.8: Integration Tests (Parallel ✅)

**Dependencies**: T035-T047 (all implementation complete)
**Estimated Time**: 5-6 hours

- [ ] **T048 [P]** Integration test: Bot configuration CRUD flow
  **File**: `backend/test/integration/bot-configuration/bot-crud.integration.spec.ts`
  **Details**: Create bot → validate token with Telegram API → update settings → verify sync → delete bot, use real PostgreSQL/Redis, test tenant isolation

- [ ] **T049 [P]** Integration test: Membership plan limit enforcement
  **File**: `backend/test/integration/membership-plan/plan-limit.integration.spec.ts`
  **Details**: Create 5 plans → attempt 6th plan → verify 409 error, test plan editing preserves existing member pricing

- [ ] **T050 [P]** Integration test: Payment webhook processing
  **File**: `backend/test/integration/payment/webhook-processing.integration.spec.ts`
  **Details**: Initiate payment → simulate QPay webhook → verify HMAC → check transaction update → verify invite link generation → test idempotency (duplicate webhook), test 3-retry logic with mock failures

- [ ] **T051 [P]** Integration test: Bot permission monitoring
  **File**: `backend/test/integration/telegram-bot/permission-monitor.integration.spec.ts`
  **Details**: Mock Telegram API permission check failure → verify dashboard alert created → verify payment blocking → restore permissions → verify resume

- [ ] **T052 [P]** Integration test: Telegram bot /start flow
  **File**: `backend/test/integration/telegram-bot/start-command.integration.spec.ts`
  **Details**: Send /start → verify welcome message → verify plan buttons → select plan → verify QPay link sent, use Telegraf test framework

- [ ] **T053 [P]** Integration test: Member rejoin flow
  **File**: `backend/test/integration/telegram-bot/rejoin-flow.integration.spec.ts`
  **Details**: Member with active membership leaves channel → sends /rejoin → verify new invite link generated → verify membership status check

---

## Phase 3.9: Worker Jobs (Sequential)

**Dependencies**: T035, T039 (services)
**Estimated Time**: 3-4 hours

- [ ] **T054** Create membership expiration processor
  **File**: `backend/src/workers/jobs/membership-expiration.processor.ts`
  **Details**: @Processor('membership-expiration'), @Process('remove-expired') runs hourly, query channel_members WHERE status='active' AND expires_at < NOW(), call TelegramApiService.banChatMember() (revoke_messages=false), update status to 'expired', handle "user not found" gracefully, emit metrics

- [ ] **T055** Create renewal reminder processor
  **File**: `backend/src/workers/jobs/renewal-reminder.processor.ts`
  **Details**: @Processor('renewal-reminders'), @Process('send-reminders') runs daily at 9 AM, query channel_members WHERE status='active' AND expires_at BETWEEN NOW()+3days-1h AND NOW()+3days+1h AND renewal_reminder_sent_at IS NULL, send Telegram message with renewal link, update renewal_reminder_sent_at

- [ ] **T056** Create bot permission monitor processor
  **File**: `backend/src/workers/jobs/bot-permission-monitor.processor.ts`
  **Details**: @Processor('bot-permission-monitor'), @Process('check-permissions') runs every 15 minutes (configurable via PERMISSION_CHECK_INTERVAL_MS env var), query active bot_configurations WHERE is_active=true, call TelegramApiService.getChatMember(bot_user_id) to verify can_invite_users permission, on failure: (1) create bot_event_log with event_type='bot_permission_lost' and severity='critical', (2) update bot_configurations.is_active=false to block new payments, (3) send email alert to tenant admin. Emit metric: `bot_permission_checks_total{status}`. **Known limitation**: Detection delay up to 15 minutes. Future enhancement: Implement Telegram chat member update webhooks for real-time detection.

---

## Phase 3.10: Module Registration (Sequential)

**Dependencies**: T041-T043 (controllers), T035-T040 (services), T054-T056 (jobs)
**Estimated Time**: 1 hour

- [ ] **T057** Register BotConfigurationModule in app.module.ts
  **File**: `backend/src/app.module.ts`
  **Details**: Import BotConfigurationModule, wire up to global TenantInterceptor, register repository

- [ ] **T058** Register MembershipPlanModule in app.module.ts
  **File**: `backend/src/app.module.ts`
  **Details**: Import MembershipPlanModule, wire up services

- [ ] **T059** Register PaymentModule in app.module.ts
  **File**: `backend/src/app.module.ts`
  **Details**: Import PaymentModule, register QPayService with environment variables (QPAY_MERCHANT_ID, QPAY_SECRET)

- [ ] **T060** Register TelegramBotModule in app.module.ts
  **File**: `backend/src/app.module.ts`
  **Details**: Import TelegramBotModule, initialize Telegraf instances, set webhook base URL

- [ ] **T061** Register worker jobs in worker/src/main.ts
  **File**: `worker/src/main.ts`
  **Details**: Import processors (T054-T056), configure BullMQ queue connections, set cron schedules

---

## Phase 3.10A: Observability & Monitoring (Sequential)

**Dependencies**: T035-T040 (services with business logic)
**Estimated Time**: 4-6 hours
**Constitutional Requirement**: Principle VIII - Observability & Monitoring

- [ ] **T083** Create MetricsService with Prometheus client
  **File**: `backend/src/common/metrics/metrics.service.ts`
  **Details**: Implement Prometheus client with metrics:
  - `payments_total{status, gateway, tenant_id}` - Counter for payment attempts
  - `telegram_api_calls_total{operation, status, bot_id}` - Counter for Telegram API calls
  - `http_request_duration_seconds{method, path, status}` - Histogram for API latency (p50, p95, p99)
  - `background_jobs_total{queue, status, job_type}` - Counter for BullMQ job execution
  - `database_pool_connections{state}` - Gauge for connection pool health
  - Export metrics at `/metrics` endpoint (public, no auth)

- [ ] **T084** Configure alert rules and dashboards
  **File**: `infrastructure/monitoring/alerts.yml` (create new)
  **Details**: Define alert rules:
  ```yaml
  - alert: HighPaymentFailureRate
    expr: rate(payments_total{status="failed"}[5m]) > 0.05
    severity: critical
    annotations:
      summary: "Payment failure rate above 5% in last 5 minutes"
      dashboard: "{{ grafana_url }}/d/payments"

  - alert: HighAPILatency
    expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
    severity: warning
    annotations:
      summary: "API p95 latency above 500ms"

  - alert: TelegramRateLimitExceeded
    expr: rate(telegram_api_calls_total{status="rate_limited"}[1m]) > 0
    severity: warning

  - alert: BotPermissionLost
    expr: increase(bot_event_logs{event_type="bot_permission_lost"}[5m]) > 0
    severity: critical
  ```
  Also update Grafana dashboard JSON template with payment funnel, API performance panels

- [ ] **T084A** Add correlation ID middleware
  **File**: `backend/src/common/middleware/correlation-id.middleware.ts`
  **Details**: Generate or extract `x-correlation-id` header for ALL requests, store in AsyncLocalStorage, inject into logger context, return in response headers and error payloads

- [ ] **T084B** Update all controllers with correlation ID logging
  **Files**:
  - `backend/src/modules/bot-configuration/bot-configuration.controller.ts` (T041)
  - `backend/src/modules/membership-plan/membership-plan.controller.ts` (T042)
  - `backend/src/modules/payment/payment.controller.ts` (T043 already has it)
  **Details**: Inject CorrelationIdService, log correlation ID at entry point of each endpoint:
  ```typescript
  @Get(':id')
  async getBot(@Param('id') id: string, @CorrelationId() correlationId: string) {
    this.logger.log('Fetching bot configuration', { correlationId, botId: id });
    // ... rest of handler
  }
  ```

---

## Phase 3.11: Frontend API Clients (Parallel ✅)

**Dependencies**: T041-T043 (backend API available)
**Estimated Time**: 2-3 hours

- [ ] **T062 [P]** Create bots API client
  **File**: `frontend/lib/api/bots.ts`
  **Details**: React Query hooks (useGetBots, useCreateBot, useUpdateBot, useDeleteBot, useGetBotEvents), axios calls to /v1/bots, cache invalidation on mutations, error handling with toast notifications

- [ ] **T063 [P]** Create plans API client
  **File**: `frontend/lib/api/plans.ts`
  **Details**: React Query hooks (useGetPlans, useCreatePlan, useUpdatePlan, useDeletePlan), handle 409 error for 5-plan limit with user-friendly message

- [ ] **T064 [P]** Create payments API client
  **File**: `frontend/lib/api/payments.ts`
  **Details**: React Query hooks (useGetPayments, useGetPaymentById), read-only (no mutations), support pagination and filtering

---

## Phase 3.12: Frontend Components (Parallel ✅)

**Dependencies**: T062-T064 (API clients)
**Estimated Time**: 6-7 hours

- [ ] **T065 [P]** Create BotConfigurationForm component
  **File**: `frontend/components/bot-management/BotConfigurationForm.tsx`
  **Details**: react-hook-form with Zod schema, fields for bot_token (validate regex), display_name, description, welcome_message, channel_id, submit to useCreateBot or useUpdateBot, show loading state, error toast for validation failures

- [ ] **T066 [P]** Create BotList component
  **File**: `frontend/components/bot-management/BotList.tsx`
  **Details**: Display bot cards in grid, use useGetBots with pagination, is_active filter toggle, loading skeleton, empty state message

- [ ] **T067 [P]** Create BotCard component
  **File**: `frontend/components/bot-management/BotCard.tsx`
  **Details**: Display bot name, status badge (active/inactive), channel info, action buttons (Edit, Delete with confirmation dialog, View Plans), last_sync_at timestamp

- [ ] **T068 [P]** Create MembershipPlanForm component
  **File**: `frontend/components/bot-management/MembershipPlanForm.tsx`
  **Details**: react-hook-form with Zod, fields for name, price (MNT input), duration_days (dropdown: 7, 30, 90, 365 days), description, sort_order, submit to useCreatePlan or useUpdatePlan, show 5-plan limit warning

- [ ] **T069 [P]** Create PlanList component
  **File**: `frontend/components/bot-management/PlanList.tsx`
  **Details**: Display plan cards sorted by sort_order, use useGetPlans, show count indicator (e.g., "3/5 plans"), drag-and-drop reordering (update sort_order), is_active toggle

- [ ] **T070 [P]** Create PlanCard component
  **File**: `frontend/components/bot-management/PlanCard.tsx`
  **Details**: Display plan name, price (format as MNT currency), duration, description, action buttons (Edit, Delete, Toggle Active), member count

- [ ] **T071 [P]** Create PaymentHistory component
  **File**: `frontend/components/bot-management/PaymentHistory.tsx`
  **Details**: Data table with columns (date, telegram_user_id, plan_name, amount, status, transaction_id), use useGetPayments with pagination, status filter, export to CSV button

- [ ] **T072 [P]** Create EventLogViewer component
  **File**: `frontend/components/bot-management/EventLogViewer.tsx`
  **Details**: Timeline view of bot_event_logs, use useGetBotEvents, event_type filter, severity badges, expand/collapse event_data JSONB, correlation_id search

---

## Phase 3.13: Frontend Pages (Sequential within page group)

**Dependencies**: T065-T072 (components)
**Estimated Time**: 4-5 hours

- [ ] **T073** Create bot list page
  **File**: `frontend/app/dashboard/bots/page.tsx`
  **Details**: Use BotList component, page header with "Create Bot" button, search input, data-testid="bots-page"

- [ ] **T074** Create bot create page
  **File**: `frontend/app/dashboard/bots/create/page.tsx`
  **Details**: Use BotConfigurationForm (create mode), breadcrumb navigation, data-testid="bot-create-page"

- [ ] **T075** Create bot edit page
  **File**: `frontend/app/dashboard/bots/[id]/edit/page.tsx`
  **Details**: Use BotConfigurationForm (edit mode), fetch bot data with useGetBotById, data-testid="bot-edit-page"

- [ ] **T076** Create membership plans list page
  **File**: `frontend/app/dashboard/bots/[id]/plans/page.tsx`
  **Details**: Use PlanList component, show bot info header, "Create Plan" button (disabled if count >= 5), data-testid="plans-page"

- [ ] **T077** Create plan create page
  **File**: `frontend/app/dashboard/bots/[id]/plans/create/page.tsx`
  **Details**: Use MembershipPlanForm (create mode), pass botId from URL params, data-testid="plan-create-page"

- [ ] **T078** Create plan edit page
  **File**: `frontend/app/dashboard/bots/[id]/plans/[planId]/edit/page.tsx`
  **Details**: Use MembershipPlanForm (edit mode), show warning: "Price changes only affect new members", data-testid="plan-edit-page"

- [ ] **T079** Create payment history page
  **File**: `frontend/app/dashboard/bots/[id]/payments/page.tsx`
  **Details**: Use PaymentHistory component, show bot-specific payments, data-testid="payments-page"

---

## Phase 3.14: E2E Tests (Parallel ✅)

**Dependencies**: T073-T079 (frontend pages), T041-T047 (backend)
**Estimated Time**: 6-7 hours

- [ ] **T080 [P]** E2E test: Bot configuration flow
  **File**: `frontend/tests/e2e/bot-configuration.spec.ts`
  **Details**: Playwright test: Login as owner → navigate to /bots → click Create → fill form → submit → verify bot appears in list → click Edit → update welcome_message → save → verify update → delete bot with confirmation, use data-testid selectors

- [ ] **T081 [P]** E2E test: Membership plan CRUD
  **File**: `frontend/tests/e2e/membership-plan.spec.ts`
  **Details**: Playwright test: Create bot → navigate to plans → create 3 plans → verify count "3/5" → reorder plans via drag-drop → verify sort_order change → edit plan price → verify warning displayed → create 2 more plans → attempt 6th plan → verify error toast

- [ ] **T082 [P]** E2E test: Payment flow end-to-end
  **File**: `frontend/tests/e2e/payment-flow.spec.ts`
  **Details**: Playwright test: Create bot + plan → open Telegram bot (use test bot) → send /start → click plan button → verify QPay link received → simulate webhook (call POST /v1/webhooks/qpay with valid HMAC) → verify invite link sent → verify payment appears in dashboard payment history, use Playwright's network mocking for QPay

---

## Dependencies Graph

```
T001-T010 (Migrations)
    ↓
T011-T015 (Entities) [P]  +  T016-T022 (DTOs) [P]
    ↓
T023-T034 (Contract Tests) [P] ⚠️ MUST FAIL
    ↓
T035 (TelegramApiService)
    ↓
T036-T040 (Services) → T041-T043 (Controllers) → T044-T047 (Bot Handlers)
    ↓
T048-T053 (Integration Tests) [P]
    ↓
T054-T056 (Worker Jobs) + T057-T061 (Module Registration)
    ↓
T083-T084B (Metrics + Correlation IDs) ⚠️ CONSTITUTIONAL REQUIREMENT
    ↓
T062-T064 (API Clients) [P]
    ↓
T065-T072 (Components) [P]
    ↓
T073-T079 (Pages)
    ↓
T080-T082 (E2E Tests) [P]
```

---

## Parallel Execution Examples

### Example 1: Run all contract tests together (T023-T034)
```bash
# After DTOs are complete, launch 12 contract test tasks in parallel
npm run test:contract -- bot-create.contract.spec.ts &
npm run test:contract -- bot-list.contract.spec.ts &
npm run test:contract -- bot-get.contract.spec.ts &
npm run test:contract -- bot-update.contract.spec.ts &
npm run test:contract -- bot-delete.contract.spec.ts &
npm run test:contract -- bot-events.contract.spec.ts &
npm run test:contract -- plan-create.contract.spec.ts &
npm run test:contract -- plan-list.contract.spec.ts &
npm run test:contract -- plan-get.contract.spec.ts &
npm run test:contract -- plan-update.contract.spec.ts &
npm run test:contract -- plan-delete.contract.spec.ts &
npm run test:contract -- qpay-webhook.contract.spec.ts &
wait  # All tests should FAIL (no implementation yet)
```

### Example 2: Run all entity creation tasks together (T011-T015)
```bash
# After migrations complete, create all entities in parallel
# (Each entity is in a different file)
Task: "Create BotConfiguration entity in backend/src/modules/bot-configuration/entities/bot-configuration.entity.ts"
Task: "Create MembershipPlan entity in backend/src/modules/membership-plan/entities/membership-plan.entity.ts"
Task: "Create PaymentTransaction entity in backend/src/modules/payment/entities/payment-transaction.entity.ts"
Task: "Create ChannelMember entity in backend/src/modules/payment/entities/channel-member.entity.ts"
Task: "Create BotEventLog entity in backend/src/modules/bot-configuration/entities/bot-event-log.entity.ts"
```

### Example 3: Run all frontend components together (T065-T072)
```bash
# After API clients complete, build all components in parallel
Task: "Create BotConfigurationForm component in frontend/components/bot-management/BotConfigurationForm.tsx"
Task: "Create BotList component in frontend/components/bot-management/BotList.tsx"
Task: "Create BotCard component in frontend/components/bot-management/BotCard.tsx"
Task: "Create MembershipPlanForm component in frontend/components/bot-management/MembershipPlanForm.tsx"
Task: "Create PlanList component in frontend/components/bot-management/PlanList.tsx"
Task: "Create PlanCard component in frontend/components/bot-management/PlanCard.tsx"
Task: "Create PaymentHistory component in frontend/components/bot-management/PaymentHistory.tsx"
Task: "Create EventLogViewer component in frontend/components/bot-management/EventLogViewer.tsx"
```

---

## Validation Checklist

**GATE: Must verify before marking tasks.md as complete**

- [x] All 3 contract files have corresponding test tasks (T023-T034 cover 12 endpoints)
- [x] All 5 entities have model creation tasks (T011-T015)
- [x] All tests come before implementation (Phase 3.4 before 3.5-3.7)
- [x] Parallel tasks are truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] TDD workflow enforced (contract tests fail → implement → pass)
- [x] Worker jobs have cron schedules documented
- [x] Frontend pages have data-testid for E2E tests
- [x] Integration tests use real PostgreSQL/Redis (no mocks)

---

## Estimated Timeline

**Total Tasks**: 86 (82 original + 4 observability tasks T083-T084B)
**Parallelizable**: 33 tasks (~38%)
**Sequential**: 53 tasks (~62%)

**Estimated Effort**:
- Phase 3.1 (Migrations): 2-3 hours
- Phase 3.2 (Entities): 3-4 hours [P]
- Phase 3.3 (DTOs): 2-3 hours [P]
- Phase 3.4 (Contract Tests): 4-5 hours [P]
- Phase 3.5 (Services): 8-10 hours
- Phase 3.6 (Controllers): 4-5 hours
- Phase 3.7 (Bot Handlers): 3-4 hours
- Phase 3.8 (Integration Tests): 5-6 hours [P]
- Phase 3.9 (Worker Jobs): 3-4 hours
- Phase 3.10 (Module Registration): 1 hour
- Phase 3.10A (Observability): 4-6 hours ⚠️ CONSTITUTIONAL REQUIREMENT
- Phase 3.11 (API Clients): 2-3 hours [P]
- Phase 3.12 (Components): 6-7 hours [P]
- Phase 3.13 (Pages): 4-5 hours
- Phase 3.14 (E2E Tests): 6-7 hours [P]

**Total**: 59-71 hours (8-9 working days with parallelization)

---

## Notes

- **[P]** tasks can run in parallel (different files, no dependencies)
- Verify contract tests **FAIL** before implementing services (TDD red phase)
- Commit after each task completion
- Run `npm run lint && npm run type-check` before committing
- Update `quickstart.md` test scenarios as implementation progresses
- Monitor metrics during implementation (payment success rate, API latency, cache hit rate)
- **Constitutional Compliance**: All tasks enforce multi-tenancy (RLS), security (HMAC verification), and observability (structured logging with correlation IDs)

---

*Generated from plan.md v1.0, data-model.md, contracts/ (3 files), research.md, quickstart.md*
*Based on Constitution v1.2.0 - TDD workflow enforced, multi-tenant isolation mandatory*
