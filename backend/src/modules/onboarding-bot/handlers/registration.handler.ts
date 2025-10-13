import { Injectable } from '@nestjs/common';
import { OnboardingBotService } from '../onboarding-bot.service';
import { OnboardingSessionService } from '../onboarding-session.service';
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
  ) {}

  async handleStart(telegramUserId: number, telegramChatId: number, correlationId: string): Promise<BotResponse> {
    // Create or reset session
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

    if (callbackData === 'help') {
      return {
        text: `Available commands:
• /start - Begin registration
• /help - Show this message
• /cancel - Cancel current operation`,
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

          await this.sessionService.clearSession(telegramUserId);

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
