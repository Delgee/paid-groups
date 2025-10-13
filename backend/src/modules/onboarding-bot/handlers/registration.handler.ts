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
        text: `Welcome back, ${existingAccount.user.name}! 👋

Your account: ${existingAccount.user.email}

What would you like to do?`,
        keyboard: {
          inline_keyboard: [
            [{ text: '🚀 Create Project', callback_data: 'create_project' }],
            [{ text: '📊 View Dashboard', callback_data: 'view_dashboard' }],
            [{ text: '❓ Help', callback_data: 'help' }],
          ],
        },
      };
    }

    // New user - show registration options
    await this.sessionService.createSession(telegramUserId, telegramChatId, correlationId);

    return {
      text: `Welcome to the Telegram Groups SaaS Platform! 👋

I'm here to help you set up your paid Telegram groups in minutes.

Choose an option:`,
      keyboard: {
        inline_keyboard: [
          [{ text: '📝 Register New Account', callback_data: 'register' }],
          [{ text: '🔗 Link Existing Account', callback_data: 'link_account' }],
          [{ text: '❓ Help', callback_data: 'help' }],
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
      return { text: 'Session expired. Please send /start to begin again.' };
    }

    if (callbackData === 'register') {
      await this.sessionService.advanceStep(telegramUserId, SessionStep.REGISTRATION_EMAIL);
      return {
        text: `Great! Let's create your account. 📝

What's your email address?
(This will be used for login and notifications)`,
      };
    }

    if (callbackData === 'link_account') {
      return { text: 'Account linking feature is coming soon! 🚧' };
    }

    if (callbackData === 'create_project') {
      return {
        text: `🚀 Let's create your first project!

A project helps you organize your paid Telegram groups. You can have multiple projects for different audiences.

<b>Project creation is coming soon!</b>

In the meantime, explore these options:`,
        keyboard: {
          inline_keyboard: [
            [{ text: '📊 View Dashboard', callback_data: 'view_dashboard' }],
            [{ text: '⚙️ Configure Bot', callback_data: 'configure_bot' }],
            [{ text: '❓ Get Help', callback_data: 'help' }],
          ],
        },
      };
    }

    if (callbackData === 'view_dashboard') {
      return {
        text: `📊 <b>Dashboard Access</b>

Your web dashboard is available at:
🌐 https://your-domain.com/dashboard

<b>Login with your registered email to access:</b>
✓ Telegram group management
✓ Real-time analytics
✓ Payment settings
✓ Subscription monitoring

What would you like to do?`,
        keyboard: {
          inline_keyboard: [
            [{ text: '🚀 Create Project', callback_data: 'create_project' }],
            [{ text: '❓ Get Help', callback_data: 'help' }],
          ],
        },
      };
    }

    if (callbackData === 'configure_bot') {
      return {
        text: `⚙️ <b>Bot Configuration</b>

Your bot is ready to use! You can configure it from the web dashboard.

<b>Configuration options include:</b>
✓ Welcome messages
✓ Payment settings
✓ Group permissions
✓ Automated responses

Choose an option:`,
        keyboard: {
          inline_keyboard: [
            [{ text: '📊 View Dashboard', callback_data: 'view_dashboard' }],
            [{ text: '❓ Get Help', callback_data: 'help' }],
          ],
        },
      };
    }

    if (callbackData === 'help') {
      return {
        text: `❓ <b>Help & Support</b>

<b>Available Commands:</b>
/start - Main menu
/help - Show this help
/cancel - Cancel operation

<b>Platform Features:</b>
✓ Create paid Telegram groups
✓ Automated payment processing
✓ Member management
✓ Analytics & reporting

Choose an option or contact support:`,
        keyboard: {
          inline_keyboard: [
            [{ text: '🚀 Create Project', callback_data: 'create_project' }],
            [{ text: '📊 View Dashboard', callback_data: 'view_dashboard' }],
          ],
        },
      };
    }

    return { text: 'Unknown option. Please send /start to begin.' };
  }

  async handleRegistrationFlow(
    telegramUserId: number,
    telegramChatId: number,
    message: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return { text: 'Session expired. Please send /start to begin again.' };
    }

    switch (session.current_step) {
      case SessionStep.IDLE:
        return { text: 'Please send /start to begin registration.' };

      case SessionStep.REGISTRATION_EMAIL:
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(message)) {
          return {
            text: '❌ Invalid email format.\n\nPlease provide a valid email address (e.g., john@example.com)',
          };
        }
        await this.sessionService.advanceStep(telegramUserId, SessionStep.REGISTRATION_NAME, {
          email: message,
        });
        return {
          text: `✅ Email received: ${message}\n\nWhat's your full name?`,
        };

      case SessionStep.REGISTRATION_NAME:
        if (message.length < 2) {
          return {
            text: '❌ Name must be at least 2 characters long.\n\nPlease provide your full name:',
          };
        }
        await this.sessionService.advanceStep(telegramUserId, SessionStep.REGISTRATION_COMPANY, {
          name: message,
        });
        return {
          text: `Nice to meet you, ${message}! 👤\n\nWhat's your company or project name?\n(This will be displayed to your members)`,
        };

      case SessionStep.REGISTRATION_COMPANY:
        if (message.length < 2) {
          return {
            text: '❌ Company name must be at least 2 characters long.\n\nPlease provide your company or project name:',
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
            text: `🎉 Account created successfully!

Your account details:
• Email: ${updatedSession.data.email}
• Name: ${updatedSession.data.name}
• Company: ${message}

What would you like to do next?`,
            keyboard: {
              inline_keyboard: [
                [{ text: '🚀 Create First Project', callback_data: 'create_project' }],
                [{ text: '📊 View Dashboard', callback_data: 'view_dashboard' }],
                [{ text: '❓ Get Help', callback_data: 'help' }],
              ],
            },
          };
        } catch (error) {
          if (error.response?.error?.code === 'DUPLICATE_EMAIL') {
            return {
              text: `⚠️ ${error.response.error.message}`,
              keyboard: {
                inline_keyboard: [
                  [{ text: '🔗 Link to Existing Account', callback_data: 'link_account' }],
                  [{ text: '📧 Use Different Email', callback_data: 'register' }],
                ],
              },
            };
          }
          throw error;
        }

      default:
        return { text: 'Something went wrong. Please send /start to begin again.' };
    }
  }
}
