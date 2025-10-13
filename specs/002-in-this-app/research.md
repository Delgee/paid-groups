# Phase 0: Research & Technical Decisions

**Feature**: Telegram Bot Onboarding for SaaS Users
**Date**: 2025-01-20

## Technical Context Resolution

### 1. Telegram Bot Framework Selection

**Decision**: Use existing Telegraf library (already in project dependencies)

**Rationale**:
- Project already uses Telegraf for existing bot functionality (`backend/src/modules/bot`)
- Mature TypeScript library with strong typing
- Supports both polling and webhooks
- Well-documented conversation state management (sessions)
- Active community and maintenance

**Alternatives Considered**:
- `node-telegram-bot-api`: More lightweight but less TypeScript support
- `grammy`: Modern alternative but would require learning new patterns
- Custom implementation: Too much effort for proven use case

### 2. Session State Storage Strategy

**Decision**: Use Redis with 1-hour TTL for onboarding sessions

**Rationale**:
- Redis already in use for caching Telegram API responses
- Fast access for conversational state (sub-millisecond reads)
- Automatic expiration via TTL matches clarification (1 hour timeout)
- Supports complex data structures (hashes for session data)
- Proven at scale for session management

**Implementation Pattern**:
```
Key: onboarding:session:{telegram_user_id}
Value: JSON string with { step, data, started_at, last_activity }
TTL: 3600 seconds (1 hour)
```

**Alternatives Considered**:
- PostgreSQL: Too slow for real-time bot conversations
- In-memory: Doesn't persist across server restarts
- Database + Redis: Over-engineered for v1 requirements

### 3. Bot Command Router Architecture

**Decision**: State machine pattern with step-based routing

**Rationale**:
- Multi-step conversations require tracking current state
- Each command either starts new flow or continues existing
- Telegraf middleware supports session management natively
- Reference: InviteMember uses similar conversational flows

**State Flow Design**:
```
IDLE → REGISTERING → PROJECT_CREATION → BOT_TOKEN → GROUP_CONNECTION → PLAN_CREATION → IDLE
```

**Alternatives Considered**:
- Webhook-per-command: Doesn't handle multi-step conversations
- Dialog frameworks: Overkill for linear onboarding flow
- Natural language processing: Not needed for structured commands

### 4. Email Validation & Verification Code Generation

**Decision**: Use existing email service + 6-digit numeric codes (TTL: 10 minutes)

**Rationale**:
- Email service already configured for web registration
- 6-digit codes are user-friendly (easy to type in Telegram)
- 10-minute expiration balances security and UX
- Codes stored in Redis with `email:verification:{email}` key

**Security Measures**:
- Rate limit: 3 verification attempts per email per hour
- Code expires after 10 minutes
- Single-use codes (delete after successful verification)
- Log all verification attempts for audit

**Alternatives Considered**:
- Magic links: Requires user to leave Telegram
- JWT tokens: Too complex for simple verification
- SMS codes: Not needed, email verification sufficient

### 5. Bot Token Validation Process

**Decision**: Direct Telegram Bot API call to `getMe` endpoint

**Rationale**:
- Official Telegram API method for token validation
- Returns bot info (username, name, capabilities)
- Fast response (<500ms typical)
- No need to cache validation results (one-time operation)

**Validation Steps**:
1. Call `bot.telegram.getMe()` with provided token
2. Verify response success (token is valid)
3. Check bot capabilities (can_join_groups, can_read_all_group_messages)
4. Store bot info in Project entity
5. Encrypt token before storing

**Error Handling**:
- Invalid token: User-friendly message + guidance to @BotFather
- Network timeout: Retry once, then show error
- Rate limit: Should not happen (validation is infrequent)

### 6. Group/Channel Permission Verification

**Decision**: Use Telegram `getChatMember` API to check bot permissions

**Rationale**:
- Official method to check bot admin status
- Returns permission details (can_manage_chat, can_post_messages, etc.)
- Required before allowing group connection
- Prevents connection errors later

**Required Permissions** (for onboarding bot):
- `is_member`: Bot must be in the group/channel
- `can_manage_chat`: Bot needs admin rights for future member management

**Permission Check Flow**:
1. Extract chat ID from forwarded message or link
2. Call `getChatMember(chatId, botUserId)`
3. Verify bot is admin
4. If not admin: Display instructions + allow retry

### 7. Rate Limiting Implementation

**Decision**: Token bucket algorithm with Redis (20 commands/minute per user)

**Rationale**:
- Matches clarification: 20 commands per minute per user
- Token bucket allows bursts but limits sustained rate
- Redis atomic operations (INCR, EXPIRE) handle concurrency
- Existing rate limiting code in `backend/src/modules/bot` as reference

**Implementation Pattern**:
```
Key: rate:limit:onboarding:{telegram_user_id}
Value: token count (starts at 20)
Operations:
  - DECR on each command
  - EXPIRE 60 (refills after 1 minute)
  - If value < 0: reject with 429
```

**Error Response**:
- Status: 429 Too Many Requests
- Message: "Too many commands. Please wait {X} seconds and try again."
- Include `retryAfter` in response

### 8. Multi-Tenant Isolation for Bot Users

**Decision**: Leverage existing RLS policies + TenantInterceptor

**Rationale**:
- Constitution Principle I: Multi-tenancy is NON-NEGOTIABLE
- Bot-created tenants follow same isolation rules as web tenants
- RLS policies automatically scope queries by `tenant_id`
- No additional work needed, just use existing patterns

**Security Verification**:
- TelegramUserAccount table includes `user_id` FK to users table
- Users table includes `tenant_id`
- All queries automatically filtered by RLS
- Audit logs include `tenant_id` for tracking

### 9. Logging & Observability

**Decision**: Extend existing structured logging with bot-specific context

**Rationale**:
- Constitution Principle VIII: Observability & Monitoring required
- Use existing `logger.telegram()` method from reference implementation
- Add correlation IDs for tracking conversation flows
- Emit metrics for monitoring dashboard

**Metrics to Track**:
```
onboarding_bot_commands_total{command, status}
onboarding_registrations_total{status}
onboarding_session_duration_seconds
telegram_api_validation_duration_seconds{operation}
```

**Log Levels**:
- INFO: Commands received, registration started/completed
- WARN: Rate limits hit, validation failures
- ERROR: Telegram API failures, system errors

### 10. Testing Strategy

**Decision**: Follow TDD workflow per constitution (contract → integration → implementation)

**Test Structure**:
```
backend/test/contract/onboarding-bot/
├── start-command.contract.spec.ts
├── registration-flow.contract.spec.ts
├── project-creation.contract.spec.ts
└── error-handling.contract.spec.ts

backend/test/integration/onboarding-bot/
├── registration-e2e.integration.spec.ts
├── session-management.integration.spec.ts
└── rate-limiting.integration.spec.ts
```

**No Mocks** (per constitution):
- Use real PostgreSQL database (test schema)
- Use real Redis instance (separate DB index)
- Mock only external Telegram API calls (not under our control)

---

## Technology Stack Summary

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Bot Framework | Telegraf | 4.x | Already in use, mature, TypeScript-first |
| Session Storage | Redis | 7.x | Existing infrastructure, fast, TTL support |
| Bot Registration | Telegram Bot API | Latest | Official API, reliable |
| Email Service | NodeMailer | Existing | Already configured |
| Rate Limiting | Redis + Token Bucket | Custom | Constitution-compliant pattern |
| Database | PostgreSQL + RLS | 14.x | Existing multi-tenant setup |
| Testing | Jest + Supertest | 29.x | Project standard |
| Logging | Winston | Existing | Structured logging |

---

## Performance Targets (from spec NFRs)

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Bot response time | <3 seconds | 95th percentile under normal load |
| Token validation | <5 seconds | Telegram API getMe call |
| Permission verification | <5 seconds | Telegram API getChatMember call |
| Session persistence | 1 hour | Redis TTL expiration |
| Rate limit | 20 cmd/min/user | Token bucket refill rate |

---

## Security Considerations

1. **Bot Token Storage**: Encrypt tokens using existing EncryptionService
2. **Email Verification**: 6-digit codes, 10-min TTL, rate limited
3. **Multi-Tenant Isolation**: RLS policies + TenantInterceptor
4. **Rate Limiting**: 20 commands/minute per user
5. **Webhook Validation**: HMAC signature verification (existing pattern)
6. **Audit Logging**: All onboarding events logged with correlation IDs
7. **Input Validation**: Zod schemas for all user inputs

---

## Integration Points

### Existing Systems to Integrate:
1. **Auth Module**: Create User + Tenant records (no password for bot users)
2. **Project Module**: Create Project entity with bot token
3. **TelegramGroup Module**: Connect groups via existing service
4. **MembershipPlan Module**: Create plans via existing service
5. **Audit Module**: Log onboarding activities
6. **Email Service**: Send verification codes for account linking

### New Components to Create:
1. **OnboardingBotController**: Webhook receiver for onboarding bot
2. **OnboardingBotService**: Business logic for registration flows
3. **OnboardingSessionService**: Redis-based session management
4. **TelegramUserAccountService**: Link Telegram IDs to User accounts
5. **BotCommandLogger**: Structured logging for bot interactions

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Telegram API rate limits | Bot unresponsive | Medium | Cache validation results, implement backoff |
| Session state loss (Redis restart) | User forced to restart | Low | Accept as acceptable risk for v1 |
| Duplicate email handling edge case | Account linking confusion | Medium | Clear error messages + email verification |
| Bot token encryption key rotation | Tokens unreadable | Low | Use EncryptionService migration pattern |
| Concurrent session updates | State corruption | Low | Redis atomic operations |

---

## Open Questions (Resolved via Clarifications)

All technical unknowns have been resolved through the clarification session:
1. ✅ User role assignment: Always OWNER
2. ✅ Session timeout: 1 hour
3. ✅ Bot capabilities: Create + View (no edit/delete in v1)
4. ✅ Email verification: Not required for new registrations
5. ✅ Rate limiting: 20 commands/minute/user

---

**Phase 0 Status**: ✅ COMPLETE
**Next Phase**: Phase 1 - Design data model, contracts, and quickstart
