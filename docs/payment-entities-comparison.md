# Payment vs PaymentTransaction Entity Comparison

**Date**: 2025-11-05
**Purpose**: Detailed comparison to understand architectural differences

---

## Quick Summary

| Aspect | Payment | PaymentTransaction |
|--------|---------|-------------------|
| **Table** | `payments` | `payment_transactions` |
| **Use Case** | Member-based dashboard flow | Bot-first onboarding flow |
| **User Model** | Requires `Member` entity | Direct Telegram user (no Member) |
| **Status States** | 6 states | 4 states |
| **Amount Type** | `decimal(10,2)` | `integer` |
| **Relationships** | Member, Membership, Tenant | Project, MembershipPlan |
| **Snapshot Fields** | ❌ None | ✅ Plan name, price, duration |
| **Membership Dates** | Stored in `Membership` entity | ✅ Stored directly in transaction |
| **Payment Link** | ❌ Not stored | ✅ Stored (payment_link) |
| **Indexes** | 7 indexes | 5 indexes |

---

## 1. Schema Comparison

### Fields in Both (Common)

| Field | Payment Type | PaymentTransaction Type | Notes |
|-------|-------------|------------------------|-------|
| `id` | uuid (PK) | uuid (PK) | ✅ Identical |
| `tenant_id` | uuid (NOT NULL) | uuid (NOT NULL) | ✅ Identical |
| `qpay_invoice_id` | varchar(255) unique | varchar(255) unique | ✅ Identical |
| `status` | enum | enum | ⚠️ Different values |
| `created_at` | timestamp | timestamp | ✅ Identical |
| `updated_at` | timestamp | timestamp | ✅ Identical |

### Fields ONLY in Payment

| Field | Type | Purpose |
|-------|------|---------|
| `member_id` | uuid (nullable) | Links to Member entity (dashboard users) |
| `membership_id` | uuid (nullable) | Links to Membership entity (subscription record) |
| `qpay_payment_id` | varchar(255) | QPay transaction ID |
| `amount_mnt` | **decimal(10,2)** | Amount in MNT (allows cents) |
| `currency` | varchar(3) | Currency code (default 'MNT') |
| `payment_method` | varchar(50) | Payment method used |
| `paid_at` | timestamp | When payment was completed |
| `failed_at` | timestamp | When payment failed |
| `failure_reason` | text | Reason for failure |
| `refunded_at` | timestamp | When refund was issued |
| `refund_amount` | decimal(10,2) | Amount refunded |
| `webhook_event_id` | varchar(255) | Webhook event identifier |
| `metadata` | jsonb | Flexible metadata storage |

### Fields ONLY in PaymentTransaction

| Field | Type | Purpose |
|-------|------|---------|
| `project_id` | uuid (NOT NULL) | Links to Project (bot configuration) |
| `membership_plan_id` | uuid (NOT NULL) | Direct link to plan (no Member required) |
| `telegram_user_id` | bigint (NOT NULL) | Telegram user ID (no Member entity) |
| `telegram_username` | varchar(255) | Telegram @username |
| `telegram_first_name` | varchar(255) | User's first name from Telegram |
| `telegram_last_name` | varchar(255) | User's last name from Telegram |
| `amount` | **integer** | Amount in MNT (whole tögrög only) |
| `snapshot_plan_name` | varchar(255) | Plan name at purchase time |
| `snapshot_price` | integer | Price at purchase time |
| `snapshot_duration_days` | integer | Duration at purchase time |
| `qpay_transaction_id` | varchar(255) | QPay transaction ID |
| `qpay_payment_method` | varchar(100) | Payment method from QPay |
| `payment_link` | text | QPay payment URL |
| `membership_starts_at` | timestamp | When membership begins |
| `membership_expires_at` | timestamp | When membership ends |
| `completed_at` | timestamp | When payment was completed |

---

## 2. Status Enum Comparison

### Payment Status (6 states)
```typescript
enum PaymentStatus {
  PENDING = 'pending',        // ✅ Both
  PROCESSING = 'processing',  // ❌ Payment ONLY
  COMPLETED = 'completed',    // ✅ Both
  FAILED = 'failed',          // ✅ Both
  REFUNDED = 'refunded',      // ✅ Both
  CANCELLED = 'cancelled',    // ❌ Payment ONLY
}
```

### PaymentTransaction Status (4 states)
```typescript
enum PaymentStatus {
  PENDING = 'pending',      // ✅ Both
  COMPLETED = 'completed',  // ✅ Both
  FAILED = 'failed',        // ✅ Both
  REFUNDED = 'refunded',    // ✅ Both
}
```

**Analysis**: Payment has 2 additional states (`PROCESSING`, `CANCELLED`) for more complex lifecycle management.

---

## 3. Relationships Comparison

### Payment Relationships
```typescript
@ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
tenant: Tenant;

@ManyToOne(() => Member, { onDelete: 'SET NULL' })
member: Member;

@ManyToOne(() => Membership, { onDelete: 'SET NULL' })
membership: Membership;
```

**Foreign Keys**: `tenant_id`, `member_id`, `membership_id`

### PaymentTransaction Relationships
```typescript
@ManyToOne(() => MembershipPlan, { onDelete: 'RESTRICT' })
membership_plan: MembershipPlan;

@ManyToOne(() => Project, { onDelete: 'CASCADE' })
project: Project;

// @OneToOne(() => ChannelMember)  // Commented out
// channel_member: ChannelMember;
```

**Foreign Keys**: `tenant_id`, `membership_plan_id`, `project_id`

**Key Difference**:
- Payment links to `Member` → `Membership` (indirect plan reference)
- PaymentTransaction links directly to `Project` + `MembershipPlan` (no Member)

---

## 4. Indexes Comparison

### Payment Indexes (7)
```sql
INDEX tenant_id
INDEX member_id
INDEX membership_id
INDEX status
INDEX qpay_invoice_id
INDEX webhook_event_id
INDEX created_at
```

### PaymentTransaction Indexes (5)
```sql
INDEX tenant_id
INDEX telegram_user_id
INDEX (tenant_id, status)  -- Composite
INDEX qpay_invoice_id (unique, partial WHERE NOT NULL)
INDEX membership_expires_at (partial WHERE status='completed')
```

**Analysis**: PaymentTransaction uses composite and partial indexes for better query performance.

---

## 5. Data Type Differences

| Field | Payment | PaymentTransaction | Impact |
|-------|---------|-------------------|--------|
| Amount | `decimal(10,2)` | `integer` | Payment supports cents, PT doesn't |
| QPay TX ID | `qpay_payment_id` | `qpay_transaction_id` | Different naming |
| Payment Method | `payment_method` | `qpay_payment_method` | Different naming |
| Completion | `paid_at` | `completed_at` | Different naming |

---

## 6. Business Logic Comparison

### Payment Service Logic (payment.service.ts)

**Key Methods**:
- `createPayment()` - Create payment record
- `processPaymentCompleted()` - Handle QPay webhook
- `createOrExtendMembership()` - Create/extend Membership entity
- `addMemberToTelegramGroup()` - Generate invite link, send DM
- `sendPaymentNotification()` - Send success/failure notifications
- `getPaymentStats()` - Analytics for dashboard

**Flow**:
```
QPay Webhook → Payment Record → Membership Record → Invite Link → Telegram DM
```

**Characteristics**:
- Creates full `Member` and `Membership` records
- Manages group invitations
- Supports membership extensions
- Sends templated notifications
- Rich metadata tracking

### PaymentTransaction Service Logic (payment-transaction.service.ts)

**Key Methods**:
- `create()` - Create transaction record
- `initiatePayment()` - Create QPay invoice with bank account
- `markAsCompleted()` - Update status with snapshot dates
- `findByQPayInvoiceId()` - Lookup by invoice
- `markAsFailed()` - Update status on failure

**Flow**:
```
Bot Request → PaymentTransaction → QPay Invoice → Payment Link → User Pays → Complete
```

**Characteristics**:
- Lightweight, no Member creation
- Stores membership dates directly in transaction
- Snapshot fields preserve plan details at purchase time
- Direct project-based payment routing
- Simpler state machine

---

## 7. Use Case Scenarios

### When Payment is Used

**Scenario**: SaaS user manages members via dashboard

1. Owner creates Member via dashboard
2. Member record stored in database
3. Payment initiated for membership plan
4. QPay webhook creates Payment record
5. PaymentService creates Membership record
6. System generates Telegram invite link
7. Member receives DM with access instructions

**User Journey**: Dashboard → Member Profile → Payment → Membership → Telegram Access

**Example**:
```typescript
// Dashboard creates member first
const member = await memberService.create({
  tenant_id: 'abc-123',
  email: 'user@example.com',
  first_name: 'John',
  telegram_user_id: '123456789'
});

// Then creates payment
const payment = await paymentService.createPayment({
  tenant_id: 'abc-123',
  member_id: member.id,
  amount_mnt: 50000,
  qpay_invoice_id: 'INV-001',
  status: 'completed'
});

// Payment service creates membership automatically
```

### When PaymentTransaction is Used

**Scenario**: User interacts directly with Telegram bot

1. User chats with Telegram bot
2. Bot shows available membership plans
3. User selects plan
4. Bot creates PaymentTransaction
5. Bot generates QPay invoice
6. User pays via QPay link
7. Webhook updates PaymentTransaction to completed
8. Bot grants channel access (no Member record created)

**User Journey**: Telegram Bot → Select Plan → Pay → Access Granted

**Example**:
```typescript
// Bot receives /buy command from user
const transaction = await paymentTransactionService.initiatePayment('tenant-id', {
  project_id: 'proj-123',
  membership_plan_id: 'plan-456',
  telegram_user_id: '123456789',
  telegram_username: 'john_doe',
  telegram_first_name: 'John',
  amount: 50000,
  snapshot_plan_name: '30-Day Premium',
  snapshot_price: 50000,
  snapshot_duration_days: 30
});

// Returns payment_link, user clicks and pays
// No Member entity created - direct channel access
```

---

## 8. Key Architectural Differences

### Payment Architecture
```
┌─────────────┐      ┌──────────┐      ┌────────────┐
│  Dashboard  │─────▶│  Member  │─────▶│  Payment   │
└─────────────┘      └──────────┘      └────────────┘
                           │                   │
                           ▼                   ▼
                     ┌────────────┐      ┌──────────────┐
                     │ Membership │      │ Invite Link  │
                     └────────────┘      └──────────────┘
```

**Characteristics**:
- **Rich User Model**: Full Member profiles with email, metadata
- **Separate Membership Entity**: Tracks subscription lifecycle
- **Complex State**: 6 status states, refund tracking, webhook IDs
- **Member Management**: Full CRUD operations via dashboard

### PaymentTransaction Architecture
```
┌─────────────┐      ┌────────────────────┐      ┌──────────┐
│ Telegram Bot│─────▶│ PaymentTransaction │─────▶│  Channel │
└─────────────┘      └────────────────────┘      └──────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ Snapshot Fields │
                     │ (plan details)  │
                     └─────────────────┘
```

**Characteristics**:
- **Lightweight**: No Member entity, just Telegram user fields
- **Self-Contained**: Membership dates stored in transaction itself
- **Immutable Snapshots**: Preserves plan details at purchase time
- **Bot-Centric**: Designed for conversational payment flow

---

## 9. Data Migration Challenges

### Challenge 1: Amount Data Type
- Payment: `decimal(10,2)` (supports 50000.50)
- PaymentTransaction: `integer` (only 50000)

**Solution**: Cast integer to decimal during migration (no data loss since PT doesn't use decimals)

### Challenge 2: Field Naming
- `qpay_payment_id` vs `qpay_transaction_id`
- `payment_method` vs `qpay_payment_method`
- `paid_at` vs `completed_at`

**Solution**: Map fields during migration, keep both for backward compatibility

### Challenge 3: Status Enum
- Payment has PROCESSING and CANCELLED states
- PaymentTransaction doesn't

**Solution**: Map PT statuses to Payment statuses (direct mapping for 4 states)

### Challenge 4: Relationships
- Payment → Member, Membership (might be NULL)
- PaymentTransaction → Project, MembershipPlan (always set)

**Solution**: Keep member_id NULL for bot-flow payments, populate project_id/plan_id

### Challenge 5: Snapshot Fields
- Payment: No snapshot fields (references live plan data)
- PaymentTransaction: Has snapshot_plan_name, snapshot_price, snapshot_duration_days

**Solution**: Add nullable snapshot columns to Payment, backfill from plan data where possible

---

## 10. Why This Duplication Exists

### Historical Context

**Phase 1: Member-Based System** (Payment entity)
- Built for SaaS dashboard where owners manage members
- Full member profiles with email, metadata
- Complex membership lifecycle (renewals, upgrades)
- Required separate Member and Membership entities

**Phase 2: Bot-First Experience** (PaymentTransaction entity)
- Added Telegram bot for direct user payments
- Users don't need email or member profiles
- Simpler flow: select plan → pay → access
- Creating Member entities for every bot user felt heavyweight

**Decision Point**:
- **Option A**: Modify Payment to support both flows (risk breaking existing code)
- **Option B**: Create new PaymentTransaction for bot flow (chosen)

**Result**: Two parallel payment systems that now need consolidation

---

## 11. Consolidation Recommendation

### Why Consolidate?

1. **Code Duplication**: Two services doing similar things
2. **Data Fragmentation**: Payment analytics split across tables
3. **Maintenance Burden**: Changes must be made twice
4. **Confusion**: Developers unsure which to use
5. **Testing Overhead**: Double the test coverage needed

### Consolidation Strategy

**Keep**: Payment entity (more mature, richer features)
**Deprecate**: PaymentTransaction entity

**Rationale**:
- Payment already has refund logic, webhook handling, analytics
- Adding nullable fields is simpler than migrating complex logic
- Member-based flow can absorb bot flow, not vice versa

### New Unified Payment Entity

```typescript
@Entity('payments')
export class Payment {
  // Existing fields
  id: uuid
  tenant_id: uuid
  member_id?: uuid               // NULL for bot flow
  membership_id?: uuid           // NULL for bot flow
  qpay_invoice_id: string
  qpay_payment_id: string
  amount_mnt: decimal(10,2)
  status: enum (6 states)

  // NEW: Bot flow support
  project_id?: uuid              // For bot payments
  membership_plan_id?: uuid      // Direct plan reference
  telegram_user_id?: bigint      // Bot flow user
  telegram_username?: string
  telegram_first_name?: string
  telegram_last_name?: string

  // NEW: Snapshot fields
  snapshot_plan_name?: string
  snapshot_price?: decimal
  snapshot_duration_days?: integer

  // NEW: Bot flow fields
  payment_link?: text
  membership_starts_at?: timestamp
  membership_expires_at?: timestamp
  completed_at?: timestamp

  // Timestamps
  paid_at?: timestamp            // Keep for backward compat
  created_at: timestamp
  updated_at: timestamp
}
```

**Benefits**:
- Single source of truth for all payments
- Unified analytics and reporting
- Single webhook handler
- One service to maintain
- Consistent error handling

---

## 12. Summary Table

| Criterion | Payment | PaymentTransaction | Winner |
|-----------|---------|-------------------|--------|
| **Fields** | 18 fields | 20 fields | - |
| **Maturity** | Older, battle-tested | Newer | 🏆 Payment |
| **Flexibility** | Supports refunds, metadata | Limited states | 🏆 Payment |
| **Simplicity** | Complex relationships | Self-contained | 🏆 PaymentTransaction |
| **Snapshot Support** | ❌ None | ✅ Full | 🏆 PaymentTransaction |
| **Use Case Coverage** | Member flow only | Bot flow only | Neither |
| **Consolidation Difficulty** | Easy to extend | Hard to extend | 🏆 Payment |

**Final Verdict**: Consolidate into Payment entity

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Related**: `payment-consolidation-plan.md`
