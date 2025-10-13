# Quickstart: Telegram Bot Onboarding Feature

**Feature**: 002-in-this-app
**Date**: 2025-01-20
**Purpose**: Step-by-step guide for validating the onboarding bot functionality

## Prerequisites

### Environment Setup
```bash
# 1. Start dependencies
docker-compose up -d postgres redis

# 2. Run migrations
npm run migration:run

# 3. Set environment variables
export TELEGRAM_ONBOARDING_BOT_TOKEN="your_bot_token_here"
export TELEGRAM_ONBOARDING_BOT_WEBHOOK_SECRET="your_webhook_secret_here"
export TELEGRAM_ONBOARDING_BOT_WEBHOOK_URL="https://yourplatform.com/v1/onboarding-bot/webhook"

# 4. Start backend
cd backend && npm run dev

# 5. Start frontend (optional, for web dashboard verification)
cd frontend && npm run dev
```

### Test Bot Setup
```bash
# Create test bot with @BotFather
# 1. Open Telegram and search for @BotFather
# 2. Send /newbot
# 3. Follow prompts to create "Test Onboarding Bot"
# 4. Copy bot token

# Save token to .env.test
echo "TELEGRAM_ONBOARDING_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" >> backend/.env.test
```

## Test Scenario 1: New User Registration

**Objective**: Validate complete registration flow from bot interaction

### Steps

1. **Start conversation**
   ```
   User: /start
   Bot: Welcome to [Platform Name]! 👋

   I'm here to help you set up your paid Telegram groups in minutes.

   Choose an option:
   • Register new account
   • Link existing account
   ```

2. **Begin registration**
   ```
   User: Register new account
   Bot: Great! Let's create your account. 📝

   What's your email address?
   (This will be used for login and notifications)
   ```

3. **Provide email**
   ```
   User: john@example.com
   Bot: ✅ Email received: john@example.com

   What's your full name?
   ```

4. **Provide name**
   ```
   User: John Doe
   Bot: Nice to meet you, John! 👤

   What's your company or project name?
   (This will be displayed to your members)
   ```

5. **Provide company name**
   ```
   User: Acme Premium Content
   Bot: 🎉 Account created successfully!

   Your account details:
   • Email: john@example.com
   • Name: John Doe
   • Company: Acme Premium Content

   What would you like to do next?
   • Create first project
   • View dashboard
   • Get help
   ```

### Expected Database State After Registration

```sql
-- Check tenant created
SELECT id, name, company_name, subscription_status FROM tenants WHERE company_name = 'Acme Premium Content';

-- Check user created with OWNER role
SELECT id, email, name, role FROM users WHERE email = 'john@example.com';

-- Check Telegram account linked
SELECT id, telegram_user_id, telegram_username FROM telegram_user_accounts
WHERE user_id = (SELECT id FROM users WHERE email = 'john@example.com');

-- Check command logged
SELECT command, response_status FROM bot_commands
WHERE telegram_user_id = [user_telegram_id]
ORDER BY created_at DESC LIMIT 5;
```

### Validation Checklist
- [ ] Tenant created with correct company name
- [ ] User created with OWNER role
- [ ] User is_active = true
- [ ] TelegramUserAccount created and linked
- [ ] No email verification required (instant activation)
- [ ] Bot commands logged in bot_commands table
- [ ] Session cleared after completion

---

## Test Scenario 2: Project Creation with Bot Token

**Objective**: Validate project creation and bot token validation

### Steps

1. **Create bot with @BotFather** (pre-requisite)
   ```
   User to @BotFather: /newbot
   BotFather: Alright, a new bot. How are we going to call it? Please choose a name for your bot.
   User: My Premium Bot
   BotFather: Good. Now let's choose a username for your bot...
   User: mypremiumb0t
   BotFather: Done! Token: 9876543210:XYZabcDEFghiJKLmno
   ```

2. **Initiate project creation**
   ```
   User: /newproject
   Bot: Let's create your first project! 🚀

   What would you like to name this project?
   (This is for your reference, members won't see it)
   ```

3. **Provide project name**
   ```
   User: Premium Content Hub
   Bot: Great name! 📛

   Add a description? (optional, type 'skip' to skip)
   ```

4. **Provide description**
   ```
   User: Central hub for all premium content subscribers
   Bot: Perfect! 📝

   Now, I need your bot token to manage members.

   1. Open @BotFather in Telegram
   2. If you haven't created a bot yet, send /newbot
   3. Copy the bot token
   4. Paste it here

   Your token will be encrypted and stored securely.
   ```

5. **Provide bot token**
   ```
   User: 9876543210:XYZabcDEFghiJKLmno
   Bot: 🔍 Validating bot token...
   ✅ Token verified!

   Bot: @mypremiumb0t
   Name: My Premium Bot

   ✅ Project created successfully!

   Project ID: [uuid]
   Bot: @mypremiumb0t

   What's next?
   • Add groups to this project
   • Create membership plans
   • View project status
   ```

### Expected Database State After Project Creation

```sql
-- Check project created
SELECT id, display_name, bot_username FROM projects WHERE display_name = 'Premium Content Hub';

-- Check bot token encrypted
SELECT bot_token FROM projects WHERE display_name = 'Premium Content Hub';
-- Should NOT match plain token "9876543210:XYZabcDEFghiJKLmno"

-- Verify project belongs to correct tenant
SELECT p.id, p.display_name, t.company_name
FROM projects p
JOIN users u ON u.tenant_id = p.tenant_id
JOIN tenants t ON t.id = p.tenant_id
WHERE p.display_name = 'Premium Content Hub';
```

### Validation Checklist
- [ ] Project created with correct display name
- [ ] Bot token validated via Telegram API getMe
- [ ] Bot token stored encrypted
- [ ] Bot username and name extracted and stored
- [ ] Project linked to correct tenant
- [ ] Session cleared after completion
- [ ] Invalid token rejected with helpful error message

---

## Test Scenario 3: Group Connection with Permission Verification

**Objective**: Validate group connection flow and bot permission checking

### Steps

1. **Create test group** (pre-requisite)
   - Create a private Telegram group or channel
   - Add the bot (@mypremiumb0t) as admin
   - Grant "Manage Chat" permission

2. **Initiate group connection**
   ```
   User: /addgroup
   Bot: Let's connect a Telegram group! 📱

   Which project should I add this group to?
   1. Premium Content Hub (@mypremiumb0t)

   Reply with the number.
   ```

3. **Select project**
   ```
   User: 1
   Bot: Perfect! 👍

   Is this a private channel or group?
   • Channel (for one-way broadcasts)
   • Group (for community discussions)
   ```

4. **Select group type**
   ```
   User: Group
   Bot: Got it! 📢

   Now, follow these steps:
   1. Make sure @mypremiumb0t is added to your group
   2. Make @mypremiumb0t an admin with "Manage Chat" permission
   3. Forward any message from that group to me

   Or, if your group has a public username, just send me the link:
   @yourgroup or t.me/yourgroup
   ```

5. **Forward message from group**
   ```
   User: [Forwards message from "Premium Subscribers" group]
   Bot: 🔍 Checking group access...

   Group found: Premium Subscribers
   Chat ID: -1001234567890

   ✅ Bot has admin permissions!

   Group connected successfully! 🎉

   Group: Premium Subscribers
   Members: 127

   What's next?
   • Create membership plan for this group
   • Add another group
   • View all groups
   ```

### Expected Database State After Group Connection

```sql
-- Check TelegramGroup created
SELECT id, name, channel_id, is_connected FROM telegram_groups WHERE name = 'Premium Subscribers';

-- Verify group linked to project
SELECT tg.name, p.display_name
FROM telegram_groups tg
JOIN projects p ON p.id = tg.project_id
WHERE tg.name = 'Premium Subscribers';

-- Check bot permission verification logged
SELECT command, parameters, response_status FROM bot_commands
WHERE command = 'addgroup'
ORDER BY created_at DESC LIMIT 1;
```

### Validation Checklist
- [ ] TelegramGroup entity created
- [ ] Chat ID extracted correctly from forwarded message
- [ ] Bot admin permissions verified via Telegram API
- [ ] Error shown if bot lacks admin permissions
- [ ] Group linked to correct project
- [ ] Session cleared after completion
- [ ] Duplicate group connection prevented (if already connected)

---

## Test Scenario 4: Membership Plan Creation

**Objective**: Validate plan creation with group association

### Steps

1. **Initiate plan creation**
   ```
   User: /createplan
   Bot: Let's create a membership plan! 💳

   Which groups should this plan include?

   Available groups:
   1. ☑️ Premium Subscribers (127 members)
   2. ☑️ VIP Content (45 members)

   Reply with numbers separated by commas (e.g., 1,2) or just one number.
   ```

2. **Select groups**
   ```
   User: 1
   Bot: Great! Plan will include:
   • Premium Subscribers

   What should we call this plan?
   (Examples: "Basic", "Premium", "VIP Access")
   ```

3. **Provide plan name**
   ```
   User: Premium Access
   Bot: Perfect name! 📋

   What's the price for this plan?
   Enter the amount in MNT (e.g., 5000)
   ```

4. **Provide price**
   ```
   User: 5000
   Bot: Got it! 5,000 MNT 💰

   How long should membership last?
   • 1 week
   • 1 month
   • 3 months
   • 1 year
   • Lifetime

   Reply with the option.
   ```

5. **Select duration**
   ```
   User: 1 month
   Bot: Monthly subscription selected! 📅

   Add a description? (optional, type 'skip' to skip)
   This will be shown to members when they subscribe.
   ```

6. **Provide description**
   ```
   User: Full access to all premium content and community discussions
   Bot: Excellent! ✍️

   📋 Plan Summary:
   • Name: Premium Access
   • Price: 5,000 MNT
   • Duration: 1 month
   • Includes: Premium Subscribers
   • Description: Full access to all premium content and community discussions

   Looks good?
   • Yes, create plan
   • No, start over
   ```

7. **Confirm creation**
   ```
   User: Yes, create plan
   Bot: ✅ Membership plan created!

   Plan: Premium Access
   Price: 5,000 MNT/month
   Groups: 1

   Your members can now subscribe via your bot @mypremiumb0t!

   What's next?
   • Create another plan
   • View all plans
   • View dashboard
   ```

### Expected Database State After Plan Creation

```sql
-- Check MembershipPlan created
SELECT id, name, price, duration, description FROM membership_plans WHERE name = 'Premium Access';

-- Verify plan linked to groups
SELECT mp.name, tg.name as group_name
FROM membership_plan_groups mpg
JOIN membership_plans mp ON mp.id = mpg.membership_plan_id
JOIN telegram_groups tg ON tg.id = mpg.telegram_group_id
WHERE mp.name = 'Premium Access';

-- Check plan belongs to correct project
SELECT mp.name, p.display_name
FROM membership_plans mp
JOIN projects p ON p.id = mp.project_id
WHERE mp.name = 'Premium Access';
```

### Validation Checklist
- [ ] MembershipPlan entity created
- [ ] Price validated as positive number
- [ ] Duration converted to proper enum value
- [ ] Plan linked to selected groups via junction table
- [ ] Plan linked to correct project
- [ ] Session cleared after completion
- [ ] Plan summary displayed before confirmation

---

## Test Scenario 5: Account Linking (Existing Web User)

**Objective**: Validate linking Telegram account to existing web-registered user

### Steps

1. **Create web user first** (pre-requisite)
   ```bash
   curl -X POST http://localhost:3001/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "existing@example.com",
       "password": "SecurePass123!",
       "name": "Jane Smith",
       "company_name": "Existing Company"
     }'
   ```

2. **Initiate account linking**
   ```
   User: /link
   Bot: Link your Telegram account to existing web account 🔗

   What's the email address for your account?
   ```

3. **Provide email**
   ```
   User: existing@example.com
   Bot: 📧 Verification code sent to existing@example.com

   Please check your email and enter the 6-digit code here.
   (Code expires in 10 minutes)
   ```

4. **Check email and provide code**
   ```
   User: 123456
   Bot: ✅ Account linked successfully!

   Your Telegram account is now connected to:
   • Email: existing@example.com
   • Name: Jane Smith
   • Company: Existing Company

   You can now manage your projects via this bot!

   What would you like to do?
   • Create new project
   • View existing projects
   • View dashboard
   ```

### Expected Database State After Linking

```sql
-- Check TelegramUserAccount created and linked to existing user
SELECT tua.telegram_user_id, u.email, u.name
FROM telegram_user_accounts tua
JOIN users u ON u.id = tua.user_id
WHERE u.email = 'existing@example.com';

-- Verify no duplicate user created
SELECT COUNT(*) FROM users WHERE email = 'existing@example.com';
-- Should be 1

-- Check verification code was used (deleted from Redis)
-- redis-cli GET email:verification:existing@example.com
-- Should return (nil)
```

### Validation Checklist
- [ ] Verification code sent to email
- [ ] Code stored in Redis with 10-minute TTL
- [ ] Code validated correctly
- [ ] TelegramUserAccount linked to existing User
- [ ] No duplicate user created
- [ ] Code deleted after successful verification
- [ ] Invalid code rejected with retry option
- [ ] Expired code rejected with re-send option

---

## Test Scenario 6: Status Command

**Objective**: Validate status overview for user with projects

### Steps

1. **Request status**
   ```
   User: /status
   Bot: 📊 Your Account Status

   Company: Acme Premium Content

   Projects: 1
   └─ Premium Content Hub (@mypremiumb0t)
      ├─ Groups: 1
      └─ Plans: 1

   Total Groups: 1
   Total Plans: 1
   Total Active Members: 127

   🌐 Web Dashboard: https://dashboard.yourplatform.com

   Need help? Type /help
   ```

### Expected Response Data

```sql
-- Aggregate query for status
SELECT
  u.name as user_name,
  t.company_name,
  COUNT(DISTINCT p.id) as projects_count,
  COUNT(DISTINCT tg.id) as groups_count,
  COUNT(DISTINCT mp.id) as plans_count
FROM users u
JOIN tenants t ON t.id = u.tenant_id
LEFT JOIN projects p ON p.tenant_id = t.id
LEFT JOIN telegram_groups tg ON tg.project_id = p.id
LEFT JOIN membership_plans mp ON mp.project_id = p.id
WHERE u.id = [user_id]
GROUP BY u.id, t.id;
```

### Validation Checklist
- [ ] Correct project count displayed
- [ ] Correct group count displayed
- [ ] Correct plan count displayed
- [ ] Active member count aggregated correctly
- [ ] Web dashboard URL included
- [ ] Multi-tenant isolation enforced (only user's data shown)

---

## Test Scenario 7: Error Handling & Edge Cases

### 7a. Invalid Email Format
```
User: invalid-email
Bot: ❌ Invalid email format.

Please provide a valid email address (e.g., john@example.com)
```

### 7b. Duplicate Email Registration
```
User: existing@example.com
Bot: ⚠️ This email is already registered.

Would you like to:
• Link this Telegram account to existing account
• Use a different email
```

### 7c. Invalid Bot Token
```
User: invalid-token-123
Bot: ❌ Invalid bot token.

Please check your token and try again. Make sure you:
1. Copied the entire token from @BotFather
2. Didn't add extra spaces
3. Used a token from @BotFather, not another bot

Need help? Visit @BotFather and send /mybots to see your tokens.
```

### 7d. Bot Lacks Admin Permissions
```
User: [Forwards message from group where bot is not admin]
Bot: ❌ I don't have admin permissions in "Test Group".

To fix this:
1. Open the group settings in Telegram
2. Go to Administrators
3. Add @mypremiumb0t as admin
4. Enable "Manage Chat" permission
5. Try again by forwarding a message from the group

Once you've done this, forward any message from the group to me.
```

### 7e. Rate Limit Exceeded
```
User: [20+ commands in 1 minute]
Bot: ⏸ Slow down! You've sent too many commands.

Please wait 45 seconds and try again.

Rate limit: 20 commands per minute
```

### 7f. Session Timeout
```
User: [Returns after 2 hours of inactivity]
Bot: ⏰ Your session expired after 1 hour of inactivity.

Would you like to:
• Start over
• Continue where you left off (if I have your details)
```

### 7g. Cancel Command
```
User: /cancel [during any multi-step flow]
Bot: ❌ Setup cancelled.

Your progress has been cleared. What would you like to do?
• Start registration
• Create project
• Get help
```

### Validation Checklist
- [ ] Email validation enforces proper format
- [ ] Duplicate email detected and handled gracefully
- [ ] Invalid bot token rejected with helpful guidance
- [ ] Bot permission verification prevents connection without admin rights
- [ ] Rate limiting enforced at 20 commands/minute
- [ ] Session timeout enforced at 1 hour
- [ ] Cancel command clears session and returns to IDLE

---

## Performance Validation

### Response Time Targets
```bash
# Measure bot response times
# Should be < 3 seconds for 95th percentile

# 1. Simple command (no external API)
time echo "/start" | send_to_bot

# 2. Bot token validation (Telegram API call)
time echo "bot_token" | send_to_bot
# Should be < 5 seconds

# 3. Group permission verification (Telegram API call)
time echo "[forward_message]" | send_to_bot
# Should be < 5 seconds
```

### Concurrent Users
```bash
# Simulate 50 concurrent users registering
for i in {1..50}; do
  send_registration_flow "user${i}@test.com" &
done
wait

# Check all users created successfully
SELECT COUNT(*) FROM users WHERE email LIKE 'user%@test.com';
# Should be 50
```

### Session Cleanup
```bash
# Verify sessions expire after 1 hour
redis-cli KEYS "onboarding:session:*"
# Create session
# Wait 3601 seconds
redis-cli KEYS "onboarding:session:*"
# Should return empty (sessions cleaned up)
```

---

## Rollback & Cleanup

### Reset Test Data
```sql
-- Delete test users and cascading data
DELETE FROM users WHERE email LIKE '%@test.com' OR email LIKE '%@example.com';

-- Verify cascading deletes worked
SELECT COUNT(*) FROM telegram_user_accounts WHERE user_id NOT IN (SELECT id FROM users);
-- Should be 0

SELECT COUNT(*) FROM bot_commands WHERE telegram_user_account_id NOT IN (SELECT id FROM telegram_user_accounts);
-- Should be 0 or commands with NULL telegram_user_account_id (unregistered users)
```

### Clear Redis Sessions
```bash
redis-cli FLUSHDB
# Or selective cleanup:
redis-cli --scan --pattern "onboarding:session:*" | xargs redis-cli DEL
redis-cli --scan --pattern "email:verification:*" | xargs redis-cli DEL
redis-cli --scan --pattern "rate:limit:onboarding:*" | xargs redis-cli DEL
```

---

## Success Criteria

- [ ] All 7 test scenarios pass without errors
- [ ] Response times meet NFR targets (<3s p95)
- [ ] Rate limiting enforced correctly
- [ ] Session timeout enforced correctly
- [ ] Multi-tenant isolation verified (no data leakage)
- [ ] All bot commands logged to bot_commands table
- [ ] Encryption verified for bot tokens
- [ ] Error messages are user-friendly and actionable
- [ ] No TypeScript compilation errors
- [ ] All lint checks pass

---

**Quickstart Status**: ✅ COMPLETE
**Next Phase**: Generate final plan.md with all sections
