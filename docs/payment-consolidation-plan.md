# Payment Entity Consolidation Plan

**Date**: 2025-11-05
**Objective**: Consolidate `payment_transactions` and `payments` tables into a single unified `payments` table

## Executive Summary

Currently, the system has two separate payment tracking entities:
- **Payment** (`payments` table) - Used for member-based dashboard flow
- **PaymentTransaction** (`payment_transactions` table) - Used for Telegram bot onboarding flow

This duplication creates maintenance overhead, inconsistent data models, and complexity. This plan consolidates both into the `Payment` entity.

---

## 1. Schema Analysis

### Current Payment Entity Fields
```typescript
id: uuid (PK)
tenant_id: uuid (NOT NULL) ✓
member_id: uuid (nullable) ✓
membership_id: uuid (nullable) ✓
qpay_invoice_id: string (unique) ✓
qpay_payment_id: string ✓
amount_mnt: decimal(10,2) ✓
currency: string (default 'MNT') ✓
status: enum(pending, processing, completed, failed, refunded, cancelled) ✓
payment_method: string ✓
paid_at: timestamp ✓
failed_at: timestamp ✓
failure_reason: text ✓
refunded_at: timestamp ✓
refund_amount: decimal(10,2) ✓
webhook_event_id: string ✓
metadata: jsonb ✓
created_at: timestamp ✓
updated_at: timestamp ✓
```

### Current PaymentTransaction Entity Fields
```typescript
id: uuid (PK)
tenant_id: uuid (NOT NULL) ✓
membership_plan_id: uuid ← MISSING IN PAYMENT
project_id: uuid ← MISSING IN PAYMENT
telegram_user_id: bigint ← MISSING IN PAYMENT
telegram_username: string ← MISSING IN PAYMENT
telegram_first_name: string ← MISSING IN PAYMENT
telegram_last_name: string ← MISSING IN PAYMENT
amount: integer (MNT) ← DIFFERENT TYPE
snapshot_plan_name: string ← MISSING IN PAYMENT
snapshot_price: integer ← MISSING IN PAYMENT
snapshot_duration_days: integer ← MISSING IN PAYMENT
status: enum(pending, completed, failed, refunded) ← FEWER STATES
qpay_invoice_id: string (unique) ✓
qpay_transaction_id: string ← DIFFERENT NAME (payment uses qpay_payment_id)
qpay_payment_method: string ← DIFFERENT NAME (payment uses payment_method)
payment_link: text ← MISSING IN PAYMENT
membership_starts_at: timestamp ← MISSING IN PAYMENT
membership_expires_at: timestamp ← MISSING IN PAYMENT
completed_at: timestamp ← MISSING IN PAYMENT (payment uses paid_at)
created_at: timestamp ✓
updated_at: timestamp ✓
```

### Fields to Add to Payment Entity
1. `project_id` (uuid, nullable) - For bot flow payments
2. `membership_plan_id` (uuid, nullable) - Direct reference to plan
3. `telegram_user_id` (bigint, nullable) - For bot flow without member
4. `telegram_username` (string, nullable) - Telegram username
5. `telegram_first_name` (string, nullable) - Telegram first name
6. `telegram_last_name` (string, nullable) - Telegram last name
7. `snapshot_plan_name` (string, nullable) - Plan name at purchase time
8. `snapshot_price` (decimal, nullable) - Price at purchase time
9. `snapshot_duration_days` (integer, nullable) - Duration at purchase time
10. `payment_link` (text, nullable) - QPay payment URL
11. `membership_starts_at` (timestamp, nullable) - Membership start date
12. `membership_expires_at` (timestamp, nullable) - Membership expiration
13. `completed_at` (timestamp, nullable) - Payment completion timestamp

### Field Unification Decisions
- **Amount type**: Keep `decimal(10,2)` (more flexible, QPay uses tögrög integers but decimal is safer)
- **QPay transaction ID**: Unify to `qpay_payment_id` (already exists in Payment)
- **Payment method**: Keep `payment_method` (already exists in Payment)
- **Status enum**: Keep Payment's enum (more states: processing, cancelled)
- **Completion timestamp**: Keep both `paid_at` and `completed_at` for backwards compatibility

---

## 2. Migration Strategy

### Phase 1: Schema Extension (Non-Breaking)
**Migration**: `AddPaymentTransactionFieldsToPayments`

```typescript
// Add new columns to payments table
ALTER TABLE payments ADD COLUMN project_id uuid;
ALTER TABLE payments ADD COLUMN membership_plan_id uuid;
ALTER TABLE payments ADD COLUMN telegram_user_id bigint;
ALTER TABLE payments ADD COLUMN telegram_username varchar(255);
ALTER TABLE payments ADD COLUMN telegram_first_name varchar(255);
ALTER TABLE payments ADD COLUMN telegram_last_name varchar(255);
ALTER TABLE payments ADD COLUMN snapshot_plan_name varchar(255);
ALTER TABLE payments ADD COLUMN snapshot_price decimal(10,2);
ALTER TABLE payments ADD COLUMN snapshot_duration_days integer;
ALTER TABLE payments ADD COLUMN payment_link text;
ALTER TABLE payments ADD COLUMN membership_starts_at timestamp;
ALTER TABLE payments ADD COLUMN membership_expires_at timestamp;
ALTER TABLE payments ADD COLUMN completed_at timestamp;

// Add foreign keys
ALTER TABLE payments ADD CONSTRAINT FK_payments_project
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT FK_payments_plan
  FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE RESTRICT;

// Add indexes
CREATE INDEX IDX_payments_project ON payments(project_id);
CREATE INDEX IDX_payments_plan ON payments(membership_plan_id);
CREATE INDEX IDX_payments_telegram_user ON payments(telegram_user_id);
CREATE INDEX IDX_payments_expiration ON payments(membership_expires_at)
  WHERE status = 'completed' AND membership_expires_at IS NOT NULL;
```

### Phase 2: Update Channel Members FK
**Migration**: `UpdateChannelMembersPaymentReference`

The `channel_members` table currently has a `payment_transaction_id` foreign key. This must be renamed to `payment_id` before data migration.

```typescript
// Rename column and update foreign key constraint
ALTER TABLE channel_members RENAME COLUMN payment_transaction_id TO payment_id;

// Drop old FK constraint
ALTER TABLE channel_members DROP CONSTRAINT IF EXISTS FK_channel_members_payment_transaction;

// Add new FK constraint pointing to payments table
ALTER TABLE channel_members ADD CONSTRAINT FK_channel_members_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE;
```

### Phase 3: Data Migration
**Migration**: `MigratePaymentTransactionsToPayments`

```typescript
// Copy all payment_transactions records to payments
INSERT INTO payments (
  id, tenant_id, membership_plan_id, qpay_invoice_id,
  amount_mnt, currency, status, payment_method,
  paid_at, metadata, created_at, updated_at,
  -- New fields from payment_transactions
  project_id, telegram_user_id, telegram_username,
  telegram_first_name, telegram_last_name,
  snapshot_plan_name, snapshot_price, snapshot_duration_days,
  payment_link, membership_starts_at, membership_expires_at,
  completed_at, qpay_payment_id
)
SELECT
  pt.id, pt.tenant_id, pt.membership_plan_id, pt.qpay_invoice_id,
  pt.amount, 'MNT', pt.status, pt.qpay_payment_method,
  pt.completed_at, '{}', pt.created_at, pt.updated_at,
  -- New fields
  pt.project_id, pt.telegram_user_id, pt.telegram_username,
  pt.telegram_first_name, pt.telegram_last_name,
  pt.snapshot_plan_name, pt.snapshot_price, pt.snapshot_duration_days,
  pt.payment_link, pt.membership_starts_at, pt.membership_expires_at,
  pt.completed_at, pt.qpay_transaction_id
FROM payment_transactions pt
WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.id = pt.id);
```

**Data Integrity Checks**:
- Verify count matches: `SELECT COUNT(*) FROM payment_transactions` = records migrated
- Verify no data loss: Check all qpay_invoice_ids are present in payments
- Verify foreign key integrity: All project_ids and membership_plan_ids exist

### Phase 4: Service Layer Consolidation

#### 3.1 Update Payment Entity
**File**: `backend/src/modules/payment/entities/payment.entity.ts`

Add new fields to entity definition with proper decorators.

#### 3.2 Merge Service Logic
**Files**:
- `backend/src/modules/payment/services/payment.service.ts` (target)
- `backend/src/modules/payment/services/payment-transaction.service.ts` (source, to be deprecated)

**Logic to Transfer**:
1. `initiatePayment()` - QPay invoice creation with project bank account
2. `markAsCompleted()` - Simplified completion with snapshot fields
3. `findByQPayInvoiceId()` - Already exists in PaymentService
4. Bot flow payment creation without member_id

**New Methods in PaymentService**:
```typescript
// From PaymentTransactionService
async initiatePaymentForBot(
  tenantId: string,
  projectId: string,
  planId: string,
  telegramUser: {
    telegram_user_id: string;
    telegram_username?: string;
    telegram_first_name?: string;
    telegram_last_name?: string;
  },
): Promise<{ payment: Payment; payment_link: string; qr_image?: string }>;

// Enhanced createPayment to support both flows
async createPayment(data: {
  tenant_id: string;
  member_id?: string;  // Optional for bot flow
  membership_id?: string;
  project_id?: string;  // For bot flow
  membership_plan_id?: string;  // For bot flow
  telegram_user_id?: string;  // For bot flow
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
  amount_mnt: number;
  currency?: string;
  snapshot_plan_name?: string;
  snapshot_price?: number;
  snapshot_duration_days?: number;
  payment_link?: string;
  qpay_invoice_id?: string;
  status?: PaymentStatus;
  metadata?: Record<string, any>;
}): Promise<Payment>;
```

#### 3.3 Update Service Dependencies
**Files to Update**:
- `backend/src/modules/payment/webhook.controller.ts` - Use PaymentService instead
- `backend/src/modules/payment/processors/membership.processor.ts` - Use Payment entity
- `backend/src/modules/project/handlers/project-bot.handler.ts` - Use PaymentService
- `backend/src/modules/payment/services/channel-member.service.ts` - Update references

### Phase 5: API Layer Updates

#### 4.1 Update Controller
**File**: `backend/src/modules/payment/payment.controller.ts`

Add bot flow endpoints if not present:
```typescript
@Post('initiate')
@UseGuards(JwtAuthGuard)
async initiatePayment(
  @TenantId() tenantId: string,
  @Body() dto: InitiatePaymentDto,
): Promise<InitiatePaymentResponseDto>;
```

#### 4.2 Update DTOs
**Files**:
- Create `InitiatePaymentDto` (merge from CreatePaymentTransactionDto)
- Update `CreatePaymentDto` to support bot flow fields
- Keep DTOs backward compatible for existing API consumers

### Phase 6: Testing Updates

#### 5.1 Update Integration Tests
**Files to Update**:
- `backend/test/integration/telegram-bot/rejoin-flow.integration.spec.ts`
- `backend/test/integration/payment/webhook-processing.integration.spec.ts`
- `backend/test/integration/membership-plan/plan-limit.integration.spec.ts`

**Changes**:
- Replace PaymentTransaction imports with Payment
- Update test data creation to use new fields
- Verify both member flow and bot flow work correctly

#### 5.2 Update Service Tests
Create comprehensive tests for:
- Payment creation with member (existing flow)
- Payment creation with telegram_user_id only (bot flow)
- Payment completion for both flows
- Snapshot field population
- Project_id and membership_plan_id handling

### Phase 7: Frontend Updates

#### 6.1 Update API Client
**File**: `frontend/lib/api/payments.ts`

Update TypeScript interfaces to match new Payment schema.

#### 6.2 Update Components
**Files**:
- `frontend/components/payments/PaymentChart.tsx`
- `frontend/components/payments/PaymentList.tsx`

Ensure components handle both member-based and bot-based payments.

### Phase 8: Deprecation

#### 7.1 Mark Services as Deprecated
Add deprecation notice to `PaymentTransactionService`:
```typescript
/**
 * @deprecated This service is deprecated. Use PaymentService instead.
 * Will be removed in version 2.0.0
 */
@Injectable()
export class PaymentTransactionService { ... }
```

#### 7.2 Remove from Module Providers (After Testing)
**File**: `backend/src/modules/payment/payment.module.ts`

Remove PaymentTransactionService from providers once all references are updated.

#### 7.3 Drop Table Migration
**Migration**: `DropPaymentTransactionsTable`

```typescript
// ONLY RUN AFTER ALL CODE REFERENCES ARE REMOVED
DROP TABLE IF EXISTS payment_transactions CASCADE;
```

---

## 3. Risk Mitigation

### Rollback Plan
1. **Phase 1-2**: Can rollback migrations without data loss
2. **Phase 3-6**: Keep PaymentTransactionService alongside PaymentService temporarily
3. **Phase 7**: Only drop table after 2+ weeks of production validation

### Data Validation Queries
```sql
-- Verify migration completeness
SELECT COUNT(*) as pt_count FROM payment_transactions;
SELECT COUNT(*) as migrated_count FROM payments WHERE project_id IS NOT NULL;

-- Verify no orphaned foreign keys
SELECT p.id, p.project_id
FROM payments p
LEFT JOIN projects proj ON p.project_id = proj.id
WHERE p.project_id IS NOT NULL AND proj.id IS NULL;

-- Verify QPay invoice uniqueness
SELECT qpay_invoice_id, COUNT(*)
FROM payments
WHERE qpay_invoice_id IS NOT NULL
GROUP BY qpay_invoice_id
HAVING COUNT(*) > 1;
```

### Monitoring
- Track payment creation errors in logs (correlation IDs)
- Monitor QPay webhook processing success rate
- Alert on payment_transactions table usage (should drop to 0)
- Compare payment counts before/after migration

---

## 4. Implementation Timeline

| Phase | Tasks | Estimated Time | Dependencies |
|-------|-------|---------------|--------------|
| 1 | Schema extension migration | 2 hours | None |
| 2 | Update channel_members FK | 1 hour | Phase 1 |
| 3 | Data migration + validation | 3 hours | Phase 1-2 |
| 4 | Service layer consolidation | 8 hours | Phase 3 |
| 5 | API layer updates | 4 hours | Phase 4 |
| 6 | Testing updates | 6 hours | Phase 4-5 |
| 7 | Frontend updates | 2 hours | Phase 5 |
| 8 | Deprecation + cleanup | 2 hours | Phase 6-7, +2 weeks validation |
| **Total** | | **28 hours** | **~4-5 days** |

---

## 5. Success Criteria

- ✅ All payment_transactions data successfully migrated to payments table
- ✅ Zero data loss (verified by count + qpay_invoice_id checks)
- ✅ PaymentService handles both member flow and bot flow
- ✅ All integration tests passing
- ✅ No references to PaymentTransaction in active code
- ✅ Frontend displays both payment types correctly
- ✅ QPay webhooks process correctly for both flows
- ✅ Production monitoring shows 0 errors for 2 weeks
- ✅ payment_transactions table dropped

---

## 6. Files Affected

### Backend (22 files)
- `backend/src/modules/payment/entities/payment.entity.ts` ← **Modified**
- `backend/src/modules/payment/entities/payment-transaction.entity.ts` ← **Deprecated**
- `backend/src/modules/payment/services/payment.service.ts` ← **Enhanced**
- `backend/src/modules/payment/services/payment-transaction.service.ts` ← **Deprecated**
- `backend/src/modules/payment/services/channel-member.service.ts` ← **Modified**
- `backend/src/modules/payment/payment.controller.ts` ← **Modified**
- `backend/src/modules/payment/webhook.controller.ts` ← **Modified**
- `backend/src/modules/payment/payment.module.ts` ← **Modified**
- `backend/src/modules/payment/processors/membership.processor.ts` ← **Modified**
- `backend/src/modules/payment/dto/create-payment-transaction.dto.ts` ← **Deprecated**
- `backend/src/modules/payment/dto/update-payment-transaction.dto.ts` ← **Deprecated**
- `backend/src/modules/payment/entities/channel-member.entity.ts` ← **Modified**
- `backend/src/modules/payment/services/channel-member.service.ts` ← **Modified**
- `backend/src/modules/project/handlers/project-bot.handler.ts` ← **Modified**
- `backend/src/database/migrations/[new]-AddPaymentTransactionFields.ts` ← **Created**
- `backend/src/database/migrations/[new]-UpdateChannelMembersPaymentReference.ts` ← **Created**
- `backend/src/database/migrations/[new]-MigratePaymentTransactions.ts` ← **Created**
- `backend/src/database/migrations/[new]-DropPaymentTransactionsTable.ts` ← **Created**
- `backend/test/integration/telegram-bot/rejoin-flow.integration.spec.ts` ← **Modified**
- `backend/test/integration/payment/webhook-processing.integration.spec.ts` ← **Modified**
- `backend/test/integration/membership-plan/plan-limit.integration.spec.ts` ← **Modified**

### Frontend (3 files)
- `frontend/lib/api/payments.ts` ← **Modified**
- `frontend/components/payments/PaymentChart.tsx` ← **Modified**
- `frontend/components/payments/PaymentList.tsx` ← **Modified**

### Documentation (2 files)
- `CLAUDE.md` ← **Updated**
- `docs/payment-consolidation-plan.md` ← **This document**

---

## 7. Next Steps

1. **Review this plan** with team and get approval
2. **Create feature branch**: `feature/consolidate-payment-entities`
3. **Start with Phase 1**: Create schema extension migration
4. **Run Phase 2**: Test data migration in staging environment
5. **Implement Phases 3-6**: Service/API/Frontend updates
6. **Deploy to staging**: Run for 1 week with monitoring
7. **Deploy to production**: Monitor for 2 weeks before Phase 7
8. **Execute Phase 7**: Drop payment_transactions table

---

## Questions/Decisions Needed

1. **Backward compatibility**: Do we need to support existing API clients expecting PaymentTransaction response format?
   - **Recommendation**: Version the API (v2) if breaking changes required

2. **Timeline**: Can we afford 4-5 days of focused work on this consolidation?
   - **Recommendation**: Schedule during low-traffic period

3. **Testing coverage**: Should we add E2E tests for both payment flows?
   - **Recommendation**: Yes, critical for payment systems

4. **Channel members**: The `channel_members` table has `payment_transaction_id` FK. How to handle?
   - **Decision**: Rename FK to `payment_id` in Phase 2 migration (before data migration)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Author**: Claude Code Agent
