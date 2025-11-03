import { Injectable } from '@nestjs/common';
import { OnboardingSessionService } from '../onboarding-session.service';

@Injectable()
export class CancelHandler {
  constructor(private readonly sessionService: OnboardingSessionService) {}

  async handleCancel(telegramUserId: number): Promise<string> {
    await this.sessionService.clearSession(telegramUserId);

    return `❌ Үйлдэл цуцлагдлаа.

Таны явц цэвэрлэгдсэн байна. Та юу хийх вэ?
• /start дарж бүртгүүлэх
• /link дарж байгаа бүртгэлтэй холбох
• /help дарж бусад сонголтуудыг харах`;
  }
}
