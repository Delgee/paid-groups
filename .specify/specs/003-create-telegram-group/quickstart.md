# Quickstart: Telegram Group Management

This guide provides step-by-step instructions for testing the complete telegram group management workflow using the provided test bot token and channel URL.

## Prerequisites

### Test Environment Setup
```bash
# Add test configuration to .env.test
TEST_TELEGRAM_BOT_TOKEN=<provided-test-bot-token>
TEST_TELEGRAM_CHANNEL_ID=<extracted-from-channel-url>
TEST_TELEGRAM_CHANNEL_USERNAME=<channel-username>

# Start development servers
npm run start:dev          # Backend on :3001
cd frontend && npm run dev  # Frontend on :3000
```

### Test Bot Requirements
- Bot must be administrator in test channel
- Required permissions: `can_change_info`, `can_post_messages`
- Test channel should be isolated for development use

## Test Scenarios

### Scenario 1: Complete Group Management Workflow

#### 1.1 Authentication
```bash
# Login as test owner
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testowner@tenant1.com",
    "password": "OwnerPass123"
  }'

# Save the access_token for subsequent requests
export AUTH_TOKEN="<access_token_from_response>"
```

#### 1.2 Create Telegram Group Entry
```bash
# Create new telegram group
curl -X POST http://localhost:3001/v1/telegram-groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "group_name": "Test VIP Group",
    "description": "Test group for development",
    "bot_id": "<existing-bot-id>",
    "settings": {
      "welcome_message": "Welcome to our VIP group!"
    }
  }'

# Expected Response: 201 Created
# Save the group ID for subsequent requests
export GROUP_ID="<id_from_response>"
```

#### 1.3 Connect to Telegram Channel
```bash
# Connect the group to actual Telegram channel
curl -X POST http://localhost:3001/v1/telegram-groups/$GROUP_ID/connect-channel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "telegram_chat_id": "$TEST_TELEGRAM_CHANNEL_ID",
    "invite_link": "https://t.me/+<invite-link>",
    "verify_permissions": true
  }'

# Expected Response: 200 OK with updated group data
# bot_assigned should be true
# connection_status should be "connected"
```

#### 1.4 Update Group Details with Sync
```bash
# Update group name and description (should sync to Telegram)
curl -X PUT http://localhost:3001/v1/telegram-groups/$GROUP_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "group_name": "Updated VIP Group Name",
    "description": "Updated description for testing sync",
    "sync_enabled": true
  }'

# Expected Response: 200 OK
# Verify in Telegram that channel title/description updated
```

#### 1.5 Manual Sync Test
```bash
# Trigger manual sync to Telegram
curl -X POST http://localhost:3001/v1/telegram-groups/$GROUP_ID/sync \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Expected Response: 200 OK with sync timestamp
# Verify last_sync_at is updated
```

#### 1.6 List Groups
```bash
# Get paginated list of groups
curl -X GET "http://localhost:3001/v1/telegram-groups?page=1&limit=10&bot_assigned=true" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Expected Response: 200 OK with groups array and pagination
```

#### 1.7 Get Group Details
```bash
# Get detailed group information
curl -X GET http://localhost:3001/v1/telegram-groups/$GROUP_ID \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Expected Response: 200 OK with complete group data
```

#### 1.8 Delete Group
```bash
# Delete the test group
curl -X DELETE http://localhost:3001/v1/telegram-groups/$GROUP_ID \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Expected Response: 204 No Content
```

### Scenario 2: Frontend User Interface Testing

#### 2.1 Navigate to Telegram Groups Management
1. Open browser to `http://localhost:3000`
2. Login with test owner credentials
3. Navigate to "Telegram Groups" section in dashboard
4. Verify groups list page loads correctly

#### 2.2 Create New Group via UI
1. Click "Create New Group" button
2. Fill in group details:
   - **Group Name**: "UI Test Group"
   - **Description**: "Created via UI for testing"
   - **Bot**: Select from dropdown
3. Submit form
4. Verify success message appears
5. Verify redirect to groups list
6. Verify new group appears in list

#### 2.3 Connect Channel via UI
1. Click "Connect Channel" on the new group
2. Fill in channel connection form:
   - **Telegram Chat ID**: `$TEST_TELEGRAM_CHANNEL_ID`
   - **Invite Link**: Test channel invite link
3. Submit form
4. Verify success message
5. Verify group status shows "Connected"
6. Verify bot assignment indicator is active

#### 2.4 Edit Group via UI
1. Click "Edit" on the connected group
2. Update group details:
   - **Group Name**: "Updated UI Test Group"
   - **Description**: "Updated via UI"
   - **Enable Auto-sync**: Check the checkbox
3. Submit form
4. Verify success message
5. Verify changes reflected in group list
6. Check Telegram channel for updated title/description

#### 2.5 Manual Sync via UI
1. Click "Sync to Telegram" button on the group
2. Verify loading state during sync
3. Verify success message
4. Verify "Last synced" timestamp updates

#### 2.6 Delete Group via UI
1. Click "Delete" on the test group
2. Verify confirmation dialog appears
3. Confirm deletion
4. Verify success message
5. Verify group removed from list

### Scenario 3: Error Handling Testing

#### 3.1 Invalid Bot Permissions
```bash
# Try to connect to channel where bot is not admin
curl -X POST http://localhost:3001/v1/telegram-groups/$GROUP_ID/connect-channel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "telegram_chat_id": "-1001234567890",
    "verify_permissions": true
  }'

# Expected Response: 409 Conflict
# Error message should indicate bot permission issue
```

#### 3.2 Duplicate Channel Connection
```bash
# Try to connect already connected channel to different group
curl -X POST http://localhost:3001/v1/telegram-groups/$ANOTHER_GROUP_ID/connect-channel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "telegram_chat_id": "$TEST_TELEGRAM_CHANNEL_ID"
  }'

# Expected Response: 409 Conflict
# Error message should indicate channel already connected
```

#### 3.3 Sync Without Connection
```bash
# Try to sync group that's not connected to Telegram
curl -X POST http://localhost:3001/v1/telegram-groups/$UNCONNECTED_GROUP_ID/sync \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Expected Response: 409 Conflict
# Error message should indicate group not connected
```

#### 3.4 Invalid Chat ID Format
```bash
# Try to connect with invalid chat ID
curl -X POST http://localhost:3001/v1/telegram-groups/$GROUP_ID/connect-channel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "telegram_chat_id": "invalid-chat-id"
  }'

# Expected Response: 400 Bad Request
# Error message should indicate invalid format
```

### Scenario 4: Multi-Tenant Isolation Testing

#### 4.1 Cross-Tenant Access Prevention
```bash
# Login as different tenant user
curl -X POST http://localhost:3001/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "othertenant@tenant2.com",
    "password": "OwnerPass123"
  }'

export OTHER_AUTH_TOKEN="<access_token_from_response>"

# Try to access first tenant's group
curl -X GET http://localhost:3001/v1/telegram-groups/$GROUP_ID \
  -H "Authorization: Bearer $OTHER_AUTH_TOKEN"

# Expected Response: 404 Not Found
# Group should not be accessible across tenants
```

### Scenario 5: Performance and Rate Limiting

#### 5.1 Rate Limiting Test
```bash
# Make rapid requests to test rate limiting
for i in {1..35}; do
  curl -X GET http://localhost:3001/v1/telegram-groups \
    -H "Authorization: Bearer $AUTH_TOKEN" &
done
wait

# Some requests should receive 429 Too Many Requests
```

#### 5.2 Caching Verification
```bash
# Make repeated requests to verify caching
time curl -X GET http://localhost:3001/v1/telegram-groups/$GROUP_ID \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Subsequent requests should be faster due to caching
time curl -X GET http://localhost:3001/v1/telegram-groups/$GROUP_ID \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Expected Results

### Success Criteria
- [ ] All API endpoints respond with correct status codes
- [ ] Group CRUD operations work correctly
- [ ] Channel connection verifies bot permissions
- [ ] Group details sync to Telegram channel automatically
- [ ] Manual sync updates last_sync_at timestamp
- [ ] Frontend UI properly handles all operations
- [ ] Error responses include helpful messages
- [ ] Multi-tenant isolation prevents cross-tenant access
- [ ] Rate limiting prevents API abuse
- [ ] Caching improves response times

### Performance Benchmarks
- API response times < 500ms for CRUD operations
- Telegram API calls < 1s response time
- Page load times < 2s for frontend pages
- Sync operations complete within 3s

### Error Handling Validation
- Bot permission errors properly detected and reported
- Invalid input validation with specific error messages
- Graceful handling of Telegram API errors
- Proper HTTP status codes for all error scenarios

## Troubleshooting

### Common Issues

#### Bot Permission Errors
- Verify bot is administrator in test channel
- Check bot has `can_change_info` permission
- Ensure test channel is accessible

#### Connection Failures
- Verify test bot token is valid and active
- Check chat ID format (negative for groups/channels)
- Ensure network connectivity to Telegram API

#### Database Issues
- Verify PostgreSQL is running and accessible
- Check that migrations have been applied
- Ensure tenant context is properly set

#### Cache Issues
- Restart Redis if caching behaves unexpectedly
- Clear cache between tests if needed
- Verify Redis connection configuration

This quickstart guide ensures comprehensive testing of the telegram group management feature across all functional requirements and user scenarios.