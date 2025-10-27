import { Injectable } from '@nestjs/common';
import { OnboardingSessionService } from '../onboarding-session.service';
import { TelegramUserAccountService } from '../telegram-user-account.service';
import { SessionStep } from '../interfaces/onboarding-session.interface';
import { BotResponse } from './registration.handler';
import { ProjectService } from '../../project/services/project.service';
import { TelegramApiService } from '../../bot/services/telegram-api.service';

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

          // Create the project
          const updatedSession = await this.sessionService.advanceStep(
            telegramUserId,
            SessionStep.IDLE,
            {
              bot_token: message,
              bot_username: botInfo.username,
            },
          );

          await this.projectService.create(
            account.user.tenant_id,
            {
              bot_token: message,
              bot_username: botInfo.username,
              display_name: updatedSession.data.project_name!,
              description: updatedSession.data.project_description || '',
              welcome_message: `Welcome! I'm ${updatedSession.data.project_name}. Choose a membership plan to get started.`,
            },
          );

          // Clear session
          await this.sessionService.clearSession(telegramUserId);

          return {
            text: `🎉 <b>Project Created Successfully!</b>

<b>Project Details:</b>
• Name: ${updatedSession.data.project_name}
• Bot: @${botInfo.username}
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

      default:
        return {
          text: 'Something went wrong. Please send /newproject to begin again.',
        };
    }
  }
}
