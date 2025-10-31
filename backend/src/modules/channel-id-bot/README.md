# Channel ID Bot

A simple Telegram bot that helps users find the ID of their Telegram channels and groups by forwarding messages.

## Overview

The Channel ID Bot provides a straightforward way for users to discover channel/group IDs, which are required when connecting Telegram channels to the platform. Users simply forward any message from their channel to this bot, and it responds with the channel ID and related information.

## Features

- **Channel ID Extraction**: Extract IDs from forwarded channel/group messages
- **Multiple Sources**: Supports public channels, private channels, groups, and supergroups
- **User-Friendly**: Simple interface with clear instructions
- **Detailed Information**: Returns channel ID, title, username, and type
- **Audit Logging**: All commands are logged to the database for analytics

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and find [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the instructions
3. Choose a name (e.g., "Channel ID Helper")
4. Choose a username (e.g., "your_channel_id_bot")
5. Save the bot token provided by BotFather

### 2. Configure Environment Variables

Add the bot token to your `.env` file:

```env
TELEGRAM_CHANNEL_ID_BOT_TOKEN=your_bot_token_here
```

### 3. Set Up Webhook

The webhook endpoint is automatically available at:

```
POST /v1/channel-id-bot/webhook/:botToken
```

To configure the webhook with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/v1/channel-id-bot/webhook/<YOUR_BOT_TOKEN>"}'
```

Replace:
- `<YOUR_BOT_TOKEN>` with your actual bot token
- `https://your-domain.com` with your production domain

### 4. Test the Bot

1. Open Telegram and search for your bot
2. Send `/start` to see the welcome message
3. Forward any message from a channel to the bot
4. The bot will reply with the channel ID

## Usage

### Commands

- `/start` - Show welcome message and instructions
- `/help` - Display help information
- **Forward a message** - Main functionality to get channel ID

### Example Workflow

1. User opens the bot in Telegram
2. User sends `/start`
3. Bot responds with instructions
4. User forwards a message from their channel
5. Bot extracts the channel ID and responds:

```
✅ Channel/Chat ID Found!

ID: -1001234567890
Title: My Awesome Channel
Username: @myawesomechannel
Link: https://t.me/myawesomechannel
Type: 📢 Channel

💡 You can use this ID to connect your channel in the dashboard.
```

## API Contract

### Webhook Request

**Endpoint**: `POST /v1/channel-id-bot/webhook/:botToken`

**Request Body** (Telegram Update format):
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 1,
    "from": {
      "id": 987654321,
      "first_name": "John",
      "username": "john_doe"
    },
    "chat": {
      "id": 987654321,
      "type": "private"
    },
    "forward_from_chat": {
      "id": -1001234567890,
      "title": "My Channel",
      "username": "mychannel",
      "type": "channel"
    },
    "date": 1234567890,
    "text": "Forwarded message"
  }
}
```

**Success Response** (200 OK):
```json
{
  "ok": true
}
```

**Error Response** (401 Unauthorized):
```json
{
  "error": {
    "code": "INVALID_BOT_TOKEN",
    "message": "Invalid bot token provided."
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid update format - message, from, and chat are required."
  }
}
```

## Architecture

### Components

1. **ChannelIdBotService** - Business logic for handling messages and formatting responses
2. **ChannelIdBotController** - HTTP endpoint for Telegram webhooks
3. **ChannelIdBotModule** - NestJS module registration

### Message Flow

```
Telegram → Webhook → Controller → Service → Response → Telegram
                         ↓
                   Audit Logging
                         ↓
                   Database (bot_commands)
```

### Database Schema

The bot reuses the existing `bot_commands` table:

```sql
CREATE TABLE bot_commands (
  id UUID PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  telegram_chat_id BIGINT NOT NULL,
  command VARCHAR(100) NOT NULL,
  parameters JSONB DEFAULT '{}',
  response_status VARCHAR(20) NOT NULL,
  error_code VARCHAR(50),
  response_time_ms INTEGER,
  correlation_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security

- **Bot Token Validation**: Only requests with valid bot token are processed
- **Input Validation**: All incoming updates are validated before processing
- **Audit Logging**: All commands are logged with correlation IDs
- **No User Authentication**: Bot doesn't require user registration (by design)
- **No Sensitive Data**: Bot only extracts public channel information

## Monitoring

### Logs

The bot logs all operations with structured logging:

```typescript
{
  "correlationId": "uuid",
  "command": "forwarded_message",
  "telegramUserId": 987654321,
  "hasForwardFromChat": true
}
```

### Metrics

Track the following metrics:
- Total commands processed
- Command types distribution
- Response times
- Error rates
- User engagement

Query bot_commands table for analytics:

```sql
-- Command usage by type
SELECT command, COUNT(*) as count
FROM bot_commands
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY command
ORDER BY count DESC;

-- Average response time
SELECT AVG(response_time_ms) as avg_response_time
FROM bot_commands
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Error rate
SELECT
  COUNT(*) FILTER (WHERE response_status = 'error') * 100.0 / COUNT(*) as error_rate
FROM bot_commands
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Testing

### Contract Tests

Run the contract tests to verify API compliance:

```bash
npm test -- test/contract/channel-id-bot/webhook.contract.spec.ts
```

**Note**: Tests for successful message sending require a valid Telegram bot token. Tests for error scenarios (401, 400) will pass with the default test token.

### Manual Testing

1. Set up ngrok for local testing:
```bash
ngrok http 3001
```

2. Configure webhook with ngrok URL:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://your-ngrok-url.ngrok.io/v1/channel-id-bot/webhook/<TOKEN>"
```

3. Test with your bot in Telegram

## Troubleshooting

### Bot Not Responding

1. **Check webhook configuration**:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

2. **Check logs** for errors:
```bash
# Look for ChannelIdBotController errors
tail -f logs/app.log | grep ChannelIdBotController
```

3. **Verify bot token** is correct in .env file

### 404 Errors

- Ensure webhook URL matches your deployed domain
- Verify the bot token in the webhook URL is correct
- Check that the backend server is running and accessible

### Rate Limiting

The bot shares the same rate limiting as other Telegram API operations (30 requests/second per bot). If you hit rate limits:

1. Reduce request frequency
2. Implement request queuing
3. Consider using multiple bots for high-traffic scenarios

## Maintenance

### Database Cleanup

Clean up old bot_commands periodically:

```sql
-- Delete commands older than 90 days
DELETE FROM bot_commands
WHERE created_at < NOW() - INTERVAL '90 days'
AND command IN ('forwarded_message', 'start', 'help', 'unknown_input');
```

### Bot Updates

To update bot commands or description:

```bash
# Set bot commands
curl -X POST "https://api.telegram.org/bot<TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Start the bot"},
      {"command": "help", "description": "Show help information"}
    ]
  }'

# Set bot description
curl -X POST "https://api.telegram.org/bot<TOKEN>/setMyDescription" \
  -d "description=Get your Telegram channel ID by forwarding any channel message"
```

## Future Enhancements

Potential improvements:
- [ ] Support for multiple forwarded messages (batch processing)
- [ ] Channel statistics (member count, creation date)
- [ ] Integration with dashboard (one-click channel connection)
- [ ] Multi-language support
- [ ] Inline query support for searching channels
- [ ] Bot permissions verification helper

## Support

For issues or questions:
1. Check logs in `bot_commands` table
2. Review correlation IDs for debugging
3. Verify webhook configuration
4. Contact platform support with correlation ID
