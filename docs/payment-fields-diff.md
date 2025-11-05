# Payment vs PaymentTransaction Field Differences

## Fields in BOTH Entities

| Field | Payment Type | PaymentTransaction Type | Match? |
|-------|-------------|------------------------|--------|
| `id` | uuid | uuid | ✅ |
| `tenant_id` | uuid | uuid | ✅ |
| `qpay_invoice_id` | varchar(255) unique | varchar(255) unique | ✅ |
| `status` | enum (6 values) | enum (4 values) | ⚠️ Different values |
| `created_at` | timestamp | timestamp | ✅ |
| `updated_at` | timestamp | timestamp | ✅ |

---

## Fields ONLY in Payment (13 fields)

| Field | Type | Purpose |
|-------|------|---------|
| `member_id` | uuid (nullable) | Link to Member table |
| `membership_id` | uuid (nullable) | Link to Membership table |
| `qpay_payment_id` | varchar(255) | QPay transaction ID |
| `amount_mnt` | decimal(10,2) | Amount with cents |
| `currency` | varchar(3) | Currency code ('MNT') |
| `payment_method` | varchar(50) | Payment method |
| `paid_at` | timestamp | Completion timestamp |
| `failed_at` | timestamp | Failure timestamp |
| `failure_reason` | text | Why it failed |
| `refunded_at` | timestamp | Refund timestamp |
| `refund_amount` | decimal(10,2) | Refund amount |
| `webhook_event_id` | varchar(255) | Webhook identifier |
| `metadata` | jsonb | Flexible metadata |

---

## Fields ONLY in PaymentTransaction (14 fields)

| Field | Type | Purpose |
|-------|------|---------|
| `project_id` | uuid | Link to Project table |
| `membership_plan_id` | uuid | Link to MembershipPlan table |
| `telegram_user_id` | bigint | Telegram user ID |
| `telegram_username` | varchar(255) | Telegram @username |
| `telegram_first_name` | varchar(255) | First name from Telegram |
| `telegram_last_name` | varchar(255) | Last name from Telegram |
| `amount` | integer | Amount (whole tögrög) |
| `snapshot_plan_name` | varchar(255) | Plan name at purchase |
| `snapshot_price` | integer | Price at purchase |
| `snapshot_duration_days` | integer | Duration at purchase |
| `qpay_transaction_id` | varchar(255) | QPay transaction ID |
| `qpay_payment_method` | varchar(100) | QPay payment method |
| `payment_link` | text | QPay payment URL |
| `membership_starts_at` | timestamp | Membership start |
| `membership_expires_at` | timestamp | Membership expiration |
| `completed_at` | timestamp | Completion timestamp |

---

## Quick Stats

- **Payment**: 19 fields total
- **PaymentTransaction**: 20 fields total
- **Common**: 6 fields
- **Payment only**: 13 fields
- **PaymentTransaction only**: 14 fields
- **Overlap**: ~30%
