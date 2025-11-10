# Telegram Groups SaaS - Codebase Quick Reference

**Status**: 80% Complete (MVP Ready)  
**Last Updated**: November 10, 2025

---

## DIRECTORY STRUCTURE

### Backend (`/backend`)
```
backend/
├── src/
│   ├── modules/              # 15 feature modules
│   │   ├── auth/            # JWT authentication
│   │   ├── user-management/ # RBAC (owner/admin/moderator)
│   │   ├── project/         # Bot configurations
│   │   ├── telegram-groups/ # Telegram group management
│   │   ├── membership-plan/ # Pricing tiers
│   │   ├── membership/      # Subscriptions lifecycle
│   │   ├── payment/         # QPay integration
│   │   ├── onboarding-bot/  # User registration bot
│   │   ├── channel-id-bot/  # Channel lookup bot
│   │   ├── analytics/       # Business metrics
│   │   ├── audit/          # Compliance logging
│   │   ├── health/         # System health
│   │   └── tenant/         # Multi-tenancy
│   ├── common/              # Shared infrastructure
│   │   ├── guards/         # JWT, RoleGuard
│   │   ├── interceptors/   # TenantInterceptor, logging
│   │   ├── middleware/     # CorrelationId, rate limiting
│   │   ├── logger/         # Winston structured logging
│   │   ├── services/       # Shared utilities
│   │   └── constants/      # App-wide constants
│   ├── database/            # TypeORM migrations
│   ├── integrations/        # QPay, Telegram APIs
│   └── workers/            # Background jobs
├── test/                    # Test suites
│   ├── contract/           # API endpoint contracts
│   ├── integration/        # End-to-end workflows
│   └── e2e/               # Playwright tests
└── package.json            # Dependencies

CONTROLLERS (15 total):
- auth.controller.ts          → /v1/auth/*
- user-management.controller → /v1/users/*
- project.controller.ts       → /v1/projects/*
- telegram-groups.controller → /v1/telegram-groups/*
- membership-plan.controller → /v1/membership-plans/*
- member.controller.ts        → /v1/members/*
- membership.controller.ts    → /v1/memberships/*
- payment.controller.ts       → /v1/payments/*
- webhook.controller.ts       → /v1/webhooks/qpay/*
- analytics.controller.ts     → /v1/analytics/*
- onboarding-bot.controller  → /v1/onboarding-bot/*
- health.controller.ts        → /v1/health
- tenant.controller.ts        → /v1/tenants/*
- project-webhook.controller → /v1/projects/webhook/*
- channel-id-bot.controller  → /v1/channel-id-bot/*

ENTITIES (14 total):
- Tenant (multi-tenant container)
- User (authentication & roles)
- Project (bot configurations)
- TelegramGroup (managed groups)
- MembershipPlan (pricing tiers)
- Member (Telegram users)
- Membership (subscriptions)
- Payment (QPay transactions)
- PaymentTransaction (detailed flow)
- AuditLog (compliance)
- TelegramUserAccount (bot registration)
- BotCommand (command definitions)
- MembershipPlanGroup (many-to-many junction)
- TrialUsage (trial tracking)
```

### Frontend (`/frontend`)
```
frontend/
├── app/
│   ├── dashboard/           # Admin panel
│   │   ├── page.tsx        # Home dashboard
│   │   ├── projects/       # Bot management
│   │   ├── telegram-groups/ # Group management
│   │   ├── plans/          # Pricing tiers
│   │   ├── members/        # Member list
│   │   ├── payments/       # Transaction history
│   │   ├── users/          # Team management
│   │   ├── analytics/      # Business metrics
│   │   └── layout.tsx      # Dashboard layout
│   ├── auth/               # Login/signup pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/             # Reusable React components
│   ├── ui/                # Shadcn/UI components
│   ├── dashboard-layout.tsx
│   ├── forms/             # Validation forms
│   └── charts/            # Analytics charts
├── lib/
│   ├── api/              # API client methods
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utilities
├── tests/
│   └── e2e/             # Playwright tests
└── package.json

KEY PAGES:
- /dashboard              → Main dashboard (home)
- /dashboard/projects     → Bot management
- /dashboard/telegram-groups → Group management
- /dashboard/plans        → Pricing tiers
- /dashboard/members      → Member list
- /dashboard/payments     → Transaction history
- /dashboard/users        → Team management
- /dashboard/analytics    → Business metrics
```

---

## KEY FEATURES

### Authentication & Authorization
- JWT tokens (15m expiry) + refresh tokens (7d)
- Roles: SUPER_ADMIN > OWNER > ADMIN > MODERATOR > MEMBER
- Per-tenant email uniqueness
- Password validation (8+ chars, complexity required)

### Multi-Tenancy
- Row-Level Security (RLS) on all tables
- TenantInterceptor enforces tenant_id context
- PostgreSQL `app.current_tenant` session variable
- Automatic filtering by tenant_id in queries

### Payment Processing
- QPay Mongolia gateway integration
- HMAC-SHA256 webhook verification
- Idempotency keys (prevent duplicate charges)
- BullMQ job queue (3 retries, exponential backoff)
- Automatic membership creation on payment
- Telegram notifications (success/failure)

### Telegram Bot Features
- Multi-bot support (one per project)
- Onboarding bot (/start registration)
- Channel ID lookup bot
- Webhook health monitoring
- Rate limiting (30 req/sec per bot)
- Redis caching (1-hour TTL)
- Auto-sync group metadata to Telegram
- Auto-add/remove members

### Membership Lifecycle
- Trial period support (configurable seconds)
- Auto-add on payment
- Auto-remove on expiration
- Expiration warnings (7, 3, 1 day)
- Status tracking (active, trial, expired, suspended, cancelled)
- Manual extension capability

---

## API ENDPOINTS (50+)

### Summary by Category
| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| Auth | 4 | No (login/register) |
| Users | 4 | Yes (OWNER) |
| Projects | 6 | Yes |
| Telegram Groups | 6 | Yes |
| Membership Plans | 6 | Yes |
| Members | 4 | Yes |
| Memberships | 5 | Yes |
| Payments | 6 | Mixed |
| Analytics | 4 | Yes |
| Bot | 3 | Mixed |
| Health | 1 | No |

### Key Endpoints
```
POST   /v1/auth/register        → Create account
POST   /v1/auth/login           → Get JWT token
POST   /v1/users                → Create admin/moderator (OWNER only)
GET    /v1/users                → List users (OWNER only)

POST   /v1/projects             → Create bot project
GET    /v1/projects             → List projects
PUT    /v1/projects/:id         → Update project

POST   /v1/telegram-groups      → Create group
GET    /v1/telegram-groups      → List groups
PUT    /v1/telegram-groups/:id  → Update group
POST   /v1/telegram-groups/:id/sync → Sync to Telegram

POST   /v1/membership-plans     → Create pricing tier
GET    /v1/membership-plans     → List plans
PUT    /v1/membership-plans/:id → Update plan

GET    /v1/members              → List members
GET    /v1/members/:id          → Get member details

POST   /v1/payments/initiate    → Create payment + get QPay link
GET    /v1/payments             → List transactions
GET    /v1/webhooks/qpay/:txnId → QPay webhook handler

GET    /v1/analytics/revenue    → Revenue metrics
GET    /v1/analytics/members    → Member metrics
```

---

## DATABASE

### Schema Highlights
- 14 entities with RLS enforcement
- All tables have `tenant_id` for multi-tenant isolation
- Relationships: Many-to-one (tenant), One-to-many (projects, groups, plans)
- Junction table: `membership_plan_groups` (many-to-many)

### Key Constraints
- Users: Unique (tenant_id, email)
- Payments: Unique qpay_invoice_id
- Memberships: Unique (member_id, group_id, status) where status IN ('active', 'trial')
- Projects: Unique bot_token

### Migrations
Located in: `/backend/src/database/migrations/`
- Run: `npm run migration:run`
- Generate: `npm run migration:generate --name=FeatureName`

---

## ENVIRONMENT CONFIGURATION

### Critical Variables (Must Set Before Production)
```
JWT_SECRET=minimum-32-characters
JWT_REFRESH_SECRET=minimum-32-characters
QPAY_WEBHOOK_SECRET=minimum-32-characters
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_HOST=localhost
REDIS_PORT=6379
TELEGRAM_ONBOARDING_BOT_TOKEN=token_from_botfather
```

### Services & Ports
- Backend API: http://localhost:3001
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Adminer (DB UI): http://localhost:8080

---

## TESTING

### Test Commands
```bash
npm run test              # All tests
npm run test:watch       # Watch mode
npm run test:contract    # Contract tests only
npm run test:integration # Integration tests only
npm run test:e2e         # Playwright E2E tests
npm run test:cov         # Coverage report
```

### Test Organization
- Contract tests: `test/contract/` (API contracts)
- Integration tests: `test/integration/` (workflows)
- E2E tests: `frontend/tests/e2e/` (user journeys)
- Unit tests: Colocated with source (`*.spec.ts`)

### Coverage Status
- Contract: 12+ endpoints tested
- Integration: Core flows validated
- E2E: User registration → payment → group access
- Overall: 86/86 tasks complete for Feature 001

---

## DEVELOPMENT WORKFLOW

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Getting Started
```bash
# Clone and install
git clone <repo>
cd paid-groups
npm install

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start databases
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
npm run migration:run

# Start development servers
npm run dev

# Backend: http://localhost:3001
# Frontend: http://localhost:3000
# API Docs: http://localhost:3001/api-docs
```

### Code Standards
- TypeScript (no `any` types)
- ESLint & Prettier
- Run `npm run lint` before commit
- TDD: Write tests first
- Commit messages: Conventional commits

---

## KEY FILES

### Backend Configuration
- `backend/src/app.module.ts` - Module registration
- `backend/src/main.ts` - App bootstrap
- `backend/src/database/data-source.ts` - TypeORM config
- `backend/.env.example` - Environment template

### Frontend Configuration
- `frontend/next.config.js` - Next.js config
- `frontend/tailwind.config.ts` - Tailwind config
- `frontend/tsconfig.json` - TypeScript config

### Documentation
- `README.md` - Project overview
- `CLAUDE.md` - AI agent instructions
- `DEPLOYMENT.md` - Production setup
- `BUSINESS_ANALYSIS.md` - Full business analysis
- `.specify/memory/constitution.md` - Development principles

---

## SECURITY CHECKLIST

### Authentication
- ✅ JWT tokens with 15m expiry
- ✅ Refresh tokens with 7d expiry
- ✅ Password hashing with bcrypt
- ✅ Password complexity validation

### Authorization
- ✅ Role-based guards (@UseGuards)
- ✅ Tenant isolation with RLS
- ✅ Audit logging for sensitive operations

### Payment Security
- ✅ HMAC-SHA256 webhook verification
- ✅ Idempotency checks (UNIQUE constraint)
- ✅ PCI compliance via QPay
- ✅ Event deduplication

### Data Protection
- ✅ Encrypted bot tokens in responses
- ✅ Sensitive fields excluded from JSON
- ✅ Database-level RLS enforcement
- ✅ Correlation IDs for tracing

---

## MONITORING & OBSERVABILITY

### Metrics Available
- Request count, latency, error rate
- Payment success/failure rate
- Telegram API call metrics
- Background job metrics
- Database connection pool stats
- Cache hit rates

### Alert Rules Configured
- Payment failure rate > 5% in 5 minutes
- API p95 latency > 500ms
- Telegram rate limit exceeded
- Database pool > 80%

### Logging
- Structured JSON logs with correlation IDs
- Winston logger with file rotation
- Levels: DEBUG, INFO, WARN, ERROR
- All sensitive operations logged

---

## PERFORMANCE TARGETS

### API Latency (P95)
| Endpoint | Target |
|----------|--------|
| /login | 150ms |
| /telegram-groups | 100ms |
| /payments/initiate | 400ms |
| /analytics | 300ms |
| /health | 10ms |

### Infrastructure Requirements
- PostgreSQL: 20+ connection pool
- Redis: 100MB+ memory
- Backend: Stateless (horizontally scalable)
- Frontend: Stateless (CDN deployable)

---

## RECOMMENDED NEXT STEPS

1. **Week 1**: Deploy to staging, security audit
2. **Week 2**: Analytics enhancements, final testing
3. **Week 3**: Production deployment, monitoring setup
4. **Week 4**: Go-live, customer onboarding

---

## SUPPORT & RESOURCES

### Documentation Files
- See `README.md` for quick start
- See `DEPLOYMENT.md` for production setup
- See `QPAY_MERCHANT_INTEGRATION.md` for payment setup
- See `BUSINESS_ANALYSIS.md` for full analysis

### Key Contacts
- Backend Lead: NestJS expertise, payments
- Frontend Lead: React/Next.js expertise
- DevOps: Docker, deployment

---

**Status**: Production-ready MVP with 80% feature completeness
**Go-Live**: Recommended (with 2-week preparation)
**Maintenance**: Minimal technical debt, well-documented codebase
