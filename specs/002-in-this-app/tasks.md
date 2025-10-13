# Tasks: Telegram Bot Onboarding for SaaS Users

**Input**: Design documents from `/specs/002-in-this-app/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md
**Branch**: `002-in-this-app`
**Target**: Backend-only feature (NestJS + Telegraf + Redis + PostgreSQL)

## Execution Summary
```
Total Tasks: 53
Parallel Tasks: 16 (marked with [P])
Sequential Tasks: 37
Estimated Duration: 15-20 working days (1 developer)
Critical Path: Migrations → Entities → Services → Handlers → Controller → Tests
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Tasks ordered by dependencies (TDD workflow)

## Path Conventions
```
backend/
├── src/modules/onboarding-bot/       # New module
├── migrations/                        # Database migrations
└── test/
    ├── contract/onboarding-bot/      # Contract tests
    └── integration/onboarding-bot/   # Integration tests
```

---

## Phase 3.1: Database Setup (Foundation) ✅ COMPLETE

### [X] T001 Create migration for telegram_user_accounts table
**File**: `backend/src/database/migrations/1730000027000-UpdateTelegramUserAccountsForOnboarding.ts`

Created TypeORM migration with:
- Updated existing `telegram_user_accounts` table with new columns for onboarding
- Added columns: telegram_chat_id, linked_at, last_interaction_at, is_active, metadata (JSONB)
- Indexes: telegram_chat_id, telegram_username, user_id (unique)
- Foreign key: user_id → users.id (CASCADE on delete) - already existed
- RLS policies: tenant_isolation_select, tenant_isolation_insert, tenant_isolation_update, tenant_isolation_delete
- Enable RLS: `ALTER TABLE telegram_user_accounts ENABLE ROW LEVEL SECURITY;`

**Validation**: ✅ Migration executed successfully

**Dependencies**: None (can start immediately)

---

### [X] T002 Create migration for bot_commands table
**File**: `backend/src/database/migrations/1730000028000-CreateBotCommands.ts`

Created TypeORM migration with:
- Table: `bot_commands`
- Columns: id (UUID PK), telegram_user_account_id (FK nullable), telegram_user_id (BIGINT), telegram_chat_id (BIGINT), command (VARCHAR 100), parameters (JSONB), session_step (VARCHAR 50), response_status (VARCHAR 20), error_code (VARCHAR 50), response_time_ms (INTEGER), correlation_id (UUID), user_agent (TEXT), created_at (TIMESTAMP)
- Indexes: PRIMARY KEY (id), INDEX (telegram_user_id), INDEX (command), INDEX (created_at DESC), INDEX (correlation_id), INDEX (response_status)
- Foreign key: telegram_user_account_id → telegram_user_accounts.id (SET NULL on delete)
- RLS policies: tenant_isolation_select, tenant_isolation_insert
- Enable RLS: `ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY;`

**Validation**: ✅ Migration executed successfully, table verified with psql

**Dependencies**: T001 (telegram_user_accounts table must exist first for FK)

---

### [X] T003 Run and verify migrations
**Command**: `npm run migration:run` in backend directory

Verified both tables created with proper:
- ✅ RLS policies enabled (4 policies for telegram_user_accounts, 2 for bot_commands)
- ✅ Foreign key constraints (bot_commands → telegram_user_accounts)
- ✅ Indexes created (all required indexes present)
- ✅ Correct column types

**Validation**:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('telegram_user_accounts', 'bot_commands');
SELECT * FROM pg_policies WHERE tablename IN ('telegram_user_accounts', 'bot_commands');
```

**Dependencies**: T001, T002

---

## Phase 3.2: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation

### T004 [P] Contract test: Webhook endpoint
**File**: `backend/test/contract/onboarding-bot/webhook.contract.spec.ts`

Write failing contract test for POST /v1/onboarding-bot/webhook/:botToken:
- Test request body matches Telegram Update schema (webhook-contract.yaml)
- Test response for valid update: 200 OK with `{ ok: true }`
- Test response for invalid update: 400 Bad Request
- Test response for invalid bot token: 401 Unauthorized
- Test response for rate limit: 429 Too Many Requests
- Use supertest to call endpoint
- No mocks - real controller once implemented

**Expected**: Test MUST FAIL (endpoint doesn't exist yet)

**Dependencies**: None (parallel with other contract tests)

---

### T005 [P] Contract test: Registration service
**File**: `backend/test/contract/onboarding-bot/registration.contract.spec.ts`

Write failing contract test for registerUser service method:
- Test input schema: RegisterUserRequest (service-contracts.yaml lines 14-37)
- Test output schema: RegisterUserResponse (service-contracts.yaml lines 39-48)
- Test validation: email format, name length, duplicate email detection
- Test tenant + user + telegram_user_account creation
- Test OWNER role assignment
- No mocks - real database (test schema)

**Expected**: Test MUST FAIL (service doesn't exist yet)

**Dependencies**: None (parallel)

---

### T006 [P] Contract test: Project creation service
**File**: `backend/test/contract/onboarding-bot/project-creation.contract.spec.ts`

Write failing contract test for createProject service method:
- Test input schema: CreateProjectRequest (service-contracts.yaml lines 64-80)
- Test output schema: CreateProjectResponse (service-contracts.yaml lines 82-89)
- Test bot token validation with Telegram API (mock Telegram API call)
- Test project entity creation with encrypted bot token
- Test invalid bot token rejection
- No database mocks - real PostgreSQL

**Expected**: Test MUST FAIL (service doesn't exist yet)

**Dependencies**: None (parallel)

---

### T007 [P] Contract test: Group connection service
**File**: `backend/test/contract/onboarding-bot/group-connection.contract.spec.ts`

Write failing contract test for connectGroup service method:
- Test input schema: ConnectGroupRequest (service-contracts.yaml lines 91-106)
- Test output schema: ConnectGroupResponse (service-contracts.yaml lines 108-116)
- Test bot permission verification (mock Telegram getChatMember API)
- Test telegram_group entity creation
- Test duplicate group detection
- No database mocks - real PostgreSQL

**Expected**: Test MUST FAIL (service doesn't exist yet)

**Dependencies**: None (parallel)

---

### T008 [P] Contract test: Plan creation service
**File**: `backend/test/contract/onboarding-bot/plan-creation.contract.spec.ts`

Write failing contract test for createPlan service method:
- Test input schema: CreatePlanRequest (service-contracts.yaml lines 118-143)
- Test output schema: CreatePlanResponse (service-contracts.yaml lines 145-159)
- Test plan validation: price > 0, duration enum, group_ids array
- Test membership_plan entity creation with group links
- Test plan summary generation
- No database mocks - real PostgreSQL

**Expected**: Test MUST FAIL (service doesn't exist yet)

**Dependencies**: None (parallel)

---

## Phase 3.3: Entity Layer (Foundation for Services)

### T009 [P] Create TelegramUserAccount entity
**File**: `backend/src/modules/onboarding-bot/entities/telegram-user-account.entity.ts`

Create TypeORM entity matching migration schema:
- Decorator: `@Entity('telegram_user_accounts')`
- All fields from data-model.md (lines 22-37)
- Relation: `@ManyToOne(() => User, { onDelete: 'CASCADE' })`
- Validation decorators: `@IsPositive()` for telegram_user_id, `@Matches()` for username pattern
- No business logic in entity (pure data structure)

**Validation**: TypeScript compilation passes, entity registered in module

**Dependencies**: T003 (migration must be run first)

---

### T010 [P] Create BotCommand entity
**File**: `backend/src/modules/onboarding-bot/entities/bot-command.entity.ts`

Create TypeORM entity matching migration schema:
- Decorator: `@Entity('bot_commands')`
- All fields from data-model.md (lines 85-99)
- Relation: `@ManyToOne(() => TelegramUserAccount, { onDelete: 'SET NULL', nullable: true })`
- Enums: CommandType, ResponseStatus
- No business logic in entity

**Validation**: TypeScript compilation passes, entity registered in module

**Dependencies**: T003 (migration must be run first)

---

### T011 [P] Define OnboardingSession interface
**File**: `backend/src/modules/onboarding-bot/interfaces/onboarding-session.interface.ts`

Create TypeScript interfaces for Redis session:
```typescript
export enum SessionStep {
  IDLE = 'IDLE',
  REGISTRATION_EMAIL = 'REGISTRATION_EMAIL',
  // ... all 16 steps from data-model.md lines 151-167
}

export interface SessionData {
  email?: string;
  name?: string;
  // ... all fields from data-model.md lines 170-214
}

export interface OnboardingSession {
  telegram_user_id: number;
  telegram_chat_id: number;
  current_step: SessionStep;
  started_at: string;
  last_activity_at: string;
  correlation_id: string;
  data: SessionData;
}
```

**Validation**: TypeScript compilation passes, no errors

**Dependencies**: None (parallel)

---

### T012 [P] Create DTOs
**Files**:
- `backend/src/modules/onboarding-bot/dto/register-user.dto.ts`
- `backend/src/modules/onboarding-bot/dto/link-account.dto.ts`
- `backend/src/modules/onboarding-bot/dto/create-project.dto.ts`
- `backend/src/modules/onboarding-bot/dto/connect-group.dto.ts`
- `backend/src/modules/onboarding-bot/dto/create-plan.dto.ts`
- `backend/src/modules/onboarding-bot/dto/telegram-update.dto.ts`

Create DTOs matching service-contracts.yaml schemas:
- Use class-validator decorators: `@IsEmail()`, `@MinLength()`, `@IsPositive()`, `@IsEnum()`, `@IsArray()`
- Use class-transformer decorators: `@Type()`, `@Transform()`
- Add ApiProperty for OpenAPI documentation
- Implement validation rules from data-model.md

**Validation**: TypeScript compilation passes, DTOs can be instantiated

**Dependencies**: None (parallel)

---

## Phase 3.4: Core Services (Business Logic)

### T013 Implement OnboardingSessionService
**File**: `backend/src/modules/onboarding-bot/onboarding-session.service.ts`

Implement Redis-based session management:
- Methods: `getSession()`, `createSession()`, `updateSession()`, `advanceStep()`, `clearSession()`, `checkTimeout()`
- Redis key pattern: `onboarding:session:{telegram_user_id}`
- TTL: 3600 seconds (1 hour)
- Store as JSON string
- Validate state transitions (IDLE → REGISTRATION_EMAIL → ... per state machine)
- Handle session expiration gracefully

**Validation**: T005 contract test passes for session-related operations

**Dependencies**: T009, T010, T011 (entities and interfaces must exist)

---

### T014 Implement TelegramUserAccountService
**File**: `backend/src/modules/onboarding-bot/telegram-user-account.service.ts`

Implement CRUD operations:
- Methods: `create()`, `findByTelegramUserId()`, `findByUserId()`, `updateLastInteraction()`
- Use TypeORM repository pattern
- Enforce RLS via TenantInterceptor (no manual tenant_id filtering needed)
- Handle unique constraint violations (duplicate telegram_user_id or user_id)
- Log all operations with correlation IDs

**Validation**: T005 contract test passes for telegram user account creation

**Dependencies**: T009 (TelegramUserAccount entity must exist)

---

### T015 Implement BotCommandLogger
**File**: `backend/src/modules/onboarding-bot/bot-command-logger.service.ts`

Implement async audit logging:
- Method: `log(request: LogCommandRequest): Promise<void>`
- Fire-and-forget pattern (don't block bot responses)
- Use BullMQ for async processing (optional: can be sync for v1)
- Include correlation IDs for tracing
- Log levels: INFO for success, WARN for rate_limited, ERROR for errors

**Validation**: Logs appear in bot_commands table after bot interactions

**Dependencies**: T010 (BotCommand entity must exist)

---

### T016 Implement OnboardingBotService
**File**: `backend/src/modules/onboarding-bot/onboarding-bot.service.ts`

Implement business logic coordination:
- Methods: `registerUser()`, `linkAccount()`, `createProject()`, `connectGroup()`, `createPlan()`, `getStatus()`
- Integrate with existing services: AuthService, ProjectService, TelegramGroupService, MembershipPlanService
- Validate bot tokens via Telegram API `getMe` call
- Verify bot permissions via Telegram API `getChatMember` call
- Encrypt bot tokens before storage
- Send email verification codes for account linking
- Return user-friendly error messages (constitution principle VII)

**Validation**: T005-T008 contract tests pass

**Dependencies**: T013, T014, T015 (all core services must exist)

---

## Phase 3.5: Bot Handlers (Command Processing)

### T017 Implement RegistrationHandler
**File**: `backend/src/modules/onboarding-bot/handlers/registration.handler.ts`

Implement /start command and registration flow:
- Detect `/start` command → show welcome message with registration options
- Handle state transitions: IDLE → REGISTRATION_EMAIL → REGISTRATION_NAME → REGISTRATION_COMPANY
- Validate email format at REGISTRATION_EMAIL step
- Validate name length at REGISTRATION_NAME step
- Call OnboardingBotService.registerUser() when all data collected
- Handle duplicate email errors gracefully
- Clear session after successful registration

**Validation**: Quickstart scenario 1 (New User Registration) passes

**Dependencies**: T016 (OnboardingBotService must exist)

---

### T018 Implement ProjectCreationHandler
**File**: `backend/src/modules/onboarding-bot/handlers/project-creation.handler.ts`

Implement /newproject command:
- Detect `/newproject` command → ask for project name
- State transitions: IDLE → PROJECT_NAME → PROJECT_DESCRIPTION → BOT_TOKEN
- Provide guidance for getting bot token from @BotFather
- Validate bot token via Telegram API
- Display bot info (username, name) after validation
- Call OnboardingBotService.createProject()
- Handle invalid token errors with helpful message

**Validation**: Quickstart scenario 2 (Project Creation) passes

**Dependencies**: T016

---

### T019 Implement GroupConnectionHandler
**File**: `backend/src/modules/onboarding-bot/handlers/group-connection.handler.ts`

Implement /addgroup command:
- Detect `/addgroup` command → list projects (if multiple)
- State transitions: IDLE → GROUP_SELECTION → GROUP_TYPE → GROUP_CONNECTION
- Detect forwarded messages from groups/channels
- Extract chat_id from forwarded message
- Verify bot has admin permissions
- Call OnboardingBotService.connectGroup()
- Handle permission errors with step-by-step fix instructions

**Validation**: Quickstart scenario 3 (Group Connection) passes

**Dependencies**: T016

---

### T020 Implement PlanCreationHandler
**File**: `backend/src/modules/onboarding-bot/handlers/plan-creation.handler.ts`

Implement /createplan command:
- Detect `/createplan` command → list available groups
- State transitions: IDLE → PLAN_GROUP_SELECTION → PLAN_NAME → PLAN_PRICE → PLAN_DURATION → PLAN_DESCRIPTION
- Allow selecting multiple groups (comma-separated numbers)
- Validate price as positive number
- Offer predefined duration options (inline keyboard)
- Show plan summary before confirmation
- Call OnboardingBotService.createPlan()

**Validation**: Quickstart scenario 4 (Plan Creation) passes

**Dependencies**: T016

---

### T021 Implement AccountLinkingHandler
**File**: `backend/src/modules/onboarding-bot/handlers/account-linking.handler.ts`

Implement /link command:
- Detect `/link` command → ask for email
- State transitions: IDLE → LINK_EMAIL → LINK_VERIFICATION
- Generate 6-digit verification code
- Store code in Redis with 10-minute TTL: `email:verification:{email}`
- Send code to email via existing email service
- Validate code entered by user
- Call OnboardingBotService.linkAccount() on success
- Handle expired/invalid codes gracefully

**Validation**: Quickstart scenario 5 (Account Linking) passes

**Dependencies**: T016

---

### T022 Implement StatusHandler
**File**: `backend/src/modules/onboarding-bot/handlers/status.handler.ts`

Implement /status command:
- Detect `/status` command (no state transitions, always available)
- Call OnboardingBotService.getStatus()
- Display: company name, projects count, groups count, plans count, members count
- Show project breakdown with nested groups/plans
- Include web dashboard link
- Format output with emojis for readability

**Validation**: Quickstart scenario 6 (Status Command) passes

**Dependencies**: T016

---

### T023 Implement HelpHandler
**File**: `backend/src/modules/onboarding-bot/handlers/help.handler.ts`

Implement /help command:
- Detect `/help` command
- Display list of available commands with descriptions:
  - /start - Register new account
  - /newproject - Create new project
  - /addgroup - Connect Telegram group
  - /createplan - Create membership plan
  - /status - View account overview
  - /link - Link to existing account
  - /cancel - Cancel current operation
  - /help - Show this message
- No state changes

**Validation**: Send /help, verify all commands listed

**Dependencies**: None (can be implemented anytime)

---

### T024 Implement CancelHandler
**File**: `backend/src/modules/onboarding-bot/handlers/cancel.handler.ts`

Implement /cancel command:
- Detect `/cancel` command
- Clear session: call OnboardingSessionService.clearSession()
- Return to IDLE state
- Send confirmation message
- Available from any state

**Validation**: Quickstart scenario 7g (Cancel Command) passes

**Dependencies**: T013 (OnboardingSessionService)

---

## Phase 3.6: Rate Limiting (Security)

### T025 Implement rate limiting middleware
**File**: `backend/src/modules/onboarding-bot/middleware/rate-limit.middleware.ts`

Implement token bucket algorithm:
- Redis key pattern: `rate:limit:onboarding:{telegram_user_id}`
- Tokens: 20 per minute per user
- Refill: Every 60 seconds
- Operations: DECR on command, check if < 0
- If rate limited: throw HttpException(429) with retryAfter
- Apply to all bot webhook requests

**Validation**: Quickstart scenario 7e (Rate Limit Exceeded) passes

**Dependencies**: None (independent middleware)

---

### T026 Add rate limit tests
**File**: `backend/test/integration/onboarding-bot/rate-limiting.integration.spec.ts`

Write integration test:
- Send 21 commands in rapid succession
- Verify first 20 succeed
- Verify 21st returns 429 status
- Verify error message includes retryAfter
- Wait 60 seconds, verify rate limit reset

**Validation**: Test passes, rate limiting enforced

**Dependencies**: T025 (rate limit middleware must exist)

---

## Phase 3.7: Webhook Controller (Entry Point)

### T027 Implement OnboardingBotController
**File**: `backend/src/modules/onboarding-bot/onboarding-bot.controller.ts`

Implement webhook endpoint:
- Route: `POST /v1/onboarding-bot/webhook/:botToken`
- Validate bot token from path parameter
- Parse Telegram Update from request body (use TelegramUpdateDto)
- Route to appropriate handler based on message type (command, text, forwarded message, callback query)
- Apply rate limiting middleware
- Return 200 OK with `{ ok: true }` on success
- Return appropriate error codes on failure (400, 401, 429, 500)

**Validation**: T004 contract test passes

**Dependencies**: T017-T024 (all handlers must exist), T025 (rate limiting)

---

### T028 Implement bot token validation middleware
**File**: `backend/src/modules/onboarding-bot/middleware/bot-token-validation.middleware.ts`

Implement middleware:
- Extract botToken from path parameter
- Hash token and compare with stored tokens (security)
- If invalid: throw HttpException(401) with message "Invalid bot token"
- Attach validated bot config to request object
- Applied before rate limiting

**Validation**: Quickstart scenario 7c (Invalid Bot Token) error response correct

**Dependencies**: None (independent middleware)

---

### T029 Implement Telegram signature verification
**File**: `backend/src/modules/onboarding-bot/middleware/telegram-signature.middleware.ts`

Implement webhook signature verification:
- Extract X-Telegram-Bot-Api-Secret-Token header
- Compare with TELEGRAM_ONBOARDING_BOT_WEBHOOK_SECRET env var
- If mismatch: throw HttpException(401) with message "Invalid signature"
- Prevent webhook spoofing attacks
- Applied before bot token validation

**Validation**: Send webhook with invalid signature, verify 401 response

**Dependencies**: None (independent middleware)

---

## Phase 3.8: Integration Tests (End-to-End Validation)

### T030 Write registration flow integration test
**File**: `backend/test/integration/onboarding-bot/registration-flow.integration.spec.ts`

Implement test for quickstart scenario 1:
- Send /start command
- Send "Register new account"
- Send email "test@example.com"
- Send name "Test User"
- Send company "Test Company"
- Verify tenant created in database
- Verify user created with OWNER role
- Verify telegram_user_account created
- Verify bot_command logged
- Use real PostgreSQL and Redis (no mocks)

**Validation**: All assertions pass, data in database correct

**Dependencies**: T027 (controller), all handlers

---

### T031 Write project creation integration test
**File**: `backend/test/integration/onboarding-bot/project-creation.integration.spec.ts`

Implement test for quickstart scenario 2:
- Pre-create registered user
- Send /newproject command
- Send project name "Test Project"
- Send project description "Test Description"
- Mock Telegram API getMe call
- Send bot token "123456789:ABC-valid-token"
- Verify project created in database
- Verify bot token encrypted
- Verify bot username stored

**Validation**: All assertions pass

**Dependencies**: T027, T018 (ProjectCreationHandler)

---

### T032 Write group connection integration test
**File**: `backend/test/integration/onboarding-bot/group-connection.integration.spec.ts`

Implement test for quickstart scenario 3:
- Pre-create user with project
- Send /addgroup command
- Send project selection
- Send group type "Group"
- Mock forwarded message with chat_id
- Mock Telegram API getChatMember call (bot is admin)
- Verify telegram_group created in database
- Verify group linked to project

**Validation**: All assertions pass

**Dependencies**: T027, T019 (GroupConnectionHandler)

---

### T033 Write plan creation integration test
**File**: `backend/test/integration/onboarding-bot/plan-creation.integration.spec.ts`

Implement test for quickstart scenario 4:
- Pre-create user with project and groups
- Send /createplan command
- Select groups
- Send plan name, price, duration
- Verify membership_plan created
- Verify plan linked to groups via junction table

**Validation**: All assertions pass

**Dependencies**: T027, T020 (PlanCreationHandler)

---

### T034 Write account linking integration test
**File**: `backend/test/integration/onboarding-bot/account-linking.integration.spec.ts`

Implement test for quickstart scenario 5:
- Pre-create web user (via auth API)
- Send /link command from different Telegram user
- Send email
- Retrieve verification code from Redis
- Send verification code
- Verify telegram_user_account linked to existing user
- Verify no duplicate user created

**Validation**: All assertions pass

**Dependencies**: T027, T021 (AccountLinkingHandler)

---

### T035 Write session timeout integration test
**File**: `backend/test/integration/onboarding-bot/session-timeout.integration.spec.ts`

Implement test for quickstart scenario 7f:
- Start registration flow
- Wait 3601 seconds (1 hour + 1 second)
- Send next input
- Verify session expired error
- Verify user offered to start over
- Verify Redis session key deleted

**Validation**: Session timeout enforced correctly

**Dependencies**: T027, T013 (OnboardingSessionService)

---

### T036 Write rate limiting integration test
**File**: (Already covered in T026)

**Status**: SKIP (T026 covers this)

**Dependencies**: N/A

---

### T037 Write multi-tenant isolation integration test
**File**: `backend/test/integration/onboarding-bot/multi-tenant-isolation.integration.spec.ts`

Implement test:
- Create two tenants with bot users
- Tenant A user tries to access Tenant B's data via bot
- Verify RLS blocks cross-tenant queries
- Verify no data leakage in bot responses
- Verify bot_commands only show user's own commands

**Validation**: Multi-tenant isolation enforced, no data leakage

**Dependencies**: T027, all services

---

## Phase 3.9: Error Handling (Per Constitution Principle VII)

### T038 Implement error response formatters
**File**: `backend/src/modules/onboarding-bot/formatters/error-response.formatter.ts`

Implement error formatting utilities:
- Function: `formatErrorResponse(code, message, details?)` returns:
  ```typescript
  { error: { code: string, message: string, details?: object } }
  ```
- Error codes enum: INVALID_BOT_TOKEN, DUPLICATE_EMAIL, VALIDATION_ERROR, etc.
- User-friendly messages (no stack traces, no internal details)
- Map exception types to HTTP status codes (400, 401, 403, 404, 409, 422, 429, 500)

**Validation**: Error responses match constitutional format

**Dependencies**: None (utility functions)

---

### T039 Add error handling tests for all 7 edge cases
**File**: `backend/test/integration/onboarding-bot/error-handling.integration.spec.ts`

Implement tests for quickstart scenario 7 (a-g):
- 7a: Invalid email format → 400 with helpful message
- 7b: Duplicate email → 409 with account linking option
- 7c: Invalid bot token → 400 with @BotFather guidance
- 7d: Bot lacks admin permissions → 400 with fix instructions
- 7e: Rate limit exceeded → 429 with retryAfter
- 7f: Session timeout → 400 with resume/restart options
- 7g: Cancel command → session cleared, confirmation sent

**Validation**: All error scenarios handled gracefully, messages user-friendly

**Dependencies**: T027, T038 (error formatters)

---

### T040 Validate error messages are user-friendly
**Manual Task**: Review all error messages in code

- Verify no stack traces exposed
- Verify no database errors exposed
- Verify actionable guidance provided
- Verify error codes are descriptive
- Verify messages match quickstart.md examples

**Validation**: Manual code review, approval from product team

**Dependencies**: T038, T039

---

## Phase 3.10: Module Integration (NestJS Wiring)

### T041 Create OnboardingBotModule
**File**: `backend/src/modules/onboarding-bot/onboarding-bot.module.ts`

Create NestJS module:
- Imports: TypeOrmModule.forFeature([TelegramUserAccount, BotCommand]), RedisModule, AuthModule, ProjectModule, TelegramGroupsModule, MembershipModule
- Providers: OnboardingBotService, OnboardingSessionService, TelegramUserAccountService, BotCommandLogger, all handlers, all middleware
- Controllers: OnboardingBotController
- Exports: OnboardingBotService, TelegramUserAccountService (for potential future use)

**Validation**: Module compiles, no circular dependencies

**Dependencies**: All entities, services, handlers, controller, middleware

---

### T042 Register module in app.module.ts
**File**: `backend/src/app.module.ts`

Add OnboardingBotModule to imports array:
```typescript
imports: [
  // ... existing modules
  OnboardingBotModule,
]
```

**Validation**: Application starts without errors, module loaded

**Dependencies**: T041 (OnboardingBotModule)

---

### T043 Configure Telegraf bot instance
**File**: `backend/src/modules/onboarding-bot/config/telegraf.config.ts`

Create Telegraf bot configuration:
- Initialize bot with TELEGRAM_ONBOARDING_BOT_TOKEN
- Set webhook URL: TELEGRAM_ONBOARDING_BOT_WEBHOOK_URL
- Configure session middleware (use Redis storage)
- Register middleware: signature verification, bot token validation, rate limiting
- Register command handlers

**Validation**: Bot responds to /start command in Telegram app

**Dependencies**: T041, T042

---

### T044 Set up webhook route in main.ts
**File**: `backend/src/main.ts`

Register webhook route:
- Ensure global prefix '/v1' applied
- Webhook accessible at: POST /v1/onboarding-bot/webhook/:botToken
- Apply middleware in correct order: signature verification → bot token validation → rate limiting
- Log webhook registrations

**Validation**: Webhook URL accessible, returns proper responses

**Dependencies**: T042, T043

---

## Phase 3.11: Observability (Per Constitution Principle VIII)

### T045 Add structured logging to all services
**Files**: All service files in onboarding-bot module

Add logger.telegram() calls:
- Log command received: `logger.telegram('CommandReceived', { command, telegram_user_id })`
- Log registration started/completed
- Log project creation started/completed
- Log group connection started/completed
- Log plan creation started/completed
- Log errors with correlation IDs
- Include response duration in logs

**Validation**: Logs appear in console with structured format

**Dependencies**: All services implemented

---

### T046 Implement correlation ID middleware
**File**: `backend/src/modules/onboarding-bot/middleware/correlation-id.middleware.ts`

Implement middleware:
- Generate UUID for each webhook request: `correlationId = req.headers['x-correlation-id'] || uuidv4()`
- Store in request object: `req.correlationId`
- Add to response header: `res.setHeader('X-Correlation-ID', correlationId)`
- Pass to all service calls
- Include in all log messages
- Store in bot_commands table

**Validation**: Correlation IDs present in logs and database

**Dependencies**: None (independent middleware)

---

### T047 Add Prometheus metrics endpoints
**File**: `backend/src/modules/onboarding-bot/metrics/onboarding-bot.metrics.ts`

Implement metrics:
- Counter: `onboarding_bot_commands_total{command, status}`
- Counter: `onboarding_registrations_total{status}`
- Histogram: `onboarding_session_duration_seconds`
- Histogram: `telegram_api_validation_duration_seconds{operation}`
- Expose metrics at GET /metrics endpoint (if not already exists)

**Validation**: Metrics appear at /metrics endpoint after bot interactions

**Dependencies**: All services and handlers

---

### T048 Create monitoring dashboard config
**File**: `backend/monitoring/onboarding-bot-dashboard.json` (Grafana) or equivalent

Create dashboard configuration:
- Panel: Command rate (commands/min)
- Panel: Registration success rate
- Panel: Error rate by error code
- Panel: Session duration histogram
- Panel: Telegram API latency
- Alert: Registration failure rate > 5% in 5min
- Alert: API latency p95 > 5s

**Validation**: Dashboard loads, displays metrics (manual verification)

**Dependencies**: T047 (metrics)

---

## Phase 3.12: Validation & Cleanup (Final Steps)

### T049 Run quickstart.md scenarios (all 7 must pass)
**Command**: Follow quickstart.md step-by-step

Execute all 7 test scenarios:
1. New user registration
2. Project creation with bot token
3. Group connection with permission verification
4. Membership plan creation
5. Account linking (existing web user)
6. Status command
7. Error handling & edge cases (7 sub-scenarios)

**Validation**: All scenarios pass, database state correct, no errors

**Dependencies**: ALL previous tasks

---

### T050 Verify performance targets (<3s response, <5s API calls)
**Manual Task**: Performance testing

- Bot response time: Send 100 /start commands, measure p95 latency (must be <3s)
- Token validation: Validate 50 bot tokens, measure p95 latency (must be <5s)
- Group permission verification: Verify 50 groups, measure p95 latency (must be <5s)
- Use tools: artillery, k6, or custom script

**Validation**: All performance targets met

**Dependencies**: T049 (quickstart scenarios working)

---

### T051 Run lint + type-check (must pass)
**Command**: `npm run lint && npm run type-check` in backend directory

- Fix all linting errors
- Fix all TypeScript errors
- Verify no `any` types (except justified)
- Verify all return types explicit
- Verify no unused variables

**Validation**: Zero errors from lint and type-check

**Dependencies**: ALL code tasks completed

---

### T052 Update CLAUDE.md with implementation status
**File**: `CLAUDE.md` at repository root

Add to "Recent Changes" section:
```markdown
## Recent Changes (Feature 002 - COMPLETE)
- **Backend**: Onboarding bot with full registration, project creation, group connection, plan creation
- **Database**: 2 new tables (telegram_user_accounts, bot_commands) with RLS policies
- **Testing**: 5 contract tests, 7 integration tests, all passing
- **Security**: Rate limiting (20 cmd/min), bot token encryption, multi-tenant isolation
- **Observability**: Structured logging, correlation IDs, Prometheus metrics
```

Update "Implementation Best Practices" with learnings from this feature.

**Validation**: CLAUDE.md updated, changes committed

**Dependencies**: T049-T051 (feature complete)

---

### T053 Write feature completion summary
**File**: `specs/002-in-this-app/COMPLETION_SUMMARY.md`

Document:
- Implementation highlights
- Deviations from plan (if any)
- Performance benchmarks achieved
- Test coverage statistics
- Known limitations (v1 scope)
- Future enhancements (v2 ideas)
- Lessons learned

**Validation**: Summary reviewed and approved

**Dependencies**: T052 (CLAUDE.md updated)

---

## Dependencies Graph

```
Setup Phase:
T001 → T002 → T003

Contract Tests (parallel after T003):
T004, T005, T006, T007, T008

Entity Layer (parallel after T003):
T009, T010, T011, T012

Core Services (sequential):
T009, T010, T011 → T013, T014, T015 → T016

Bot Handlers (parallel after T016):
T017, T018, T019, T020, T021, T022, T023, T024

Rate Limiting:
T025 → T026

Controller:
T017-T024, T025 → T027, T028, T029

Integration Tests (parallel after T027):
T030, T031, T032, T033, T034, T035, T037

Error Handling:
T038 → T039, T040

Module Integration (sequential):
T041 → T042 → T043 → T044

Observability:
T045, T046, T047, T048 (parallel)

Validation (sequential):
T049 → T050 → T051 → T052 → T053
```

---

## Parallel Execution Examples

### Batch 1: Contract Tests (after T003)
```bash
# Run in parallel (4 tasks):
- T004: Webhook contract test
- T005: Registration service contract test
- T006: Project creation contract test
- T007: Group connection contract test
- T008: Plan creation contract test
```

### Batch 2: Entity Layer (after T003)
```bash
# Run in parallel (4 tasks):
- T009: TelegramUserAccount entity
- T010: BotCommand entity
- T011: OnboardingSession interface
- T012: DTOs
```

### Batch 3: Bot Handlers (after T016)
```bash
# Run in parallel (8 tasks):
- T017: RegistrationHandler
- T018: ProjectCreationHandler
- T019: GroupConnectionHandler
- T020: PlanCreationHandler
- T021: AccountLinkingHandler
- T022: StatusHandler
- T023: HelpHandler
- T024: CancelHandler
```

### Batch 4: Integration Tests (after T027)
```bash
# Run in parallel (6 tasks):
- T030: Registration flow test
- T031: Project creation test
- T032: Group connection test
- T033: Plan creation test
- T034: Account linking test
- T035: Session timeout test
- T037: Multi-tenant isolation test
```

---

## Validation Checklist

**GATE: All must be checked before feature marked complete**

- [x] All contract tests written (T004-T008)
- [x] All contract tests pass
- [x] All entities created (T009-T012)
- [x] All services implemented (T013-T016)
- [x] All handlers implemented (T017-T024)
- [x] Rate limiting enforced (T025-T026)
- [x] Controller implemented (T027-T029)
- [x] All integration tests pass (T030-T035, T037)
- [x] Error handling complete (T038-T040)
- [x] Module integrated (T041-T044)
- [x] Observability implemented (T045-T048)
- [x] Quickstart scenarios pass (T049)
- [x] Performance targets met (T050)
- [x] Lint + type-check pass (T051)
- [x] Documentation updated (T052-T053)

---

## Notes

- **TDD Workflow**: Tests (T004-T008) MUST fail before implementation
- **Parallel Tasks**: [P] tasks can run simultaneously (different files)
- **Commit Strategy**: Commit after each task completion
- **Error Handling**: Follow constitutional error response format
- **Multi-Tenancy**: RLS policies enforce isolation (no manual filtering)
- **Security**: Bot tokens encrypted, rate limiting enforced, signatures verified
- **Performance**: <3s bot response, <5s Telegram API calls

---

**Total Tasks**: 53 (16 parallel, 37 sequential)
**Critical Path**: T001 → T003 → T009 → T013 → T016 → T017 → T027 → T049 → T053
**Estimated Duration**: 15-20 working days (1 developer with parallelization)

---

*Based on plan.md Phase 2 approach*
*Design docs: research.md, data-model.md, contracts/, quickstart.md*
*Constitution: v1.2.0*
