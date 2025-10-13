# Data Model: Telegram Bot Onboarding

**Feature**: 002-in-this-app
**Date**: 2025-01-20

## Entity Overview

This feature introduces 2 new persistent entities and 1 transient entity:

1. **TelegramUserAccount** (persistent) - Links Telegram users to platform User accounts
2. **BotCommand** (persistent) - Audit log for bot interactions
3. **OnboardingSession** (transient, Redis) - Tracks multi-step conversation state

## Entity Definitions

### 1. TelegramUserAccount

**Purpose**: Bidirectional mapping between Telegram user IDs and platform User accounts

**Table**: `telegram_user_accounts`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| user_id | UUID | FK to users(id), NOT NULL, UNIQUE | Platform user account |
| telegram_user_id | BIGINT | NOT NULL, UNIQUE | Telegram user ID from Bot API |
| telegram_chat_id | BIGINT | NULL | Private chat ID with bot (may differ from user_id) |
| telegram_username | VARCHAR(255) | NULL | Telegram @username (can change) |
| telegram_first_name | VARCHAR(255) | NULL | User's first name from Telegram |
| telegram_last_name | VARCHAR(255) | NULL | User's last name from Telegram |
| linked_at | TIMESTAMP | NOT NULL, default NOW() | When account was linked |
| last_interaction_at | TIMESTAMP | NULL | Last bot command timestamp |
| is_active | BOOLEAN | NOT NULL, default TRUE | Can be deactivated without deletion |
| metadata | JSONB | default {} | Additional Telegram metadata |
| created_at | TIMESTAMP | NOT NULL, default NOW() | |
| updated_at | TIMESTAMP | NOT NULL, default NOW() | |

**Indexes**:
- PRIMARY KEY: `id`
- UNIQUE INDEX: `telegram_user_accounts_user_id_key` ON (`user_id`)
- UNIQUE INDEX: `telegram_user_accounts_telegram_user_id_key` ON (`telegram_user_id`)
- INDEX: `telegram_user_accounts_telegram_chat_id_idx` ON (`telegram_chat_id`)
- INDEX: `telegram_user_accounts_telegram_username_idx` ON (`telegram_username`)

**RLS Policy**:
```sql
-- tenant_isolation_select
CREATE POLICY tenant_isolation_select ON telegram_user_accounts
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM users WHERE tenant_id::text = current_setting('app.current_tenant', true)
  )
);

-- tenant_isolation_insert
CREATE POLICY tenant_isolation_insert ON telegram_user_accounts
FOR INSERT
WITH CHECK (
  user_id IN (
    SELECT id FROM users WHERE tenant_id::text = current_setting('app.current_tenant', true)
  )
);
```

**Relationships**:
- MANY-TO-ONE: `telegram_user_accounts.user_id` → `users.id` (CASCADE on delete)
- ONE-TO-MANY: User can have only ONE Telegram account (enforced by UNIQUE on user_id)

**Validation Rules**:
- `telegram_user_id` MUST be positive integer
- `telegram_username` MUST match pattern `^[a-zA-Z0-9_]{5,32}$` (if provided)
- `user_id` MUST reference existing User with OWNER role

---

### 2. BotCommand

**Purpose**: Audit log for all onboarding bot commands (analytics + debugging)

**Table**: `bot_commands`

**Fields**:
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK, auto-generated | Unique identifier |
| telegram_user_account_id | UUID | FK to telegram_user_accounts(id), NULL | Linked account (NULL for unregistered users) |
| telegram_user_id | BIGINT | NOT NULL | Telegram user ID who issued command |
| telegram_chat_id | BIGINT | NOT NULL | Chat ID where command was issued |
| command | VARCHAR(100) | NOT NULL | Command name (start, newproject, status, etc.) |
| parameters | JSONB | default {} | Command parameters (if any) |
| session_step | VARCHAR(50) | NULL | Session state when command issued |
| response_status | VARCHAR(20) | NOT NULL | success / error / rate_limited |
| error_code | VARCHAR(50) | NULL | Error code if response_status = error |
| response_time_ms | INTEGER | NULL | Command processing duration |
| correlation_id | UUID | NOT NULL | For tracing multi-step flows |
| user_agent | TEXT | NULL | Telegram client info (if available) |
| created_at | TIMESTAMP | NOT NULL, default NOW() | Command timestamp |

**Indexes**:
- PRIMARY KEY: `id`
- INDEX: `bot_commands_telegram_user_id_idx` ON (`telegram_user_id`)
- INDEX: `bot_commands_command_idx` ON (`command`)
- INDEX: `bot_commands_created_at_idx` ON (`created_at` DESC)
- INDEX: `bot_commands_correlation_id_idx` ON (`correlation_id`)
- INDEX: `bot_commands_response_status_idx` ON (`response_status`)

**RLS Policy**:
```sql
-- tenant_isolation_select
CREATE POLICY tenant_isolation_select ON bot_commands
FOR SELECT
USING (
  telegram_user_account_id IS NULL OR
  telegram_user_account_id IN (
    SELECT id FROM telegram_user_accounts WHERE user_id IN (
      SELECT id FROM users WHERE tenant_id::text = current_setting('app.current_tenant', true)
    )
  )
);

-- tenant_isolation_insert
CREATE POLICY tenant_isolation_insert ON bot_commands
FOR INSERT
WITH CHECK (TRUE); -- All commands can be logged (tenant association done via telegram_user_account_id)
```

**Relationships**:
- MANY-TO-ONE: `bot_commands.telegram_user_account_id` → `telegram_user_accounts.id` (SET NULL on delete)

**Validation Rules**:
- `command` MUST be one of: start, newproject, addgroup, createplan, status, link, cancel, help
- `response_status` MUST be one of: success, error, rate_limited
- `response_time_ms` MUST be >= 0

---

### 3. OnboardingSession (Redis)

**Purpose**: Track multi-step conversation state (transient, 1-hour TTL)

**Storage**: Redis Hash

**Key Pattern**: `onboarding:session:{telegram_user_id}`

**Fields** (stored as JSON):
```typescript
interface OnboardingSession {
  telegram_user_id: number;          // Telegram user ID
  telegram_chat_id: number;          // Private chat ID
  current_step: SessionStep;         // Current state in flow
  started_at: string;                // ISO timestamp
  last_activity_at: string;          // ISO timestamp for timeout tracking
  correlation_id: string;            // UUID for tracing
  data: SessionData;                 // Step-specific collected data
}

enum SessionStep {
  IDLE = 'IDLE',
  REGISTRATION_EMAIL = 'REGISTRATION_EMAIL',
  REGISTRATION_NAME = 'REGISTRATION_NAME',
  REGISTRATION_COMPANY = 'REGISTRATION_COMPANY',
  PROJECT_NAME = 'PROJECT_NAME',
  PROJECT_DESCRIPTION = 'PROJECT_DESCRIPTION',
  BOT_TOKEN = 'BOT_TOKEN',
  GROUP_SELECTION = 'GROUP_SELECTION',
  GROUP_TYPE = 'GROUP_TYPE',
  GROUP_CONNECTION = 'GROUP_CONNECTION',
  PLAN_GROUP_SELECTION = 'PLAN_GROUP_SELECTION',
  PLAN_NAME = 'PLAN_NAME',
  PLAN_PRICE = 'PLAN_PRICE',
  PLAN_DURATION = 'PLAN_DURATION',
  PLAN_DESCRIPTION = 'PLAN_DESCRIPTION',
  LINK_EMAIL = 'LINK_EMAIL',
  LINK_VERIFICATION = 'LINK_VERIFICATION',
}

interface SessionData {
  // Registration flow
  email?: string;
  name?: string;
  company_name?: string;
  user_id?: string;              // Created user ID
  tenant_id?: string;            // Created tenant ID

  // Project flow
  project_name?: string;
  project_description?: string;
  bot_token?: string;
  bot_username?: string;
  project_id?: string;           // Created project ID

  // Group flow
  selected_project_id?: string;
  group_type?: 'channel' | 'group';
  channel_id?: string;
  channel_title?: string;
  telegram_group_id?: string;    // Created TelegramGroup ID

  // Plan flow
  selected_groups?: string[];    // Array of telegram_group IDs
  plan_name?: string;
  plan_price?: number;
  plan_duration?: string;
  plan_description?: string;
  membership_plan_id?: string;   // Created MembershipPlan ID

  // Link flow
  link_email?: string;
  verification_code?: string;

  // Resume support
  can_resume?: boolean;
  resume_offered?: boolean;
}
```

**TTL**: 3600 seconds (1 hour)

**Operations**:
- `GET onboarding:session:{telegram_user_id}` → Retrieve session or NULL
- `SET onboarding:session:{telegram_user_id} {json} EX 3600` → Create/update session
- `DEL onboarding:session:{telegram_user_id}` → Clear session (on completion or cancel)
- `TTL onboarding:session:{telegram_user_id}` → Check remaining time

**Validation Rules**:
- Session MUST expire after 1 hour of inactivity (TTL auto-enforced)
- `current_step` transitions MUST follow valid state machine paths
- `data` fields MUST match current_step requirements

---

## State Machine

### Valid State Transitions

```
IDLE → REGISTRATION_EMAIL → REGISTRATION_NAME → REGISTRATION_COMPANY → IDLE (registration complete)
IDLE → PROJECT_NAME → PROJECT_DESCRIPTION → BOT_TOKEN → IDLE (project created)
IDLE → GROUP_SELECTION → GROUP_TYPE → GROUP_CONNECTION → IDLE (group connected)
IDLE → PLAN_GROUP_SELECTION → PLAN_NAME → PLAN_PRICE → PLAN_DURATION → PLAN_DESCRIPTION → IDLE (plan created)
IDLE → LINK_EMAIL → LINK_VERIFICATION → IDLE (account linked)

Any state → IDLE (on /cancel command)
```

### Session Lifecycle

1. **Session Start**: First bot command creates session with `IDLE` state
2. **State Progression**: Each user response advances to next step
3. **Session Timeout**: Redis TTL expires after 1 hour → user must restart
4. **Session Completion**: Successful flow completion → session deleted
5. **Session Cancellation**: `/cancel` command → session deleted

---

## Database Migration

**File**: `backend/migrations/{timestamp}-create-onboarding-bot-tables.ts`

**Operations**:
1. Create `telegram_user_accounts` table with indexes and RLS
2. Create `bot_commands` table with indexes and RLS
3. Add foreign key constraints
4. Enable RLS on both tables
5. Grant appropriate permissions to application role

**Rollback**:
- Drop tables in reverse order (FK constraints)
- RLS policies auto-dropped with tables

---

## Entity Usage in Workflows

### Registration Flow
1. User sends `/start` → BotCommand logged
2. Bot asks for email → OnboardingSession.current_step = REGISTRATION_EMAIL
3. User provides email → Session.data.email stored, step = REGISTRATION_NAME
4. User provides name → Session.data.name stored, step = REGISTRATION_COMPANY
5. User provides company → Session.data.company_name stored
6. System creates Tenant + User → stores user_id in session
7. System creates TelegramUserAccount linking telegram_user_id to user_id
8. Session deleted, back to IDLE

### Project Creation Flow
1. User sends `/newproject` → BotCommand logged, session step = PROJECT_NAME
2. User provides name → Session.data.project_name stored, step = PROJECT_DESCRIPTION
3. User provides description (or skips) → Session.data.project_description stored, step = BOT_TOKEN
4. User provides token → System validates via Telegram API, stores encrypted in Project
5. Project created → project_id stored in session
6. Session deleted, back to IDLE

### Group Connection Flow
1. User sends `/addgroup` → session step = GROUP_SELECTION
2. If multiple projects: User selects project → selected_project_id stored
3. Bot asks group type → session step = GROUP_TYPE
4. User selects type → group_type stored, step = GROUP_CONNECTION
5. User forwards message or sends link → System extracts chat_id, verifies bot permissions
6. TelegramGroup created → telegram_group_id stored
7. Session deleted, back to IDLE

### Plan Creation Flow
1. User sends `/createplan` → session step = PLAN_GROUP_SELECTION
2. Bot lists groups → User selects groups → selected_groups[] stored, step = PLAN_NAME
3. User provides name → plan_name stored, step = PLAN_PRICE
4. User provides price → plan_price stored, step = PLAN_DURATION
5. User selects duration → plan_duration stored, step = PLAN_DESCRIPTION
6. User provides description (or skips) → plan_description stored
7. MembershipPlan created with links to groups → membership_plan_id stored
8. Session deleted, back to IDLE

---

## Performance Considerations

### Read Performance
- **TelegramUserAccount lookups**: O(1) via unique index on `telegram_user_id`
- **BotCommand queries**: Indexed by `telegram_user_id`, `command`, `created_at`
- **OnboardingSession**: O(1) Redis hash lookup

### Write Performance
- **TelegramUserAccount creation**: Low frequency (once per user)
- **BotCommand logging**: High frequency but async (fire-and-forget)
- **OnboardingSession updates**: High frequency but Redis handles easily

### Storage Estimates (1000 users, 12 months)
- **TelegramUserAccount**: ~1000 rows × 500 bytes = 500 KB
- **BotCommand**: ~1000 users × 50 commands/user = 50K rows × 800 bytes = 40 MB
- **OnboardingSession**: ~50 concurrent sessions × 2 KB = 100 KB (transient)

**Total**: ~41 MB per 1000 users (negligible)

---

## Security Measures

1. **Multi-Tenant Isolation**: RLS policies enforce tenant boundaries
2. **Telegram User ID Uniqueness**: Prevents duplicate account linking
3. **User ID Uniqueness**: One Telegram account per User
4. **Audit Trail**: All commands logged in bot_commands table
5. **Session Expiration**: Automatic cleanup after 1 hour
6. **Bot Token Encryption**: Stored encrypted in Project entity

---

**Phase 1 Data Model Status**: ✅ COMPLETE
**Next Step**: Generate API contracts
