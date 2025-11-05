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
    const account =
      await this.telegramUserAccountService.findByTelegramUserId(
        telegramUserId,
      );

    if (!account || !account.user) {
      return {
        text: `⚠️ Групп нэмэхээс өмнө эхлээд бүртгүүлэх хэрэгтэй.

Бүртгүүлэхийн тулд /start илгээнэ үү.`,
      };
    }

    // Get user's projects
    const projectsResponse = await this.projectService.findAll(
      account.user.tenant_id,
      {
        page: 1,
        limit: 50,
        is_active: true,
      },
    );

    if (projectsResponse.data.length === 0) {
      return {
        text: `⚠️ Групп нэмэхээс өмнө эхлээд төсөл үүсгэх хэрэгтэй.

Доорх товчлуур ашиглан төсөл үүсгэнэ үү:`,
        keyboard: {
          inline_keyboard: [
            [{ text: '🚀 Төсөл үүсгэх', callback_data: 'create_project' }],
          ],
        },
      };
    }

    // If only one project, skip selection
    if (projectsResponse.data.length === 1) {
      // Create or reset session
      const existingSession =
        await this.sessionService.getSession(telegramUserId);
      if (!existingSession) {
        await this.sessionService.createSession(
          telegramUserId,
          telegramChatId,
          correlationId,
        );
      }

      await this.sessionService.advanceStep(
        telegramUserId,
        SessionStep.GROUP_TYPE,
        {
          selected_project_id: projectsResponse.data[0].id,
        },
      );

      return {
        text: `➕ <b>Telegram групп нэмэх</b>

Төсөл: <b>${projectsResponse.data[0].display_name}</b>

<b>Алхам 1:</b> Ямар төрлийн Telegram групп нэмэх вэ?`,
        keyboard: {
          inline_keyboard: [
            [{ text: '📢 Сувag', callback_data: 'group_type:channel' }],
            [{ text: '👥 Групп', callback_data: 'group_type:group' }],
          ],
        },
      };
    }

    // Multiple projects - show selection
    // Create or reset session
    const existingSession =
      await this.sessionService.getSession(telegramUserId);
    if (!existingSession) {
      await this.sessionService.createSession(
        telegramUserId,
        telegramChatId,
        correlationId,
      );
    }

    await this.sessionService.advanceStep(
      telegramUserId,
      SessionStep.GROUP_SELECTION,
    );

    const projectButtons = projectsResponse.data.map((project) => [
      {
        text: `📁 ${project.display_name}`,
        callback_data: `select_project:${project.id}`,
      },
    ]);

    return {
      text: `➕ <b>Telegram групп нэмэх</b>

<b>Алхам 1:</b> Энэ группд зориулсан төслөө сонгоно уу:`,
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
    await this.sessionService.advanceStep(
      telegramUserId,
      SessionStep.GROUP_CONNECTION,
      {
        group_type: groupType,
      },
    );

    const typeLabel = groupType === 'channel' ? 'Сувag' : 'Групп';
    const typeLabelLower = groupType === 'channel' ? 'сувгаа' : 'группаа';

    return {
      text: `<b>Алхам 2:</b> Telegram ${typeLabelLower} холбох

${typeLabelLower} холбохын тулд:
1. Ботоо ${typeLabelLower} руу <b>админ</b> эрхтэй нэмнэ үү
2. Бот дараах эрхтэй байх ёстой:
   ${groupType === 'channel' ? '• Пост илгээх' : '• Гишүүд удирдах\n   • Линкээр урих'}
3. ${typeLabel}-ийн хэрэглэгчийн нэр (@-тэй) эсвэл ID илгээнэ үү

<b>Сонголт 1:</b> Хэрэглэгчийн нэр илгээх
${groupType === 'channel' ? '@миний_төлбөртэй_сувag' : '@миний_төлбөртэй_групп'}

<b>Сонголт 2:</b> ${typeLabelLower}-аас мессеж дамжуулах
Энэ хамгийн хялбар арга! Мессеж дамжуулбал би ${typeLabelLower}-ийн мэдээллийг автоматаар таних болно.

Дээрх сонголтоос нэгийг сонгоно уу:`,
    };
  }

  async handleProjectSelection(
    telegramUserId: number,
    telegramChatId: number,
    projectId: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const account =
      await this.telegramUserAccountService.findByTelegramUserId(
        telegramUserId,
      );

    // Verify project belongs to user
    const project = await this.projectService.findOne(
      account.user.tenant_id,
      projectId,
    );

    if (!project) {
      return {
        text: '❌ Төсөл олдсонгүй. Дахин эхлүүлэхийн тулд /addgroup илгээнэ үү.',
      };
    }

    await this.sessionService.advanceStep(
      telegramUserId,
      SessionStep.GROUP_TYPE,
      {
        selected_project_id: projectId,
      },
    );

    return {
      text: `Төсөл сонгогдлоо: <b>${project.display_name}</b>

<b>Алхам 2:</b> Ямар төрлийн Telegram групп нэмэх вэ?`,
      keyboard: {
        inline_keyboard: [
          [{ text: '📢 Сувag', callback_data: 'group_type:channel' }],
          [{ text: '👥 Групп', callback_data: 'group_type:group' }],
        ],
      },
    };
  }

  async handleForwardedMessage(
    telegramUserId: number,
    telegramChatId: number,
    forwardedFrom: any,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session || session.current_step !== SessionStep.GROUP_CONNECTION) {
      return {
        text: `ℹ️ Сувag эсвэл групп нэмэхийн тулд эхлээд /addgroup команд ашиглаад, дараа нь сувag/группаасаа мессеж надруу дамжуулна уу.`,
      };
    }

    const account =
      await this.telegramUserAccountService.findByTelegramUserId(
        telegramUserId,
      );

    console.log('Forwarded from:', forwardedFrom);

    // Extract channel/group info from forwarded message
    const chatId = forwardedFrom.chat?.id || forwardedFrom.sender_chat?.id;
    const chatTitle =
      forwardedFrom.chat?.title || forwardedFrom.sender_chat?.title;
    const chatUsername =
      forwardedFrom.chat?.username || forwardedFrom.sender_chat?.username;

    if (!chatId) {
      return {
        text: `❌ Дамжуулсан мессежээс сувag/группын мэдээлэл олж чадсангүй.

Дараахыг шалгана уу:
1. Сувag/группаас мессеж дамжуулсан эсэх (түүний тухай мессеж биш)
2. Бот тэр сувag/группд админ эрхтэй нэмэгдсэн эсэх

Дахин дамжуулж үзэх эсвэл сувгийн хэрэглэгчийн нэрийг гараар оруулна уу:`,
      };
    }

    try {
      // Create the telegram group with chat ID
      const telegramGroup = await this.telegramGroupsService.create(
        {
          project_id: session.data.selected_project_id!,
          group_name: chatTitle || chatUsername || `Channel ${chatId}`,
          description: `Connected via Telegram bot onboarding - forwarded message`,
          telegram_chat_id: chatId.toString(),
        },
        account.user.tenant_id,
      );

      // Clear session
      await this.sessionService.clearSession(telegramUserId);

      return {
        text: `🎉 <b>Сувag/Групп амжилттай холбогдлоо!</b>

<b>Дэлгэрэнгүй:</b>
• Нэр: ${telegramGroup.group_name}
• Чатын ID: ${chatId}
${chatUsername ? `• Хэрэглэгчийн нэр: @${chatUsername}` : ''}
• Төлөв: Идэвхитэй

<b>Дараагийн алхам:</b>`,
        keyboard: {
          inline_keyboard: [
            [
              {
                text: '💰 Гишүүнчлэлийн багц үүсгэх',
                callback_data: 'create_plan',
              },
            ],
            [{ text: '➕ Өөр групп нэмэх', callback_data: 'add_group' }],
            [{ text: '📊 Хяналтын самбар', callback_data: 'view_dashboard' }],
          ],
        },
      };
    } catch (error) {
      if (error.response?.message?.includes('not found')) {
        return {
          text: `❌ Сувag/групп руу хандаж чадсангүй.

Дараахыг шалгана уу:
• Бот админ эрхтэй нэмэгдсэн эсэх
• Бот шаардлагатай эрхтэй эсэх
• Ботыг нэмсний дараа дахин оролдоно уу

Засч дууссаны дараа дахин мессеж дамжуулна уу:`,
        };
      }

      if (error.response?.statusCode === 409) {
        return {
          text: `⚠️ Энэ сувag/групп аль хэдийн таны төсөлд холбогдсон байна.

Та дараахыг хийж болно:`,
          keyboard: {
            inline_keyboard: [
              [{ text: '➕ Өөр групп нэмэх', callback_data: 'add_group' }],
              [{ text: '📊 Бүх группүүдийг харах', callback_data: 'view_dashboard' }],
            ],
          },
        };
      }

      return {
        text: `❌ Сувag/групп холбож чадсангүй.

${error.response?.message || error.message || 'Тодорхойгүй алдаа'}

Дахин оролдоно уу эсвэл асуудал үргэлжилвэл дэмжлэгтэй холбогдоно уу.`,
      };
    }
  }

  async handleGroupConnectionFlow(
    telegramUserId: number,
    telegramChatId: number,
    message: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return { text: 'Хугацаа дууссан байна. Дахин эхлүүлэхийн тулд /addgroup илгээнэ үү.' };
    }

    const account =
      await this.telegramUserAccountService.findByTelegramUserId(
        telegramUserId,
      );

    if (session.current_step === SessionStep.GROUP_CONNECTION) {
      // Extract channel/group identifier
      let channelUsername = message.trim();

      // Remove @ prefix if present
      if (channelUsername.startsWith('@')) {
        channelUsername = channelUsername.substring(1);
      }

      // Validate format
      if (
        channelUsername.length < 5 ||
        !/^[a-zA-Z0-9_]+$/.test(channelUsername)
      ) {
        const typeLabel = session.data.group_type === 'channel' ? 'сувгийн' : 'группын';
        return {
          text: `❌ ${typeLabel} хэрэглэгчийн нэрийн формат буруу байна.

Хэрэглэгчийн нэр:
• Дор хаяж 5 тэмдэгттэй байх
• Зөвхөн үсэг, тоо, доогуур зураас агуулах
• @-ээр эхлэх

Жишээ: @миний_төлбөртэй_сувag

Дахин оролдоно уу:`,
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

        const typeLabel =
          session.data.group_type === 'channel' ? 'Сувag' : 'Групп';

        return {
          text: `🎉 <b>${typeLabel} амжилттай холбогдлоо!</b>

<b>${typeLabel}-ийн дэлгэрэнгүй:</b>
• Нэр: ${telegramGroup.group_name}
• Төрөл: ${typeLabel}
• Төлөв: Идэвхитэй

<b>Дараагийн алхам:</b>`,
          keyboard: {
            inline_keyboard: [
              [
                {
                  text: '💰 Гишүүнчлэлийн багц үүсгэх',
                  callback_data: 'create_plan',
                },
              ],
              [{ text: '➕ Өөр групп нэмэх', callback_data: 'add_group' }],
              [{ text: '📊 Хяналтын самбар', callback_data: 'view_dashboard' }],
            ],
          },
        };
      } catch (error) {
        const typeLabel =
          session.data.group_type === 'channel' ? 'сувag' : 'групп';

        if (error.response?.message?.includes('not found')) {
          return {
            text: `❌ <b>@${channelUsername}</b> ${typeLabel}-ийг олж чадсангүй

Дараахыг шалгана уу:
• Хэрэглэгчийн нэр зөв эсэх
• ${typeLabel} нийтийн эсэх (эсвэл таны бот админаар нэмэгдсэн)
• Ботыг ${typeLabel} руу нэмсэн эсэх

Зөв хэрэглэгчийн нэрээр дахин оролдоно уу:`,
          };
        }

        if (
          error.response?.message?.includes('permission') ||
          error.response?.message?.includes('admin')
        ) {
          return {
            text: `❌ Бот <b>@${channelUsername}</b> дотор шаардлагатай эрхгүй байна

<b>Засахын тулд:</b>
1. ${typeLabel}-ийн тохиргоог нээнэ үү
2. Ботоо <b>Админ</b> эрхтэй нэмнэ үү
3. Дараах эрхийг олгоно уу:
   ${session.data.group_type === 'channel' ? '• Пост илгээх\n   • Пост засах' : '• Гишүүд удирдах\n   • Линкээр урих'}
4. Хэрэглэгчийн нэрийг дахин илгээнэ үү

Эрх олгосны дараа дахин оролдоно уу:`,
          };
        }

        if (error.response?.statusCode === 409) {
          return {
            text: `⚠️ Энэ ${typeLabel} аль хэдийн таны төсөлд холбогдсон байна.

Та дараахыг хийж болно:`,
            keyboard: {
              inline_keyboard: [
                [
                  {
                    text: '➕ Өөр групп нэмэх',
                    callback_data: 'add_group',
                  },
                ],
                [
                  {
                    text: '📊 Бүх группүүдийг харах',
                    callback_data: 'view_dashboard',
                  },
                ],
              ],
            },
          };
        }

        return {
          text: `❌ ${typeLabel} холбож чадсангүй.

${error.response?.message || error.message || 'Тодорхойгүй алдаа'}

Дахин оролдоно уу эсвэл асуудал үргэлжилвэл дэмжлэгтэй холбогдоно уу.`,
        };
      }
    }

    return {
      text: 'Алдаа гарлаа. Дахин эхлүүлэхийн тулд /addgroup илгээнэ үү.',
    };
  }
}
