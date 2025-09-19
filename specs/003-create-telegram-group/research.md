# Research: Telegram Group Management Integration

## Telegraph Library Integration

### Decision: Use Current Custom Service Approach
**Rationale**: The existing codebase already implements a custom Telegraf service wrapper that's optimized for multi-tenant architecture. This approach provides better control over per-tenant bot instances compared to the nestjs-telegraf package which is designed for single-bot applications.

**Alternatives considered**:
- nestjs-telegraf package - Rejected due to single-bot limitation
- Direct Telegraf usage - Current implementation already follows this pattern effectively

### Implementation Pattern:
```typescript
// Existing pattern in TelegramApiService
private getBotInstance(botToken: string): Telegraf {
  if (!this.bots.has(botToken)) {
    const bot = new Telegraf(botToken);
    this.bots.set(botToken, bot);
  }
  return this.bots.get(botToken)!;
}
```

## Telegram Bot API Channel Management

### Decision: Implement Channel Management Methods in TelegramApiService
**Rationale**: The existing TelegramApiService provides the perfect foundation for adding channel management capabilities. Bot admin permissions are already validated in the current implementation.

**Required Methods**:
- `setChatTitle(botToken, chatId, title)` - Update channel/group title
- `setChatDescription(botToken, chatId, description)` - Update channel description
- `setChatPhoto(botToken, chatId, photo)` - Update channel photo
- `validateBotPermissions(botToken, chatId)` - Enhanced permission checking

### Bot Admin Requirements:
- Bot must be administrator in the channel/group
- Required permissions: `can_change_info` for title/description changes
- Additional permissions: `can_post_messages`, `can_edit_messages` for channels

## Rate Limiting and Caching Strategy

### Decision: Redis-Based Caching with Enhanced Rate Limiting
**Rationale**: The project already uses Redis for caching and BullMQ. Implementing comprehensive caching for Telegram API responses will reduce API calls and improve performance.

**Caching Strategy**:
- Cache duration: 1 hour for chat info, 30 minutes for member info
- Cache invalidation: On successful updates to Telegram channels
- Cache keys: `telegram:{method}:{hashedToken}:{params}`

**Rate Limiting**:
- 30 requests per minute per bot token
- Use existing ThrottlerModule with Redis storage
- Handle Telegram's 429 errors with exponential backoff

## Database Structure Analysis

### Decision: Extend Existing telegram_groups Table
**Rationale**: The current database structure already includes a well-designed telegram_groups table with proper multi-tenant isolation, foreign key relationships, and indexing.

**Current Structure** (telegram_groups table):
```sql
- id: UUID (Primary Key)
- tenant_id: UUID (Foreign Key → tenants.id)
- bot_id: UUID (Foreign Key → telegram_bots.id)
- telegram_chat_id: BIGINT (Unique)
- group_name: VARCHAR(255)
- group_type: ENUM('group', 'supergroup', 'channel')
- is_active: BOOLEAN
- member_count: INTEGER
- settings: JSONB
```

**Required Enhancements**:
```sql
-- Add new columns for the feature requirements
ALTER TABLE telegram_groups ADD COLUMN:
- description: TEXT
- bot_assigned: BOOLEAN DEFAULT false
- last_sync_at: TIMESTAMP
- sync_enabled: BOOLEAN DEFAULT false
```

## Test Configuration

### Decision: Use Environment-Based Test Bot Configuration
**Rationale**: Following the existing pattern of environment variable configuration for sensitive credentials while providing test-specific bot tokens and channel URLs.

**Test Environment Setup**:
```bash
# Add to .env.test
TEST_TELEGRAM_BOT_TOKEN=<provided-test-bot-token>
TEST_TELEGRAM_CHANNEL_ID=<extracted-from-channel-url>
TEST_TELEGRAM_CHANNEL_USERNAME=<channel-username>
```

**Test Bot Requirements**:
- Bot must be administrator in test channel
- Required permissions: can_change_info, can_post_messages
- Test channel should be isolated for development use

## Multi-Tenant Security Patterns

### Decision: Follow Existing RLS and Tenant Isolation Patterns
**Rationale**: The current implementation already has robust multi-tenant security with Row-Level Security policies and tenant context middleware.

**Security Implementation**:
- All telegram group operations scoped by tenant_id
- Bot tokens encrypted at rest using existing encryption service
- RLS policies automatically filter by current tenant context
- Audit logging for all telegram group operations

## API Integration Architecture

### Decision: Service Layer Pattern with Error Handling
**Rationale**: Following the established pattern of service layer abstraction with comprehensive error handling for external API integrations.

**Service Architecture**:
```
TelegramGroupsController → TelegramGroupsService → TelegramApiService
                                              ↗ TelegramCacheService
```

**Error Handling Strategy**:
- Specific handling for Telegram API error codes (403, 429, 400)
- Graceful degradation when bot permissions insufficient
- Comprehensive logging for debugging and monitoring
- User-friendly error messages for frontend display

## Frontend Integration Patterns

### Decision: Follow Existing User Management UI Patterns
**Rationale**: The user management feature provides excellent patterns for CRUD operations, form validation, and list views that can be adapted for telegram group management.

**UI Component Structure**:
```
app/dashboard/telegram-groups/
├── page.tsx (List view)
├── create/page.tsx (Create form)
└── [id]/edit/page.tsx (Edit form)

components/telegram-groups/
├── TelegramGroupForm.tsx (Form component)
├── TelegramGroupList.tsx (List component)
├── ChannelConnectionForm.tsx (Channel linking)
└── TelegramGroupCard.tsx (Individual group card)
```

**Form Validation Strategy**:
- Zod schema validation matching API DTOs
- Real-time validation feedback
- Telegram-specific validation (chat ID format, bot token validation)

## Performance Considerations

### Decision: Implement Optimistic Updates with Background Sync
**Rationale**: Telegram API calls can be slow, so implementing optimistic updates for better user experience while ensuring eventual consistency.

**Performance Strategy**:
- Immediate UI updates for non-critical operations
- Background sync for Telegram channel updates
- Queue-based processing for bulk operations
- Caching for frequently accessed data (group lists, member counts)

## Monitoring and Observability

### Decision: Extend Existing Logging and Error Tracking
**Rationale**: Following the established observability patterns with structured logging and error context.

**Monitoring Implementation**:
- Structured logging for all Telegram API operations
- Error tracking for bot permission failures
- Performance metrics for API response times
- Health checks for bot connectivity

## Summary

The research confirms that the existing codebase provides an excellent foundation for telegram group management. The current multi-tenant architecture, database structure, and service patterns can be extended efficiently to support the new requirements. Key implementation areas:

1. **Extend TelegramApiService** with channel management methods
2. **Enhance telegram_groups table** with sync tracking columns
3. **Implement Redis caching** for Telegram API responses
4. **Follow existing UI patterns** from user management feature
5. **Add comprehensive error handling** for Telegram API integration
6. **Implement test environment** with provided bot token and channel URL

All technical unknowns have been resolved and implementation patterns identified.