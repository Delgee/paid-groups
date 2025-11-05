import { Injectable } from '@nestjs/common';
import { OnboardingSessionService } from '../onboarding-session.service';
import { TelegramUserAccountService } from '../telegram-user-account.service';
import { SessionStep } from '../interfaces/onboarding-session.interface';
import { BotResponse } from './registration.handler';
import { ProjectService } from '../../project/services/project.service';
import { TelegramApiService } from '../../../integrations/telegram/telegram-api.service';
import {
  MONGOLIAN_BANKS,
  isValidBankCode,
  getBankName,
} from '../../../common/constants/banks.constant';

@Injectable()
export class ProjectCreationHandler {
  constructor(
    private readonly sessionService: OnboardingSessionService,
    private readonly telegramUserAccountService: TelegramUserAccountService,
    private readonly projectService: ProjectService,
    private readonly telegramApiService: TelegramApiService,
  ) {}

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
        text: `⚠️ You need to register first before creating a project.

Please send /start to register your account.`,
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
      text: `🚀 <b>Create New Project</b>

Let's set up your Telegram bot project!

<b>Step 1:</b> What would you like to name your project?

Examples:
• "Premium Fitness Channel"
• "Crypto Trading Signals"
• "Language Learning Community"`,
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
        text: 'Session expired. Please send /newproject to start again.',
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
            text: '❌ Project name must be at least 3 characters long.\n\nPlease provide a valid project name:',
          };
        }

        if (message.length > 100) {
          return {
            text: '❌ Project name must be less than 100 characters.\n\nPlease provide a shorter name:',
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
          text: `✅ Project name: <b>${message}</b>

<b>Step 2:</b> Provide a brief description for your project (optional).

You can skip this step by typing "skip".`,
        };

      case SessionStep.PROJECT_DESCRIPTION:
        const description = message.toLowerCase() === 'skip' ? '' : message;

        await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.BOT_TOKEN,
          {
            project_description: description,
          },
        );

        return {
          text: `<b>Step 3:</b> Enter your Telegram Bot Token

To get a bot token:
1. Open @BotFather in Telegram
2. Send /newbot
3. Follow the instructions to create your bot
4. Copy the bot token (format: 123456789:ABC-DEF...)

Send me the token:`,
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

          // Advance to bank selection step
          await this.sessionService.advanceStep(
            telegramUserId,
            SessionStep.PROJECT_BANK,
            {
              bot_token: message,
              bot_username: botInfo.username,
            },
          );

          // Generate bank list with numbers
          const bankList = MONGOLIAN_BANKS.map(
            (bank, index) => `${index + 1}. ${bank.name} (${bank.code})`,
          ).join('\n');

          return {
            text: `✅ Bot verified: <b>@${botInfo.username}</b>

<b>Step 4:</b> Select your bank for payment processing

${bankList}

Please send the number (1-${MONGOLIAN_BANKS.length}) of your bank:`,
          };
        } catch (error) {
          if (error.response?.error?.code === 'DUPLICATE_BOT_TOKEN') {
            return {
              text: `⚠️ This bot token is already registered in the system.

Each bot can only be used once. Please create a new bot with @BotFather or use a different token:`,
            };
          }

          return {
            text: `❌ Failed to validate bot token with Telegram.

This could be due to:
• Invalid token format
• Network issues
• Telegram API timeout

Please try again or get a new token from @BotFather:`,
          };
        }

      case SessionStep.PROJECT_BANK:
        // Validate bank selection (number from 1 to MONGOLIAN_BANKS.length)
        const bankIndex = parseInt(message.trim(), 10);

        if (
          isNaN(bankIndex) ||
          bankIndex < 1 ||
          bankIndex > MONGOLIAN_BANKS.length
        ) {
          return {
            text: `❌ Invalid selection. Please send a number between 1 and ${MONGOLIAN_BANKS.length}.`,
          };
        }

        const selectedBank = MONGOLIAN_BANKS[bankIndex - 1];

        await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.PROJECT_ACCOUNT_NUMBER,
          {
            account_bank_code: selectedBank.code,
          },
        );

        return {
          text: `✅ Bank selected: <b>${selectedBank.name}</b>

<b>Step 5:</b> Enter your bank account number

This is the account where payments will be deposited.

Example: 490000869`,
        };

      case SessionStep.PROJECT_ACCOUNT_NUMBER:
        // Validate account number (basic validation)
        if (message.trim().length === 0 || message.trim().length > 50) {
          return {
            text: `❌ Invalid account number. It should be between 1 and 50 characters.

Please enter your bank account number:`,
          };
        }

        await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.PROJECT_ACCOUNT_NAME,
          {
            account_number: message.trim(),
          },
        );

        return {
          text: `✅ Account number saved

<b>Step 6:</b> Enter the account holder name

This should match the name registered with the bank.

Example: John Doe`,
        };

      case SessionStep.PROJECT_ACCOUNT_NAME:
        // Validate account name
        if (message.trim().length === 0 || message.trim().length > 255) {
          return {
            text: `❌ Invalid account holder name. It should be between 1 and 255 characters.

Please enter the account holder name:`,
          };
        }

        // Now create the project with all collected data
        const finalSession = await this.sessionService.advanceStep(
          telegramUserId,
          SessionStep.IDLE,
          {
            account_name: message.trim(),
          },
        );

        try {
          await this.projectService.create(account.user.tenant_id, {
            bot_token: finalSession.data.bot_token!,
            bot_username: finalSession.data.bot_username!,
            display_name: finalSession.data.project_name!,
            description: finalSession.data.project_description || '',
            welcome_message: `Welcome! I'm ${finalSession.data.project_name}. Choose a membership plan to get started.`,
            account_bank_code: finalSession.data.account_bank_code!,
            account_number: finalSession.data.account_number!,
            account_name: finalSession.data.account_name!,
          });

          // Clear session
          await this.sessionService.clearSession(telegramUserId);

          const bankName = getBankName(finalSession.data.account_bank_code!);

          return {
            text: `🎉 <b>Project Created Successfully!</b>

<b>Project Details:</b>
• Name: ${finalSession.data.project_name}
• Bot: @${finalSession.data.bot_username}
• Bank: ${bankName}
• Account: ${finalSession.data.account_number}
• Status: Active

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

          if (error.response?.error?.code === 'DUPLICATE_BOT_TOKEN') {
            return {
              text: `⚠️ This bot token is already registered in the system.

Each bot can only be used once. Please send /newproject to try again with a different bot.`,
            };
          }

          return {
            text: `❌ Failed to create project.

Error: ${error.message || 'Unknown error'}

Please send /newproject to try again.`,
          };
        }

      default:
        return {
          text: 'Something went wrong. Please send /newproject to begin again.',
        };
    }
  }
}
