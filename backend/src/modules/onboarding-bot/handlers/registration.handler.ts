import { Injectable } from '@nestjs/common';
import { OnboardingBotService } from '../onboarding-bot.service';
import { OnboardingSessionService } from '../onboarding-session.service';
import { TelegramUserAccountService } from '../telegram-user-account.service';
import { SessionStep } from '../interfaces/onboarding-session.interface';

export interface BotResponse {
  text: string;
  keyboard?: any;
}

@Injectable()
export class RegistrationHandler {
  constructor(
    private readonly onboardingBotService: OnboardingBotService,
    private readonly sessionService: OnboardingSessionService,
    private readonly telegramUserAccountService: TelegramUserAccountService,
  ) {}

  async handleStart(telegramUserId: number, telegramChatId: number, correlationId: string): Promise<BotResponse> {
    // Check if user is already registered
    const existingAccount = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    if (existingAccount && existingAccount.user) {
      // User already registered - show main menu
      await this.sessionService.createSession(telegramUserId, telegramChatId, correlationId);

      return {
        text: `Тавтай морил ${existingAccount.user.name}! 👋

Таны бүртгэл: ${existingAccount.user.email}

Та юу хийх вэ?`,
        keyboard: {
          inline_keyboard: [
            [{ text: '🚀 Төсөл үүсгэх', callback_data: 'create_project' }],
            [{ text: '📊 Хяналтын самбар', callback_data: 'view_dashboard' }],
            [{ text: '❓ Тусламж', callback_data: 'help' }],
          ],
        },
      };
    }

    // New user - show registration options
    await this.sessionService.createSession(telegramUserId, telegramChatId, correlationId);

    return {
      text: `Төлбөртэй Телеграм группын платформд тавтай морил! 👋

Би танд төлбөртэй Телеграм групп үүсгэхэд тусална. Хэдхэн минутын дотор бүх зүйлийг тохируулна.

Сонголтоо хийнэ үү:`,
      keyboard: {
        inline_keyboard: [
          [{ text: '📝 Шинэ бүртгэл үүсгэх', callback_data: 'register' }],
          [{ text: '🔗 Байгаа бүртгэлтэй холбох', callback_data: 'link_account' }],
          [{ text: '❓ Тусламж', callback_data: 'help' }],
        ],
      },
    };
  }

  async handleCallbackQuery(
    telegramUserId: number,
    telegramChatId: number,
    callbackData: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return { text: 'Хугацаа дууссан байна. /start товчийг дарж дахин эхлүүлнэ үү.' };
    }

    if (callbackData === 'register') {
      await this.sessionService.advanceStep(telegramUserId, SessionStep.REGISTRATION_EMAIL);
      return {
        text: `Маш сайн! Таны бүртгэл үүсгэе. 📝

Таны имэйл хаяг хэд вэ?
(Энэ нь нэвтрэх болон мэдэгдэл хүлээн авахад ашиглагдана)`,
      };
    }

    if (callbackData === 'link_account') {
      return { text: 'Бүртгэл холбох функц удахгүй ирнэ! 🚧' };
    }

    if (callbackData === 'create_project') {
      return {
        text: `🚀 Таны анхны төслийг үүсгэе!

Төсөл нь таны төлбөртэй Телеграм группуудыг зохион байгуулахад тусална. Та өөр өөр үзэгчдэд зориулж олон төсөл үүсгэж болно.

<b>Төсөл үүсгэх функц удахгүй нэмэгдэнэ!</b>

Одоогоор эдгээр сонголтуудыг үзнэ үү:`,
        keyboard: {
          inline_keyboard: [
            [{ text: '📊 Хяналтын самбар', callback_data: 'view_dashboard' }],
            [{ text: '⚙️ Бот тохируулах', callback_data: 'configure_bot' }],
            [{ text: '❓ Тусламж авах', callback_data: 'help' }],
          ],
        },
      };
    }

    if (callbackData === 'view_dashboard') {
      return {
        text: `📊 <b>Хяналтын самбар</b>

Таны веб хяналтын самбар энд байна:
🌐 https://your-domain.com/dashboard

<b>Бүртгэлтэй имэйлээрээ нэвтэрч дараах зүйлсийг хийнэ үү:</b>
✓ Телеграм групп удирдах
✓ Бодит цагийн тайлан
✓ Төлбөрийн тохиргоо
✓ Элсэлтийн хяналт

Та юу хийх вэ?`,
        keyboard: {
          inline_keyboard: [
            [{ text: '🚀 Төсөл үүсгэх', callback_data: 'create_project' }],
            [{ text: '❓ Тусламж авах', callback_data: 'help' }],
          ],
        },
      };
    }

    if (callbackData === 'configure_bot') {
      return {
        text: `⚙️ <b>Ботын тохиргоо</b>

Таны бот ашиглахад бэлэн боллоо! Та үүнийг веб хяналтын самбараас тохируулж болно.

<b>Тохиргооны сонголтууд:</b>
✓ Угтах мессеж
✓ Төлбөрийн тохиргоо
✓ Группын эрх
✓ Автомат хариулт

Сонголтоо хийнэ үү:`,
        keyboard: {
          inline_keyboard: [
            [{ text: '📊 Хяналтын самбар', callback_data: 'view_dashboard' }],
            [{ text: '❓ Тусламж авах', callback_data: 'help' }],
          ],
        },
      };
    }

    if (callbackData === 'help') {
      return {
        text: `❓ <b>Тусламж ба дэмжлэг</b>

<b>Боломжтой командууд:</b>
/start - Үндсэн цэс
/help - Энэ тусламжийг харах
/cancel - Үйлдлийг цуцлах

<b>Платформын боломжууд:</b>
✓ Төлбөртэй Телеграм групп үүсгэх
✓ Автомат төлбөр боловсруулах
✓ Гишүүд удирдах
✓ Тайлан ба статистик

Сонголтоо хийх эсвэл тусламж авах:`,
        keyboard: {
          inline_keyboard: [
            [{ text: '🚀 Төсөл үүсгэх', callback_data: 'create_project' }],
            [{ text: '📊 Хяналтын самбар', callback_data: 'view_dashboard' }],
          ],
        },
      };
    }

    return { text: 'Тодорхойгүй сонголт. /start товчийг дарж эхлүүлнэ үү.' };
  }

  async handleRegistrationFlow(
    telegramUserId: number,
    telegramChatId: number,
    message: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return { text: 'Хугацаа дууссан байна. /start товчийг дарж дахин эхлүүлнэ үү.' };
    }

    switch (session.current_step) {
      case SessionStep.IDLE:
        return { text: '/start товчийг дарж бүртгэл эхлүүлнэ үү.' };

      case SessionStep.REGISTRATION_EMAIL:
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(message)) {
          return {
            text: '❌ Имэйл хаягийн формат буруу байна.\n\nЗөв имэйл хаяг оруулна уу (жишээ нь: john@example.com)',
          };
        }
        await this.sessionService.advanceStep(telegramUserId, SessionStep.REGISTRATION_NAME, {
          email: message,
        });
        return {
          text: `✅ Имэйл хүлээн авлаа: ${message}\n\nТаны бүтэн нэр хэн бэ?`,
        };

      case SessionStep.REGISTRATION_NAME:
        if (message.length < 2) {
          return {
            text: '❌ Нэр хамгийн багадаа 2 үсэгтэй байх ёстой.\n\nТаны бүтэн нэрийг оруулна уу:',
          };
        }
        await this.sessionService.advanceStep(telegramUserId, SessionStep.REGISTRATION_COMPANY, {
          name: message,
        });
        return {
          text: `Танилцаж байгаадаа баяртай байна, ${message}! 👤\n\nТаны компани эсвэл төслийн нэр юу вэ?\n(Энэ нэр таны гишүүдэд харагдана)`,
        };

      case SessionStep.REGISTRATION_COMPANY:
        if (message.length < 2) {
          return {
            text: '❌ Компанийн нэр хамгийн багадаа 2 үсэгтэй байх ёстой.\n\nКомпани эсвэл төслийн нэрийг оруулна уу:',
          };
        }

        // Complete registration
        const updatedSession = await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.IDLE,
          { company_name: message },
        );

        try {
          const result = await this.onboardingBotService.registerUser({
            telegram_user_id: telegramUserId,
            telegram_chat_id: telegramChatId,
            email: updatedSession.data.email!,
            name: updatedSession.data.name!,
            company_name: message,
            correlation_id: correlationId,
          });

          // Recreate session in IDLE state for post-registration actions
          await this.sessionService.createSession(telegramUserId, telegramChatId, correlationId);

          return {
            text: `🎉 Бүртгэл амжилттай үүслээ!

Таны бүртгэлийн мэдээлэл:
• Имэйл: ${updatedSession.data.email}
• Нэр: ${updatedSession.data.name}
• Компани: ${message}

Дараа нь юу хийх вэ?`,
            keyboard: {
              inline_keyboard: [
                [{ text: '🚀 Эхний төсөл үүсгэх', callback_data: 'create_project' }],
                [{ text: '📊 Хяналтын самбар', callback_data: 'view_dashboard' }],
                [{ text: '❓ Тусламж авах', callback_data: 'help' }],
              ],
            },
          };
        } catch (error) {
          if (error.response?.error?.code === 'DUPLICATE_EMAIL') {
            return {
              text: `⚠️ ${error.response.error.message}`,
              keyboard: {
                inline_keyboard: [
                  [{ text: '🔗 Байгаа бүртгэлтэй холбох', callback_data: 'link_account' }],
                  [{ text: '📧 Өөр имэйл ашиглах', callback_data: 'register' }],
                ],
              },
            };
          }
          throw error;
        }

      default:
        return { text: 'Алдаа гарлаа. /start товчийг дарж дахин эхлүүлнэ үү.' };
    }
  }
}
