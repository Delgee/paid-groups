# Tasks: Telegram Group Management

**Input**: Design documents from `/specs/003-create-telegram-group/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓)

## Phase 3.1: Setup

- [x] T001 [P] Add Telegraph library dependency to backend package.json
- [x] T002 [P] Configure test environment variables for Telegram Bot API testing
- [x] T003 [P] Update database migration for telegram_groups table enhancements

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests
- [x] T004 [P] Contract test GET /v1/telegram-groups in backend/test/contract/telegram-groups/telegram-groups-list.contract.spec.ts
- [x] T005 [P] Contract test POST /v1/telegram-groups in backend/test/contract/telegram-groups/telegram-groups-create.contract.spec.ts
- [x] T006 [P] Contract test GET /v1/telegram-groups/{id} in backend/test/contract/telegram-groups/telegram-groups-get.contract.spec.ts
- [x] T007 [P] Contract test PUT /v1/telegram-groups/{id} in backend/test/contract/telegram-groups/telegram-groups-update.contract.spec.ts
- [x] T008 [P] Contract test DELETE /v1/telegram-groups/{id} in backend/test/contract/telegram-groups/telegram-groups-delete.contract.spec.ts
- [x] T009 [P] Contract test POST /v1/telegram-groups/{id}/connect-channel in backend/test/contract/telegram-groups/telegram-groups-connect.contract.spec.ts
- [x] T010 [P] Contract test POST /v1/telegram-groups/{id}/sync in backend/test/contract/telegram-groups/telegram-groups-sync.contract.spec.ts

### Integration Tests
- [x] T011 [P] Integration test telegram group CRUD workflow in backend/test/integration/telegram-groups-crud.integration.spec.ts
- [x] T012 [P] Integration test channel connection and bot permission verification in backend/test/integration/telegram-channel-connection.integration.spec.ts
- [x] T013 [P] Integration test auto-sync functionality with active groups in backend/test/integration/telegram-sync.integration.spec.ts
- [x] T014 [P] Integration test multi-tenant isolation for telegram groups in backend/test/integration/telegram-groups-tenant-isolation.integration.spec.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Backend Models and DTOs
- [x] T015 [P] Create TelegramGroup entity enhancements in backend/src/modules/telegram-groups/telegram-groups.entity.ts
- [x] T016 [P] Create CreateTelegramGroupDto in backend/src/modules/telegram-groups/dto/create-telegram-group.dto.ts
- [x] T017 [P] Create UpdateTelegramGroupDto in backend/src/modules/telegram-groups/dto/update-telegram-group.dto.ts
- [x] T018 [P] Create ConnectChannelDto in backend/src/modules/telegram-groups/dto/connect-channel.dto.ts

### Telegram Integration Services
- [x] T019 [P] Enhance TelegramApiService with channel management methods in backend/src/integrations/telegram/telegram-api.service.ts
- [x] T020 [P] Create TelegramChannelService for channel operations in backend/src/integrations/telegram/telegram-channel.service.ts
- [x] T021 [P] Create TelegramSyncService for auto-sync functionality in backend/src/integrations/telegram/telegram-sync.service.ts

### Core Business Logic
- [x] T022 Create TelegramGroupsService with CRUD operations in backend/src/modules/telegram-groups/telegram-groups.service.ts
- [x] T023 Create TelegramGroupsController with all endpoints in backend/src/modules/telegram-groups/telegram-groups.controller.ts
- [x] T024 Add input validation and error handling for telegram group operations
- [x] T025 Implement bot permission verification logic

### Database Migration
- [x] T026 Create database migration to add new telegram_groups columns in backend/src/database/migrations/1730000011000-EnhanceTelegramGroups.ts

## Phase 3.4: Frontend Implementation

### Frontend Components
- [x] T027 [P] Create TelegramGroupForm component in frontend/components/telegram-groups/TelegramGroupForm.tsx
- [x] T028 [P] Create TelegramGroupList component in frontend/components/telegram-groups/TelegramGroupList.tsx
- [x] T029 [P] Create TelegramGroupCard component in frontend/components/telegram-groups/TelegramGroupCard.tsx
- [x] T030 [P] Create ChannelConnectionForm component in frontend/components/telegram-groups/ChannelConnectionForm.tsx

### Frontend Pages
- [x] T031 Create telegram groups list page in frontend/app/dashboard/telegram-groups/page.tsx
- [x] T032 Create telegram group creation page in frontend/app/dashboard/telegram-groups/create/page.tsx
- [x] T033 Create telegram group edit page in frontend/app/dashboard/telegram-groups/[id]/edit/page.tsx

### Frontend API Client
- [x] T034 [P] Create telegram groups API client methods in frontend/lib/api/telegram-groups.ts

## Phase 3.5: Integration and Polish

### Module Integration
- [x] T035 Register TelegramGroupsModule in backend app.module.ts
- [x] T036 Add navigation links for telegram groups in frontend navigation (line 39 in app/dashboard/layout.tsx)

### Test Fixes (Critical - Post-Implementation)
- [x] T037 Fix CRUD integration test function signatures in backend/test/integration/telegram-groups-crud.integration.spec.ts
- [x] T038 Fix tenant isolation test timeouts and assertions in backend/test/integration/telegram-groups-tenant-isolation.integration.spec.ts
- [x] T039 Verify and fix contract tests (7 files in test/contract/telegram-groups/)
- [x] T040 Fix channel connection integration test signatures and types in backend/test/integration/telegram-channel-connection.integration.spec.ts
- [x] T041 Fix sync integration test signatures and types in backend/test/integration/telegram-sync.integration.spec.ts

### Redis Caching and Environment
- [x] T042 Implement caching for Telegram API responses using Redis

### Testing Environment Setup
- [x] T043 Configure test bot token and channel for development environment
- [x] T044 Add telegram groups to existing RLS policies and tenant context

### E2E Tests
- [x] T045 [P] E2E test complete telegram group management workflow in frontend/tests/e2e/telegram-groups-workflow.spec.ts
- [x] T046 [P] E2E test channel connection and sync operations in frontend/tests/e2e/telegram-channel-connection.spec.ts

### Polish and Documentation
- [x] T047 [P] Add rate limiting for Telegram API calls
- [x] T048 [P] Implement structured logging for telegram operations
- [x] T049 [P] Update CLAUDE.md with telegram groups patterns
- [x] T050 Run quickstart.md validation scenarios and fix any issues

## Dependencies

### Blocking Dependencies
- T001-T003 (Setup) before all implementation tasks
- T004-T014 (Tests) before T015-T045 (Implementation)
- T015-T018 (DTOs) before T022-T023 (Service/Controller)
- T019-T021 (Telegram Services) before T022 (Business Service)
- T026 (Migration) before T022 (Service)
- T027-T030 (Components) before T031-T033 (Pages)
- T034 (API Client) before T031-T033 (Pages)

### Sequential Dependencies
- T022 blocks T023 (Service before Controller)
- T035 blocks E2E tests (Module registration before E2E)
- T038-T039 blocks T040-T041 (Test setup before E2E)

## Parallel Execution Examples

### Phase 3.2 Contract Tests (Launch together):
```
Task: "Contract test GET /v1/telegram-groups in backend/tests/contract/telegram-groups-list.contract.spec.ts"
Task: "Contract test POST /v1/telegram-groups in backend/tests/contract/telegram-groups-create.contract.spec.ts"
Task: "Contract test GET /v1/telegram-groups/{id} in backend/tests/contract/telegram-groups-get.contract.spec.ts"
Task: "Contract test PUT /v1/telegram-groups/{id} in backend/tests/contract/telegram-groups-update.contract.spec.ts"
```

### Phase 3.3 Models and DTOs (Launch together):
```
Task: "Create TelegramGroup entity enhancements in backend/src/modules/telegram-groups/telegram-groups.entity.ts"
Task: "Create CreateTelegramGroupDto in backend/src/modules/telegram-groups/dto/create-telegram-group.dto.ts"
Task: "Create UpdateTelegramGroupDto in backend/src/modules/telegram-groups/dto/update-telegram-group.dto.ts"
Task: "Create ConnectChannelDto in backend/src/modules/telegram-groups/dto/connect-channel.dto.ts"
```

### Phase 3.4 Frontend Components (Launch together):
```
Task: "Create TelegramGroupForm component in frontend/components/telegram-groups/TelegramGroupForm.tsx"
Task: "Create TelegramGroupList component in frontend/components/telegram-groups/TelegramGroupList.tsx"
Task: "Create TelegramGroupCard component in frontend/components/telegram-groups/TelegramGroupCard.tsx"
Task: "Create ChannelConnectionForm component in frontend/components/telegram-groups/ChannelConnectionForm.tsx"
```

## Implementation Notes

### TDD Requirements
- All contract tests (T004-T010) must fail before implementation begins
- All integration tests (T011-T014) must fail before implementation begins
- Commit after each completed task
- Run tests after each implementation task to verify they pass

### Multi-Tenant Security
- All database operations must include tenant_id filtering
- RLS policies must be updated to cover new telegram_groups operations
- Bot tokens must be encrypted and scoped by tenant

### Telegram API Integration
- Implement proper rate limiting (30 requests/minute per bot)
- Cache responses in Redis with appropriate TTL
- Handle Telegram API errors gracefully with user-friendly messages
- Verify bot admin permissions before allowing channel connections

### Performance Requirements
- API response times < 500ms for CRUD operations
- Telegram API calls < 1s response time
- Page load times < 2s for frontend pages
- Implement optimistic updates for better UX

## Validation Checklist

- [x] All contracts have corresponding tests (T004-T010)
- [x] All entities have model tasks (T015-T018)
- [x] All tests come before implementation (T004-T014 before T015+)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Frontend and backend tasks properly separated
- [x] Integration tasks include multi-tenant testing
- [x] E2E tests cover complete user workflows

**Total Tasks**: 45 ordered tasks ready for execution
**Estimated Completion**: Following TDD principles with proper test coverage