# Feature Specification: Telegram Bot Onboarding for SaaS Users

**Feature Branch**: `002-in-this-app`
**Created**: 2025-01-20
**Updated**: 2025-01-20
**Status**: Draft
**Input**: User description: "the flow I want is enrolling SaaS users not the members. it is for creating plans, registering bot_token and channel_id easier for the SaaS user. It is just alternative way SaaS user can also be registered and create plans, groups, membership plans with web."

## Clarifications

### Session 2025-01-20
- Q: Should bot-registered SaaS users be assigned the OWNER role by default, or should there be role selection during registration? → A: Always assign OWNER role (tenant creator)
- Q: How long should the onboarding session state persist before timing out? → A: 1 hour (balanced timeout)
- Q: Should the bot support managing (editing/viewing) existing projects, groups, and plans, or only creating new ones? → A: Create + View/Status (can see details but not edit)
- Q: Should new SaaS users registering via bot go through email verification before account activation? → A: No verification (instant activation, lower friction)
- Q: What rate limit should be applied to bot interactions to prevent abuse? → A: 20 commands per minute per user

---

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature request identifies need for Telegram bot-based SaaS user onboarding
   → Alternative to web-based registration and project setup
2. Extract key concepts from description
   → Actors: SaaS users (content creators/tenant owners)
   → Actions: Register account, create project, configure bot token, connect channels/groups, create membership plans
   → Data: User accounts, projects, bot tokens, channel IDs, membership plans
   → Constraints: Simpler alternative to web dashboard, inspired by InviteMember's @InviteMemberBot
3. For each unclear aspect:
   → Bot-registered SaaS users always receive OWNER role (tenant creator)
   → No email verification required for bot registration (instant activation)
   → Bot supports creating new entities + viewing/status checks (no editing in v1)
4. Fill User Scenarios & Testing section
   → Primary flow: SaaS user starts bot → registers → creates project → adds bot token → connects groups → creates plans
5. Generate Functional Requirements
   → Each requirement marked for testability
6. Identify Key Entities
   → OnboardingSession (tracks multi-step setup), TelegramUserAccount (links User to Telegram ID)
7. Run Review Checklist
   → WARN "Spec has uncertainties" - 3 clarifications needed for implementation
8. Return: SUCCESS (spec ready for clarification phase)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

**As a content creator (SaaS user)**, I want to register for the platform and set up my paid Telegram groups entirely through a Telegram bot, so that I can start monetizing my content quickly without using a web dashboard.

**Flow (inspired by InviteMember's @InviteMemberBot):**
1. Content creator discovers the platform's onboarding bot (e.g., @YourAppSetupBot)
2. User sends `/start` command to the bot
3. Bot welcomes user and offers account registration
4. User registers by providing email, name, and company name
5. Bot creates tenant account and owner user with immediate activation (no email verification needed)
6. Bot prompts: "Create your first project" → user provides project name
7. Bot guides: "Create a bot with @BotFather and send me the token"
8. User creates bot via @BotFather, receives token, pastes it to setup bot
9. Bot validates token and registers the Telegram bot
10. Bot asks: "Connect your first channel or group" → user sends channel/group link or ID
11. Bot verifies bot permissions and connects the group
12. Bot prompts: "Create your first membership plan" → user provides plan details (name, price, duration)
13. Bot creates the plan and links it to the connected group
14. Bot confirms: "Setup complete! Your members can now subscribe via [bot link]"
15. User can continue managing via bot commands OR switch to web dashboard

### Acceptance Scenarios

1. **Given** a new content creator who has never used the platform, **When** they send `/start` to the onboarding bot, **Then** bot should:
   - Display welcome message explaining the platform
   - Offer two options: "Register new account" or "Link existing account"
   - For registration, ask for email address
   - Validate email format
   - Ask for full name
   - Ask for company/project name
   - Create tenant and owner user with immediate activation (no email verification)
   - Send confirmation with account details and next steps

2. **Given** a registered SaaS user with no projects, **When** they send `/newproject` command, **Then** bot should:
   - Ask for project display name
   - Ask for project description (optional)
   - Guide user to create bot with @BotFather
   - Prompt user to paste bot token
   - Validate token with Telegram API
   - Register bot and create project
   - Send confirmation with next steps

3. **Given** a SaaS user with a project but no connected groups, **When** they send `/addgroup` command, **Then** bot should:
   - List existing projects (if multiple) and ask which project to add to
   - Ask: "Private Channel or Private Group?"
   - Prompt: "Add me (@YourBot) as admin to your channel/group, then send me the link or forward a message from it"
   - Detect group/channel from forwarded message or link
   - Verify bot has admin permissions
   - Connect group to project
   - Send confirmation

4. **Given** a SaaS user with connected groups, **When** they send `/createplan` command, **Then** bot should:
   - Show list of connected groups and ask which one(s) the plan includes
   - Ask for plan name (e.g., "Premium Access")
   - Ask for price (e.g., "5000" for 5000 MNT)
   - Ask for duration (options: "1 week", "1 month", "3 months", "1 year", "lifetime")
   - Optionally ask for plan description
   - Create membership plan linked to selected groups
   - Send summary with plan details

5. **Given** a SaaS user who completed setup, **When** they send `/status` command, **Then** bot should display:
   - Number of projects
   - Number of connected groups per project
   - Number of membership plans
   - Total active members
   - Link to web dashboard for detailed analytics

6. **Given** a SaaS user with existing web account, **When** they send `/link` command to bot, **Then** bot should:
   - Ask for email address associated with web account
   - Send verification code to email
   - Ask user to enter verification code in bot
   - Link Telegram account to existing user account
   - Confirm successful linking
   - Allow bot-based management of existing projects

7. **Given** a SaaS user during any multi-step process, **When** they send `/cancel` command, **Then** bot should:
   - Abort current setup process
   - Clear session state
   - Return to main menu
   - Confirm cancellation

### Edge Cases

- **What happens when user provides invalid bot token?**
  - Bot should validate token with Telegram API
  - Display error: "Invalid bot token. Please check and try again."
  - Provide guidance on getting token from @BotFather
  - Allow retry without restarting entire flow

- **What happens when bot doesn't have admin permissions in target group?**
  - Bot should detect permission level
  - Display error: "I need admin permissions in [group name]. Please make me an admin and try again."
  - Provide step-by-step instructions for granting admin rights
  - Allow retry after permissions are granted

- **What happens when user tries to register with email already in use?**
  - Bot should detect duplicate email
  - Offer two options: (a) "Link this Telegram account to existing account" with email verification, or (b) "Use different email"
  - For linking: send verification code to email, validate code, link accounts

- **What happens when user abandons multi-step setup midway?**
  - Bot should save progress in session state (1 hour timeout)
  - On next interaction within timeout, offer: "Resume setup" or "Start over"
  - Clear session after 1 hour of inactivity

- **What happens when user tries to connect a group that's already connected to another project?**
  - Bot should detect duplicate group connection
  - Display error: "This group is already connected to project [name]"
  - Offer option to disconnect from old project and reconnect to new one (with confirmation)

- **What happens when user creates a plan with invalid price format?**
  - Bot should validate price as positive number
  - Display error: "Please enter a valid price (numbers only, e.g., 5000)"
  - Allow retry without losing other plan details

- **What happens when bot token belongs to a bot already registered in the system?**
  - Bot should detect duplicate bot token
  - Display error: "This bot is already registered to [tenant name]"
  - Prevent duplicate registration
  - Suggest creating new bot with @BotFather

---

## Requirements *(mandatory)*

### Functional Requirements

#### SaaS User Registration & Authentication
- **FR-001**: Onboarding bot MUST allow content creators to register new account by providing email, name, and company name
- **FR-002**: System MUST create tenant and owner user upon successful registration with immediate activation (no email verification)
- **FR-003**: System MUST assign OWNER role to all bot-registered SaaS users (tenant creators)
- **FR-004**: System MUST link Telegram user ID to created user account for seamless bot interactions
- **FR-005**: System MUST prevent duplicate registrations for same email address
- **FR-006**: System MUST support linking Telegram account to existing web-registered account via email verification
- **FR-007**: System MUST send verification code to email when linking existing accounts (for account security)
- **FR-008**: System MUST validate email format before account creation

#### Bot Commands & Interaction
- **FR-009**: Onboarding bot MUST respond to `/start` command with welcome message and registration options
- **FR-010**: Bot MUST support `/newproject` command to create new project
- **FR-011**: Bot MUST support `/addgroup` command to connect Telegram groups/channels to project
- **FR-012**: Bot MUST support `/createplan` command to create membership plans
- **FR-013**: Bot MUST support `/status` command to show overview of user's projects and metrics
- **FR-014**: Bot MUST support `/link` command to link Telegram account to existing web account
- **FR-015**: Bot MUST support `/cancel` command to abort current multi-step process
- **FR-016**: Bot MUST support `/help` command to display all available commands
- **FR-017**: Bot MUST maintain conversation state during multi-step setup processes
- **FR-018**: Bot MUST provide clear error messages with actionable guidance when operations fail
- **FR-019**: Bot MUST support viewing details of existing projects, groups, and plans (read-only in v1)
- **FR-020**: Bot MUST NOT support editing or deleting existing entities in v1 (defer to web dashboard)

#### Project & Bot Token Management
- **FR-021**: System MUST guide users to create bot with @BotFather and collect bot token
- **FR-022**: System MUST validate bot token with Telegram API before registration
- **FR-023**: System MUST prevent registration of duplicate bot tokens
- **FR-024**: System MUST store bot token securely (encrypted)
- **FR-025**: System MUST create Project entity with bot configuration upon successful token validation
- **FR-026**: System MUST support creating multiple projects per SaaS user
- **FR-027**: Bot MUST display list of existing projects when user has multiple projects

#### Group/Channel Connection
- **FR-028**: Bot MUST support accepting group/channel via forwarded message OR direct link/username
- **FR-029**: System MUST extract channel ID from forwarded messages or links
- **FR-030**: System MUST verify bot has admin permissions in target group/channel
- **FR-031**: System MUST display clear error if bot lacks required permissions
- **FR-032**: System MUST prevent connecting same group to multiple projects without confirmation
- **FR-033**: System MUST create TelegramGroup entity upon successful connection
- **FR-034**: Bot MUST allow reconnecting groups between projects with user confirmation

#### Membership Plan Creation
- **FR-035**: Bot MUST support creating membership plans via conversational flow
- **FR-036**: Bot MUST collect plan name, price, duration, and optional description
- **FR-037**: System MUST validate price as positive number
- **FR-038**: Bot MUST offer predefined duration options (1 week, 1 month, 3 months, 1 year, lifetime)
- **FR-039**: Bot MUST allow selecting multiple groups for a single plan
- **FR-040**: System MUST create MembershipPlan entity linked to selected groups
- **FR-041**: Bot MUST display plan summary before final confirmation

#### Session & State Management
- **FR-042**: System MUST maintain session state for each user during multi-step processes
- **FR-043**: System MUST store partial progress (e.g., collected email, project name) during setup
- **FR-044**: Bot MUST offer "Resume setup" option if user returns after abandoning process
- **FR-045**: System MUST clear session after 1 hour of inactivity
- **FR-046**: Bot MUST allow users to restart setup process from beginning

#### Integration with Web Dashboard
- **FR-047**: System MUST ensure bot-created projects, groups, and plans are visible in web dashboard
- **FR-048**: System MUST allow SaaS users to switch between bot and web for management
- **FR-049**: Bot MUST provide link to web dashboard in status messages
- **FR-050**: System MUST sync all bot-created data with web dashboard in real-time

#### Security & Data Integrity
- **FR-051**: System MUST ensure multi-tenant isolation for bot-registered SaaS users
- **FR-052**: System MUST validate Telegram webhook signatures for onboarding bot
- **FR-053**: System MUST rate-limit bot interactions to 20 commands per minute per user to prevent abuse
- **FR-054**: System MUST log all onboarding bot interactions for audit trail
- **FR-055**: System MUST encrypt sensitive data (email, bot tokens) with same standards as web
- **FR-056**: System MUST implement email verification for account linking to prevent account takeover

### Key Entities *(include if feature involves data)*

- **OnboardingSession**: Tracks multi-step setup process for each SaaS user. Contains current step (registration, project creation, bot token, group connection, plan creation), collected data (email, project name, bot token, etc.), Telegram chat ID, session start time, last activity time, and expiration timestamp. Enables bot to resume interrupted workflows.

- **TelegramUserAccount**: Links a User entity (SaaS owner) to their Telegram user ID, chat ID, and username. Allows bidirectional lookup between system users and Telegram identities for bot-based management.

- **BotCommand**: Represents commands issued to onboarding bot. Contains command type (start, newproject, addgroup, createplan, etc.), SaaS user who issued it, timestamp, and any parameters. Used for analytics and audit logging.

### Non-Functional Requirements

- **NFR-001**: Onboarding bot MUST respond to commands within 3 seconds under normal load
- **NFR-002**: Bot token validation MUST complete within 5 seconds
- **NFR-003**: Group permission verification MUST complete within 5 seconds
- **NFR-004**: Session state MUST persist for 1 hour of inactivity before automatic cleanup
- **NFR-005**: Bot interaction logs MUST be retained for same period as web audit logs
- **NFR-006**: Bot commands MUST be in English initially (localization as future enhancement)
- **NFR-007**: Bot setup flow MUST complete in under 5 minutes for experienced users

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain - **All resolved**
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

**Clarifications Resolved:**
1. ~~Default role for bot-registered SaaS users~~ ✅ Resolved: Always OWNER role
2. ~~Session timeout duration~~ ✅ Resolved: 1 hour of inactivity
3. ~~Can users manage existing projects via bot~~ ✅ Resolved: Create + View/Status only (no editing in v1)
4. ~~Email verification requirement~~ ✅ Resolved: No verification (instant activation)
5. ~~Rate limiting for bot interactions~~ ✅ Resolved: 20 commands per minute per user

---

## Execution Status

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities resolved (5 clarifications completed)
- [x] User scenarios defined
- [x] Requirements generated (56 functional requirements)
- [x] Entities identified (3 entities)
- [x] Review checklist passed

---

## Dependencies & Assumptions

### Dependencies
- Existing User and Tenant entities from web registration system
- Existing Project entity (bot configuration)
- Existing TelegramGroup entity
- Existing MembershipPlan entity
- Telegram Bot API for token validation and permission verification
- Email service for verification codes (account linking)
- Existing authentication and authorization system

### Assumptions
- SaaS users have Telegram accounts and can interact with bots
- Users know how to create bots with @BotFather (or bot provides guidance)
- Users have admin access to their Telegram groups/channels
- InviteMember's @InviteMemberBot serves as reference: conversational setup flow, step-by-step guidance, no-code approach
- Bot-registered users should have same capabilities as web-registered users
- Web dashboard remains primary tool for advanced management, bot is simplified alternative
- All bot-created data must be immediately visible and editable in web dashboard
- Feature complements existing web registration, doesn't replace it

### Out of Scope (for v1)
- Editing existing projects/groups/plans via bot (use web dashboard)
- Deleting projects/groups/plans via bot (use web dashboard)
- Advanced analytics in bot (only basic metrics in `/status`)
- Multi-language support (English only initially)
- Custom bot commands configuration via onboarding bot
- Payment provider configuration via bot (must use web dashboard)
- Group moderation features
- Bulk operations (e.g., creating multiple plans at once)
- Export/import functionality

---

## Comparison to Web Workflow

### Web Registration Flow (Current)
1. User visits website
2. Fills registration form (email, password, name, company)
3. Email verification
4. Login to dashboard
5. Navigate to Projects section
6. Click "Create Project"
7. Fill project form with bot token
8. Navigate to Groups section
9. Add groups with channel IDs
10. Navigate to Plans section
11. Create membership plans

**Total: ~10-15 clicks, 3-5 page navigations, 10-15 minutes**

### Bot Registration Flow (This Feature)
1. Open @YourAppSetupBot
2. Send `/start`
3. Reply to bot questions (email, name, company)
4. Get bot token from @BotFather
5. Paste token to setup bot
6. Forward message from group to bot
7. Reply with plan details

**Total: ~7 bot messages, 0 page loads, 5 minutes**

### Value Proposition
- **Faster onboarding**: 50% time reduction for simple setups
- **Mobile-friendly**: Complete setup from phone without opening browser
- **Lower friction**: No password creation, no email verification, instant activation
- **Telegram-native**: Users stay in familiar environment
- **Guided experience**: Conversational flow with validation at each step

---
