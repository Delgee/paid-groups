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
        text: `⚠️ Таны Telegram данс <b>${existingAccount.user.email}</b> хаягтай аль хэдийн холбогдсон байна

Та дараахыг хийж болно:`,
        keyboard: {
          inline_keyboard: [
            [{ text: '📊 Хяналтын самбар', callback_data: 'view_dashboard' }],
            [{ text: '📋 Төлөв харах', callback_data: 'view_status' }],
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
      text: `🔗 <b>Одоо байгаа дансаа холбох</b>

Хэрэв та манай вэб хяналтын самбар дээр данстай бол түүнийг Telegram-тай холбож болно.

<b>Алхам 1:</b> Дансандаа холбогдсон имэйл хаягаа оруулна уу:`,
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
      return { text: 'Хугацаа дууссан байна. Дахин эхлүүлэхийн тулд /link илгээнэ үү.' };
    }

    switch (session.current_step) {
      case SessionStep.LINK_EMAIL:
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(message)) {
          return {
            text: '❌ Имэйл хаягийн формат буруу байна.\n\nЗөв имэйл хаяг оруулна уу (жишээ нь: john@example.com)',
          };
        }

        // Check if user exists
        const user = await this.userRepository.findOne({
          where: { email: message.toLowerCase().trim() },
        });

        if (!user) {
          return {
            text: `❌ <b>${message}</b> имэйл хаягтай данс олдсонгүй

Та дараахыг хүсч байна уу:`,
            keyboard: {
              inline_keyboard: [
                [{ text: '📝 Шинэ данс бүртгүүлэх', callback_data: 'register' }],
                [{ text: '🔄 Өөр имэйл оруулах', callback_data: 'link_account' }],
              ],
            },
          };
        }

        // Check if this user is already linked to a different Telegram account
        const existingLink = await this.telegramUserAccountService.findByUserId(user.id);

        if (existingLink) {
          return {
            text: `⚠️ Энэ имэйл хаяг өөр Telegram данстай аль хэдийн холбогдсон байна.

Нэг имэйл хаяг зөвхөн нэг Telegram данстай холбогдож болно.

Та дараахыг хүсч байна уу:`,
            keyboard: {
              inline_keyboard: [
                [{ text: '📝 Шинэ данс бүртгүүлэх', callback_data: 'register' }],
                [{ text: '❓ Тусламж авах', callback_data: 'help' }],
              ],
            },
          };
        }

        await this.sessionService.advanceStep(telegramUserId, SessionStep.LINK_VERIFICATION, {
          link_email: message.toLowerCase().trim(),
        });

        return {
          text: `<b>Данс холбох - Удахгүй!</b> 🚧

Telegram ботоор имэйл баталгаажуулах функцийг хөгжүүлж байна.

Одоогоор вэб хяналтын самбарыг ашиглана уу:
🌐 https://your-domain.com/dashboard

<b>Вэб хяналтын самбар дээр:</b>
1. Имэйл хаягаараа нэвтэрнэ үү: ${message}
2. Тохиргоо → Telegram хэсэгт орно уу
3. Данс холбох заавруудыг дагана уу

<b>Эсвэл Telegram-аар шинэ данс бүртгүүлнэ үү:</b>`,
          keyboard: {
            inline_keyboard: [[{ text: '📝 Шинэ данс бүртгүүлэх', callback_data: 'register' }]],
          },
        };

      case SessionStep.LINK_VERIFICATION:
        // In the future, this will handle verification code validation
        return {
          text: 'Данс холбох удахгүй боломжтой болно! Шинэ данс бүртгүүлэхийн тулд /start илгээнэ үү.',
        };

      default:
        return { text: 'Алдаа гарлаа. Дахин эхлүүлэхийн тулд /link илгээнэ үү.' };
    }
  }
}
