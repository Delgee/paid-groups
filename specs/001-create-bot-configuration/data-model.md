# Data Model: Bot Configuration & Automated Payment Management

**Feature**: 001-create-bot-configuration
**Date**: 2025-10-07
**Status**: Complete

## Entity Definitions

### 1. BotConfiguration

Represents the configuration and settings for a Telegram bot managed by a SaaS user.

**Table Name**: `bot_configurations`

**Fields**:

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| tenant_id | uuid | NOT NULL, FOREIGN KEY(tenants.id) ON DELETE CASCADE | Multi-tenant isolation |
| bot_token | varchar(255) | NOT NULL, UNIQUE | Telegram bot API token |
| bot_username | varchar(255) | NOT NULL | Bot's @username from Telegram |
| display_name | varchar(255) | NOT NULL | Bot display name shown to users |
| description | text | NULL | Bot description (max 512 chars) |
| welcome_message | text | NOT NULL | Message sent on /start command |
| channel_id | bigint | NULL | Associated Telegram channel ID |
| channel_username | varchar(255) | NULL | Channel @username for verification |
| is_active | boolean | NOT NULL, DEFAULT true | Bot operational status |
| last_sync_at | timestamp | NULL | Last successful Telegram API sync |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Validation Rules**:
- `bot_token` format: Must match regex `^\d+:[A-Za-z0-9_-]{35}$`
- `bot_username` format: Must match regex `^[A-Za-z0-9_]{5,32}$`
- `display_name` length: 1-255 characters
- `description` length: 0-512 characters
- `welcome_message` length: 1-4096 characters (Telegram message limit)
- `channel_id` must be negative integer (Telegram channel IDs are negative)

**Indexes**:
```sql
CREATE INDEX idx_bot_configurations_tenant ON bot_configurations(tenant_id);
CREATE INDEX idx_bot_configurations_active ON bot_configurations(tenant_id, is_active);
CREATE UNIQUE INDEX idx_bot_configurations_token ON bot_configurations(bot_token);
CREATE INDEX idx_bot_configurations_channel ON bot_configurations(channel_id) WHERE channel_id IS NOT NULL;
```

**RLS Policies**:
```sql
ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON bot_configurations
  FOR SELECT
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_insert ON bot_configurations
  FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_update ON bot_configurations
  FOR UPDATE
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_delete ON bot_configurations
  FOR DELETE
  USING (tenant_id::text = current_setting('app.current_tenant', true));
```

**Business Rules**:
- One bot configuration can have 0-5 active membership plans
- Bot token must be validated via Telegram API before saving
- Channel permissions must be verified if `channel_id` is set
- Deleting bot configuration cascades to membership plans, payment transactions, and channel members

---

### 2. MembershipPlan

Represents a subscription tier/plan offered through a bot.

**Table Name**: `membership_plans`

**Fields**:

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| tenant_id | uuid | NOT NULL, FOREIGN KEY(tenants.id) ON DELETE CASCADE | Multi-tenant isolation |
| bot_configuration_id | uuid | NOT NULL, FOREIGN KEY(bot_configurations.id) ON DELETE CASCADE | Parent bot |
| name | varchar(255) | NOT NULL | Plan display name |
| description | text | NULL | Plan description/benefits |
| price | integer | NOT NULL, CHECK(price > 0) | Price in MNT (Mongolian Tugrik) |
| duration_days | integer | NOT NULL, CHECK(duration_days > 0) | Membership duration in days |
| is_active | boolean | NOT NULL, DEFAULT true | Plan availability status |
| sort_order | integer | NOT NULL, DEFAULT 0 | Display order (lower = higher priority) |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Validation Rules**:
- `name` length: 1-255 characters
- `description` length: 0-1024 characters
- `price` range: 1000-10000000 MNT (₮1,000 - ₮10,000,000)
- `duration_days` range: 1-365 days
- Maximum 5 active plans per bot (enforced in application layer)

**Indexes**:
```sql
CREATE INDEX idx_membership_plans_tenant ON membership_plans(tenant_id);
CREATE INDEX idx_membership_plans_bot ON membership_plans(bot_configuration_id, is_active, sort_order);
CREATE INDEX idx_membership_plans_active ON membership_plans(tenant_id, is_active);
```

**RLS Policies**:
```sql
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON membership_plans
  FOR SELECT
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_insert ON membership_plans
  FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_update ON membership_plans
  FOR UPDATE
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_delete ON membership_plans
  FOR DELETE
  USING (tenant_id::text = current_setting('app.current_tenant', true));
```

**Business Rules**:
- Plan price/duration changes only affect new purchases (existing members keep original terms)
- Cannot delete plan with active memberships (must deactivate instead)
- Cannot have more than 5 active plans per bot
- `sort_order` determines display order in bot UI (lower numbers shown first)

---

### 3. PaymentTransaction

Represents a payment attempt/completion for a membership plan.

**Table Name**: `payment_transactions`

**Fields**:

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| tenant_id | uuid | NOT NULL, FOREIGN KEY(tenants.id) ON DELETE CASCADE | Multi-tenant isolation |
| membership_plan_id | uuid | NOT NULL, FOREIGN KEY(membership_plans.id) ON DELETE RESTRICT | Selected plan |
| bot_configuration_id | uuid | NOT NULL, FOREIGN KEY(bot_configurations.id) ON DELETE CASCADE | Bot that processed payment |
| telegram_user_id | bigint | NOT NULL | Payer's Telegram user ID |
| telegram_username | varchar(255) | NULL | Payer's Telegram @username (can be null) |
| telegram_first_name | varchar(255) | NULL | Payer's first name from Telegram |
| telegram_last_name | varchar(255) | NULL | Payer's last name from Telegram |
| amount | integer | NOT NULL, CHECK(amount > 0) | Amount paid in MNT |
| plan_duration_days | integer | NOT NULL | Duration snapshot (from plan at purchase) |
| status | varchar(50) | NOT NULL, CHECK(status IN ('pending', 'completed', 'failed', 'refunded')) | Payment status |
| qpay_invoice_id | varchar(255) | NULL, UNIQUE | QPay invoice identifier |
| qpay_transaction_id | varchar(255) | NULL | QPay transaction identifier |
| qpay_payment_method | varchar(100) | NULL | Payment method used (qpay_wallet, mobile_bank, qr_code) |
| payment_link | text | NULL | QPay payment link sent to user |
| expires_at | timestamp | NULL | Membership expiration date (set on completion) |
| completed_at | timestamp | NULL | Payment completion timestamp |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Validation Rules**:
- `telegram_user_id` must be positive integer
- `telegram_username` format: `^[A-Za-z0-9_]{5,32}$` (if not null)
- `amount` range: 1000-10000000 MNT
- `plan_duration_days` range: 1-365
- `status` transitions: pending → completed/failed, completed → refunded
- `qpay_invoice_id` must be unique (idempotency key)
- `expires_at` = `completed_at` + `plan_duration_days` (calculated on completion)

**Indexes**:
```sql
CREATE INDEX idx_payment_transactions_tenant ON payment_transactions(tenant_id);
CREATE INDEX idx_payment_transactions_user ON payment_transactions(telegram_user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(tenant_id, status);
CREATE INDEX idx_payment_transactions_bot ON payment_transactions(bot_configuration_id, status);
CREATE UNIQUE INDEX idx_payment_transactions_qpay_invoice ON payment_transactions(qpay_invoice_id) WHERE qpay_invoice_id IS NOT NULL;
CREATE INDEX idx_payment_transactions_expiration ON payment_transactions(expires_at) WHERE status = 'completed' AND expires_at IS NOT NULL;
```

**RLS Policies**:
```sql
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON payment_transactions
  FOR SELECT
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_insert ON payment_transactions
  FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_update ON payment_transactions
  FOR UPDATE
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_delete ON payment_transactions
  FOR DELETE
  USING (tenant_id::text = current_setting('app.current_tenant', true));
```

**Business Rules**:
- Payment transaction created in `pending` status when user initiates payment
- Updated to `completed` when QPay webhook confirms payment
- Membership expiration calculated as: `completed_at + plan_duration_days`
- Failed payments can be retried (unlimited attempts, user must restart from /start)
- Refunds change status to `refunded` but preserve original transaction data
- `qpay_invoice_id` uniqueness prevents duplicate webhook processing

---

### 4. ChannelMember

Represents an active or expired membership in a Telegram channel.

**Table Name**: `channel_members`

**Fields**:

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| tenant_id | uuid | NOT NULL, FOREIGN KEY(tenants.id) ON DELETE CASCADE | Multi-tenant isolation |
| payment_transaction_id | uuid | NOT NULL, FOREIGN KEY(payment_transactions.id) ON DELETE CASCADE | Associated payment |
| bot_configuration_id | uuid | NOT NULL, FOREIGN KEY(bot_configurations.id) ON DELETE CASCADE | Bot that manages membership |
| telegram_user_id | bigint | NOT NULL | Member's Telegram user ID |
| channel_id | bigint | NOT NULL | Telegram channel ID |
| invite_link | text | NULL | Generated invite link (if not yet joined) |
| status | varchar(50) | NOT NULL, CHECK(status IN ('active', 'expired', 'revoked')) | Membership status |
| joined_at | timestamp | NULL | When member joined channel |
| expires_at | timestamp | NOT NULL | Membership expiration date |
| removed_at | timestamp | NULL | When member was removed from channel |
| renewal_reminder_sent_at | timestamp | NULL | When 3-day reminder was sent |
| created_at | timestamp | NOT NULL, DEFAULT now() | Record creation timestamp |
| updated_at | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Validation Rules**:
- `telegram_user_id` must be positive integer
- `channel_id` must be negative integer (Telegram channels have negative IDs)
- `expires_at` must be in the future when status is 'active'
- `status` transitions: active → expired/revoked
- `joined_at` must be <= `expires_at`
- `removed_at` must be >= `joined_at` (if not null)

**Indexes**:
```sql
CREATE INDEX idx_channel_members_tenant ON channel_members(tenant_id);
CREATE INDEX idx_channel_members_user ON channel_members(telegram_user_id, status);
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id, status);
CREATE INDEX idx_channel_members_expiration ON channel_members(status, expires_at) WHERE status = 'active';
CREATE INDEX idx_channel_members_reminders ON channel_members(status, expires_at, renewal_reminder_sent_at) WHERE status = 'active' AND renewal_reminder_sent_at IS NULL;
CREATE INDEX idx_channel_members_payment ON channel_members(payment_transaction_id);
```

**RLS Policies**:
```sql
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON channel_members
  FOR SELECT
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_insert ON channel_members
  FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_update ON channel_members
  FOR UPDATE
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_delete ON channel_members
  FOR DELETE
  USING (tenant_id::text = current_setting('app.current_tenant', true));
```

**Business Rules**:
- Created when payment transaction status becomes 'completed'
- Invite link generated immediately after creation (single-use, expires in `plan_duration_days + 7 days`)
- Status changes to 'expired' when current time > `expires_at` (via scheduled job)
- Member removed from channel when status becomes 'expired' or 'revoked'
- Renewal reminder sent 3 days before `expires_at` (via scheduled job)
- Can have multiple records per user (each payment creates new membership)
- Active members who leave channel can rejoin via /rejoin command (generates new invite link)

---

### 5. BotEventLog

Represents audit trail and operational events for bot lifecycle.

**Table Name**: `bot_event_logs`

**Fields**:

| Field Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| tenant_id | uuid | NOT NULL, FOREIGN KEY(tenants.id) ON DELETE CASCADE | Multi-tenant isolation |
| bot_configuration_id | uuid | NULL, FOREIGN KEY(bot_configurations.id) ON DELETE CASCADE | Related bot (null for tenant-wide events) |
| event_type | varchar(100) | NOT NULL | Event category/name |
| event_data | jsonb | NOT NULL | Event-specific data payload |
| severity | varchar(50) | NOT NULL, CHECK(severity IN ('info', 'warning', 'error', 'critical')) | Event severity level |
| telegram_user_id | bigint | NULL | Related Telegram user (if applicable) |
| correlation_id | uuid | NULL | For grouping related events |
| occurred_at | timestamp | NOT NULL, DEFAULT now() | Event timestamp |

**Validation Rules**:
- `event_type` enum values (see Event Types section below)
- `event_data` must be valid JSON object
- `severity` determines alert routing (critical → immediate dashboard alert)
- `correlation_id` groups related events (e.g., payment flow: initiated → completed)

**Indexes**:
```sql
CREATE INDEX idx_bot_event_logs_tenant ON bot_event_logs(tenant_id);
CREATE INDEX idx_bot_event_logs_bot ON bot_event_logs(bot_configuration_id, occurred_at DESC) WHERE bot_configuration_id IS NOT NULL;
CREATE INDEX idx_bot_event_logs_type ON bot_event_logs(tenant_id, event_type, occurred_at DESC);
CREATE INDEX idx_bot_event_logs_severity ON bot_event_logs(tenant_id, severity, occurred_at DESC) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_bot_event_logs_correlation ON bot_event_logs(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_bot_event_logs_user ON bot_event_logs(telegram_user_id, occurred_at DESC) WHERE telegram_user_id IS NOT NULL;
CREATE INDEX idx_bot_event_logs_occurred ON bot_event_logs(occurred_at DESC);
```

**RLS Policies**:
```sql
ALTER TABLE bot_event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON bot_event_logs
  FOR SELECT
  USING (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_insert ON bot_event_logs
  FOR INSERT
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true));

CREATE POLICY tenant_isolation_delete ON bot_event_logs
  FOR DELETE
  USING (tenant_id::text = current_setting('app.current_tenant', true));
```

**Event Types & Data Schemas**:

| Event Type | Severity | Example event_data |
|------------|----------|-------------------|
| `bot_created` | info | `{"bot_username": "@mybot", "channel_id": -123456}` |
| `bot_updated` | info | `{"changed_fields": ["display_name", "description"], "before": {...}, "after": {...}}` |
| `bot_sync_success` | info | `{"synced_fields": ["commands", "description"], "duration_ms": 450}` |
| `bot_sync_failed` | error | `{"error": "API timeout", "retry_count": 3}` |
| `bot_token_invalid` | critical | `{"error_code": 401, "error_message": "Unauthorized"}` |
| `bot_permission_lost` | critical | `{"channel_id": -123456, "missing_permissions": ["can_invite_users"]}` |
| `plan_created` | info | `{"plan_id": "uuid", "name": "Monthly VIP", "price": 50000}` |
| `plan_updated` | info | `{"plan_id": "uuid", "changed_fields": ["price"], "old_price": 50000, "new_price": 60000}` |
| `payment_initiated` | info | `{"transaction_id": "uuid", "user_id": 123456, "plan": "Monthly VIP", "amount": 50000}` |
| `payment_completed` | info | `{"transaction_id": "uuid", "qpay_invoice_id": "INV123", "duration_ms": 3200}` |
| `payment_failed` | warning | `{"transaction_id": "uuid", "error": "Payment declined", "qpay_error_code": "ERR_002"}` |
| `payment_webhook_retry` | warning | `{"transaction_id": "uuid", "retry_attempt": 2, "error": "Database timeout"}` |
| `invite_link_generated` | info | `{"member_id": "uuid", "user_id": 123456, "expire_date": "2025-11-07T00:00:00Z"}` |
| `member_joined` | info | `{"member_id": "uuid", "user_id": 123456, "channel_id": -123456}` |
| `member_expired` | info | `{"member_id": "uuid", "user_id": 123456, "expired_at": "2025-10-07T00:00:00Z"}` |
| `member_removed` | info | `{"member_id": "uuid", "user_id": 123456, "channel_id": -123456}` |
| `renewal_reminder_sent` | info | `{"member_id": "uuid", "user_id": 123456, "days_until_expiry": 3}` |
| `webhook_received` | info | `{"source": "qpay", "invoice_id": "INV123", "status": "PAID"}` |
| `webhook_signature_invalid` | critical | `{"source": "qpay", "invoice_id": "INV123", "ip_address": "1.2.3.4"}` |

**Retention Policy**:
- Events older than 90 days are automatically deleted (via cron job)
- Critical events are preserved indefinitely (severity = 'critical')
- Tenant can configure retention period (30/60/90 days) in settings

**Business Rules**:
- All bot configuration changes logged automatically
- All payment state transitions logged with correlation_id
- All webhook events logged (including invalid signatures for security audit)
- Events with severity 'critical' trigger dashboard alerts
- Logs used for debugging, compliance, and analytics

---

## Entity Relationships

```
tenants (1) ──── (N) bot_configurations
                        │
                        ├── (1) ──── (N) membership_plans
                        │                    │
                        │                    │ (selected plan)
                        │                    │
                        ├── (1) ──── (N) payment_transactions
                        │                    │
                        │                    │ (associated payment)
                        │                    │
                        ├── (1) ──── (N) channel_members
                        │
                        └── (1) ──── (N) bot_event_logs

Relationships:
- bot_configurations.tenant_id → tenants.id
- membership_plans.bot_configuration_id → bot_configurations.id
- membership_plans.tenant_id → tenants.id
- payment_transactions.membership_plan_id → membership_plans.id
- payment_transactions.bot_configuration_id → bot_configurations.id
- payment_transactions.tenant_id → tenants.id
- channel_members.payment_transaction_id → payment_transactions.id
- channel_members.bot_configuration_id → bot_configurations.id
- channel_members.tenant_id → tenants.id
- bot_event_logs.bot_configuration_id → bot_configurations.id
- bot_event_logs.tenant_id → tenants.id
```

**Cascade Behaviors**:
- Delete tenant → Cascade delete all bot_configurations + dependent entities
- Delete bot_configuration → Cascade delete membership_plans, payment_transactions, channel_members, bot_event_logs
- Delete membership_plan → RESTRICT if active channel_members exist, otherwise cascade
- Delete payment_transaction → Cascade delete channel_members

---

## Performance Considerations

**Index Strategy**:
- Composite indexes on (tenant_id, frequently_queried_column) for multi-tenant queries
- Partial indexes for status-based queries (e.g., `WHERE status = 'active'`)
- BRIN indexes on timestamp columns (occurred_at, created_at) for time-range queries
- GIN indexes on JSONB columns (event_data) for JSON path queries

**Query Optimization**:
- RLS policies automatically filter by tenant_id (no manual WHERE clause needed)
- Use `SELECT ... FOR UPDATE SKIP LOCKED` for job processing (renewal reminders, expiration checks)
- Batch operations for membership expiration (process 100 members per transaction)
- Use Redis cache for frequently accessed bot configurations (TTL: 5 minutes)

**Storage Estimates** (per tenant):
- bot_configurations: ~500 bytes/row × 10 bots = 5 KB
- membership_plans: ~300 bytes/row × 50 plans = 15 KB
- payment_transactions: ~500 bytes/row × 10,000 transactions = 5 MB
- channel_members: ~300 bytes/row × 8,000 members = 2.4 MB
- bot_event_logs: ~500 bytes/row × 50,000 events = 25 MB (before 90-day purge)

**Total per tenant**: ~32.5 MB (for active SaaS user with moderate traffic)

---

## Data Integrity Constraints

**Cross-Table Validations**:
1. `channel_members.expires_at` must match `payment_transactions.expires_at`
2. `payment_transactions.amount` must equal `membership_plans.price` at time of creation
3. `payment_transactions.plan_duration_days` must equal `membership_plans.duration_days` at time of creation
4. `bot_configurations.channel_id` must exist in Telegram (validated via API before saving)
5. `membership_plans.bot_configuration_id` must have `is_active = true` to accept payments

**Enforcement**:
- Constraints 1-3: Database triggers or application-layer validation
- Constraint 4: Pre-save validation via Telegram API
- Constraint 5: Application-layer check in payment initiation flow

---

## Migration Notes

**Migration Order** (for new deployments):
1. Enable uuid-ossp extension (`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`)
2. Create `bot_configurations` table
3. Create `membership_plans` table
4. Create `payment_transactions` table
5. Create `channel_members` table
6. Create `bot_event_logs` table
7. Enable RLS on all tables
8. Create RLS policies for all tables
9. Create indexes

**Rollback Strategy**:
- Each migration includes corresponding DOWN migration
- Foreign key constraints prevent orphaned records
- RLS policies can be temporarily disabled for data migration: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`

---

## Security Notes

**Sensitive Fields**:
- `bot_configurations.bot_token` → MUST be encrypted at rest (AES-256-GCM)
- `payment_transactions.qpay_invoice_id` → PII, log access in audit trail
- `telegram_user_id` → PII, GDPR data deletion applies

**Access Control**:
- SaaS users can only access their own tenant's data (enforced via RLS)
- API endpoints must validate tenant context before queries
- Admin panel access requires role-based authorization (owner/admin only)

**Audit Trail**:
- All bot_configuration changes logged in bot_event_logs
- All payment state transitions logged with correlation_id
- Webhook events logged with signature validation status
