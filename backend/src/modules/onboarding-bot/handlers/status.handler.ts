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
        text: `⚠️ Төлвөө харахын тулд эхлээд бүртгүүлэх хэрэгтэй.

Бүртгүүлэхийн тулд /start илгээнэ үү.`,
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
  • Бот: @${project.bot_username || 'тохируулаагүй'}
  • Группүүд: ${groupCount}
  • Багцууд: ${planCount}`,
        );
      }

      const statusText = `📊 <b>Дансны төлөв</b>

<b>Таны данс:</b>
• Имэйл: ${account.user.email}
• Нэр: ${account.user.name}
• Компани: ${account.user.tenant?.name || 'Тохируулаагүй'}

<b>Товч мэдээлэл:</b>
• Төслүүд: ${projects.length}
• Telegram группүүд: ${totalGroups}
• Гишүүнчлэлийн багцууд: ${totalPlans}

<b>Төслүүд:${projectDetails.join('')}</b>

<b>Хяналтын самбар:</b>
🌐 https://your-domain.com/dashboard

<b>Та юу хийхийг хүсч байна?</b>`;

      return {
        text: statusText,
        keyboard: {
          inline_keyboard: [
            [{ text: '🚀 Төсөл үүсгэх', callback_data: 'create_project' }],
            [{ text: '➕ Групп нэмэх', callback_data: 'add_group' }],
            [{ text: '💰 Багц үүсгэх', callback_data: 'create_plan' }],
            [{ text: '❓ Тусламж', callback_data: 'help' }],
          ],
        },
      };
    } catch (error) {
      return {
        text: `❌ Таны төлвийг татаж чадсангүй.

${error.message || 'Тодорхойгүй алдаа'}

Дахин оролдоно уу эсвэл дэмжлэгтэй холбогдоно уу.`,
      };
    }
  }
}
