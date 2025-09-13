# Tasks: Owner User Management

**Input**: Design documents from `/home/delgee/workspace/saas/paid-groups/specs/002-if-saas-user/`
**Prerequisites**: plan.md (✓), research.md (✓), data-model.md (✓), contracts/ (✓), quickstart.md (✓)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript, NestJS, Next.js 14, Prisma ORM, PostgreSQL
   → Structure: Web application (backend/ + frontend/)
2. Load design documents:
   → data-model.md: CreateUserRequestDto, CreateUserResponseDto, GetUsersResponseDto
   → contracts/: POST /api/users, GET /api/users endpoints
   → quickstart.md: 6 test scenarios (happy path, validation, errors)
3. Generate tasks by category:
   → Setup: project structure, dependencies
   → Tests: contract tests, integration tests, E2E tests
   → Core: DTOs, services, controllers, UI components
   → Integration: API client, form validation, error handling
   → Polish: unit tests, performance validation
4. Task rules applied:
   → Different files = [P] for parallel execution
   → Tests before implementation (TDD enforced)
   → Backend before frontend (API dependency)
5. Tasks numbered T001-T024
6. Dependencies validated
7. Parallel execution examples provided
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [ ] T001 Create user-management module structure in backend/src/modules/user-management/
- [ ] T002 Add user management route in frontend/src/app/(dashboard)/users/
- [ ] T003 [P] Install and configure validation dependencies (class-validator, zod)

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T004 [P] Contract test POST /api/users in backend/tests/contract/user-management.post.spec.ts
- [ ] T005 [P] Contract test GET /api/users in backend/tests/contract/user-management.get.spec.ts
- [ ] T006 [P] Integration test user creation workflow in backend/tests/integration/user-creation.spec.ts
- [ ] T007 [P] Integration test role-based access control in backend/tests/integration/user-authorization.spec.ts
- [ ] T008 [P] E2E test owner creates admin user in frontend/tests/e2e/create-admin-user.spec.ts
- [ ] T009 [P] E2E test owner creates moderator user in frontend/tests/e2e/create-moderator-user.spec.ts
- [ ] T010 [P] E2E test validation error handling in frontend/tests/e2e/user-validation-errors.spec.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Backend Implementation
- [ ] T011 [P] CreateUserRequestDto in backend/src/modules/user-management/dto/create-user-request.dto.ts
- [ ] T012 [P] CreateUserResponseDto in backend/src/modules/user-management/dto/create-user-response.dto.ts
- [ ] T013 [P] GetUsersResponseDto in backend/src/modules/user-management/dto/get-users-response.dto.ts
- [ ] T014 UserManagementService in backend/src/modules/user-management/user-management.service.ts
- [ ] T015 UserManagementController in backend/src/modules/user-management/user-management.controller.ts
- [ ] T016 Role-based guard for owner permissions in backend/src/common/guards/owner-role.guard.ts

### Frontend Implementation
- [ ] T017 [P] User management API client in frontend/src/lib/api/users.ts
- [ ] T018 [P] CreateUserForm component in frontend/src/components/user-management/CreateUserForm.tsx
- [ ] T019 [P] UserList component in frontend/src/components/user-management/UserList.tsx
- [ ] T020 User management page in frontend/src/app/(dashboard)/users/page.tsx
- [ ] T021 Create user page in frontend/src/app/(dashboard)/users/create/page.tsx

## Phase 3.4: Integration
- [ ] T022 Connect UserManagementService to Prisma ORM with tenant isolation
- [ ] T023 Add user management routes to NestJS module exports
- [ ] T024 Integrate user management UI with dashboard navigation

## Phase 3.5: Polish
- [ ] T025 [P] Unit tests for CreateUserForm validation in frontend/src/components/user-management/__tests__/CreateUserForm.test.tsx
- [ ] T026 [P] Unit tests for UserManagementService in backend/src/modules/user-management/__tests__/user-management.service.spec.ts
- [ ] T027 Performance test API response times (<500ms) using quickstart scenarios
- [ ] T028 [P] Update backend API documentation in backend/docs/api.md
- [ ] T029 Run complete quickstart.md validation workflow

## Dependencies
- Setup (T001-T003) before everything
- Tests (T004-T010) before implementation (T011-T021)
- DTOs (T011-T013) before service (T014)
- Service (T014) before controller (T015)
- API client (T017) before frontend components (T018-T019)
- Components (T018-T019) before pages (T020-T021)
- Core implementation before integration (T022-T024)
- Implementation before polish (T025-T029)

## Parallel Execution Examples

### Tests Phase (After T001-T003)
```bash
# Launch T004-T010 together (all different files):
Task: "Contract test POST /api/users in backend/tests/contract/user-management.post.spec.ts"
Task: "Contract test GET /api/users in backend/tests/contract/user-management.get.spec.ts"
Task: "Integration test user creation workflow in backend/tests/integration/user-creation.spec.ts"
Task: "Integration test role-based access control in backend/tests/integration/user-authorization.spec.ts"
Task: "E2E test owner creates admin user in frontend/tests/e2e/create-admin-user.spec.ts"
Task: "E2E test owner creates moderator user in frontend/tests/e2e/create-moderator-user.spec.ts"
Task: "E2E test validation error handling in frontend/tests/e2e/user-validation-errors.spec.ts"
```

### DTO Creation (After tests fail)
```bash
# Launch T011-T013 together (independent DTOs):
Task: "CreateUserRequestDto in backend/src/modules/user-management/dto/create-user-request.dto.ts"
Task: "CreateUserResponseDto in backend/src/modules/user-management/dto/create-user-response.dto.ts"
Task: "GetUsersResponseDto in backend/src/modules/user-management/dto/get-users-response.dto.ts"
```

### Frontend Components (After T017)
```bash
# Launch T018-T019 together (independent components):
Task: "CreateUserForm component in frontend/src/components/user-management/CreateUserForm.tsx"
Task: "UserList component in frontend/src/components/user-management/UserList.tsx"
```

### Polish Phase (After integration)
```bash
# Launch T025, T026, T028 together (independent files):
Task: "Unit tests for CreateUserForm validation in frontend/src/components/user-management/__tests__/CreateUserForm.test.tsx"
Task: "Unit tests for UserManagementService in backend/src/modules/user-management/__tests__/user-management.service.spec.ts"
Task: "Update backend API documentation in backend/docs/api.md"
```

## Task Details

### T004: Contract Test POST /api/users
- Validate request schema matches CreateUserRequest
- Test all response codes: 201, 400, 401, 403, 409, 500
- Verify JWT authentication requirement
- Test role restriction to owner users only

### T008: E2E Test Owner Creates Admin User
- Complete workflow: login as owner → navigate to users → create admin → verify success
- Test form validation, API integration, UI feedback
- Verify user appears in list after creation

### T014: UserManagementService Implementation
- Implement createUser method with tenant isolation
- Hash passwords using bcrypt
- Validate email uniqueness within tenant
- Add comprehensive error handling

### T015: UserManagementController Implementation
- POST /api/users endpoint with role guard
- GET /api/users endpoint with pagination
- Input validation using DTOs
- Audit logging for user creation

### T018: CreateUserForm Component
- Form validation using Zod schema
- Password complexity requirements
- Role selection dropdown (admin/moderator)
- Error handling and user feedback

### T022: Prisma ORM Integration
- Configure tenant context in service methods
- Use existing users table with RLS policies
- Implement proper error handling for constraints
- Add audit logging entries

## Notes
- [P] tasks = different files, no dependencies between them
- All tests MUST fail before implementing corresponding functionality
- Commit after completing each task
- Each task should take 30-60 minutes to complete
- Validate tests pass after implementation tasks

## Task Generation Rules Applied

1. **From Contracts**:
   - POST /api/users → T004 (contract test), T015 (implementation)
   - GET /api/users → T005 (contract test), T015 (implementation)

2. **From Data Model**:
   - CreateUserRequestDto → T011 (model creation)
   - CreateUserResponseDto → T012 (model creation)
   - GetUsersResponseDto → T013 (model creation)

3. **From User Stories**:
   - Owner creates admin user → T008 (integration test)
   - Owner creates moderator user → T009 (integration test)
   - Validation error handling → T010 (integration test)

4. **Ordering Applied**:
   - Setup → Tests → Models → Services → Endpoints → UI → Polish
   - Dependencies respected (DTOs before services, services before controllers)

## Validation Checklist

- [x] All contracts have corresponding tests (T004-T005)
- [x] All entities have model tasks (T011-T013)
- [x] All tests come before implementation (T004-T010 before T011+)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] TDD enforced: tests must be written first and fail
- [x] All quickstart scenarios covered in E2E tests