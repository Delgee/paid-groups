# Quickstart Guide: Telegram Groups SaaS Platform

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+
- Docker and Docker Compose (optional)
- Telegram Bot Token (from @BotFather)
- QPay Mongolia merchant account

## Quick Setup (5 minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd telegram-groups-saas

# Install dependencies
npm install

# Setup environment
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/telegram_saas
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key

# QPay Configuration
QPAY_MERCHANT_ID=your-merchant-id
QPAY_API_KEY=your-api-key
QPAY_API_SECRET=your-api-secret
QPAY_WEBHOOK_SECRET=your-webhook-secret

# Application
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
```

### 3. Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed sample data (optional)
npm run db:seed
```

### 4. Start Development Servers

```bash
# Start all services (uses Docker Compose)
npm run dev

# OR start individually:
npm run dev:backend  # API server on :3001
npm run dev:frontend # Web app on :3000
npm run dev:worker   # Background jobs
```

## Your First Telegram Bot

### Step 1: Create Bot with BotFather

1. Open Telegram and search for @BotFather
2. Send `/newbot` and follow prompts
3. Save the bot token

### Step 2: Register Your SaaS Account

```bash
# Using CLI
npm run cli auth:register \
  --email admin@example.com \
  --password YourSecurePassword \
  --name "Admin User" \
  --company "My Company"

# OR via API
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourSecurePassword",
    "name": "Admin User",
    "company_name": "My Company"
  }'
```

### Step 3: Add Your Bot

```bash
# Login first
export TOKEN=$(npm run cli auth:login \
  --email admin@example.com \
  --password YourSecurePassword \
  --json | jq -r .access_token)

# Add bot
npm run cli bot:create \
  --token $TOKEN \
  --bot-token "YOUR_BOT_TOKEN_FROM_BOTFATHER" \
  --name "My Paid Groups Bot"
```

### Step 4: Connect Telegram Group

1. Add your bot to a Telegram group as admin
2. Get the group ID:

```bash
npm run cli bot:groups \
  --token $TOKEN \
  --bot-id YOUR_BOT_ID
```

3. Connect the group:

```bash
npm run cli group:connect \
  --token $TOKEN \
  --bot-id YOUR_BOT_ID \
  --chat-id GROUP_CHAT_ID \
  --name "Premium Content Group"
```

### Step 5: Create Membership Plan

```bash
npm run cli plan:create \
  --token $TOKEN \
  --group-id GROUP_ID \
  --name "Monthly Membership" \
  --price 10000 \
  --duration 30 \
  --trial 7
```

## Testing Payment Flow

### Local Testing with QPay Sandbox

1. Configure sandbox credentials in `.env`
2. Create test payment:

```bash
# Generate payment link
npm run cli payment:test \
  --plan-id PLAN_ID \
  --telegram-user-id 123456789
```

3. Complete payment in QPay sandbox
4. Webhook will be received and member added automatically

### Webhook Testing with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Expose local webhook endpoint
ngrok http 3001

# Update webhook URL in QPay dashboard
# https://your-ngrok-url.ngrok.io/webhooks/qpay
```

## Admin Dashboard

1. Open http://localhost:3000
2. Login with your credentials
3. Available sections:
   - **Dashboard**: Overview and analytics
   - **Bots**: Manage your Telegram bots
   - **Groups**: Connected Telegram groups
   - **Members**: Member management
   - **Plans**: Membership plans and pricing
   - **Payments**: Transaction history
   - **Settings**: Account and bot configuration

## Common CLI Commands

```bash
# Bot Management
npm run cli bot:list
npm run cli bot:update --bot-id ID --name "New Name"
npm run cli bot:stats --bot-id ID

# Member Management
npm run cli member:list --group-id ID
npm run cli member:ban --telegram-id ID --reason "Violation"
npm run cli member:extend --member-id ID --days 30

# Analytics
npm run cli analytics:revenue --period month
npm run cli analytics:members --group-id ID
npm run cli analytics:export --format csv

# System
npm run cli cache:clear
npm run cli jobs:status
npm run cli health:check
```

## Docker Compose Setup

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

## Production Deployment

### 1. Environment Setup

```bash
# Production environment
cp .env.production.example .env.production

# Build for production
npm run build
```

### 2. Database Migration

```bash
# Run production migrations
NODE_ENV=production npm run db:migrate
```

### 3. Start Production Services

```bash
# Using PM2
npm install -g pm2
pm2 start ecosystem.config.js

# Using Docker
docker build -t telegram-saas .
docker run -d -p 3001:3001 --env-file .env.production telegram-saas
```

### 4. Configure Webhook URL

Update QPay webhook URL to production:
```
https://api.yourdomain.com/webhooks/qpay
```

## Troubleshooting

### Bot Not Responding

```bash
# Check bot webhook
npm run cli bot:webhook:status --bot-id ID

# Re-register webhook
npm run cli bot:webhook:register --bot-id ID
```

### Payment Not Processing

```bash
# Check webhook logs
npm run cli webhook:logs --limit 10

# Manually process webhook
npm run cli webhook:replay --event-id ID
```

### Database Connection Issues

```bash
# Test connection
npm run db:test

# Reset connections
npm run db:reset-pool
```

## Support

- Documentation: `/docs`
- API Reference: http://localhost:3001/api-docs
- Logs: `./logs/`
- Support Email: support@example.com

## Next Steps

1. ✅ Configure message templates in dashboard
2. ✅ Set up analytics tracking
3. ✅ Enable two-factor authentication
4. ✅ Configure backup strategy
5. ✅ Set up monitoring alerts