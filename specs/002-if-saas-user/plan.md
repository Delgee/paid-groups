# Implementation Plan: Owner User Management

**Branch**: `002-if-saas-user` | **Date**: 2025-09-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/delgee/workspace/saas/paid-groups/specs/002-if-saas-user/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Feature spec loaded: Owner User Management functionality
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Project Type detected: web (frontend + backend)
   → Structure Decision: Option 2 - Web application
3. Evaluate Constitution Check section below
   → Initial review shows compliance with simplicity principles
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → All technical details clarified from existing system
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
6. Re-evaluate Constitution Check section
   → Post-design review for violations
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Primary requirement: Enable SaaS owners to create admin and moderator users through the frontend interface with role-based permissions and validation. Technical approach leverages existing multi-tenant architecture with PostgreSQL RLS, NestJS backend API endpoints, and Next.js frontend user management interface.

## Technical Context
**Language/Version**: TypeScript (Node.js 18+, React 18)
**Primary Dependencies**: NestJS, Next.js 14 (App Router), Prisma ORM, PostgreSQL, Tailwind CSS, Shadcn/UI
**Storage**: PostgreSQL with Row-Level Security (existing users table)
**Testing**: Jest (backend), Playwright (E2E), React Testing Library (frontend)
**Target Platform**: Web browsers (Chrome 100+, Firefox 100+, Safari 15+)
**Project Type**: web - determines source structure (frontend + backend)
**Performance Goals**: <500ms form submission response, <2s page load
**Constraints**: Multi-tenant isolation, role-based access control, email uniqueness per tenant
**Scale/Scope**: Supporting existing user management for unlimited admin/moderator creation per tenant

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 2 (backend api, frontend ui)
- Using framework directly? Yes (NestJS controllers, Next.js pages)
- Single data model? Yes (existing users table with role enum)
- Avoiding patterns? Yes (direct Prisma usage, no repository abstraction)

**Architecture**:
- EVERY feature as library? Yes (user-management service module)
- Libraries listed: backend/src/modules/user-management (CRUD operations, validation), frontend/src/components/user-management (UI components, forms)
- CLI per library: Yes (nestjs cli commands, next dev/build commands)
- Library docs: llms.txt format planned? Yes (update CLAUDE.md)

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? Yes (contract tests first)
- Git commits show tests before implementation? Will be enforced
- Order: Contract→Integration→E2E→Unit strictly followed? Yes
- Real dependencies used? Yes (PostgreSQL testcontainer, Redis)
- Integration tests for: new API endpoints, frontend form submission, role validation
- FORBIDDEN: Implementation before test, skipping RED phase

**Observability**:
- Structured logging included? Yes (NestJS logger, audit logging for user creation)
- Frontend logs → backend? Yes (error tracking, user actions)
- Error context sufficient? Yes (validation errors, form feedback)

**Versioning**:
- Version number assigned? Current feature version 1.0.0
- BUILD increments on every change? Yes (semantic versioning)
- Breaking changes handled? N/A (new feature, no existing API changes)

## Project Structure

### Documentation (this feature)
```
specs/002-if-saas-user/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── modules/
│   │   └── user-management/     # New module
│   │       ├── user-management.controller.ts
│   │       ├── user-management.service.ts
│   │       ├── dto/
│   │       └── __tests__/
│   ├── common/
│   │   ├── guards/             # Role-based guards
│   │   └── decorators/         # Permission decorators
│   └── database/
└── tests/
    ├── contract/               # API contract tests
    ├── integration/            # Database integration tests
    └── unit/                   # Service unit tests

frontend/
├── src/
│   ├── app/
│   │   └── (dashboard)/
│   │       └── users/          # New user management pages
│   ├── components/
│   │   └── user-management/    # New UI components
│   │       ├── CreateUserForm.tsx
│   │       ├── UserList.tsx
│   │       └── UserManagementCard.tsx
│   └── lib/
│       └── api/                # API client methods
└── tests/
    ├── e2e/                    # Playwright tests
    └── components/             # Component tests
```

**Structure Decision**: Option 2 - Web application (frontend + backend detected)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - All technical details are known from existing system
   - Dependencies already established
   - Integration patterns already implemented

2. **Generate and dispatch research agents**:
   - No unknown technologies - using established stack
   - Review existing user management patterns in codebase
   - Examine current role-based access control implementation

3. **Consolidate findings** in `research.md` using format:
   - Decision: Extend existing users table and auth system
   - Rationale: Leverages established multi-tenant architecture
   - Alternatives considered: New user management service vs extending existing

**Output**: research.md with system analysis and approach decisions

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - User entity (existing) with role field validation
   - CreateUserRequest/Response DTOs
   - Role-based permission mappings

2. **Generate API contracts** from functional requirements:
   - POST /api/users (create admin/moderator user)
   - GET /api/users (list users for owner)
   - Input validation schemas and response formats
   - Output OpenAPI spec to `/contracts/`

3. **Generate contract tests** from contracts:
   - POST /api/users contract test (request/response validation)
   - Role-based access control tests
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Owner creates admin user scenario
   - Owner creates moderator user scenario
   - Duplicate email validation scenario
   - Form validation error scenarios

5. **Update agent file incrementally** (O(1) operation):
   - Update existing CLAUDE.md with user management context
   - Add API endpoints and component patterns
   - Preserve existing project context
   - Keep under 150 lines for token efficiency

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate from Phase 1 design: 4 contract tests, 3 integration tests, 8 implementation tasks
- Each API endpoint → contract test task [P]
- Each UI component → component test task [P]
- Each user story → E2E test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Contract tests → Integration tests → E2E tests → Implementation
- Dependency order: Backend DTOs → API endpoints → Frontend components → Pages
- Mark [P] for parallel execution (independent components)

**Estimated Output**: 18-22 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No constitutional violations identified - table left empty*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| - | - | - |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*