# Telegram Groups SaaS Platform

A multi-tenant SaaS platform for managing paid Telegram groups with automated payment processing via QPay Mongolia.

## Architecture

- **Backend**: NestJS with TypeScript, PostgreSQL with Row-Level Security
- **Frontend**: Next.js 14 with App Router, Tailwind CSS, Shadcn/UI
- **Worker**: Background job processing with BullMQ
- **Database**: PostgreSQL 15 with multi-tenant isolation
- **Cache/Queue**: Redis 7
- **Payment**: QPay Mongolia integration

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone and setup**:
```bash
git clone <repository-url>
cd telegram-groups-saas
npm install
```

2. **Environment setup**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services**:
```bash
# Start databases
docker-compose up -d

# Install dependencies
npm run install:all

# Run migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs
- **Database Admin**: http://localhost:8080 (adminer)
- **Redis Admin**: http://localhost:8081

## Project Structure

```
telegram-groups-saas/
├── backend/              # NestJS API server
│   ├── src/
│   │   ├── modules/      # Feature modules
│   │   ├── common/       # Shared utilities
│   │   └── database/     # Migrations and seeds
│   └── test/             # Test files
├── frontend/             # Next.js dashboard
│   ├── app/              # App router pages
│   ├── components/       # Reusable components
│   └── lib/              # Utilities and API client
├── worker/               # Background job processor (if exists)
│   ├── src/
│   │   ├── jobs/         # Job handlers
│   │   ├── queues/       # Queue configuration
│   └── schedulers/       # Cron jobs
├── packages/             # Shared packages (if exists)
│   └── shared-types/     # Shared TypeScript types
├── .specify/             # Active feature specifications (new workflow)
│   └── specs/            # Current feature specs
└── specs/                # Legacy feature specifications (archived)
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start all services
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only
npm run dev:worker       # Worker only

# Building
npm run build            # Build all projects
npm run build:backend    # Backend only
npm run build:frontend   # Frontend only
npm run build:worker     # Worker only

# Testing
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run test:contract    # Contract tests
npm run test:integration # Integration tests

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed data

# Linting
npm run lint             # Lint all projects
```

### Testing

The project follows Test-Driven Development (TDD):

1. **Contract Tests**: API endpoint contracts
2. **Integration Tests**: End-to-end workflows
3. **Unit Tests**: Individual component logic

#### Setting Up Test Bot and Channel

For running integration and E2E tests that involve Telegram Bot API:

1. **Create a Test Bot**:
   ```bash
   # 1. Open Telegram and search for @BotFather
   # 2. Send /newbot and follow the prompts
   # 3. Copy the bot token
   # 4. Add to .env.test:
   TEST_TELEGRAM_BOT_TOKEN=your-bot-token-here
   ```

2. **Create a Test Channel**:
   ```bash
   # 1. Create a new Telegram channel
   # 2. Add your test bot as an administrator with:
   #    - Post messages permission
   #    - Edit messages permission
   #    - Delete messages permission
   # 3. Get the channel ID (send a message to the channel and use:
   #    https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   # 4. Add to .env.test:
   TEST_TELEGRAM_CHANNEL_ID=-1001234567890
   TEST_TELEGRAM_CHAT_ID=-1001234567890
   ```

3. **Run Tests**:
   ```bash
   # Set environment variables
   export NODE_ENV=test
   export DB_NAME=telegram_saas_test

   # Run migrations for test database
   npm run migration:run

   # Run tests
   npm run test:integration
   npm run test:e2e
   ```

### Environment Variables

**Development**: Use `.env` file (copy from `.env.example`)
**Production**: Use `.env.production` file (see [DEPLOYMENT.md](DEPLOYMENT.md) for setup)

Key environment variables:

- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Redis connection
- `JWT_SECRET`: JWT signing secret
- `QPAY_*`: QPay Mongolia configuration
- `TELEGRAM_BOT_TOKEN`: Bot token from BotFather
- `FRONTEND_URL`: Frontend application URL
- `NEXT_PUBLIC_API_URL`: Backend API URL (accessible from browser)

## Features

### Core Functionality

- ✅ Multi-tenant architecture with data isolation
- ✅ JWT-based authentication with refresh tokens
- ✅ Telegram bot management and customization
- ✅ QPay Mongolia payment integration
- ✅ Automated membership lifecycle
- ✅ Real-time analytics and reporting
- ✅ Role-based access control

### User Types

1. **End Users**: Pay for group access via Telegram bots
2. **SaaS Users**: Manage their paid groups and bots
3. **Super Admins**: Platform oversight and management

### Payment Flow

1. User initiates payment through Telegram bot
2. QPay webhook confirms payment
3. User automatically added to paid group
4. Membership tracked with expiration
5. Automatic removal on expiration

## Deployment

### Production Build

```bash
npm run build
npm run db:migrate
npm start
```

### Docker Deployment

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Environment Configuration

Set production environment variables:
- Database connection strings
- Redis configuration  
- QPay production credentials
- JWT secrets
- CORS origins

## API Documentation

API documentation is available at `/api-docs` when running the backend server.

## Contributing

1. Follow TDD approach - write tests first
2. Use conventional commit messages
3. Ensure all tests pass
4. Update documentation as needed

## License

MIT License

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation in `/specs/`
- Review API contracts in `/specs/*/contracts/`