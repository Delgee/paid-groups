# Project Webhook Handler

## Overview

The project webhook handler processes incoming Telegram updates for project-specific bots. When a project is created, a webhook URL is automatically configured with Telegram, allowing the bot to receive and process user interactions.

## Architecture

### Components

1. **ProjectWebhookController** (`project-webhook.controller.ts`)
   - HTTP endpoint handler for incoming Telegram webhooks
   - Route: `POST /v1/projects/webhook/:tenantId/:projectId`
   - Validates webhook secret token
   - Delegates processing to ProjectWebhookProcessorService

2. **ProjectWebhookProcessorService** (`project-webhook-processor.service.ts`)
   - Core business logic for processing webhook updates
   - Handles commands, messages, and callbacks
   - Multi-tenant isolation with RLS

3. **ProjectWebhookService** (`project-webhook.service.ts`)
   - Manages webhook configuration with Telegram API
   - Generates webhook URLs and secrets
   - Handles webhook setup, verification, and refresh

## Webhook Flow

### 1. Project Creation

```typescript
// When a project is created:
POST /v1/projects

// Backend automatically:
1. Creates project record
2. Generates webhook URL: {BASE_URL}/v1/projects/webhook/{tenantId}/{projectId}
3. Generates random webhook secret (32 bytes hex)
4. Calls Telegram API: setWebhook(url, secret)
5. Stores webhook_url and webhook_secret in project record
```

### 2. Telegram Sends Updates

```
User interacts with bot (sends /start command)
    ↓
Telegram API receives update
    ↓
Telegram sends POST request to webhook URL
    Headers: X-Telegram-Bot-Api-Secret-Token: {secret}
    Body: TelegramUpdate JSON
    ↓
ProjectWebhookController receives request
    ↓
Validates tenant + project + secret token
    ↓
ProjectWebhookProcessorService processes update
    ↓
Sends response back to user via Telegram API
```

### 3. Update Processing

```typescript
// Update types handled:
- message: Text messages, commands (/start, /help, /status, /subscribe)
- callback_query: Inline button presses
- chat_member: Users joining/leaving groups
- my_chat_member: Bot added/removed from groups
```

## Implemented Commands

### /start
- Sends welcome message (customizable in project.welcome_message)
- Default: Greets user and shows available commands

### /help
- Shows all available commands
- Explains how the bot works
- Provides support information

### /status
- Shows user's membership status
- Displays active memberships (TODO: integrate with membership service)

### /subscribe
- Shows available subscription plans (TODO: integrate with membership plan service)
- Provides payment instructions

## Security

### Webhook Secret Validation

```typescript
// Telegram sends secret token in header
const secretToken = headers['x-telegram-bot-api-secret-token'];

// Constant-time comparison prevents timing attacks
const isValid = crypto.timingSafeEqual(
  Buffer.from(secretToken),
  Buffer.from(project.webhook_secret)
);
```

### Multi-Tenant Isolation

```typescript
// RLS automatically enforced by setting tenant context
await dataSource.query('SET LOCAL app.current_tenant = $1', [tenantId]);

// All subsequent queries automatically scoped by tenant_id
```

## Testing

### Manual Testing with curl

```bash
# 1. Create a project first
PROJECT_ID="your-project-id"
TENANT_ID="your-tenant-id"
WEBHOOK_SECRET="your-webhook-secret"

# 2. Send test webhook
curl -X POST \
  "http://localhost:3001/v1/projects/webhook/${TENANT_ID}/${PROJECT_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: ${WEBHOOK_SECRET}" \
  -d '{
    "update_id": 123456789,
    "message": {
      "message_id": 1,
      "from": {
        "id": 123456,
        "is_bot": false,
        "first_name": "Test",
        "username": "testuser"
      },
      "chat": {
        "id": 123456,
        "type": "private",
        "first_name": "Test"
      },
      "date": 1640000000,
      "text": "/start"
    }
  }'
```

### Expected Response

```json
{
  "ok": true,
  "result": "Update processed successfully"
}
```

## Error Handling

### Common Errors

1. **404 Not Found** - Project doesn't exist
   ```json
   {
     "error": {
       "code": "PROJECT_NOT_FOUND",
       "message": "Project {id} not found in tenant {tenantId}"
     }
   }
   ```

2. **401 Unauthorized** - Invalid webhook secret
   ```json
   {
     "error": {
       "code": "INVALID_WEBHOOK_SECRET",
       "message": "Invalid webhook secret token"
     }
   }
   ```

3. **400 Bad Request** - Invalid update format
   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Invalid update format - update_id is required"
     }
   }
   ```

## Webhook Management

### Refresh Webhook

If the webhook URL or BASE_URL changes:

```bash
POST /v1/projects/:id/webhook/refresh

# Response:
{
  "success": true,
  "message": "Webhook refreshed successfully",
  "webhookUrl": "https://new-domain.com/v1/projects/webhook/{tenantId}/{projectId}"
}
```

### Verify Webhook

Check if webhook is correctly configured:

```typescript
const result = await webhookService.verifyWebhook(
  botToken,
  expectedWebhookUrl
);

// Returns:
{
  isValid: true,
  currentUrl: "https://api.telegram.org/bot.../..."
}
```

## TODO: Future Enhancements

1. **Membership Integration**
   - `/status` command: Show real membership details
   - `/subscribe` command: Display actual plans from database
   - Validate membership when users join groups
   - Auto-kick users without valid membership

2. **Payment Flow**
   - Handle subscription callbacks
   - Generate QPay payment links
   - Process payment webhooks
   - Auto-grant access after payment

3. **Group Management**
   - Track bot additions to groups
   - Sync group information to database
   - Handle bot removal from groups

4. **Analytics**
   - Track command usage
   - Monitor webhook delivery
   - Alert on webhook failures

5. **Rate Limiting**
   - Implement per-user rate limits
   - Prevent spam/abuse
   - Track rate limit violations

## Monitoring

### Logs to Monitor

```bash
# Webhook received
"Received webhook update {update_id} for project {projectId}"

# Command processed
"Processing command /start for project {projectId}"

# Errors
"Error processing webhook update {update_id}: {error}"
"Invalid webhook secret for project {projectId}"
```

### Health Check

```bash
POST /v1/projects/webhook/health

# Response:
{
  "status": "ok",
  "timestamp": "2025-01-20T12:00:00.000Z"
}
```

## References

- Telegram Bot API: https://core.telegram.org/bots/api#setwebhook
- Webhook Updates: https://core.telegram.org/bots/api#update
- Webhook Security: https://core.telegram.org/bots/api#setwebhook (secret_token parameter)
