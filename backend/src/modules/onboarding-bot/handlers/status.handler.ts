import { Injectable } from '@nestjs/common';
import { TelegramUserAccountService } from '../telegram-user-account.service';
import { BotResponse } from './registration.handler';
import { ProjectService } from '../../project/services/project.service';
import { TelegramGroupsService } from '../../telegram-groups/telegram-groups.service';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';

@Injectable()
export class StatusHandler {
  constructor(
    private readonly telegramUserAccountService: TelegramUserAccountService,
    private readonly projectService: ProjectService,
    private readonly telegramGroupsService: TelegramGroupsService,
    private readonly membershipPlanService: MembershipPlanService,
  ) {}

  async handleStatusCommand(
    telegramUserId: number,
    telegramChatId: number,
    correlationId: string,
  ): Promise<BotResponse> {
    // Check if user is registered
    const account = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    if (!account || !account.user) {
      return {
        text: `⚠️ You need to register first to view your status.

Please send /start to register your account.`,
      };
    }

    try {
      // Get all user's data
      const projectsResponse = await this.projectService.findAll(account.user.tenant_id, {
        page: 1,
        limit: 100,
        is_active: true,
      });

      const projects = projectsResponse.data;

      // Get groups and plans for all projects
      let totalGroups = 0;
      let totalPlans = 0;
      const projectDetails: string[] = [];

      for (const project of projects) {
        const groupsResponse = await this.telegramGroupsService.findAll(account.user.tenant_id, {
          page: 1,
          limit: 100,
          project_id: project.id,
        });

        const plans = await this.membershipPlanService.findAll(account.user.tenant_id, {
          project_id: project.id,
          is_active: true,
        });

        const groupCount = groupsResponse.data.length;
        const planCount = plans.length;

        totalGroups += groupCount;
        totalPlans += planCount;

        projectDetails.push(
          `\n<b>${project.display_name}</b>
  • Bot: @${project.bot_username || 'not set'}
  • Groups: ${groupCount}
  • Plans: ${planCount}`,
        );
      }

      const statusText = `📊 <b>Account Status</b>

<b>Your Account:</b>
• Email: ${account.user.email}
• Name: ${account.user.name}
• Company: ${account.user.tenant?.name || 'Not set'}

<b>Overview:</b>
• Projects: ${projects.length}
• Telegram Groups: ${totalGroups}
• Membership Plans: ${totalPlans}

<b>Projects:${projectDetails.join('')}</b>

<b>Dashboard:</b>
🌐 https://your-domain.com/dashboard

<b>What would you like to do?</b>`;

      return {
        text: statusText,
        keyboard: {
          inline_keyboard: [
            [{ text: '🚀 Create Project', callback_data: 'create_project' }],
            [{ text: '➕ Add Group', callback_data: 'add_group' }],
            [{ text: '💰 Create Plan', callback_data: 'create_plan' }],
            [{ text: '❓ Help', callback_data: 'help' }],
          ],
        },
      };
    } catch (error) {
      return {
        text: `❌ Failed to fetch your status.

${error.message || 'Unknown error'}

Please try again later or contact support.`,
      };
    }
  }
}
