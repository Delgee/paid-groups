import { Injectable } from '@nestjs/common';
import { OnboardingSessionService } from '../onboarding-session.service';
import { TelegramUserAccountService } from '../telegram-user-account.service';
import { SessionStep } from '../interfaces/onboarding-session.interface';
import { BotResponse } from './registration.handler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Injectable()
export class AccountLinkingHandler {
  constructor(
    private readonly sessionService: OnboardingSessionService,
    private readonly telegramUserAccountService: TelegramUserAccountService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async handleLinkCommand(
    telegramUserId: number,
    telegramChatId: number,
    correlationId: string,
  ): Promise<BotResponse> {
    // Check if user is already linked
    const existingAccount = await this.telegramUserAccountService.findByTelegramUserId(telegramUserId);

    if (existingAccount) {
      return {
        text: `⚠️ Your Telegram account is already linked to <b>${existingAccount.user.email}</b>

You can:`,
        keyboard: {
          inline_keyboard: [
            [{ text: '📊 View Dashboard', callback_data: 'view_dashboard' }],
            [{ text: '📋 View Status', callback_data: 'view_status' }],
          ],
        },
      };
    }

    // Start link flow
    // Create or reset session
    const existingSession = await this.sessionService.getSession(telegramUserId);
    if (!existingSession) {
      await this.sessionService.createSession(telegramUserId, telegramChatId, correlationId);
    }

    await this.sessionService.advanceStep(telegramUserId, SessionStep.LINK_EMAIL);

    return {
      text: `🔗 <b>Link Existing Account</b>

If you already have an account on our web dashboard, you can link it to your Telegram.

<b>Step 1:</b> Enter the email address associated with your account:`,
    };
  }

  async handleAccountLinkingFlow(
    telegramUserId: number,
    telegramChatId: number,
    message: string,
    correlationId: string,
  ): Promise<BotResponse> {
    const session = await this.sessionService.getSession(telegramUserId);

    if (!session) {
      return { text: 'Session expired. Please send /link to start again.' };
    }

    switch (session.current_step) {
      case SessionStep.LINK_EMAIL:
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(message)) {
          return {
            text: '❌ Invalid email format.\n\nPlease provide a valid email address (e.g., john@example.com)',
          };
        }

        // Check if user exists
        const user = await this.userRepository.findOne({
          where: { email: message.toLowerCase().trim() },
        });

        if (!user) {
          return {
            text: `❌ No account found with email <b>${message}</b>

Would you like to:`,
            keyboard: {
              inline_keyboard: [
                [{ text: '📝 Register New Account', callback_data: 'register' }],
                [{ text: '🔄 Try Different Email', callback_data: 'link_account' }],
              ],
            },
          };
        }

        // Check if this user is already linked to a different Telegram account
        const existingLink = await this.telegramUserAccountService.findByUserId(user.id);

        if (existingLink) {
          return {
            text: `⚠️ This email is already linked to another Telegram account.

Each email can only be linked to one Telegram account.

Would you like to:`,
            keyboard: {
              inline_keyboard: [
                [{ text: '📝 Register New Account', callback_data: 'register' }],
                [{ text: '❓ Get Help', callback_data: 'help' }],
              ],
            },
          };
        }

        await this.sessionService.advanceStep(telegramUserId, SessionStep.LINK_VERIFICATION, {
          link_email: message.toLowerCase().trim(),
        });

        return {
          text: `<b>Account Linking - Coming Soon!</b> 🚧

Email verification via Telegram bot is under development.

For now, please use the web dashboard at:
🌐 https://your-domain.com/dashboard

<b>In the web dashboard:</b>
1. Login with your email: ${message}
2. Go to Settings → Telegram
3. Follow the instructions to link your account

<b>Or register a new account via Telegram:</b>`,
          keyboard: {
            inline_keyboard: [[{ text: '📝 Register New Account', callback_data: 'register' }]],
          },
        };

      case SessionStep.LINK_VERIFICATION:
        // In the future, this will handle verification code validation
        return {
          text: 'Account linking is coming soon! Please use /start to register a new account.',
        };

      default:
        return { text: 'Something went wrong. Please send /link to begin again.' };
    }
  }
}
