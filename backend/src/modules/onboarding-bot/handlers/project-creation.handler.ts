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
            text: `❌ Invalid bot token format.

The token should look like:
<code>123456789:ABCdefGHI-JKLmnoPQR</code>

Please get a valid token from @BotFather and try again:`,
          };
        }

        // Validate token with Telegram API
        try {
          const botInfo = await this.telegramApiService.verifyBotToken(message);

          if (!botInfo) {
            return {
              text: `❌ Invalid bot token. The token was not accepted by Telegram.

Please check your token and try again, or get a new one from @BotFather:`,
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
            text: `✅ Bot verified: <b>@${botInfo.username}</b>

<b>Step 4 of 8:</b> Payment Information Notice

⚠️ We'll now collect your bank account details for payment processing through QPay Mongolia.

<b>By continuing, you agree to:</b>
• Store bank account information securely
• Use this information only for payment processing
• Comply with our data protection policies

Your data is encrypted and stored securely. You can delete your project and associated data at any time.

<b>Type 'I AGREE' to continue</b>, or send /cancel to stop the project creation.`,
          };
        } catch (error) {
          this.logger.error('Bot token verification failed', {
            error: error.message,
            telegramUserId,
            correlationId,
          });

          if (error.response?.error?.code === 'DUPLICATE_BOT_TOKEN') {
            return {
              text: `⚠️ This bot token is already registered in the system.

Each bot can only be used once. Please create a new bot with @BotFather or use a different token:`,
            };
          }

          return {
            text: `❌ Unable to verify bot token at this time.

This might be due to:
• Network connectivity issues
• Telegram API temporarily unavailable

Please try again in a few moments, or send /cancel to exit.`,
          };
        }

      case SessionStep.PROJECT_BANK_PRIVACY_CONSENT:
        if (message.trim().toUpperCase() !== 'I AGREE') {
          return {
            text: `⚠️ You must type exactly 'I AGREE' (without quotes) to continue with bank account collection.

If you don't want to continue, send /cancel to exit.`,
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
          text: `✅ Thank you for your consent.

<b>Step 5 of 8:</b> Select your bank for payment processing

Please tap on your bank from the list below:`,
          keyboard: this.generateBankKeyboard(0),
        };

      case SessionStep.PROJECT_BANK:
        // This step is handled by callback queries (inline keyboard)
        // If user sends text instead of clicking button, show error
        return {
          text: `⚠️ Please select your bank using the buttons above, or send /cancel to exit.`,
          keyboard: this.generateBankKeyboard(session.data.bank_page || 0),
        };

      case SessionStep.PROJECT_ACCOUNT_NUMBER:
        // Validate account number format
        const trimmedAccountNumber = message.trim();

        if (trimmedAccountNumber.length === 0) {
          return {
            text: `❌ Account number cannot be empty.

Please enter your bank account number:`,
          };
        }

        if (trimmedAccountNumber.length > MAX_ACCOUNT_NUMBER_LENGTH) {
          return {
            text: `❌ Account number is too long (max ${MAX_ACCOUNT_NUMBER_LENGTH} characters).

Please enter a valid bank account number:`,
          };
        }

        if (!ACCOUNT_NUMBER_REGEX.test(trimmedAccountNumber)) {
          return {
            text: `❌ Invalid account number format.

Bank account numbers should contain only digits (8-20 characters).

Please enter a valid bank account number:`,
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
          text: `✅ Account number saved: <code>${maskedAccount}</code>

<b>Step 7 of 8:</b> Enter the account holder name

This should match the name registered with the bank.

Example: Bat-Erdene Ganbaatar`,
        };

      case SessionStep.PROJECT_ACCOUNT_NAME:
        // Validate account name
        const trimmedAccountName = message.trim();

        if (trimmedAccountName.length === 0) {
          return {
            text: `❌ Account holder name cannot be empty.

Please enter the account holder name:`,
          };
        }

        if (trimmedAccountName.length > MAX_ACCOUNT_NAME_LENGTH) {
          return {
            text: `❌ Account holder name is too long (max ${MAX_ACCOUNT_NAME_LENGTH} characters).

Please enter the account holder name:`,
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
          text: `<b>Step 8 of 8:</b> Confirm Your Project Details

Please review the information below:

📝 <b>Project Name:</b> ${confirmSession.data.project_name}
🤖 <b>Bot:</b> @${confirmSession.data.bot_username}
📄 <b>Description:</b> ${confirmSession.data.project_description || 'None'}
🏦 <b>Bank:</b> ${bankName}
💳 <b>Account Number:</b> <code>${maskedAccountForConfirm}</code>
👤 <b>Account Holder:</b> ${confirmSession.data.account_name}

⚠️ <b>Important:</b> Please verify your bank account details are correct. Incorrect information may prevent you from receiving payments.

<b>Type 'CONFIRM' to create your project</b>, or /cancel to start over.`,
        };

      case SessionStep.PROJECT_CONFIRM:
        if (message.trim().toUpperCase() !== 'CONFIRM') {
          return {
            text: `⚠️ You must type exactly 'CONFIRM' (without quotes) to create the project.

If you want to start over, send /cancel.`,
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
            text: `🎉 <b>Project Created Successfully!</b>

<b>Project Details:</b>
• Name: ${finalSession.data.project_name}
• Bot: @${finalSession.data.bot_username}
• Bank: ${finalBankName}
• Account: <code>${finalMaskedAccount}</code>
• Status: Active

Your project is now ready to accept payments!

<b>What's next?</b>`,
            keyboard: {
              inline_keyboard: [
                [{ text: '➕ Add Telegram Group', callback_data: 'add_group' }],
                [
                  {
                    text: '💰 Create Membership Plan',
                    callback_data: 'create_plan',
                  },
                ],
                [
                  {
                    text: '📊 View Dashboard',
                    callback_data: 'view_dashboard',
                  },
                ],
                [{ text: '❓ Get Help', callback_data: 'help' }],
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
              text: `⚠️ This bot token is already registered in the system.

Each bot can only be used once. Please send /newproject to try again with a different bot.`,
            };
          }

          // Don't expose internal error details to user
          return {
            text: `❌ Unable to create project at this time.

This might be due to:
• System temporarily unavailable
• Network connectivity issues
• Invalid configuration

Please try again in a few minutes. If the problem persists, contact support with reference ID: <code>${correlationId}</code>`,
          };
        }

      default:
        return {
          text: 'Something went wrong. Please send /newproject to begin again.',
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
        text: 'Session expired. Please send /newproject to start again.',
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
        text: `<b>Step 5 of 8:</b> Select your bank for payment processing

Please tap on your bank from the list below (Page ${page + 1}):`,
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
          text: '❌ Invalid bank selection. Please try again.',
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
        text: `✅ Bank selected: <b>${selectedBank.name}</b>

<b>Step 6 of 8:</b> Enter your bank account number

This is the account where payments will be deposited.

<b>Format:</b> 8-20 digits only
<b>Example:</b> 490000869`,
      };
    }

    return {
      text: 'Invalid selection. Please try again.',
      keyboard: this.generateBankKeyboard(session.data.bank_page || 0),
    };
  }
}
