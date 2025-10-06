# Quickstart: Bot Configuration & Automated Payment Management

**Feature**: 001-create-bot-configuration
**Date**: 2025-10-07
**Status**: Complete

This quickstart guide provides test scenarios matching the spec acceptance scenarios. Use these to verify the feature implementation.

---

## Prerequisites

1. **Backend running**: `npm run dev` (port 3001)
2. **Frontend running**: `cd frontend && npm run dev` (port 3000)
3. **BullMQ worker running**: `npm run worker:dev`
4. **PostgreSQL running**: Database migrated with latest schema
5. **Redis running**: For caching and job queue
6. **Test tenant created**: You have valid JWT token for authentication
7. **Telegram bot created**: Obtain bot token from @BotFather
8. **Telegram channel created**: Create private channel, add bot as admin with invite permissions

---

## Environment Setup

```bash
# .env file (backend)
QPAY_MERCHANT_ID=your_test_merchant_id
QPAY_SECRET_KEY=your_test_secret_key
QPAY_SANDBOX_URL=https://sandbox.qpay.mn
TELEGRAM_WEBHOOK_DOMAIN=https://your-ngrok-domain.ngrok.io
```

```bash
# Test JWT token (replace with actual token from login)
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Test Scenario 1: Bot Configuration Synchronization

**Objective**: Verify that bot configuration changes immediately reflect on the live Telegram bot.

### Step 1.1: Create Bot Configuration

```bash
curl -X POST http://localhost:3001/v1/bots \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bot_token": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789",
    "display_name": "My Test Bot",
    "description": "Test bot for premium content",
    "welcome_message": "Welcome! Choose a membership plan:\n\n/start - View available plans",
    "channel_id": -1001234567890
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
  "bot_token": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789",
  "bot_username": "my_test_bot",
  "display_name": "My Test Bot",
  "description": "Test bot for premium content",
  "welcome_message": "Welcome! Choose a membership plan:\n\n/start - View available plans",
  "channel_id": -1001234567890,
  "channel_username": "my_premium_channel",
  "is_active": true,
  "last_sync_at": "2025-10-07T10:30:00Z",
  "created_at": "2025-10-07T10:30:00Z",
  "updated_at": "2025-10-07T10:30:00Z"
}
```

**Verification:**
1. Open Telegram and search for your bot (@my_test_bot)
2. Send `/start` command to the bot
3. Verify bot replies with the welcome message
4. Check bot description in Telegram UI matches "Test bot for premium content"

### Step 1.2: Update Bot Configuration

```bash
curl -X PUT http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "display_name": "Updated Test Bot",
    "description": "Updated description for testing sync",
    "welcome_message": "Welcome back! We have updated our plans.\n\n/start - View latest plans"
  }'
```

**Expected Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "display_name": "Updated Test Bot",
  "description": "Updated description for testing sync",
  "welcome_message": "Welcome back! We have updated our plans.\n\n/start - View latest plans",
  "last_sync_at": "2025-10-07T10:35:00Z",
  "updated_at": "2025-10-07T10:35:00Z"
}
```

**Verification:**
1. Open Telegram and send `/start` to the bot again
2. Verify bot replies with the NEW welcome message
3. Check bot description in Telegram UI is updated
4. Verify sync happened within 5 seconds (check `last_sync_at` timestamp)

### Step 1.3: Check Bot Event Logs

```bash
curl -X GET "http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/events?limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "event_type": "bot_sync_success",
      "event_data": {
        "synced_fields": ["description", "welcome_message"],
        "duration_ms": 420
      },
      "severity": "info",
      "occurred_at": "2025-10-07T10:35:00Z"
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "event_type": "bot_updated",
      "event_data": {
        "changed_fields": ["display_name", "description", "welcome_message"],
        "before": { "display_name": "My Test Bot" },
        "after": { "display_name": "Updated Test Bot" }
      },
      "severity": "info",
      "occurred_at": "2025-10-07T10:35:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "total_pages": 1
  }
}
```

---

## Test Scenario 2: Membership Plan Creation

**Objective**: Verify that SaaS users can create up to 5 membership plans per bot.

### Step 2.1: Create First Membership Plan

```bash
curl -X POST http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/plans \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Access",
    "description": "7 days of premium content access",
    "price": 15000,
    "duration_days": 7,
    "sort_order": 1
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "660e8400-e29b-41d4-a716-446655440000",
  "bot_configuration_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Weekly Access",
  "description": "7 days of premium content access",
  "price": 15000,
  "duration_days": 7,
  "is_active": true,
  "sort_order": 1,
  "created_at": "2025-10-07T10:40:00Z",
  "updated_at": "2025-10-07T10:40:00Z"
}
```

### Step 2.2: Create Additional Plans (Monthly, Annual)

```bash
# Monthly plan
curl -X POST http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/plans \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Monthly VIP",
    "description": "30 days of premium content access",
    "price": 50000,
    "duration_days": 30,
    "sort_order": 2
  }'

# Annual plan (20% discount)
curl -X POST http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/plans \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Annual VIP",
    "description": "365 days of premium content access (20% discount)",
    "price": 480000,
    "duration_days": 365,
    "sort_order": 3
  }'
```

### Step 2.3: List All Plans

```bash
curl -X GET http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/plans \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "name": "Weekly Access",
      "price": 15000,
      "duration_days": 7,
      "sort_order": 1
    },
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "name": "Monthly VIP",
      "price": 50000,
      "duration_days": 30,
      "sort_order": 2
    },
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440000",
      "name": "Annual VIP",
      "price": 480000,
      "duration_days": 365,
      "sort_order": 3
    }
  ]
}
```

### Step 2.4: Test 5-Plan Limit

```bash
# Create plans 4 and 5
for i in 4 5; do
  curl -X POST http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/plans \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Plan $i\",
      \"price\": $((i * 10000)),
      \"duration_days\": $((i * 7)),
      \"sort_order\": $i
    }"
done

# Try to create 6th plan (should fail)
curl -X POST http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/plans \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Should Fail",
    "price": 10000,
    "duration_days": 7,
    "sort_order": 6
  }'
```

**Expected Response (422 Unprocessable Entity):**
```json
{
  "error": {
    "code": "MAX_PLANS_EXCEEDED",
    "message": "Cannot create more than 5 active plans per bot. Please deactivate an existing plan first.",
    "details": {
      "current_active_plans": 5,
      "max_allowed_plans": 5
    }
  }
}
```

---

## Test Scenario 3: Automated Payment & Access Grant

**Objective**: Verify end-to-end payment flow from plan selection to channel access.

### Step 3.1: Telegram Bot Interaction (Manual)

1. Open Telegram and send `/start` to your bot
2. Bot should display available plans with inline buttons:
   ```
   Welcome back! We have updated our plans.

   Available Plans:
   📅 Weekly Access - ₮15,000 (7 days)
   📆 Monthly VIP - ₮50,000 (30 days)
   🎫 Annual VIP - ₮480,000 (365 days)

   [Select Weekly] [Select Monthly] [Select Annual]
   ```

3. Click "Select Monthly" button
4. Bot should reply with QPay payment link:
   ```
   You selected: Monthly VIP (₮50,000)

   Click below to complete payment:
   🔗 https://qpay.mn/pay/INV-20251007-123456

   Payment is valid for 30 minutes.
   ```

### Step 3.2: Simulate QPay Webhook (Payment Success)

**First, compute HMAC signature:**
```typescript
// Run this in Node.js REPL or create test script
const crypto = require('crypto');
const invoice_id = "INV-20251007-123456";
const transaction_id = "TXN-QPAY-789012345";
const status = "PAID";
const amount = 50000;
const secret = process.env.QPAY_SECRET_KEY;

const payload = `${invoice_id}${transaction_id}${status}${amount}`;
const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
console.log(signature);
// Output: a3f8b2c9d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0
```

**Send webhook:**
```bash
curl -X POST http://localhost:3001/v1/webhooks/qpay \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "INV-20251007-123456",
    "transaction_id": "TXN-QPAY-789012345",
    "status": "PAID",
    "amount": 50000,
    "payment_method": "qpay_wallet",
    "timestamp": "2025-10-07T10:50:00Z",
    "signature": "a3f8b2c9d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "processed",
  "transaction_id": "dd0e8400-e29b-41d4-a716-446655440000",
  "invite_link": "https://t.me/+AbCdEfGhIjKlMn",
  "message": "Payment completed successfully. Invite link sent to user."
}
```

### Step 3.3: Verify User Receives Invite Link (Telegram)

Bot should send message to user:
```
✅ Payment successful!

Your membership is now active.
Duration: 30 days
Expires: 2025-11-06

Join the channel:
🔗 https://t.me/+AbCdEfGhIjKlMn

This link is single-use and expires in 37 days.
```

### Step 3.4: Verify Channel Access

1. User clicks the invite link
2. User joins the private channel
3. Verify user can see channel content
4. Check database for channel member record:

```bash
# Via backend API (create admin endpoint or check directly in DB)
psql -d paid_groups_dev -c "
  SELECT id, telegram_user_id, status, joined_at, expires_at
  FROM channel_members
  WHERE status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
"
```

**Expected Output:**
```
                  id                  | telegram_user_id |  status  |       joined_at        |       expires_at
--------------------------------------+------------------+----------+------------------------+------------------------
 ee0e8400-e29b-41d4-a716-446655440000 |        123456789 | active   | 2025-10-07 10:51:00+00 | 2025-11-06 10:50:00+00
```

### Step 3.5: Test Rejoin Flow (User Left Channel)

1. User manually leaves the channel in Telegram
2. User sends `/rejoin` command to bot
3. Bot should verify active membership and generate new invite link:
   ```
   Your membership is still active!

   Join the channel again:
   🔗 https://t.me/+NewInviteLinkXyz

   Expires: 2025-11-06
   ```

4. User clicks new link and rejoins channel

---

## Test Scenario 4: Payment Failure Handling

**Objective**: Verify system handles payment failures gracefully.

### Step 4.1: Simulate QPay Webhook (Payment Failed)

```bash
# Compute signature for failed payment
# payload = "INV-20251007-789012TXN-QPAY-345678901FAILED50000"

curl -X POST http://localhost:3001/v1/webhooks/qpay \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "INV-20251007-789012",
    "transaction_id": "TXN-QPAY-345678901",
    "status": "FAILED",
    "amount": 50000,
    "payment_method": "mobile_bank",
    "timestamp": "2025-10-07T11:00:00Z",
    "signature": "b4e9c3d0e2f5a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2"
  }'
```

**Expected Response (200 OK):**
```json
{
  "status": "processed",
  "transaction_id": "ff0e8400-e29b-41d4-a716-446655440000",
  "invite_link": null,
  "message": "Payment failed. Transaction status updated."
}
```

### Step 4.2: Verify User Receives Error Message (Telegram)

Bot should send message to user:
```
❌ Payment failed

Your payment could not be processed.

Reason: Payment declined by bank

You can try again with a different payment method.
Send /start to view plans.
```

### Step 4.3: Test Retry Flow

1. User sends `/start` command again
2. User selects same plan (Monthly VIP)
3. User receives NEW payment link (different invoice_id)
4. User completes payment successfully
5. Verify new payment transaction created (not reusing failed one)

### Step 4.4: Test Invalid Signature (Security)

```bash
curl -X POST http://localhost:3001/v1/webhooks/qpay \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_id": "INV-20251007-999999",
    "transaction_id": "TXN-FAKE-123456789",
    "status": "PAID",
    "amount": 50000,
    "payment_method": "qpay_wallet",
    "timestamp": "2025-10-07T11:10:00Z",
    "signature": "invalid_signature_1234567890abcdef"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "HMAC signature verification failed. This request may be fraudulent.",
    "details": {
      "invoice_id": "INV-20251007-999999",
      "ip_address": "127.0.0.1"
    }
  }
}
```

### Step 4.5: Verify Security Event Logged

```bash
curl -X GET "http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/events?severity=critical&limit=5" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "data": [
    {
      "id": "gg0e8400-e29b-41d4-a716-446655440000",
      "event_type": "webhook_signature_invalid",
      "event_data": {
        "source": "qpay",
        "invoice_id": "INV-20251007-999999",
        "ip_address": "127.0.0.1"
      },
      "severity": "critical",
      "occurred_at": "2025-10-07T11:10:00Z"
    }
  ]
}
```

---

## Test Scenario 5: Membership Expiration & Renewal

**Objective**: Verify automated membership expiration and renewal reminder system.

### Step 5.1: Create Test Membership with Short Duration

```bash
# Create test plan with 1-day duration
curl -X POST http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/plans \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test 1-Day Plan",
    "price": 1000,
    "duration_days": 1,
    "sort_order": 99
  }'
```

### Step 5.2: Complete Payment for Test Plan

1. User selects 1-Day plan via bot
2. Complete payment via QPay webhook simulation
3. User joins channel

### Step 5.3: Manually Set Expiration to 3 Days from Now (for testing)

```sql
-- Run in PostgreSQL
UPDATE channel_members
SET expires_at = NOW() + INTERVAL '3 days 1 hour'
WHERE telegram_user_id = 123456789
  AND status = 'active';
```

### Step 5.4: Trigger Renewal Reminder Job (BullMQ)

```bash
# Via backend API (create admin endpoint) or BullMQ dashboard
# Or wait for scheduled job to run (daily at 9 AM)

# Manual trigger via Node.js REPL:
node
> const { Queue } = require('bullmq');
> const queue = new Queue('membership-reminders');
> queue.add('send-reminders', {});
```

### Step 5.5: Verify User Receives Reminder (Telegram)

Bot should send message:
```
⏰ Membership Expiring Soon

Your membership expires in 3 days.

Expiration date: 2025-10-10 11:00 UTC

Renew now to keep access:
Send /start to view plans
```

### Step 5.6: Verify Reminder Logged in Database

```sql
SELECT id, telegram_user_id, expires_at, renewal_reminder_sent_at, status
FROM channel_members
WHERE telegram_user_id = 123456789;
```

**Expected Output:**
```
                  id                  | telegram_user_id |       expires_at       |  renewal_reminder_sent_at  | status
--------------------------------------+------------------+------------------------+---------------------------+--------
 hh0e8400-e29b-41d4-a716-446655440000 |        123456789 | 2025-10-10 11:00:00+00 | 2025-10-07 12:00:00+00    | active
```

### Step 5.7: Manually Set Expiration to Past (for testing)

```sql
UPDATE channel_members
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE telegram_user_id = 123456789
  AND status = 'active';
```

### Step 5.8: Trigger Expiration Job

```bash
# Manual trigger via Node.js REPL:
node
> const { Queue } = require('bullmq');
> const queue = new Queue('membership-expiration');
> queue.add('remove-expired', {});
```

### Step 5.9: Verify User Removed from Channel

1. Check user's Telegram channel access (should be removed)
2. Verify database status updated:

```sql
SELECT id, telegram_user_id, status, removed_at
FROM channel_members
WHERE telegram_user_id = 123456789;
```

**Expected Output:**
```
                  id                  | telegram_user_id |  status  |       removed_at
--------------------------------------+------------------+----------+------------------------
 hh0e8400-e29b-41d4-a716-446655440000 |        123456789 | expired  | 2025-10-07 12:05:00+00
```

3. Verify event logged:

```bash
curl -X GET "http://localhost:3001/v1/bots/550e8400-e29b-41d4-a716-446655440000/events?event_type=member_expired" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## BullMQ Worker Testing

### Verify Job Queue Processing

```bash
# Check BullMQ dashboard (if installed)
# Or query Redis directly:

redis-cli
> KEYS bull:*
> HGETALL bull:membership-reminders:1
> HGETALL bull:membership-expiration:1
```

### Monitor Worker Logs

```bash
# Worker should output structured logs:
# [2025-10-07 12:00:00] INFO: Processing renewal reminders...
# [2025-10-07 12:00:05] INFO: Sent 3 renewal reminders
# [2025-10-07 12:00:05] INFO: Processing membership expiration...
# [2025-10-07 12:00:08] INFO: Removed 2 expired members
```

---

## Troubleshooting

### Bot Not Responding to /start

1. Check bot token validity:
   ```bash
   curl https://api.telegram.org/bot<BOT_TOKEN>/getMe
   ```
2. Verify webhook is set correctly:
   ```bash
   curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
   ```
3. Check backend logs for webhook errors

### Payment Webhook Not Processing

1. Verify HMAC signature calculation
2. Check QPay sandbox environment is used
3. Verify transaction exists in database with `pending` status
4. Check Redis for rate limiting issues

### User Not Getting Invite Link

1. Verify bot has admin permissions in channel:
   ```bash
   curl https://api.telegram.org/bot<BOT_TOKEN>/getChatMember?chat_id=<CHANNEL_ID>&user_id=<BOT_USER_ID>
   ```
2. Check `can_invite_users` permission is true
3. Verify payment transaction status is `completed`
4. Check backend logs for Telegram API errors

### Membership Not Expiring

1. Verify BullMQ worker is running
2. Check job scheduler configuration (cron expressions)
3. Query database for members with past expiration dates
4. Check worker logs for processing errors

---

## Success Criteria

All test scenarios should pass:
- ✅ Bot configuration syncs to Telegram within 5 seconds
- ✅ Up to 5 membership plans can be created per bot
- ✅ Payment webhook processing with HMAC verification
- ✅ Invite link generation and channel access grant
- ✅ Payment failures handled gracefully with retry support
- ✅ Renewal reminders sent 3 days before expiration
- ✅ Expired members automatically removed from channel
- ✅ All events logged in bot_event_logs table
- ✅ Security events (invalid signatures) logged with critical severity

---

## Next Steps

After completing these tests:
1. Run contract tests to verify API schema compliance
2. Run integration tests for database operations
3. Run E2E tests for complete user workflows
4. Monitor production logs for 24 hours after deployment
5. Set up alerts for critical events (bot_permission_lost, webhook_signature_invalid)
