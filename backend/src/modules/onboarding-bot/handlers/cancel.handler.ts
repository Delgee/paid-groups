import { Injectable } from '@nestjs/common';
import { OnboardingSessionService } from '../onboarding-session.service';

@Injectable()
export class CancelHandler {
  constructor(private readonly sessionService: OnboardingSessionService) {}

  async handleCancel(telegramUserId: number): Promise<string> {
    await this.sessionService.clearSession(telegramUserId);

    return `❌ Operation cancelled.

Your progress has been cleared. What would you like to do?
• Send /start to register
• Send /link to link existing account
• Send /help for more options`;
  }
}
