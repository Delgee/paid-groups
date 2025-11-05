import { Injectable, Logger } from '@nestjs/common';
import { OnboardingSessionService } from '../onboarding-session.service';
import { TelegramUserAccountService } from '../telegram-user-account.service';
import { SessionStep } from '../interfaces/onboarding-session.interface';
import { BotResponse } from './registration.handler';
import { ProjectService } from '../../project/services/project.service';
import { TelegramApiService } from '../../../integrations/telegram/telegram-api.service';
import {
  MONGOLIAN_BANKS,
  getBankName,
} from '../../../common/constants/banks.constant';

// Constants for validation
const MAX_ACCOUNT_NUMBER_LENGTH = 50;
const MAX_ACCOUNT_NAME_LENGTH = 255;
const ACCOUNT_NUMBER_REGEX = /^[0-9]{8,20}$/; // Mongolian bank account format
const BANKS_PER_PAGE = 8;

@Injectable()
export class ProjectCreationHandler {
  private readonly logger = new Logger(ProjectCreationHandler.name);

  // Pre-generated bank list for first page (performance optimization)
  private readonly BANK_LIST_PAGE_1 = MONGOLIAN_BANKS.slice(0, BANKS_PER_PAGE)
    .map((bank, index) => `${index + 1}. ${bank.name} (${bank.code})`)
    .join('\n');

  constructor(
    private readonly sessionService: OnboardingSessionService,
    private readonly telegramUserAccountService: TelegramUserAccountService,
    private readonly projectService: ProjectService,
    private readonly telegramApiService: TelegramApiService,
  ) {}

  /**
   * Mask account number for display (show only last 4 digits)
   */
  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) {
      return accountNumber;
    }
    return accountNumber.slice(-4).padStart(accountNumber.length, '*');
  }

  /**
   * Generate inline keyboard for bank selection with pagination
   */
  private generateBankKeyboard(page: number = 0) {
    const totalPages = Math.ceil(MONGOLIAN_BANKS.length / BANKS_PER_PAGE);
    const startIdx = page * BANKS_PER_PAGE;
    const endIdx = Math.min(startIdx + BANKS_PER_PAGE, MONGOLIAN_BANKS.length);
    const banksOnPage = MONGOLIAN_BANKS.slice(startIdx, endIdx);

    // Create button rows (2 buttons per row)
    const buttons = [];
    for (let i = 0; i < banksOnPage.length; i += 2) {
      const row = [];
      const bank1 = banksOnPage[i];
      row.push({
        text: `${bank1.name}`,
        callback_data: `bank:${bank1.code}`,
      });

      if (i + 1 < banksOnPage.length) {
        const bank2 = banksOnPage[i + 1];
        row.push({
          text: `${bank2.name}`,
          callback_data: `bank:${bank2.code}`,
        });
      }
      buttons.push(row);
    }

    // Add navigation buttons
    const navButtons = [];
    if (page > 0) {
      navButtons.push({
        text: '⬅️ Өмнөх',
        callback_data: `bank:page:${page - 1}`,
      });
    }
    if (page < totalPages - 1) {
      navButtons.push({
        text: 'Дараах ➡️',
        callback_data: `bank:page:${page + 1}`,
      });
    }
    if (navButtons.length > 0) {
      buttons.push(navButtons);
    }

    return {
      inline_keyboard: buttons,
    };
  }

  async handleNewProjectCommand(
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
        text: `⚠️ Төсөл үүсгэхээс өмнө эхлээд бүртгүүлэх хэрэгтэй.

Бүртгэл үүсгэхийн тулд /start команд илгээнэ үү.`,
      };
    }

    // Start project creation flow - create or reset session
    const existingSession =
      await this.sessionService.getSession(telegramUserId);
    if (existingSession) {
      await this.sessionService.advanceStep(
        telegramUserId,
        SessionStep.PROJECT_NAME,
      );
    } else {
      await this.sessionService.createSession(
        telegramUserId,
        telegramChatId,
        correlationId,
      );
      await this.sessionService.advanceStep(
        telegramUserId,
        SessionStep.PROJECT_NAME,
      );
    }

    return {
      text: `🚀 <b>Шинэ төсөл үүсгэх</b>

Telegram ботын төслийг тохируулъя!

<b>Алхам 1/8:</b> Төслийн нэрийг юу гэж өгөх вэ?

Жишээ нь:
• "Төлбөртэй фитнесс сувag"
• "Крипто арилжааны дохио"
• "Хэл сурах нийгэмлэг"`,
    };
  }

  async handleProjectCreationFlow(
    telegramUserId: number,
    telegramChatId: number,
    message: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return {
        text: 'Хугацаа дууссан байна. Дахин эхлүүлэхийн тулд /newproject команд илгээнэ үү.',
      };
    }

    const account =
      await this.telegramUserAccountService.findByTelegramUserId(
        telegramUserId,
      );

    switch (session.current_step) {
      case SessionStep.PROJECT_NAME:
        if (message.length < 3) {
          return {
            text: '❌ Төслийн нэр дор хаяж 3 үсэгтэй байх ёстой.\n\nЗөв төслийн нэр оруулна уу:',
          };
        }

        if (message.length > 100) {
          return {
            text: '❌ Төслийн нэр 100 тэмдэгтээс бага байх ёстой.\n\nБогино нэр оруулна уу:',
          };
        }

        await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.PROJECT_DESCRIPTION,
          {
            project_name: message,
          },
        );

        return {
          text: `✅ Төслийн нэр: <b>${message}</b>

<b>Алхам 2/8:</b> Төслийн товч тайлбар оруулна уу (заавал биш).

Энэ алхмыг алгасахын тулд "алгасах" гэж бичнэ үү.`,
        };

      case SessionStep.PROJECT_DESCRIPTION:
        const lowerMessage = message.toLowerCase();
        const description = (lowerMessage === 'skip' || lowerMessage === 'алгасах') ? '' : message;

        await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.BOT_TOKEN,
          {
            project_description: description,
          },
        );

        return {
          text: `<b>Алхам 3/8:</b> Telegram ботын токеноо оруулна уу

Ботын токен авах:
1. Telegram дээрх @BotFather-г нээнэ үү
2. /newbot команд илгээнэ үү
3. Ботоо үүсгэх заавар дагана уу
4. Ботын токеныг хуулна уу (формат: 123456789:ABC-DEF...)

Токеноо илгээнэ үү:`,
        };

      case SessionStep.BOT_TOKEN:
        // Validate token format
        const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
        if (!tokenRegex.test(message)) {
          return {
            text: `❌ Ботын токены формат буруу байна.

Токен ийм байх ёстой:
<code>123456789:ABCdefGHI-JKLmnoPQR</code>

@BotFather-аас зөв токен авч дахин оролдоно уу:`,
          };
        }

        // Validate token with Telegram API
        try {
          const botInfo = await this.telegramApiService.verifyBotToken(message);

          if (!botInfo) {
            return {
              text: `❌ Ботын токен буруу байна. Telegram токеныг хүлээн аваагүй байна.

Токеноо шалгаад дахин оролдоно уу, эсвэл @BotFather-аас шинээр авна уу:`,
            };
          }

          // Advance to privacy consent step
          await this.sessionService.advanceStep(
            telegramUserId,
            SessionStep.PROJECT_BANK_PRIVACY_CONSENT,
            {
              bot_token: message,
              bot_username: botInfo.username,
            },
          );

          return {
            text: `✅ Бот баталгаажлаа: <b>@${botInfo.username}</b>

<b>Алхам 4/8:</b> Төлбөрийн мэдээллийн мэдэгдэл

⚠️ Одоо QPay Mongolia-аар төлбөр боловсруулахын тулд таны банкны дансны мэдээллийг цуглуулна.

<b>Үргэлжлүүлснээр та дараахтай зөвшөөрч байна:</b>
• Банкны дансны мэдээллийг аюулгүй хадгалах
• Энэ мэдээллийг зөвхөн төлбөр боловсруулахад ашиглах
• Мэдээлэл хамгаалах бодлогыг дагаж мөрдөх

Таны мэдээлэл шифрлэгдсэн, аюулгүй хадгалагдана. Та төсөл болон холбогдох мэдээллээ хэзээ ч устгаж болно.

<b>Үргэлжлүүлэхийн тулд 'ЗӨВШӨӨРЧ БАЙНА' гэж бичнэ үү</b>, эсвэл төсөл үүсгэхийг зогсоохын тулд /cancel илгээнэ үү.`,
          };
        } catch (error) {
          this.logger.error('Bot token verification failed', {
            error: error.message,
            telegramUserId,
            correlationId,
          });

          if (error.response?.error?.code === 'DUPLICATE_BOT_TOKEN') {
            return {
              text: `⚠️ Энэ ботын токен аль хэдийн системд бүртгэлтэй байна.

Бот зөвхөн нэг удаа ашиглагдаж болно. @BotFather-аар шинэ бот үүсгэх эсвэл өөр токен ашиглана уу:`,
            };
          }

          return {
            text: `❌ Ботын токеныг одоогоор баталгаажуулж чадахгүй байна.

Энэ нь дараах шалтгаантай байж болно:
• Сүлжээний холболтын асуудал
• Telegram API түр ажиллахгүй байна

Хэдэн хормын дараа дахин оролдоно уу, эсвэл гарахын тулд /cancel илгээнэ үү.`,
          };
        }

      case SessionStep.PROJECT_BANK_PRIVACY_CONSENT:
        const upperMessage = message.trim().toUpperCase();
        if (upperMessage !== 'I AGREE' && upperMessage !== 'ЗӨВШӨӨРЧ БАЙНА') {
          return {
            text: `⚠️ Банкны дансны мэдээлэл цуглуулахын тулд 'ЗӨВШӨӨРЧ БАЙНА' (хашилтгүй) гэж бичих ёстой.

Үргэлжлүүлэхгүй бол /cancel илгээж гарна уу.`,
          };
        }

        await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.PROJECT_BANK,
          {
            bank_page: 0,
          },
        );

        return {
          text: `✅ Зөвшөөрсөнд баярлалаа.

<b>Алхам 5/8:</b> Төлбөр боловсруулахад ашиглах банкаа сонгоно уу

Доорх жагсаалтаас банкаа сонгоно уу:`,
          keyboard: this.generateBankKeyboard(0),
        };

      case SessionStep.PROJECT_BANK:
        // This step is handled by callback queries (inline keyboard)
        // If user sends text instead of clicking button, show error
        return {
          text: `⚠️ Дээрх товчлуураар банкаа сонгоно уу, эсвэл гарахын тулд /cancel илгээнэ үү.`,
          keyboard: this.generateBankKeyboard(session.data.bank_page || 0),
        };

      case SessionStep.PROJECT_ACCOUNT_NUMBER:
        // Validate account number format
        const trimmedAccountNumber = message.trim();

        if (trimmedAccountNumber.length === 0) {
          return {
            text: `❌ Дансны дугаар хоосон байж болохгүй.

Банкны дансны дугаараа оруулна уу:`,
          };
        }

        if (trimmedAccountNumber.length > MAX_ACCOUNT_NUMBER_LENGTH) {
          return {
            text: `❌ Дансны дугаар хэт урт байна (хамгийн ихдээ ${MAX_ACCOUNT_NUMBER_LENGTH} тэмдэгт).

Зөв дансны дугаар оруулна уу:`,
          };
        }

        if (!ACCOUNT_NUMBER_REGEX.test(trimmedAccountNumber)) {
          return {
            text: `❌ Дансны дугаарын формат буруу байна.

Банкны дансны дугаар зөвхөн тоо агуулах ёстой (8-20 тэмдэгт).

Зөв дансны дугаар оруулна уу:`,
          };
        }

        await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.PROJECT_ACCOUNT_NAME,
          {
            account_number: trimmedAccountNumber,
          },
        );

        const maskedAccount = this.maskAccountNumber(trimmedAccountNumber);

        return {
          text: `✅ Дансны дугаар хадгалагдлаа: <code>${maskedAccount}</code>

<b>Алхам 7/8:</b> Дансны эзэмшигчийн нэрийг оруулна уу

Энэ нь банкинд бүртгэгдсэн нэртэй таарах ёстой.

Жишээ: Бат-Эрдэнэ Ганбаатар`,
        };

      case SessionStep.PROJECT_ACCOUNT_NAME:
        // Validate account name
        const trimmedAccountName = message.trim();

        if (trimmedAccountName.length === 0) {
          return {
            text: `❌ Дансны эзэмшигчийн нэр хоосон байж болохгүй.

Дансны эзэмшигчийн нэрийг оруулна уу:`,
          };
        }

        if (trimmedAccountName.length > MAX_ACCOUNT_NAME_LENGTH) {
          return {
            text: `❌ Дансны эзэмшигчийн нэр хэт урт байна (хамгийн ихдээ ${MAX_ACCOUNT_NAME_LENGTH} тэмдэгт).

Дансны эзэмшигчийн нэрийг оруулна уу:`,
          };
        }

        // Advance to confirmation step
        await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.PROJECT_CONFIRM,
          {
            account_name: trimmedAccountName,
          },
        );

        const confirmSession = await this.sessionService.getSession(
          telegramUserId,
        );
        const bankName = getBankName(confirmSession.data.account_bank_code!);
        const maskedAccountForConfirm = this.maskAccountNumber(
          confirmSession.data.account_number!,
        );

        return {
          text: `<b>Алхам 8/8:</b> Төслийн дэлгэрэнгүй мэдээллийг баталгаажуулах

Доорх мэдээллийг шалгана уу:

📝 <b>Төслийн нэр:</b> ${confirmSession.data.project_name}
🤖 <b>Бот:</b> @${confirmSession.data.bot_username}
📄 <b>Тайлбар:</b> ${confirmSession.data.project_description || 'Байхгүй'}
🏦 <b>Банк:</b> ${bankName}
💳 <b>Дансны дугаар:</b> <code>${maskedAccountForConfirm}</code>
👤 <b>Дансны эзэмшигч:</b> ${confirmSession.data.account_name}

⚠️ <b>Анхаар:</b> Банкны дансны мэдээлэл зөв эсэхийг шалгана уу. Буруу мэдээлэл нь та төлбөр хүлээн авахад саад болно.

<b>Төслөө үүсгэхийн тулд 'БАТАЛГААЖУУЛАХ' гэж бичнэ үү</b>, эсвэл эхнээс эхлүүлэхийн тулд /cancel илгээнэ үү.`,
        };

      case SessionStep.PROJECT_CONFIRM:
        const confirmMessage = message.trim().toUpperCase();
        if (confirmMessage !== 'CONFIRM' && confirmMessage !== 'БАТАЛГААЖУУЛАХ') {
          return {
            text: `⚠️ Төслийг үүсгэхийн тулд 'БАТАЛГААЖУУЛАХ' (хашилтгүй) гэж бичих ёстой.

Эхнээс эхлүүлэхийн тулд /cancel илгээнэ үү.`,
          };
        }

        // Now create the project with all collected data
        const finalSession = await this.sessionService.getSession(
          telegramUserId,
        );

        try {
          this.logger.log('Creating project via bot', {
            telegramUserId,
            tenantId: account.user.tenant_id,
            projectName: finalSession.data.project_name,
            botUsername: finalSession.data.bot_username,
            correlationId,
          });

          const project = await this.projectService.create(
            account.user.tenant_id,
            {
              bot_token: finalSession.data.bot_token!,
              bot_username: finalSession.data.bot_username!,
              display_name: finalSession.data.project_name!,
              description: finalSession.data.project_description || '',
              welcome_message: `Welcome! I'm ${finalSession.data.project_name}. Choose a membership plan to get started.`,
              account_bank_code: finalSession.data.account_bank_code!,
              account_number: finalSession.data.account_number!,
              account_name: finalSession.data.account_name!,
            },
          );

          // Clear session
          await this.sessionService.clearSession(telegramUserId);

          const finalBankName = getBankName(
            finalSession.data.account_bank_code!,
          );
          const finalMaskedAccount = this.maskAccountNumber(
            finalSession.data.account_number!,
          );

          this.logger.log('Project created successfully via bot', {
            telegramUserId,
            projectId: project.id,
            correlationId,
          });

          return {
            text: `🎉 <b>Төсөл амжилттай үүслээ!</b>

<b>Төслийн дэлгэрэнгүй:</b>
• Нэр: ${finalSession.data.project_name}
• Бот: @${finalSession.data.bot_username}
• Банк: ${finalBankName}
• Данс: <code>${finalMaskedAccount}</code>
• Төлөв: Идэвхитэй

Таны төсөл одоо төлбөр хүлээн авахад бэлэн боллоо!

<b>Дараагийн алхам:</b>`,
            keyboard: {
              inline_keyboard: [
                [{ text: '➕ Telegram групп нэмэх', callback_data: 'add_group' }],
                [
                  {
                    text: '💰 Гишүүнчлэлийн багц үүсгэх',
                    callback_data: 'create_plan',
                  },
                ],
                [
                  {
                    text: '📊 Хяналтын самбар',
                    callback_data: 'view_dashboard',
                  },
                ],
                [{ text: '❓ Тусламж авах', callback_data: 'help' }],
              ],
            },
          };
        } catch (error) {
          // Reset to IDLE on error
          await this.sessionService.clearSession(telegramUserId);

          this.logger.error('Project creation failed via bot', {
            telegramUserId,
            error: error.message,
            stack: error.stack,
            correlationId,
          });

          if (error.response?.error?.code === 'DUPLICATE_BOT_TOKEN') {
            return {
              text: `⚠️ Энэ ботын токен аль хэдийн системд бүртгэлтэй байна.

Бот зөвхөн нэг удаа ашиглагдаж болно. Өөр боттой дахин оролдохын тулд /newproject илгээнэ үү.`,
            };
          }

          // Don't expose internal error details to user
          return {
            text: `❌ Төслийг одоогоор үүсгэж чадахгүй байна.

Энэ нь дараах шалтгаантай байж болно:
• Систем түр ажиллахгүй байна
• Сүлжээний холболтын асуудал
• Буруу тохиргоо

Хэдэн минутын дараа дахин оролдоно уу. Асуудал үргэлжилвэл дэмжлэгтэй холбогдож лавлах дугаарыг өгнө үү: <code>${correlationId}</code>`,
          };
        }

      default:
        return {
          text: 'Алдаа гарлаа. Дахин эхлүүлэхийн тулд /newproject илгээнэ үү.',
        };
    }
  }

  /**
   * Handle callback queries for bank selection
   */
  async handleBankCallback(
    telegramUserId: number,
    callbackData: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session || session.current_step !== SessionStep.PROJECT_BANK) {
      return {
        text: 'Хугацаа дууссан байна. Дахин эхлүүлэхийн тулд /newproject илгээнэ үү.',
      };
    }

    // Handle pagination
    if (callbackData.startsWith('bank:page:')) {
      const page = parseInt(callbackData.split(':')[2], 10);
      await this.sessionService.updateSession(telegramUserId, {
        data: {
          ...session.data,
          bank_page: page,
        },
      });

      return {
        text: `<b>Алхам 5/8:</b> Төлбөр боловсруулахад ашиглах банкаа сонгоно уу

Доорх жагсаалтаас банкаа сонгоно уу (Хуудас ${page + 1}):`,
        keyboard: this.generateBankKeyboard(page),
      };
    }

    // Handle bank selection
    if (callbackData.startsWith('bank:')) {
      const bankCode = callbackData.split(':')[1];
      const selectedBank = MONGOLIAN_BANKS.find(
        (bank) => bank.code === bankCode,
      );

      if (!selectedBank) {
        return {
          text: '❌ Буруу банк сонгогдлоо. Дахин оролдоно уу.',
          keyboard: this.generateBankKeyboard(session.data.bank_page || 0),
        };
      }

      await this.sessionService.advanceStep(
        telegramUserId,
        SessionStep.PROJECT_ACCOUNT_NUMBER,
        {
          account_bank_code: selectedBank.code,
        },
      );

      return {
        text: `✅ Банк сонгогдлоо: <b>${selectedBank.name}</b>

<b>Алхам 6/8:</b> Банкны дансны дугаараа оруулна уу

Энэ бол төлбөр орох данс юм.

<b>Формат:</b> Зөвхөн 8-20 оронтой тоо
<b>Жишээ:</b> 490000869`,
      };
    }

    return {
      text: 'Буруу сонголт. Дахин оролдоно уу.',
      keyboard: this.generateBankKeyboard(session.data.bank_page || 0),
    };
  }
}
