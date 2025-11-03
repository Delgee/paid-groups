import { Injectable } from '@nestjs/common';
import { OnboardingSessionService } from '../onboarding-session.service';
import { TelegramUserAccountService } from '../telegram-user-account.service';
import { SessionStep } from '../interfaces/onboarding-session.interface';
import { BotResponse } from './registration.handler';
import { ProjectService } from '../../project/services/project.service';
import { TelegramGroupsService } from '../../telegram-groups/telegram-groups.service';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';

@Injectable()
export class PlanCreationHandler {
  constructor(
    private readonly sessionService: OnboardingSessionService,
    private readonly telegramUserAccountService: TelegramUserAccountService,
    private readonly projectService: ProjectService,
    private readonly telegramGroupsService: TelegramGroupsService,
    private readonly membershipPlanService: MembershipPlanService,
  ) {}

  async handleCreatePlanCommand(
    telegramUserId: number,
    telegramChatId: number,
    correlationId: string,
  ): Promise<BotResponse> {
    // Check if user is registered
    const account = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    if (!account || !account.user) {
      return {
        text: `⚠️ You need to register first before creating membership plans.

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
        text: `⚠️ You need to create a project first.

Please create a project using the button below:`,
        keyboard: {
          inline_keyboard: [[{ text: '🚀 Create Project', callback_data: 'create_project' }]],
        },
      };
    }

    // Get first project's groups (simplified for v1)
    const project = projectsResponse.data[0];
    const groupsResponse = await this.telegramGroupsService.findAll(account.user.tenant_id, {
      page: 1,
      limit: 50,
      project_id: project.id,
    });

    if (groupsResponse.data.length === 0) {
      return {
        text: `⚠️ You need to add Telegram groups first before creating a membership plan.

Please add a group using the button below:`,
        keyboard: {
          inline_keyboard: [[{ text: '➕ Add Telegram Group', callback_data: 'add_group' }]],
        },
      };
    }

    // Start plan creation flow
    // Create or reset session
    const existingSession = await this.sessionService.getSession(telegramUserId);
    if (!existingSession) {
      await this.sessionService.createSession(telegramUserId, telegramChatId, correlationId);
    }

    await this.sessionService.advanceStep(telegramUserId, SessionStep.PLAN_GROUP_SELECTION, {
      selected_project_id: project.id,
    });

    const groupButtons = groupsResponse.data.map((group, index) => [
      {
        text: `${group.group_type === 'channel' ? '📢' : '👥'} ${group.group_name}`,
        callback_data: `select_plan_group:${group.id}`,
      },
    ]);

    groupButtons.push([{ text: '✅ Continue with Selected Groups', callback_data: 'plan_groups_done' }]);

    return {
      text: `💰 <b>Create Membership Plan</b>

Project: <b>${project.display_name}</b>

<b>Step 1:</b> Select the Telegram groups for this plan

Tap groups to select them, then tap "Continue":`,
      keyboard: {
        inline_keyboard: groupButtons,
      },
    };
  }

  async handleGroupSelection(
    telegramUserId: number,
    telegramChatId: number,
    groupId: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return { text: 'Session expired. Please send /createplan to start again.' };
    }

    // Toggle group selection
    const selectedGroups = session.data.selected_groups || [];
    const index = selectedGroups.indexOf(groupId);

    if (index > -1) {
      selectedGroups.splice(index, 1); // Remove if already selected
    } else {
      selectedGroups.push(groupId); // Add if not selected
    }

    await this.sessionService.advanceStep(telegramUserId, session.current_step, {
      selected_groups: selectedGroups,
    });

    const account = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);
    const groupsResponse = await this.telegramGroupsService.findAll(account.user.tenant_id, {
      page: 1,
      limit: 50,
      project_id: session.data.selected_project_id,
    });

    const groupButtons = groupsResponse.data.map((group) => {
      const isSelected = selectedGroups.includes(group.id);
      return [
        {
          text: `${isSelected ? '✅' : '⬜'} ${group.group_type === 'channel' ? '📢' : '👥'} ${group.group_name}`,
          callback_data: `select_plan_group:${group.id}`,
        },
      ];
    });

    groupButtons.push([{ text: '✅ Continue with Selected Groups', callback_data: 'plan_groups_done' }]);

    return {
      text: `💰 <b>Create Membership Plan</b>

<b>Selected Groups:</b> ${selectedGroups.length}

Tap groups to select/deselect, then tap "Continue":`,
      keyboard: {
        inline_keyboard: groupButtons,
      },
    };
  }

  async handleGroupSelectionDone(
    telegramUserId: number,
    telegramChatId: number,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session || !session.data.selected_groups || session.data.selected_groups.length === 0) {
      return {
        text: '❌ Please select at least one group before continuing.',
      };
    }

    await this.sessionService.advanceStep(telegramUserId, SessionStep.PLAN_NAME);

    return {
      text: `<b>Step 2:</b> Enter a name for your membership plan

Examples:
• "Premium Monthly Access"
• "VIP Membership"
• "Basic Plan"

Enter the plan name:`,
    };
  }

  async handlePlanCreationFlow(
    telegramUserId: number,
    telegramChatId: number,
    message: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return { text: 'Session expired. Please send /createplan to start again.' };
    }

    const account = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    switch (session.current_step) {
      case SessionStep.PLAN_NAME:
        if (message.length < 3) {
          return {
            text: '❌ Plan name must be at least 3 characters long.\n\nPlease provide a valid plan name:',
          };
        }

        await this.sessionService.advanceStep(telegramUserId, SessionStep.PLAN_PRICE, {
          plan_name: message,
        });

        return {
          text: `✅ Plan name: <b>${message}</b>

<b>Step 3:</b> Enter the price in MNT (Mongolian Tugrik)

Example: 50000 (for 50,000 MNT)

Enter the price:`,
        };

      case SessionStep.PLAN_PRICE:
        const price = parseFloat(message);

        if (isNaN(price) || price <= 0) {
          return {
            text: '❌ Invalid price. Please enter a valid number greater than 0.\n\nExample: 50000\n\nEnter the price:',
          };
        }

        if (price > 10000000) {
          return {
            text: '❌ Price seems too high. Please enter a reasonable price (max 10,000,000 MNT).\n\nEnter the price:',
          };
        }

        await this.sessionService.advanceStep(telegramUserId, SessionStep.PLAN_DURATION, {
          plan_price: price,
        });

        return {
          text: `✅ Price: <b>${price.toLocaleString()} MNT</b>

<b>Step 4:</b> Select the membership duration:`,
          keyboard: {
            inline_keyboard: [
              [{ text: '7 Days', callback_data: 'plan_duration:7' }],
              [{ text: '30 Days (1 Month)', callback_data: 'plan_duration:30' }],
              [{ text: '90 Days (3 Months)', callback_data: 'plan_duration:90' }],
              [{ text: '180 Days (6 Months)', callback_data: 'plan_duration:180' }],
              [{ text: '365 Days (1 Year)', callback_data: 'plan_duration:365' }],
            ],
          },
        };

      case SessionStep.PLAN_DESCRIPTION:
        const description = message.toLowerCase() === 'skip' ? '' : message;

        // Create the membership plan
        try {
          const updatedSession = await this.sessionService.advanceStep(
            telegramUserId,
            SessionStep.IDLE,
            {
              plan_description: description,
            },
          );

          const plan = await this.membershipPlanService.create(account.user.tenant_id, {
            name: updatedSession.data.plan_name!,
            description: description || `Membership plan for ${updatedSession.data.plan_name}`,
            price: updatedSession.data.plan_price!,
            duration_days: parseInt(updatedSession.data.plan_duration!),
            project_id: updatedSession.data.selected_project_id!,
            telegram_group_ids: updatedSession.data.selected_groups!,
            is_active: true,
          });

          // Clear session
          await this.sessionService.clearSession(telegramUserId);

          return {
            text: `🎉 <b>Membership Plan Created!</b>

<b>Plan Details:</b>
• Name: ${plan.name}
• Price: ${plan.price.toLocaleString()} MNT
• Duration: ${plan.duration_days} days
• Groups: ${updatedSession.data.selected_groups!.length}

Your members can now subscribe to this plan!

<b>What's next?</b>`,
            keyboard: {
              inline_keyboard: [
                [{ text: '💰 Create Another Plan', callback_data: 'create_plan' }],
                [{ text: '📊 View Dashboard', callback_data: 'view_dashboard' }],
                [{ text: '📋 View Status', callback_data: 'view_status' }],
              ],
            },
          };
        } catch (error) {
          return {
            text: `❌ Failed to create membership plan.

${error.response?.message || error.message || 'Unknown error'}

Please try again or contact support if the issue persists.`,
          };
        }

      default:
        return { text: 'Something went wrong. Please send /createplan to begin again.' };
    }
  }

  async handleDurationSelection(
    telegramUserId: number,
    telegramChatId: number,
    days: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return { text: 'Session expired. Please send /createplan to start again.' };
    }

    await this.sessionService.advanceStep(telegramUserId, SessionStep.PLAN_DESCRIPTION, {
      plan_duration: days,
    });

    const daysNum = parseInt(days);
    const durationLabel =
      daysNum === 7
        ? '7 Days'
        : daysNum === 30
        ? '1 Month'
        : daysNum === 90
        ? '3 Months'
        : daysNum === 180
        ? '6 Months'
        : '1 Year';

    return {
      text: `✅ Duration: <b>${durationLabel}</b>

<b>Step 5:</b> Add a description for your plan (optional)

This will help members understand what they get with this plan.

You can skip this step by typing "skip".

Enter the description:`,
    };
  }
}
