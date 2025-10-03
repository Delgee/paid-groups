# Data Model: Telegram Group Management

## Entity Overview

The telegram group management feature extends the existing database schema by enhancing the current `telegram_groups` table and adding new fields to support the feature requirements.

## Primary Entities

### TelegramGroup (Enhanced)

**Purpose**: Represents a managed Telegram group/channel entity within the platform with connection status and synchronization capabilities.

**Table**: `telegram_groups` (existing, enhanced)

#### Core Fields
```typescript
interface TelegramGroup {
  // Existing fields (maintained)
  id: string;                    // UUID primary key
  tenant_id: string;             // UUID foreign key to tenants
  bot_id: string;                // UUID foreign key to telegram_bots
  telegram_chat_id: bigint;      // Telegram's chat ID (unique)
  group_name: string;            // Display name in dashboard
  group_type: 'group' | 'supergroup' | 'channel';
  username?: string;             // @username if public
  invite_link?: string;          // Telegram invite link
  member_count: number;          // Current member count
  is_active: boolean;            // General active status
  settings: Record<string, any>; // Flexible JSON settings
  created_at: Date;
  updated_at: Date;

  // New fields for this feature
  description?: string;          // Group description (sync with Telegram)
  bot_assigned: boolean;         // Bot has admin permissions (FR-011)
  last_sync_at?: Date;          // Last successful sync to Telegram
  sync_enabled: boolean;        // Auto-sync enabled (FR-012)
  connection_status: 'pending' | 'connected' | 'failed' | 'disconnected';
  sync_errors?: string;         // Last sync error message
}
```

#### Relationships
- **Many-to-One** with `Tenant` (cascade delete)
- **Many-to-One** with `TelegramBot` (cascade delete)
- **One-to-Many** with `MembershipPlan`
- **One-to-Many** with `Membership`

#### Indexes
```sql
-- Existing indexes (maintained)
CREATE INDEX "IDX_telegram_groups_tenant_id" ON telegram_groups (tenant_id);
CREATE INDEX "IDX_telegram_groups_bot_id" ON telegram_groups (bot_id);
CREATE INDEX "IDX_telegram_groups_telegram_chat_id" ON telegram_groups (telegram_chat_id);

-- New indexes for enhanced functionality
CREATE INDEX "IDX_telegram_groups_bot_assigned" ON telegram_groups (bot_assigned);
CREATE INDEX "IDX_telegram_groups_sync_enabled" ON telegram_groups (sync_enabled);
CREATE INDEX "IDX_telegram_groups_connection_status" ON telegram_groups (connection_status);
```

#### Constraints
```sql
-- Existing constraints (maintained)
UNIQUE (telegram_chat_id)
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
FOREIGN KEY (bot_id) REFERENCES telegram_bots(id) ON DELETE CASCADE

-- New constraints
CHECK (connection_status IN ('pending', 'connected', 'failed', 'disconnected'))
CHECK (group_type IN ('group', 'supergroup', 'channel'))
```

## Supporting Entities

### TelegramBot (Reference)

**Purpose**: Existing entity that provides bot credentials and configuration for Telegram group management.

**Key Fields for Integration**:
```typescript
interface TelegramBot {
  id: string;
  tenant_id: string;
  bot_token: string;        // Encrypted bot token
  bot_username?: string;
  bot_name: string;
  is_active: boolean;
  // ... other existing fields
}
```

### Tenant (Reference)

**Purpose**: Existing multi-tenant isolation entity.

**Key Fields for Integration**:
```typescript
interface Tenant {
  id: string;
  company_name: string;
  is_active: boolean;
  // ... other existing fields
}
```

## Data Transfer Objects (DTOs)

### CreateTelegramGroupDto
```typescript
interface CreateTelegramGroupDto {
  group_name: string;           // Required, 1-255 characters
  description?: string;         // Optional, max 1000 characters
  bot_id: string;              // UUID of associated bot
  settings?: Record<string, any>; // Optional settings
}
```

### UpdateTelegramGroupDto
```typescript
interface UpdateTelegramGroupDto {
  group_name?: string;          // Optional, 1-255 characters
  description?: string;         // Optional, max 1000 characters
  sync_enabled?: boolean;       // Enable/disable auto-sync
  settings?: Record<string, any>; // Optional settings
}
```

### ConnectChannelDto
```typescript
interface ConnectChannelDto {
  telegram_chat_id: string;     // Telegram chat ID (number as string)
  invite_link?: string;         // Optional invite link
  verify_permissions?: boolean; // Verify bot admin permissions
}
```

### TelegramGroupSummaryDto
```typescript
interface TelegramGroupSummaryDto {
  id: string;
  group_name: string;
  description?: string;
  group_type: string;
  member_count: number;
  is_active: boolean;
  bot_assigned: boolean;
  connection_status: string;
  last_sync_at?: Date;
  created_at: Date;
  bot: {
    id: string;
    bot_name: string;
    bot_username?: string;
  };
}
```

## Validation Rules

### Business Rules (from FR requirements)

#### FR-001: Group Creation
- **group_name**: Required, 1-255 characters, unique within tenant
- **description**: Optional, max 1000 characters
- **bot_id**: Must reference active bot within same tenant

#### FR-005: Channel Connection
- **telegram_chat_id**: Must be valid Telegram chat ID format
- **invite_link**: Must be valid Telegram invite link format if provided
- **bot_assigned**: Set to true only after successful permission verification

#### FR-006: Data Validation
- **group_name**: No special characters except spaces, hyphens, underscores
- **description**: Plain text only, no markdown or HTML
- **settings**: Valid JSON object

#### FR-011: Active Status
- **bot_assigned**: Automatically set when bot admin permissions verified
- **connection_status**: Updated based on Telegram API responses

#### FR-012: Synchronization
- **sync_enabled**: Can only be true when bot_assigned is true
- **last_sync_at**: Updated on successful Telegram channel updates
- **sync_errors**: Cleared on successful sync, populated on failures

### Technical Constraints

#### Multi-Tenant Isolation
- All operations must include tenant_id filter
- Cross-tenant access prevented by RLS policies
- Foreign key relationships maintain tenant boundaries

#### Telegram API Constraints
- **telegram_chat_id**: Must be negative for groups/channels
- **group_type**: Must match actual Telegram chat type
- **member_count**: Updated via periodic sync jobs

#### Performance Constraints
- Indexes on frequently queried fields (tenant_id, bot_assigned, sync_enabled)
- JSONB settings field for flexible metadata storage
- Pagination required for list operations (limit 50 per page)

## State Transitions

### Connection Status Flow
```
pending → connected    (successful bot permission verification)
pending → failed       (bot permission verification failed)
connected → failed     (sync operation failed)
failed → connected     (retry successful)
connected → disconnected (manual disconnection)
disconnected → pending (reconnection attempt)
```

### Bot Assignment Flow
```
bot_assigned: false → true   (successful admin permission verification)
bot_assigned: true → false   (permission verification failed)
```

### Sync Process Flow
```
sync_enabled: false → true   (user enables, requires bot_assigned: true)
sync_enabled: true → false   (user disables or bot_assigned becomes false)
```

## Migration Strategy

### Database Migration
```sql
-- Add new columns to existing telegram_groups table
ALTER TABLE telegram_groups
ADD COLUMN description TEXT,
ADD COLUMN bot_assigned BOOLEAN DEFAULT false,
ADD COLUMN last_sync_at TIMESTAMP,
ADD COLUMN sync_enabled BOOLEAN DEFAULT false,
ADD COLUMN connection_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN sync_errors TEXT;

-- Add new indexes
CREATE INDEX "IDX_telegram_groups_bot_assigned" ON telegram_groups (bot_assigned);
CREATE INDEX "IDX_telegram_groups_sync_enabled" ON telegram_groups (sync_enabled);
CREATE INDEX "IDX_telegram_groups_connection_status" ON telegram_groups (connection_status);

-- Add check constraints
ALTER TABLE telegram_groups
ADD CONSTRAINT "CHK_connection_status"
CHECK (connection_status IN ('pending', 'connected', 'failed', 'disconnected'));
```

### Data Migration
```sql
-- Update existing records to have proper initial state
UPDATE telegram_groups
SET connection_status = 'connected',
    bot_assigned = true,
    sync_enabled = false
WHERE is_active = true;

UPDATE telegram_groups
SET connection_status = 'disconnected',
    bot_assigned = false,
    sync_enabled = false
WHERE is_active = false;
```

## Relationships Diagram

```
Tenant (1) ←→ (Many) TelegramBot (1) ←→ (Many) TelegramGroup
                                                    ↓
                                           (Many) MembershipPlan
                                                    ↓
                                              (Many) Membership
```

This data model provides the foundation for implementing telegram group management with proper multi-tenant isolation, Telegram API integration, and synchronization capabilities while maintaining compatibility with the existing schema.