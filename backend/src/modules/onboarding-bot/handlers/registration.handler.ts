import { Injectable } from '@nestjs/common';
import { OnboardingBotService } from '../onboarding-bot.service';
import { OnboardingSessionService } from '../onboarding-session.service';
import { SessionStep } from '../interfaces/onboarding-session.interface';

@Injectable()
export class RegistrationHandler {
  constructor(
    private readonly onboardingBotService: OnboardingBotService,
    private readonly sessionService: OnboardingSessionService,
  ) {}

  async handleStart(telegramUserId: number, telegramChatId: number, correlationId: string): Promise<string> {
    // Create or reset session
    await this.sessionService.createSession(telegramUserId, telegramChatId, correlationId);

    return `Welcome to the Telegram Groups SaaS Platform! 👋

I'm here to help you set up your paid Telegram groups in minutes.

Choose an option:
• Register new account
• Link existing account
• Help

Reply with your choice or send /help for more information.`;
  }

  async handleRegistrationFlow(
    telegramUserId: number,
    telegramChatId: number,
    message: string,
    correlationId: string,
  ): Promise<string> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return 'Session expired. Please send /start to begin again.';
    }

    switch (session.current_step) {
      case SessionStep.IDLE:
        if (message.toLowerCase().includes('register')) {
          await this.sessionService.advanceStep(telegramUserId, SessionStep.REGISTRATION_EMAIL);
          return `Great! Let's create your account. 📝\n\nWhat's your email address?\n(This will be used for login and notifications)`;
        }
        return 'Please choose an option: Register new account or Link existing account';

      case SessionStep.REGISTRATION_EMAIL:
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(message)) {
          return '❌ Invalid email format.\n\nPlease provide a valid email address (e.g., john@example.com)';
        }
        await this.sessionService.advanceStep(telegramUserId, SessionStep.REGISTRATION_NAME, {
          email: message,
        });
        return `✅ Email received: ${message}\n\nWhat's your full name?`;

      case SessionStep.REGISTRATION_NAME:
        if (message.length < 2) {
          return '❌ Name must be at least 2 characters long.\n\nPlease provide your full name:';
        }
        await this.sessionService.advanceStep(telegramUserId, SessionStep.REGISTRATION_COMPANY, {
          name: message,
        });
        return `Nice to meet you, ${message}! 👤\n\nWhat's your company or project name?\n(This will be displayed to your members)`;

      case SessionStep.REGISTRATION_COMPANY:
        if (message.length < 2) {
          return '❌ Company name must be at least 2 characters long.\n\nPlease provide your company or project name:';
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

          return `🎉 Account created successfully!

Your account details:
• Email: ${updatedSession.data.email}
• Name: ${updatedSession.data.name}
• Company: ${message}

What would you like to do next?
• Create first project
• View dashboard
• Get help`;
        } catch (error) {
          if (error.response?.error?.code === 'DUPLICATE_EMAIL') {
            return `⚠️ ${error.response.error.message}\n\nWould you like to:\n• Link this Telegram account to existing account\n• Use a different email`;
          }
          throw error;
        }

      default:
        return 'Something went wrong. Please send /start to begin again.';
    }
  }
}
