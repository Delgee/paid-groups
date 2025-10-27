# Webhook Management Documentation

## Overview

The Project Webhook Management system automatically generates, validates, and maintains Telegram Bot API webhooks for all projects in the platform.

## Key Features

- **Auto-Generation**: Webhook URLs and secrets are automatically generated when creating a project
- **Health Checks**: Automatic validation of webhook configurations on startup
- **BASE_URL Validation**: Ensures webhooks match the current deployment URL
- **Manual Refresh**: API endpoint to regenerate webhooks for security or migration purposes
- **Migration Support**: Backfill webhooks for existing projects

---

## Webhook URL Pattern

All webhook URLs follow this standardized pattern:

```
{BASE_URL}/v1/projects/webhook/{tenant_id}/{project_id}
```

**Example:**
```
https://api.example.com/v1/projects/webhook/123e4567-e89b-12d3-a456-426614174000/789e4567-e89b-12d3-a456-426614174999
```

### Components:

- `{BASE_URL}`: Configured via environment variable (e.g., `https://api.example.com`)
- `{tenant_id}`: UUID of the tenant (for multi-tenant isolation)
- `{project_id}`: UUID of the specific project/bot

---

## Webhook Secret

Each project has a unique `webhook_secret` (64-character hex string) used to:
- Verify incoming webhook requests from Telegram
- Prevent spoofing and unauthorized webhook calls
- Rotate security credentials via the refresh endpoint

**Security**: Webhook secrets are:
- Auto-generated using cryptographically secure random bytes
- Masked in API responses (never exposed to clients)
- Stored in the database for verification
- Regenerated when webhooks are refreshed

---

## API Endpoints

### 1. Create Project (Auto-generates Webhook)

**POST** `/v1/projects`

Creates a new project and automatically configures its webhook with Telegram.

**Request:**
```json
{
  "bot_token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11",
  "bot_username": "my_awesome_bot",
  "display_name": "My Awesome Bot",
  "welcome_message": "Welcome to the bot!"
}
```

**Response:**
```json
{
  "id": "789e4567-e89b-12d3-a456-426614174999",
  "tenant_id": "123e4567-e89b-12d3-a456-426614174000",
  "bot_token": "***",
  "bot_username": "my_awesome_bot",
  "display_name": "My Awesome Bot",
  "webhook_url": "https://api.example.com/v1/projects/webhook/123e4567.../789e4567...",
  "is_active": true,
  "created_at": "2025-01-27T10:00:00Z"
}
```

**Note**: The webhook is automatically registered with Telegram API during project creation.

---

### 2. Refresh Webhook

**POST** `/v1/projects/:id/webhook/refresh`

Regenerates the webhook secret and re-registers with Telegram API.

**Use Cases:**
- BASE_URL changed (e.g., domain migration)
- Security credential rotation
- Webhook configuration issues

**Request:**
```bash
curl -X POST https://api.example.com/v1/projects/789e4567.../webhook/refresh \
  -H "Authorization: Bearer {token}"
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook refreshed successfully",
  "webhookUrl": "https://api.example.com/v1/projects/webhook/123e4567.../789e4567..."
}
```

---

## Environment Configuration

### Required Variables

```bash
# Base URL for webhook generation (REQUIRED)
BASE_URL=https://api.example.com
```

### Optional Health Check Configuration

```bash
# Enable webhook health check on startup (default: true)
WEBHOOK_HEALTH_CHECK_ON_STARTUP=true

# Auto-fix mismatched webhooks on startup (default: false)
# WARNING: Regenerates secrets and calls Telegram API
WEBHOOK_AUTO_FIX_ON_STARTUP=false

# Verify webhooks with Telegram API during health check (default: false)
# WARNING: Makes API calls and may hit rate limits
WEBHOOK_VERIFY_WITH_TELEGRAM=false
```

---

## Health Check System

### Automatic Startup Check

On application startup, the `WebhookHealthCheckService` validates all active project webhooks:

**Checks Performed:**
1. ✅ **Healthy**: Webhook URL matches expected pattern based on BASE_URL
2. ⚠️ **Mismatched**: Webhook URL doesn't match current BASE_URL
3. ❌ **Missing**: Project has no webhook_url or webhook_secret configured
4. 💥 **Failed**: Health check encountered an error

### Health Check Output

```
=== Webhook Health Check Summary ===
Total Projects: 15
Checked Projects: 15
✅ Healthy Webhooks: 12
⚠️  Mismatched Webhooks: 2
❌ Missing Webhooks: 1
💥 Failed Checks: 0
===================================
```

### Auto-Fix on Startup

If `WEBHOOK_AUTO_FIX_ON_STARTUP=true`, the system will:
1. Identify mismatched webhooks
2. Generate new webhook secrets
3. Re-register webhooks with Telegram API
4. Update database with new configuration

**⚠️ Warning**: This makes API calls to Telegram and should only be enabled during migrations.

---

## Database Migration

### Backfill Existing Projects

For projects created before webhook auto-generation was implemented:

```bash
# Run migration
npm run migration:run
```

The `BackfillProjectWebhooks` migration will:
1. Find all projects without webhook configuration
2. Generate webhook URLs based on BASE_URL
3. Create secure webhook secrets
4. Update database records

**Post-Migration Steps:**
- Use the `/webhook/refresh` endpoint for each project to register with Telegram API
- Or enable `WEBHOOK_AUTO_FIX_ON_STARTUP=true` and restart the application

---

## Implementation Details

### Services

#### ProjectWebhookService

Handles core webhook operations:
- `generateWebhookUrl(tenantId, projectId)` - Creates webhook URL from BASE_URL
- `generateWebhookSecret()` - Generates cryptographically secure secret
- `setupWebhook(botToken, tenantId, projectId)` - Registers with Telegram API
- `refreshWebhook(botToken, tenantId, projectId)` - Regenerates and re-registers
- `verifyWebhook(botToken, expectedUrl)` - Validates with Telegram API
- `isWebhookUrlValid(webhookUrl)` - Checks if URL matches current BASE_URL

#### WebhookHealthCheckService

Manages webhook validation and health monitoring:
- `onModuleInit()` - Runs automatic health check on startup
- `checkAllWebhooks()` - Validates all active project webhooks
- `fixMismatchedWebhooks()` - Auto-corrects webhook mismatches
- `runManualCheck()` - Trigger health check programmatically

### Database Schema

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  bot_token VARCHAR(255) NOT NULL,
  webhook_url VARCHAR(500),        -- Auto-generated on creation
  webhook_secret VARCHAR(255),     -- Auto-generated on creation
  -- ... other fields
);
```

---

## Common Scenarios

### 1. Domain Migration

**Problem**: Deployed application to new domain, webhooks point to old domain.

**Solution**:
```bash
# Option A: Auto-fix on startup
export WEBHOOK_AUTO_FIX_ON_STARTUP=true
npm run start

# Option B: Manual refresh per project
curl -X POST /v1/projects/{id}/webhook/refresh -H "Authorization: Bearer {token}"
```

### 2. Security Credential Rotation

**Problem**: Need to rotate webhook secrets for security compliance.

**Solution**:
```bash
# Refresh webhook for a specific project
curl -X POST /v1/projects/{id}/webhook/refresh -H "Authorization: Bearer {token}"
```

### 3. Webhook Not Receiving Updates

**Problem**: Telegram bot not receiving webhook updates.

**Diagnosis**:
```bash
# 1. Check webhook configuration via Telegram API
curl https://api.telegram.org/bot{BOT_TOKEN}/getWebhookInfo

# 2. Verify BASE_URL is accessible from internet
curl https://{BASE_URL}/health

# 3. Check application logs for webhook errors
```

**Solution**:
```bash
# Refresh webhook
curl -X POST /v1/projects/{id}/webhook/refresh -H "Authorization: Bearer {token}"
```

### 4. Existing Projects Missing Webhooks

**Problem**: Projects created before webhook auto-generation don't have webhooks.

**Solution**:
```bash
# Run backfill migration
npm run migration:run

# Enable auto-fix and restart
export WEBHOOK_AUTO_FIX_ON_STARTUP=true
npm run start
```

---

## Testing

### Contract Tests

Located in: `test/contract/projects/webhook-auto-generation.contract.spec.ts`

Tests cover:
- Webhook auto-generation on project creation
- Webhook refresh endpoint
- URL pattern validation
- Secret generation and masking

Run tests:
```bash
npm run test -- webhook-auto-generation.contract.spec.ts
```

### Integration Tests

Located in: `test/integration/webhook-health-check.integration.spec.ts`

Tests cover:
- Health check detection of healthy/mismatched/missing webhooks
- Auto-fix functionality
- BASE_URL validation
- Configuration option handling

Run tests:
```bash
npm run test -- webhook-health-check.integration.spec.ts
```

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Webhook Success Rate**: Percentage of successful webhook deliveries
2. **Mismatched Webhook Count**: Number of projects with incorrect webhook URLs
3. **Missing Webhook Count**: Number of active projects without webhooks
4. **Refresh Failure Rate**: Failed webhook refresh attempts

### Recommended Alerts

```yaml
# Alert on high mismatch rate
- alert: HighWebhookMismatchRate
  expr: webhook_mismatch_count > 5
  severity: warning
  annotations:
    summary: "Multiple projects have mismatched webhook URLs"

# Alert on webhook refresh failures
- alert: WebhookRefreshFailures
  expr: rate(webhook_refresh_failures[5m]) > 0.1
  severity: critical
  annotations:
    summary: "Webhook refresh operations are failing"
```

---

## Troubleshooting

### Webhook URL Not Generated

**Symptom**: Project created but webhook_url is null

**Causes**:
1. BASE_URL not set in environment
2. Telegram API token invalid
3. Network connectivity issues

**Fix**:
```bash
# 1. Verify BASE_URL is set
echo $BASE_URL

# 2. Manually refresh webhook
curl -X POST /v1/projects/{id}/webhook/refresh
```

### Health Check Shows All Mismatched

**Symptom**: All webhooks marked as mismatched on startup

**Cause**: BASE_URL changed between deployments

**Fix**:
```bash
# Enable auto-fix for one-time migration
export WEBHOOK_AUTO_FIX_ON_STARTUP=true
npm run start

# Disable after migration completes
export WEBHOOK_AUTO_FIX_ON_STARTUP=false
```

### Telegram Not Calling Webhook

**Symptom**: getWebhookInfo shows webhook set, but no updates received

**Diagnosis**:
```bash
# Check if webhook URL is publicly accessible
curl https://{BASE_URL}/v1/projects/webhook/{tenant}/{project}

# Verify SSL certificate is valid
curl -vI https://{BASE_URL}
```

**Requirements**:
- Webhook URL must use HTTPS (not HTTP)
- SSL certificate must be valid
- URL must be publicly accessible from internet

---

## Best Practices

1. **Always Set BASE_URL**: Required for webhook auto-generation
2. **Use HTTPS**: Telegram requires HTTPS for webhooks
3. **Rotate Secrets Periodically**: Use refresh endpoint for security
4. **Monitor Health Checks**: Watch for mismatched/missing webhooks
5. **Test After Migration**: Run health check after domain changes
6. **Enable Auto-Fix Carefully**: Only during migrations, not in production
7. **Validate SSL Certificates**: Ensure valid certificates for BASE_URL

---

## Reference Implementation

For detailed implementation patterns, see:
- Bot Module: `backend/src/modules/bot/services/bot-validation.service.ts`
- Project Webhook Service: `backend/src/modules/project/services/project-webhook.service.ts`
- Health Check Service: `backend/src/modules/project/services/webhook-health-check.service.ts`

---

## Security Considerations

1. **Webhook Secrets**: Never expose webhook_secret in API responses
2. **Token Verification**: Always validate X-Telegram-Bot-Api-Secret-Token header
3. **HTTPS Only**: Never use HTTP for webhook URLs
4. **Rate Limiting**: Implement rate limits on webhook endpoints
5. **Tenant Isolation**: Validate tenant_id matches authenticated user

---

## Support

For issues or questions:
- Check application logs for detailed error messages
- Run manual health check: `WebhookHealthCheckService.runManualCheck()`
- Review Telegram API documentation: https://core.telegram.org/bots/api#setwebhook
