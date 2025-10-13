import { Injectable } from '@nestjs/common';
import { OnboardingSessionService } from '../onboarding-session.service';
import { TelegramUserAccountService } from '../telegram-user-account.service';
import { SessionStep } from '../interfaces/onboarding-session.interface';
import { BotResponse } from './registration.handler';
import { ProjectService } from '../../project/services/project.service';
import { TelegramGroupsService } from '../../telegram-groups/telegram-groups.service';
import { GroupType } from '../../telegram-groups/telegram-groups.entity';

@Injectable()
export class GroupConnectionHandler {
  constructor(
    private readonly sessionService: OnboardingSessionService,
    private readonly telegramUserAccountService: TelegramUserAccountService,
    private readonly projectService: ProjectService,
    private readonly telegramGroupsService: TelegramGroupsService,
  ) {}

  async handleAddGroupCommand(
    telegramUserId: number,
    telegramChatId: number,
    correlationId: string,
  ): Promise<BotResponse> {
    // Check if user is registered
    const account = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    if (!account || !account.user) {
      return {
        text: `⚠️ You need to register first before adding groups.

Please send /start to register your account.`,
      };
    }

    // Get user's projects
    const projectsResponse = await this.projectService.findAll(account.user.tenant_id, {
      page: 1,
      limit: 50,
      is_active: true,
    });

    if (projectsResponse.data.length === 0) {
      return {
        text: `⚠️ You need to create a project first before adding groups.

Please create a project using the button below:`,
        keyboard: {
          inline_keyboard: [[{ text: '🚀 Create Project', callback_data: 'create_project' }]],
        },
      };
    }

    // If only one project, skip selection
    if (projectsResponse.data.length === 1) {
      // Create or reset session
      const existingSession = await this.sessionService.getSession(telegramUserId);
      if (!existingSession) {
        await this.sessionService.createSession(telegramUserId, telegramChatId, correlationId);
      }

      await this.sessionService.advanceStep(telegramUserId, SessionStep.GROUP_TYPE, {
        selected_project_id: projectsResponse.data[0].id,
      });

      return {
        text: `➕ <b>Add Telegram Group</b>

Project: <b>${projectsResponse.data[0].display_name}</b>

<b>Step 1:</b> What type of Telegram group do you want to add?`,
        keyboard: {
          inline_keyboard: [
            [{ text: '📢 Channel', callback_data: 'group_type:channel' }],
            [{ text: '👥 Group', callback_data: 'group_type:group' }],
          ],
        },
      };
    }

    // Multiple projects - show selection
    // Create or reset session
    const existingSession = await this.sessionService.getSession(telegramUserId);
    if (!existingSession) {
      await this.sessionService.createSession(telegramUserId, telegramChatId, correlationId);
    }

    await this.sessionService.advanceStep(telegramUserId, SessionStep.GROUP_SELECTION);

    const projectButtons = projectsResponse.data.map((project) => [
      { text: `📁 ${project.display_name}`, callback_data: `select_project:${project.id}` },
    ]);

    return {
      text: `➕ <b>Add Telegram Group</b>

<b>Step 1:</b> Select the project for this group:`,
      keyboard: {
        inline_keyboard: projectButtons,
      },
    };
  }

  async handleGroupTypeSelection(
    telegramUserId: number,
    telegramChatId: number,
    groupType: 'channel' | 'group',
    correlationId: string,
  ): Promise<BotResponse> {
    await this.sessionService.advanceStep(telegramUserId, SessionStep.GROUP_CONNECTION, {
      group_type: groupType,
    });

    const typeLabel = groupType === 'channel' ? 'Channel' : 'Group';

    return {
      text: `<b>Step 2:</b> Connect your Telegram ${typeLabel}

To connect your ${groupType}:
1. Add your bot to the ${groupType} as an <b>administrator</b>
2. Make sure the bot has permission to:
   ${groupType === 'channel' ? '• Post messages' : '• Manage members\n   • Invite users via link'}
3. Send me the ${groupType}'s username (with @) or ID

<b>Example:</b>
${groupType === 'channel' ? '@my_premium_channel' : '@my_premium_group'}

Send the ${groupType} username or ID:`,
    };
  }

  async handleProjectSelection(
    telegramUserId: number,
    telegramChatId: number,
    projectId: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const account = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    // Verify project belongs to user
    const project = await this.projectService.findOne(account.user.tenant_id, projectId);

    if (!project) {
      return {
        text: '❌ Project not found. Please send /addgroup to start again.',
      };
    }

    await this.sessionService.advanceStep(telegramUserId, SessionStep.GROUP_TYPE, {
      selected_project_id: projectId,
    });

    return {
      text: `Project selected: <b>${project.display_name}</b>

<b>Step 2:</b> What type of Telegram group do you want to add?`,
      keyboard: {
        inline_keyboard: [
          [{ text: '📢 Channel', callback_data: 'group_type:channel' }],
          [{ text: '👥 Group', callback_data: 'group_type:group' }],
        ],
      },
    };
  }

  async handleGroupConnectionFlow(
    telegramUserId: number,
    telegramChatId: number,
    message: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return { text: 'Session expired. Please send /addgroup to start again.' };
    }

    const account = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    if (session.current_step === SessionStep.GROUP_CONNECTION) {
      // Extract channel/group identifier
      let channelUsername = message.trim();

      // Remove @ prefix if present
      if (channelUsername.startsWith('@')) {
        channelUsername = channelUsername.substring(1);
      }

      // Validate format
      if (channelUsername.length < 5 || !/^[a-zA-Z0-9_]+$/.test(channelUsername)) {
        return {
          text: `❌ Invalid ${session.data.group_type} username format.

Username should:
• Be at least 5 characters
• Contain only letters, numbers, and underscores
• Start with @

Example: @my_premium_channel

Please try again:`,
        };
      }

      try {
        // Create the telegram group
        const telegramGroup = await this.telegramGroupsService.create(
          {
            project_id: session.data.selected_project_id!,
            group_name: channelUsername,
            description: `Connected via Telegram bot onboarding - ${session.data.group_type}`,
            telegram_chat_id: `@${channelUsername}`, // Will be validated by service
          },
          account.user.tenant_id,
        );

        // Clear session
        await this.sessionService.clearSession(telegramUserId);

        const typeLabel = session.data.group_type === 'channel' ? 'Channel' : 'Group';

        return {
          text: `🎉 <b>${typeLabel} Connected Successfully!</b>

<b>${typeLabel} Details:</b>
• Name: ${telegramGroup.group_name}
• Type: ${typeLabel}
• Status: Active

<b>What's next?</b>`,
          keyboard: {
            inline_keyboard: [
              [{ text: '💰 Create Membership Plan', callback_data: 'create_plan' }],
              [{ text: '➕ Add Another Group', callback_data: 'add_group' }],
              [{ text: '📊 View Dashboard', callback_data: 'view_dashboard' }],
            ],
          },
        };
      } catch (error) {
        const typeLabel = session.data.group_type === 'channel' ? 'channel' : 'group';

        if (error.response?.message?.includes('not found')) {
          return {
            text: `❌ Could not find the ${typeLabel} <b>@${channelUsername}</b>

Please check:
• The username is correct
• The ${typeLabel} is public (or your bot is added as admin)
• You added the bot to the ${typeLabel}

Try again with the correct username:`,
          };
        }

        if (error.response?.message?.includes('permission') || error.response?.message?.includes('admin')) {
          return {
            text: `❌ Bot lacks required permissions in <b>@${channelUsername}</b>

<b>To fix this:</b>
1. Open your ${typeLabel} settings
2. Add your bot as an <b>Administrator</b>
3. Grant these permissions:
   ${session.data.group_type === 'channel' ? '• Post messages\n   • Edit messages' : '• Manage users\n   • Invite users via link'}
4. Send the username again

Try again after granting permissions:`,
          };
        }

        if (error.response?.statusCode === 409) {
          return {
            text: `⚠️ This ${typeLabel} is already connected to your project.

You can:`,
            keyboard: {
              inline_keyboard: [
                [{ text: '➕ Add Different Group', callback_data: 'add_group' }],
                [{ text: '📊 View All Groups', callback_data: 'view_dashboard' }],
              ],
            },
          };
        }

        return {
          text: `❌ Failed to connect ${typeLabel}.

${error.response?.message || error.message || 'Unknown error'}

Please try again or contact support if the issue persists.`,
        };
      }
    }

    return { text: 'Something went wrong. Please send /addgroup to begin again.' };
  }
}
