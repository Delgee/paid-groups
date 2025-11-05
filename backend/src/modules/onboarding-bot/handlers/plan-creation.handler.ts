import { Injectable, Logger } from '@nestjs/common';
import { OnboardingSessionService } from '../onboarding-session.service';
import { TelegramUserAccountService } from '../telegram-user-account.service';
import { SessionStep } from '../interfaces/onboarding-session.interface';
import { BotResponse } from './registration.handler';
import { ProjectService } from '../../project/services/project.service';
import { TelegramGroupsService } from '../../telegram-groups/telegram-groups.service';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';

@Injectable()
export class PlanCreationHandler {
  private readonly logger = new Logger(PlanCreationHandler.name);

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
        text: `⚠️ Гишүүнчлэлийн багц үүсгэхээс өмнө эхлээд бүртгүүлэх хэрэгтэй.

Бүртгүүлэхийн тулд /start илгээнэ үү.`,
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
        text: `⚠️ Эхлээд төсөл үүсгэх хэрэгтэй.

Доорх товчлуур ашиглан төсөл үүсгэнэ үү:`,
        keyboard: {
          inline_keyboard: [[{ text: '🚀 Төсөл үүсгэх', callback_data: 'create_project' }]],
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
        text: `⚠️ Гишүүнчлэлийн багц үүсгэхээс өмнө эхлээд Telegram групп нэмэх хэрэгтэй.

Доорх товчлуур ашиглан групп нэмнэ үү:`,
        keyboard: {
          inline_keyboard: [[{ text: '➕ Telegram групп нэмэх', callback_data: 'add_group' }]],
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

    groupButtons.push([{ text: '✅ Сонгосон группуудтай үргэлжлүүлэх', callback_data: 'plan_groups_done' }]);

    return {
      text: `💰 <b>Гишүүнчлэлийн багц үүсгэх</b>

Төсөл: <b>${project.display_name}</b>

<b>Алхам 1:</b> Энэ багцад оруулах Telegram группуудыг сонгоно уу

Группүүдийг дараад "Үргэлжлүүлэх" товч дарна уу:`,
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
      return { text: 'Хугацаа дууссан байна. Дахин эхлүүлэхийн тулд /createplan илгээнэ үү.' };
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

    groupButtons.push([{ text: '✅ Сонгосон группуудтай үргэлжлүүлэх', callback_data: 'plan_groups_done' }]);

    return {
      text: `💰 <b>Гишүүнчлэлийн багц үүсгэх</b>

<b>Сонгосон группүүд:</b> ${selectedGroups.length}

Группүүдийг сонгох/хасахын тулд дараад, дараа нь "Үргэлжлүүлэх" дарна уу:`,
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
        text: '❌ Үргэлжлүүлэхээс өмнө дор хаяж нэг групп сонгоно уу.',
      };
    }

    await this.sessionService.advanceStep(telegramUserId, SessionStep.PLAN_NAME);

    return {
      text: `<b>Алхам 2:</b> Гишүүнчлэлийн багцын нэрийг оруулна уу

Жишээ нь:
• "Сарын төлбөртэй хандалт"
• "VIP гишүүнчлэл"
• "Үндсэн багц"

Багцын нэрийг оруулна уу:`,
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
      return { text: 'Хугацаа дууссан байна. Дахин эхлүүлэхийн тулд /createplan илгээнэ үү.' };
    }

    const account = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    switch (session.current_step) {
      case SessionStep.PLAN_NAME:
        if (message.length < 3) {
          return {
            text: '❌ Багцын нэр дор хаяж 3 тэмдэгттэй байх ёстой.\n\nЗөв багцын нэр оруулна уу:',
          };
        }

        await this.sessionService.advanceStep(telegramUserId, SessionStep.PLAN_PRICE, {
          plan_name: message,
        });

        return {
          text: `✅ Багцын нэр: <b>${message}</b>

<b>Алхам 3:</b> Үнийг төгрөгөөр (MNT) оруулна уу

Жишээ: 50000 (50,000 төгрөг)

Үнийг оруулна уу:`,
        };

      case SessionStep.PLAN_PRICE:
        const price = parseFloat(message);

        if (isNaN(price) || price <= 0) {
          return {
            text: '❌ Буруу үнэ. 0-ээс их зөв тоо оруулна уу.\n\nЖишээ: 50000\n\nҮнийг оруулна уу:',
          };
        }

        if (price > 10000000) {
          return {
            text: '❌ Үнэ хэт өндөр байна. Боломжит үнэ оруулна уу (хамгийн ихдээ 10,000,000 төгрөг).\n\nҮнийг оруулна уу:',
          };
        }

        await this.sessionService.advanceStep(telegramUserId, SessionStep.PLAN_DURATION, {
          plan_price: price,
        });

        return {
          text: `✅ Үнэ: <b>${price.toLocaleString()} төгрөг</b>

<b>Алхам 4:</b> Гишүүнчлэлийн хугацааг сонгоно уу:`,
          keyboard: {
            inline_keyboard: [
              [{ text: '7 өдөр', callback_data: 'plan_duration:7' }],
              [{ text: '30 өдөр (1 сар)', callback_data: 'plan_duration:30' }],
              [{ text: '90 өдөр (3 сар)', callback_data: 'plan_duration:90' }],
              [{ text: '180 өдөр (6 сар)', callback_data: 'plan_duration:180' }],
              [{ text: '365 өдөр (1 жил)', callback_data: 'plan_duration:365' }],
            ],
          },
        };

      case SessionStep.PLAN_DESCRIPTION:
        const lowerMsg = message.toLowerCase();
        const description = (lowerMsg === 'skip' || lowerMsg === 'алгасах') ? '' : message;

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
            description: description || `${updatedSession.data.plan_name}-ийн гишүүнчлэлийн багц`,
            price: updatedSession.data.plan_price!,
            duration_days: parseInt(updatedSession.data.plan_duration!),
            project_id: updatedSession.data.selected_project_id!,
            telegram_group_ids: updatedSession.data.selected_groups!,
            is_active: true,
          });

          // Ensure webhook is properly configured for the project
          try {
            await this.projectService.ensureWebhookConfigured(
              account.user.tenant_id,
              updatedSession.data.selected_project_id!,
            );
          } catch (webhookError) {
            // Log but don't fail plan creation if webhook setup fails
            // User can manually refresh webhook later if needed
            this.logger.warn(
              `Failed to ensure webhook configured for project ${updatedSession.data.selected_project_id}: ${webhookError.message}`,
            );
          }

          // Clear session
          await this.sessionService.clearSession(telegramUserId);

          return {
            text: `🎉 <b>Гишүүнчлэлийн багц амжилттай үүслээ!</b>

<b>Багцын дэлгэрэнгүй:</b>
• Нэр: ${plan.name}
• Үнэ: ${plan.price.toLocaleString()} төгрөг
• Хугацаа: ${plan.duration_days} өдөр
• Группүүд: ${updatedSession.data.selected_groups!.length}

Таны гишүүд одоо энэ багц руу бүртгүүлж болно!

<b>Дараагийн алхам:</b>`,
            keyboard: {
              inline_keyboard: [
                [{ text: '💰 Өөр багц үүсгэх', callback_data: 'create_plan' }],
                [{ text: '📊 Хяналтын самбар', callback_data: 'view_dashboard' }],
                [{ text: '📋 Төлөв харах', callback_data: 'view_status' }],
              ],
            },
          };
        } catch (error) {
          return {
            text: `❌ Гишүүнчлэлийн багц үүсгэж чадсангүй.

${error.response?.message || error.message || 'Тодорхойгүй алдаа'}

Дахин оролдоно уу эсвэл асуудал үргэлжилвэл дэмжлэгтэй холбогдоно уу.`,
          };
        }

      default:
        return { text: 'Алдаа гарлаа. Дахин эхлүүлэхийн тулд /createplan илгээнэ үү.' };
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
      return { text: 'Хугацаа дууссан байна. Дахин эхлүүлэхийн тулд /createplan илгээнэ үү.' };
    }

    await this.sessionService.advanceStep(telegramUserId, SessionStep.PLAN_DESCRIPTION, {
      plan_duration: days,
    });

    const daysNum = parseInt(days);
    const durationLabel =
      daysNum === 7
        ? '7 өдөр'
        : daysNum === 30
        ? '1 сар'
        : daysNum === 90
        ? '3 сар'
        : daysNum === 180
        ? '6 сар'
        : '1 жил';

    return {
      text: `✅ Хугацаа: <b>${durationLabel}</b>

<b>Алхам 5:</b> Багцын тайлбар нэмэх (заавал биш)

Энэ нь гишүүдэд энэ багцаас юу авахыг ойлгоход тусална.

Энэ алхмыг алгасахын тулд "алгасах" гэж бичнэ үү.

Тайлбар оруулна уу:`,
    };
  }
}
