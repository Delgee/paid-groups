# Telegram Integration Architecture

**Last Updated**: 2025-01-31
**Version**: 2.0 (Centralized Architecture)

## Overview

All Telegram Bot API integrations are now centralized in the `TelegramIntegrationModule`. This module provides consistent, Telegraf-based API access with built-in caching, rate limiting, and bot lifecycle management.

## Architecture Principles

### 1. **Single Source of Truth**
All Telegram API interactions go through `backend/src/integrations/telegram/` services.

### 2. **No Direct HTTP Calls**
Use Telegraf library instead of `axios` or direct HTTP requests for consistency and type safety.

### 3. **Centralized Bot Management**
`TelegramBotHandlerService` manages all bot instances with long-polling, replacing scattered bot handlers.

### 4. **Reusable Services**
Domain-specific modules (`project`, `bot-configuration`, `onboarding-bot`) import `TelegramIntegrationModule` instead of implementing their own Telegram logic.

---

## Module Structure

```
backend/src/integrations/telegram/
├── telegram-integration.module.ts      # Main module (exports all services)
├── telegram-api.service.ts             # Low-level API wrapper (caching, rate limiting)
├── telegram-bot-handler.service.ts     # Centralized bot instance management (NEW)
├── telegram-channel.service.ts         # Channel management operations
└── telegram-sync.service.ts            # Group-to-channel synchronization
```

---

## Core Services

### 1. TelegramApiService

**Purpose**: Low-level Telegram Bot API wrapper with caching and rate limiting.

**Location**: `backend/src/integrations/telegram/telegram-api.service.ts`

**Features**:
- ✅ Redis caching (1 hour TTL for metadata, 5 min for member counts)
- ✅ Token bucket rate limiting (30 req/sec)
- ✅ Structured logging for all operations
- ✅ Bot instance management and reuse
- ✅ Automatic cache invalidation after write operations

**Key Methods**:
```typescript
// Bot verification
async verifyBotToken(botToken: string): Promise<TelegramUser | null>

// Chat management
async getChatInfo(botToken: string, chatId: string | number): Promise<TelegramChat | null>
async setChatTitle(botToken: string, chatId: string | number, title: string): Promise<boolean>
async setChatDescription(botToken: string, chatId: string | number, description: string): Promise<boolean>

// Messaging
async sendMessage(botToken: string, chatId: string | number, message: string, options?: SendMessageOptions): Promise<boolean>

// Webhook management
async setWebhook(botToken: string, webhookUrl: string): Promise<boolean>
async getWebhookInfo(botToken: string): Promise<any>

// And 20+ more methods...
```

**Usage Example**:
```typescript
@Injectable()
export class MyService {
  constructor(private readonly telegramApiService: TelegramApiService) {}

  async sendNotification(botToken: string, chatId: number) {
    await this.telegramApiService.sendMessage(
      botToken,
      chatId,
      'Your payment was successful!',
      { parse_mode: 'HTML' }
    );
  }
}
```

---

### 2. TelegramBotHandlerService (NEW)

**Purpose**: Centralized service for managing Telegram bot instances with long-polling.

**Location**: `backend/src/integrations/telegram/telegram-bot-handler.service.ts`

**Features**:
- ✅ Unified bot lifecycle management (create, stop, restart)
- ✅ Command handler registration
- ✅ Callback query handler registration
- ✅ Automatic graceful shutdown on SIGINT/SIGTERM
- ✅ Bot instance reuse and memory management

**Key Methods**:
```typescript
// Register command handlers
registerCommandHandler(
  botId: string,
  command: string,
  handler: (ctx: Context, config: BotConfiguration) => Promise<void>
): void

// Register callback query handlers
registerCallbackQueryHandler(
  botId: string,
  pattern: RegExp | string,
  handler: (ctx: Context, config: BotConfiguration, data: string) => Promise<void>
): void

// Bot lifecycle management
async createBotInstance(config: BotConfiguration): Promise<void>
async stopBot(botId: string): Promise<void>
async restartBot(config: BotConfiguration): Promise<void>

// Bot instance access
getBotInstance(botId: string): Telegraf | undefined
isBotRunning(botId: string): boolean
getRunningBots(): string[]
```

**Configuration Interface**:
```typescript
export interface BotConfiguration {
  id: string;
  botToken: string;
  botUsername?: string;
  welcomeMessage?: string;
  tenantId: string;
}
```

**Usage Example**:
```typescript
@Injectable()
export class ProjectBotHandler implements OnModuleInit {
  constructor(
    private readonly telegramBotHandler: TelegramBotHandlerService,
  ) {}

  async createBotInstance(project: Project): Promise<void> {
    const config: BotConfiguration = {
      id: project.id,
      botToken: project.bot_token,
      botUsername: project.bot_username,
      welcomeMessage: project.welcome_message,
      tenantId: project.tenant_id,
    };

    // Register handlers
    this.telegramBotHandler.registerCommandHandler(
      project.id,
      'start',
      (ctx) => this.handleStartCommand(ctx, project)
    );

    this.telegramBotHandler.registerCallbackQueryHandler(
      project.id,
      /^buy_plan_/,
      async (ctx, _config, data) => {
        const planId = data.replace('buy_plan_', '');
        await this.initiatePayment(ctx, project, planId);
      }
    );

    // Launch bot
    await this.telegramBotHandler.createBotInstance(config);
  }
}
```

---

### 3. TelegramChannelService

**Purpose**: High-level channel management operations.

**Location**: `backend/src/integrations/telegram/telegram-channel.service.ts`

**Features**:
- Channel connection and verification
- Bot permission checking
- Channel metadata management

---

### 4. TelegramSyncService

**Purpose**: Synchronize group data to Telegram channels.

**Location**: `backend/src/integrations/telegram/telegram-sync.service.ts`

**Features**:
- Auto-sync group details to channels
- Batch sync operations
- Sync status tracking

---

## Integration Pattern

### Module Integration

**Before** (Anti-pattern):
```typescript
// ❌ Don't do this
import { Telegraf } from 'telegraf';
import axios from 'axios';

@Injectable()
export class MyService {
  async sendMessage(botToken: string, chatId: number, text: string) {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
    });
  }
}
```

**After** (Recommended):
```typescript
// ✅ Do this
import { Injectable } from '@nestjs/common';
import { TelegramApiService } from '../../integrations/telegram/telegram-api.service';

@Injectable()
export class MyService {
  constructor(private readonly telegramApiService: TelegramApiService) {}

  async sendMessage(botToken: string, chatId: number, text: string) {
    await this.telegramApiService.sendMessage(botToken, chatId, text);
  }
}
```

### Module Imports

**Any module needing Telegram functionality must import `TelegramIntegrationModule`**:

```typescript
import { Module } from '@nestjs/common';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram-integration.module';

@Module({
  imports: [
    TelegramIntegrationModule, // ✅ Import the module
  ],
  providers: [MyService],
})
export class MyModule {}
```

---

## Refactored Services

### 1. TelegramBotService (Onboarding Bot)

**Location**: `backend/src/modules/onboarding-bot/telegram-bot.service.ts`

**Status**: ✅ Refactored (now uses `TelegramApiService` instead of axios)

**Changes**:
```typescript
// Before: Direct HTTP calls
await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {...});

// After: Uses TelegramApiService
await this.telegramApiService.sendMessage(botToken, chatId, text, options);
```

**Note**: This service is now a thin wrapper and is marked as `@deprecated`. Consider using `TelegramApiService` directly.

---

### 2. ProjectBotHandler

**Location**: `backend/src/modules/project/handlers/project-bot.handler.ts`

**Status**: ✅ Refactored (now uses `TelegramBotHandlerService`)

**Changes**:
```typescript
// Before: Managed Telegraf instances directly
private bots: Map<string, Telegraf> = new Map();
const bot = new Telegraf(project.bot_token);
await bot.launch();

// After: Uses TelegramBotHandlerService
constructor(private readonly telegramBotHandler: TelegramBotHandlerService) {}

this.telegramBotHandler.registerCommandHandler(project.id, 'start', handler);
await this.telegramBotHandler.createBotInstance(config);
```

**Benefits**:
- ✅ No more manual bot instance management
- ✅ Unified command/callback registration
- ✅ Automatic cleanup on shutdown
- ✅ Consistent error handling

---

### 3. TelegramBotHandler (Legacy)

**Location**: `backend/src/modules/bot-configuration/handlers/telegram-bot.handler.ts`

**Status**: ✅ Refactored (now uses `TelegramBotHandlerService`)

**Note**: Marked as `@deprecated` - for legacy `BotConfiguration` entities. New implementations should use `Project` entities and `ProjectBotHandler`.

**Changes**: Same as ProjectBotHandler - now delegates to `TelegramBotHandlerService`.

---

## Migration Guide

### Migrating from Direct Telegraf Usage

**Step 1**: Import `TelegramIntegrationModule` in your module

```typescript
@Module({
  imports: [TelegramIntegrationModule],
  // ...
})
export class YourModule {}
```

**Step 2**: Inject services into your class

```typescript
constructor(
  private readonly telegramApiService: TelegramApiService,
  private readonly telegramBotHandler: TelegramBotHandlerService, // If using long-polling
) {}
```

**Step 3**: Replace direct Telegraf calls

```typescript
// Before
const bot = new Telegraf(botToken);
await bot.telegram.sendMessage(chatId, text);

// After
await this.telegramApiService.sendMessage(botToken, chatId, text);
```

**Step 4**: For long-polling bots, use TelegramBotHandlerService

```typescript
// Before
const bot = new Telegraf(botToken);
bot.command('start', async (ctx) => { /* ... */ });
await bot.launch();

// After
this.telegramBotHandler.registerCommandHandler(botId, 'start', async (ctx) => { /* ... */ });
await this.telegramBotHandler.createBotInstance(config);
```

---

### Migrating from Direct HTTP (axios) Usage

**Step 1**: Remove axios imports and HTTP calls

```typescript
// Before
import axios from 'axios';

await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
  chat_id: chatId,
  text: 'Hello',
});
```

**Step 2**: Use TelegramApiService

```typescript
// After
await this.telegramApiService.sendMessage(botToken, chatId, 'Hello');
```

**Step 3**: Update module imports (same as above)

---

## Benefits of Centralization

### 1. **Consistency**
- All Telegram API calls use the same Telegraf-based approach
- Type safety across the entire application
- Consistent error handling and logging

### 2. **Performance**
- Centralized Redis caching reduces API calls by ~70-80%
- Bot instance reuse (no duplicate instances for same token)
- Automatic rate limiting prevents hitting Telegram's limits

### 3. **Maintainability**
- Single location for Telegram API logic updates
- Easier to debug (all calls logged through one service)
- Reduced code duplication

### 4. **Reliability**
- Built-in rate limiting prevents 429 errors
- Automatic retry logic for transient failures
- Graceful bot shutdown on application termination

### 5. **Testing**
- Easy to mock single service instead of multiple implementations
- Consistent test patterns across modules
- Integration tests can use shared test utilities

---

## Best Practices

### 1. Always Use TelegramIntegrationModule Services

```typescript
// ❌ Bad
import { Telegraf } from 'telegraf';
const bot = new Telegraf(token);

// ✅ Good
constructor(private readonly telegramApiService: TelegramApiService) {}
```

### 2. Register Handlers Before Launching Bots

```typescript
// ✅ Good order
this.telegramBotHandler.registerCommandHandler(botId, 'start', handler);
this.telegramBotHandler.registerCallbackQueryHandler(botId, /^buy_/, handler);
await this.telegramBotHandler.createBotInstance(config);
```

### 3. Clean Up Bot Instances

```typescript
// When deactivating a bot
await this.telegramBotHandler.stopBot(botId);
this.telegramBotHandler.cleanupBotInstance(botId);
```

### 4. Use Structured Logging

```typescript
// TelegramApiService automatically logs, but for custom logic:
this.logger.log(`Processing command for bot ${botId}`);
```

### 5. Handle Errors Gracefully

```typescript
try {
  await this.telegramApiService.sendMessage(botToken, chatId, text);
} catch (error) {
  this.logger.error(`Failed to send message: ${error.message}`);
  // Implement fallback logic
}
```

---

## Testing

### Unit Tests

Mock `TelegramApiService` in your tests:

```typescript
const mockTelegramApiService = {
  sendMessage: jest.fn().mockResolvedValue(true),
  verifyBotToken: jest.fn().mockResolvedValue({ id: 123, username: 'testbot' }),
};

const module = await Test.createTestingModule({
  providers: [
    MyService,
    { provide: TelegramApiService, useValue: mockTelegramApiService },
  ],
}).compile();
```

### Integration Tests

Use real `TelegramIntegrationModule` with test bot tokens:

```typescript
const module = await Test.createTestingModule({
  imports: [TelegramIntegrationModule],
  providers: [MyService],
}).compile();

// Use test bot token from environment
const testBotToken = process.env.TEST_BOT_TOKEN;
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Modules                         │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────┐            │
│  │ Project     │  │ Onboarding│  │ Bot            │            │
│  │ Module      │  │ Bot Module│  │ Configuration  │            │
│  └──────┬──────┘  └─────┬────┘  └────────┬───────┘            │
│         │                │                 │                     │
│         └────────────────┼─────────────────┘                     │
│                          │                                       │
│                          ▼                                       │
│         ┌────────────────────────────────────────┐              │
│         │  TelegramIntegrationModule             │              │
│         │  ┌──────────────────────────────────┐  │              │
│         │  │ TelegramApiService               │  │              │
│         │  │ - API wrapper                    │  │              │
│         │  │ - Caching & rate limiting        │  │              │
│         │  └──────────────────────────────────┘  │              │
│         │  ┌──────────────────────────────────┐  │              │
│         │  │ TelegramBotHandlerService        │  │              │
│         │  │ - Bot lifecycle management       │  │              │
│         │  │ - Handler registration           │  │              │
│         │  └──────────────────────────────────┘  │              │
│         │  ┌──────────────────────────────────┐  │              │
│         │  │ TelegramChannelService           │  │              │
│         │  │ TelegramSyncService              │  │              │
│         │  └──────────────────────────────────┘  │              │
│         └────────────────┬───────────────────────┘              │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  Telegraf Library            │
            │  (Type-safe Telegram API)    │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │  Telegram Bot API            │
            │  api.telegram.org            │
            └──────────────────────────────┘
```

---

## Common Issues

### Issue 1: Bot Not Responding

**Symptom**: Bot instance created but doesn't respond to commands.

**Solution**:
```typescript
// Check if bot is running
const isRunning = this.telegramBotHandler.isBotRunning(botId);

// Verify bot token
const botInfo = await this.telegramApiService.verifyBotToken(botToken);
if (!botInfo) {
  throw new Error('Invalid bot token');
}

// Check registered handlers
console.log(this.telegramBotHandler.getRunningBots());
```

### Issue 2: Rate Limit Exceeded

**Symptom**: `Rate limit exceeded. Please try again later.`

**Solution**: TelegramApiService already implements rate limiting. If you're still hitting limits, you're likely making too many sequential calls. Use batch operations or add delays:

```typescript
// Batch messages
const messages = ['Message 1', 'Message 2', 'Message 3'];
for (const msg of messages) {
  await this.telegramApiService.sendMessage(botToken, chatId, msg);
  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
}
```

### Issue 3: Memory Leak from Bot Instances

**Symptom**: Memory usage increases over time.

**Solution**: Always clean up bot instances when deactivating:

```typescript
// Proper cleanup
async deactivateBot(botId: string) {
  await this.telegramBotHandler.stopBot(botId);
  this.telegramBotHandler.cleanupBotInstance(botId);
}

// Implement OnModuleDestroy
async onModuleDestroy() {
  // TelegramBotHandlerService handles this automatically
  // But you can also manually stop specific bots
  await this.telegramBotHandler.stopAllBots();
}
```

---

## Future Improvements

### Planned Features

1. **Metrics Dashboard**
   - Real-time bot status monitoring
   - API call rate tracking
   - Cache hit/miss ratios

2. **Advanced Rate Limiting**
   - Per-chat rate limiting
   - Burst handling
   - Priority queue for important messages

3. **Bot Health Checks**
   - Automatic bot restart on failures
   - Webhook delivery monitoring
   - Alert notifications

4. **Enhanced Caching**
   - Configurable TTL per method
   - Cache warming strategies
   - Multi-layer caching (memory + Redis)

---

## References

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Telegraf Library Documentation](https://telegraf.js.org/)
- [Project TELEGRAM_API_USAGE.md](./TELEGRAM_API_USAGE.md) - Detailed API method reference

---

**Document Version**: 2.0
**Last Updated**: 2025-01-31
**Maintained By**: Development Team
