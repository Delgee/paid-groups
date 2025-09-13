# Claude Code Agent Instructions: Telegram Groups SaaS

## Project Context

You're working on a multi-tenant SaaS platform for managing paid Telegram groups with automated payment processing via QPay Mongolia. The platform has three user types: super admins (platform owners), SaaS users (content creators), and end users (group members).

## Architecture Overview

- **Backend**: NestJS with TypeScript, PostgreSQL with Row-Level Security, Redis for caching/queues
- **Frontend**: Next.js 14 with App Router, Tailwind CSS, Shadcn/UI components
- **Infrastructure**: Docker, multi-tenant with tenant isolation, BullMQ for job processing
- **Integrations**: Telegram Bot API (Telegraph), QPay Mongolia payment gateway

## Key Implementation Guidelines

### 1. Multi-Tenancy
- ALWAYS include `tenant_id` in database queries
- Use RLS policies for data isolation
- Set tenant context in middleware: `SET LOCAL app.current_tenant TO 'uuid'`
- Never expose data across tenant boundaries

### 2. Telegram Bot Management
- Each tenant gets unique bot instance
- Use Telegraph library for bot interactions
- Implement rate limiting per bot
- Cache Telegram API responses in Redis (TTL: 1 hour)

### 3. Payment Processing
- QPay webhooks MUST verify HMAC signature
- Use idempotency keys to prevent duplicate processing
- Queue webhook processing with BullMQ
- Log all payment events for audit trail

### 4. Testing Requirements
- Write contract tests FIRST (before implementation)
- Test with real PostgreSQL and Redis (no mocks)
- Integration tests for payment flows
- E2E tests for critical user journeys

### 5. Security Checklist
- [ ] JWT tokens with 15-min expiry
- [ ] Refresh token rotation
- [ ] Input validation on all endpoints
- [ ] Rate limiting per tenant
- [ ] Audit logging for sensitive operations

## Development Workflow

### Starting New Feature
```bash
# You're on branch: 001-goal-build-a
# Spec location: /specs/001-goal-build-a/spec.md
# Plan location: /specs/001-goal-build-a/plan.md

# Run tests first (TDD)
npm run test:watch

# Start development
npm run dev
```

### Database Operations
```bash
# Create migration
npm run migration:create -- AddTenantIdToUsers

# Run migrations
npm run db:migrate

# Enable RLS on new table
psql -c "ALTER TABLE table_name ENABLE ROW LEVEL SECURITY"
```

### Testing Commands
```bash
# Contract tests
npm run test:contract

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test
```

## Common Patterns

### API Endpoint Structure
```typescript
// Always use these decorators
@Controller('resource')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiTags('Resource')
export class ResourceController {
  @Post()
  @UseInterceptors(AuditLogInterceptor)
  async create(@TenantId() tenantId: string, @Body() dto: CreateDto) {
    // Implementation
  }
}
```

### Database Query Pattern
```typescript
// Always scope by tenant
const result = await this.resourceRepository.find({
  where: {
    tenant_id: tenantId,
    // other conditions
  }
});
```

### Webhook Processing
```typescript
// Always verify signature first
const isValid = this.verifyWebhookSignature(payload, signature);
if (!isValid) throw new UnauthorizedException();

// Use idempotency key
const existing = await this.findByIdempotencyKey(eventId);
if (existing) return existing;

// Process in queue
await this.paymentQueue.add('process', payload, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});
```

### Error Handling
```typescript
// Use custom exceptions
throw new TenantNotFoundException(tenantId);
throw new PaymentProcessingException(payment_id, error);
throw new BotRateLimitException(bot_id);
```

## File Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/          # Authentication/authorization
│   │   ├── tenant/        # Multi-tenant management
│   │   ├── bot/           # Telegram bot management
│   │   ├── payment/       # QPay integration
│   │   ├── membership/    # Membership logic
│   │   └── analytics/     # Analytics/reporting
│   ├── common/
│   │   ├── guards/        # Auth, tenant guards
│   │   ├── interceptors/  # Audit, tenant context
│   │   ├── decorators/    # Custom decorators
│   │   └── filters/       # Exception filters
│   └── database/
│       ├── migrations/    # Database migrations
│       └── seeds/         # Seed data

frontend/
├── app/                   # Next.js app router
│   ├── (auth)/           # Auth pages
│   ├── (dashboard)/      # Dashboard pages
│   └── api/              # API routes
├── components/
│   ├── ui/               # Shadcn/UI components
│   └── features/         # Feature components
└── lib/
    ├── api/              # API client
    └── utils/            # Utilities
```

## Critical Implementation Tasks

### Phase 1: Foundation (Current)
1. ✅ Database schema with RLS
2. ⏳ Authentication system with JWT
3. ⏳ Tenant management module
4. ⏳ Basic dashboard UI

### Phase 2: Bot Integration
1. ⏳ Telegram bot framework
2. ⏳ Bot-to-tenant mapping
3. ⏳ Message template system
4. ⏳ Command handlers

### Phase 3: Payment System
1. ⏳ QPay webhook endpoint
2. ⏳ Payment processing queue
3. ⏳ Membership lifecycle
4. ⏳ Invoice generation

### Phase 4: Analytics & Admin
1. ⏳ Analytics aggregation
2. ⏳ Admin dashboard
3. ⏳ Export functionality
4. ⏳ Monitoring setup

## Environment Variables

```env
# Required for development
DATABASE_URL=postgresql://user:pass@localhost:5432/telegram_saas
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-min-32-chars
QPAY_API_KEY=sandbox-key
QPAY_WEBHOOK_SECRET=webhook-secret
```

## Debugging Tips

1. **Multi-tenant issues**: Check `current_setting('app.current_tenant')`
2. **Bot not responding**: Verify webhook registration with Telegram
3. **Payment failures**: Check webhook logs in Redis queue
4. **Performance**: Monitor slow queries with `EXPLAIN ANALYZE`

## Documentation

- API Docs: http://localhost:3001/api-docs
- Database Schema: `/specs/001-goal-build-a/data-model.md`
- API Contracts: `/specs/001-goal-build-a/contracts/`
- Architecture Decisions: `/specs/001-goal-build-a/research.md`

## Support Commands

```bash
# Check system health
npm run health:check

# View recent errors
npm run logs:errors --tail 50

# Clear Redis cache
npm run cache:clear

# Reprocess failed webhook
npm run webhook:replay --id EVENT_ID
```

Remember: Always follow TDD, maintain tenant isolation, and create audit logs for financial operations.