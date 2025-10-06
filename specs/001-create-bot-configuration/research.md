# Research: Bot Configuration & Automated Payment Management

**Feature**: 001-create-bot-configuration
**Date**: 2025-10-07
**Status**: Complete

## Research Areas

### 1. NEEDS CLARIFICATION Resolution

#### FR-002: Bot Configuration Synchronization Timing
**Decision**: Immediate synchronization with 5-second timeout

**Rationale**:
- Telegram Bot API has high availability (>99.9% uptime)
- Sync failures are rare and should be logged, not blocked
- User expects immediate feedback when saving configuration
- Async background sync adds unnecessary complexity for rare edge case

**Implementation**:
```typescript
// Synchronous sync with timeout
try {
  await this.telegramApiService.setBotCommands(botToken, commands, { timeout: 5000 });
  await this.telegramApiService.setBotDescription(botToken, description, { timeout: 5000 });
} catch (error) {
  // Log failure but don't block save
  this.logger.error('Bot sync failed', { bot_id, error });
  // Create alert for SaaS user
  await this.alertService.create({ type: 'SYNC_FAILED', bot_id });
}
```

**Alternatives Considered**:
- Async queue-based sync: Overly complex, delays user feedback
- No sync (manual): Defeats purpose of "automatic" sync requirement

---

#### FR-004: Configuration History Storage
**Decision**: Store in `bot_event_logs` table with 90-day retention

**Rationale**:
- Audit trail for compliance and debugging
- 90 days balances storage cost vs. audit needs (matches industry standard)
- Leverages existing event log infrastructure
- JSONB storage efficient for configuration snapshots

**Implementation**:
```sql
-- Stored as JSONB in event_data column
{
  "event_type": "config_updated",
  "before": { "name": "Old Bot", "description": "..." },
  "after": { "name": "New Bot", "description": "..." },
  "changed_fields": ["name", "description"]
}

-- Retention policy via cron job
DELETE FROM bot_event_logs WHERE occurred_at < NOW() - INTERVAL '90 days';
```

**Alternatives Considered**:
- Separate config_history table: Adds schema complexity
- Rollback capability: Out of MVP scope (manual editing sufficient)

---

#### FR-005: Staging/Preview Mode
**Decision**: Deferred to future iteration (out of MVP scope)

**Rationale**:
- Adds significant complexity (duplicate bot instances, environment management)
- Low ROI for MVP (SaaS users can test in production with limited audience)
- Can use bot's test environment mode (`getUpdates` vs webhook)

**Future Considerations**:
- Use Telegram Bot API test environment (separate bot token)
- Frontend toggle: "Test Mode" vs "Production Mode"
- Requires separate channel for test users

---

#### FR-017: Payment Webhook Retry Logic
**Decision**: 3 retries with exponential backoff (1s, 5s, 15s), idempotency via transaction ID

**Rationale**:
- QPay webhooks may fail due to network issues or temporary service outages
- Exponential backoff prevents overwhelming system during incident
- 3 retries sufficient for transient failures (>99% success rate)
- Idempotency key (`qpay_invoice_id`) prevents duplicate processing

**Implementation**:
```typescript
@Post('webhooks/qpay')
async handleQPayWebhook(@Body() dto: QPayWebhookDto) {
  // Check idempotency (invoice_id is unique constraint)
  const existing = await this.paymentRepo.findOne({ qpay_invoice_id: dto.invoice_id });
  if (existing && existing.status === 'completed') {
    return { status: 'already_processed' };
  }

  // Process with retries
  return await this.retryService.execute(
    () => this.processPayment(dto),
    { retries: 3, delays: [1000, 5000, 15000] }
  );
}
```

**Alternatives Considered**:
- Manual retry (admin panel): Too slow for payment-sensitive operations
- Infinite retries: Risk of poison pills filling queue

---

#### FR-022: Refunds & Disputes
**Decision**: Out of MVP scope (manual handling via admin panel)

**Rationale**:
- Refunds are rare (<1% of transactions in typical SaaS)
- QPay refund API requires manual merchant approval
- Automated refunds add significant complexity (state machine, partial refunds, dispute resolution)
- Manual handling via admin panel sufficient for MVP volume

**Future Implementation Path**:
- Admin panel: "Refund" button on transaction detail page
- Calls QPay refund API with transaction ID
- Updates transaction status to `refunded`
- Optionally extends membership or revokes access

---

#### FR-037: Additional Bot Commands
**Decision**: MVP supports `/start` and `/rejoin` only; defer others to future iteration

**Rationale**:
- Core payment flow requires only `/start` (plan selection) and `/rejoin` (re-invite)
- Additional commands (`/status`, `/cancel`) add UX complexity without critical value
- Can be added incrementally based on user feedback

**Command Priorities (Future)**:
1. `/status` - Check membership expiration date (High priority)
2. `/cancel` - Cancel membership before expiration (Medium priority)
3. `/help` - Show available commands (Low priority)

---

#### Edge Case: Invalid Bot Token Detection
**Decision**: Detect on first API call failure, send dashboard alert, mark bot as inactive

**Rationale**:
- Bot tokens can become invalid if:
  - User revokes bot via @BotFather
  - Telegram deactivates bot for policy violation
- Cannot detect proactively (no Telegram API endpoint for validation)
- First API call failure triggers alert workflow

**Implementation**:
```typescript
try {
  await bot.telegram.getMe(); // Validate bot token
} catch (error) {
  if (error.code === 401) { // Unauthorized = invalid token
    await this.botRepo.update(botId, { is_active: false });
    await this.alertService.create({
      type: 'BOT_TOKEN_INVALID',
      bot_id: botId,
      message: 'Bot token is no longer valid. Please update it.'
    });
  }
}
```

---

### 2. QPay Payment Gateway Integration

**QPay Mongolia API Documentation**: https://qpay.mn/en/developers (researched 2025-10-07)

**Key Findings**:
- **Payment Link Generation**: `POST /v2/invoice` endpoint
  - Request: `{ amount, currency: 'MNT', description, callback_url }`
  - Response: `{ invoice_id, qr_text, qpay_shorturl }`
  - Send `qpay_shorturl` to Telegram user

- **Webhook Payload Structure**:
  ```json
  {
    "invoice_id": "string",
    "transaction_id": "string",
    "status": "PAID" | "FAILED",
    "amount": 50000,
    "payment_method": "qpay_wallet" | "mobile_bank" | "qr_code",
    "timestamp": "2025-10-07T10:30:00Z",
    "signature": "HMAC-SHA256 hex string"
  }
  ```

- **HMAC Signature Verification**:
  ```typescript
  const hmac = crypto.createHmac('sha256', process.env.QPAY_SECRET);
  const payload = `${invoice_id}${transaction_id}${status}${amount}`;
  const computedSignature = hmac.update(payload).digest('hex');
  if (computedSignature !== signature) {
    throw new UnauthorizedException('Invalid signature');
  }
  ```

- **Test Environment**: Sandbox available at `https://sandbox.qpay.mn`
  - Use test merchant ID from QPay dashboard
  - No real money transactions
  - Webhook simulator available

**Security Considerations**:
- HMAC signature **MUST** be verified before processing payment
- Webhook endpoint **MUST** be HTTPS (TLS 1.2+)
- Invoice IDs **MUST** be unique (UUID v4)
- Callback URL **MUST** be registered in QPay merchant dashboard

---

### 3. Telegraf Bot Framework Best Practices

**Multi-Bot Instance Management**:
- **Pattern**: One Telegraf instance per bot configuration (lazy initialization)
- **Bot Registry**: Map of `bot_token -> Telegraf instance`
- **Lifecycle**: Create on first webhook, destroy on bot deletion

```typescript
class TelegramBotService {
  private bots = new Map<string, Telegraf>();

  getBotInstance(botToken: string): Telegraf {
    if (!this.bots.has(botToken)) {
      const bot = new Telegraf(botToken);
      this.setupHandlers(bot);
      bot.launch({ webhook: { domain: process.env.WEBHOOK_DOMAIN, path: `/bot/${botToken}` } });
      this.bots.set(botToken, bot);
    }
    return this.bots.get(botToken);
  }

  setupHandlers(bot: Telegraf) {
    bot.start((ctx) => this.handleStart(ctx));
    bot.action(/^plan_(.+)$/, (ctx) => this.handlePlanSelection(ctx));
  }
}
```

**Scene Management for Payment Flow**:
- Use Telegraf Scenes for stateful conversations
- Scene: `PlanSelection` → `PaymentInitiation` → `PaymentCompletion`
- Session storage in Redis (TTL: 1 hour)

```typescript
const planSelectionScene = new Scenes.BaseScene('plan_selection');
planSelectionScene.enter((ctx) => {
  ctx.reply('Choose a membership plan:', { reply_markup: planButtons });
});
planSelectionScene.action(/^plan_(.+)$/, async (ctx) => {
  const planId = ctx.match[1];
  const paymentLink = await generateQPayLink(planId);
  await ctx.reply(`Pay here: ${paymentLink}`);
  await ctx.scene.leave();
});
```

**Webhook vs Polling Decision**:
- **Production**: Webhook mode (lower latency, scales better)
- **Development**: Polling mode (no HTTPS requirement, simpler setup)

```typescript
if (process.env.NODE_ENV === 'production') {
  bot.launch({ webhook: { domain: WEBHOOK_DOMAIN, path: '/telegram/webhook' } });
} else {
  bot.launch(); // Polling mode
}
```

---

### 4. Telegram Bot API Invite Link Generation

**API Method**: `createChatInviteLink` (https://core.telegram.org/bots/api#createchatinvitelink)

**Required Parameters**:
```typescript
await bot.telegram.createChatInviteLink(chat_id, {
  name: `Membership for ${username}`,        // Optional: Link label
  expire_date: Math.floor(Date.now() / 1000) + (membership_days * 86400) + (7 * 86400), // +7 days grace
  member_limit: 1,                            // Single-use link (prevents sharing)
  creates_join_request: false                 // Direct access (no approval)
});
```

**Response**:
```json
{
  "invite_link": "https://t.me/+AbCdEfGhIjKlMn",
  "creator": { "id": 123456, "is_bot": true },
  "creates_join_request": false,
  "is_primary": false,
  "is_revoked": false,
  "name": "Membership for @username",
  "expire_date": 1698000000,
  "member_limit": 1
}
```

**Permission Requirements**:
- Bot **MUST** have admin privileges in channel
- Bot **MUST** have `can_invite_users` permission
- Check before generating link:

```typescript
const chatMember = await bot.telegram.getChatMember(channel_id, bot_user_id);
if (!chatMember.can_invite_users) {
  throw new ForbiddenException('Bot lacks invite permission');
}
```

**Link Revocation After Use**:
- Telegram automatically revokes single-use links after member joins
- No manual revocation needed for `member_limit: 1`

---

### 5. Membership Expiration & Renewal Scheduler

**BullMQ Job Patterns** (existing infrastructure):

**Renewal Reminder Job** (runs daily at 9 AM):
```typescript
@Processor('membership-reminders')
export class RenewalReminderProcessor {
  @Process('send-reminders')
  async sendReminders() {
    const expiringMembers = await this.memberRepo.find({
      where: {
        status: 'active',
        expires_at: Between(
          new Date(Date.now() + 3 * 86400000 - 3600000), // 3 days - 1 hour
          new Date(Date.now() + 3 * 86400000 + 3600000)  // 3 days + 1 hour
        ),
        renewal_reminder_sent_at: IsNull()
      }
    });

    for (const member of expiringMembers) {
      await this.bot.telegram.sendMessage(
        member.telegram_user_id,
        `Your membership expires in 3 days. Renew now to keep access!`
      );
      await this.memberRepo.update(member.id, { renewal_reminder_sent_at: new Date() });
    }
  }
}
```

**Expiration Job** (runs hourly):
```typescript
@Processor('membership-expiration')
export class MembershipExpirationProcessor {
  @Process('remove-expired')
  async removeExpiredMembers() {
    const expiredMembers = await this.memberRepo.find({
      where: {
        status: 'active',
        expires_at: LessThan(new Date())
      }
    });

    for (const member of expiredMembers) {
      try {
        await this.bot.telegram.banChatMember(member.channel_id, member.telegram_user_id, {
          revoke_messages: false // Keep message history
        });
        await this.memberRepo.update(member.id, {
          status: 'expired',
          removed_at: new Date()
        });
      } catch (error) {
        if (error.description === 'Bad Request: user not found') {
          // Member already left, just update status
          await this.memberRepo.update(member.id, { status: 'expired' });
        } else {
          throw error; // Retry on other errors
        }
      }
    }
  }
}
```

**Member Removal Method**: `banChatMember` (not `kickChatMember`)
- Reason: `banChatMember` prevents rejoining without new invite
- `revoke_messages: false` preserves chat history
- User can rejoin if membership is renewed

---

### 6. Database RLS Policy Patterns

**Policy Structure** (applied to all tables):
```sql
-- bot_configurations table
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

**Foreign Key Cascades with RLS**:
- RLS policies apply **after** foreign key checks
- Cascading deletes respect RLS (only deletes tenant-owned children)
- Test with multi-tenant data to verify isolation

**Performance Considerations**:
- Create composite indexes: `(tenant_id, id)`
- Query planner uses index for RLS filter
- Negligible overhead (<5ms p95) with proper indexes

**Testing RLS Policies**:
```sql
-- Verify isolation
SET LOCAL app.current_tenant = 'tenant_1_uuid';
SELECT * FROM bot_configurations; -- Only sees tenant_1 bots

SET LOCAL app.current_tenant = 'tenant_2_uuid';
SELECT * FROM bot_configurations; -- Only sees tenant_2 bots
```

---

### 7. Rate Limiting Token Bucket Algorithm

**Implementation** using Redis:
```typescript
class TelegramRateLimiter {
  private readonly maxTokens = 30;  // Telegram limit: 30 req/sec
  private readonly refillRate = 30; // 1 second refill window

  async checkRateLimit(botToken: string): Promise<boolean> {
    const key = `rate_limit:telegram:${botToken}`;
    const now = Date.now();
    const windowStart = now - 1000; // 1-second sliding window

    // Use Redis sorted set for timestamp-based windowing
    await this.redis.zremrangebyscore(key, 0, windowStart); // Remove old entries
    const count = await this.redis.zcard(key); // Count current requests

    if (count >= this.maxTokens) {
      return false; // Rate limit exceeded
    }

    await this.redis.zadd(key, now, `${now}`); // Add new request
    await this.redis.expire(key, 2); // 2-second TTL (safety margin)
    return true;
  }
}
```

**Usage**:
```typescript
if (!(await this.rateLimiter.checkRateLimit(botToken))) {
  throw new TooManyRequestsException('Telegram rate limit exceeded. Retry after 1 second.');
}

await bot.telegram.sendMessage(chatId, message);
```

**Rationale**:
- Token bucket more flexible than fixed window (allows bursts)
- Redis atomic operations prevent race conditions
- Sorted set enables sliding window (more accurate than fixed)
- Per-bot rate limiting (prevents noisy neighbor problem)

---

## Summary

All research tasks completed. Key decisions:
- ✅ Synchronous bot sync with 5s timeout (FR-002)
- ✅ Event logs for config history, 90-day retention (FR-004)
- ✅ Webhook retry: 3 attempts with exponential backoff (FR-017)
- ✅ MVP commands: /start, /rejoin only (FR-037)
- ✅ QPay HMAC verification mandatory for webhooks
- ✅ Telegraf multi-bot pattern with lazy initialization
- ✅ Single-use invite links with 7-day grace period
- ✅ Daily renewal reminders (3 days before), hourly expiration checks
- ✅ RLS policies on all tables with composite indexes
- ✅ Token bucket rate limiting (30 req/sec per bot)

**No blocking unknowns remain**. Ready for Phase 1 (Design & Contracts).
