import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { OnboardingSession, SessionStep, SessionData } from './interfaces/onboarding-session.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OnboardingSessionService {
  private readonly SESSION_TTL = 3600; // 1 hour in seconds
  private readonly SESSION_KEY_PREFIX = 'onboarding:session:';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getSession(telegramUserId: number): Promise<OnboardingSession | null> {
    const key = this.getSessionKey(telegramUserId);
    const session = await this.cacheManager.get<OnboardingSession>(key);
    return session || null;
  }

  async createSession(
    telegramUserId: number,
    telegramChatId: number,
    correlationId?: string,
  ): Promise<OnboardingSession> {
    const session: OnboardingSession = {
      telegram_user_id: telegramUserId,
      telegram_chat_id: telegramChatId,
      current_step: SessionStep.IDLE,
      started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      correlation_id: correlationId || uuidv4(),
      data: {},
    };

    await this.saveSession(session);
    return session;
  }

  async updateSession(
    telegramUserId: number,
    updates: Partial<OnboardingSession>,
  ): Promise<OnboardingSession> {
    const session = await this.getSession(telegramUserId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession: OnboardingSession = {
      ...session,
      ...updates,
      last_activity_at: new Date().toISOString(),
    };

    await this.saveSession(updatedSession);
    return updatedSession;
  }

  async advanceStep(
    telegramUserId: number,
    nextStep: SessionStep,
    dataUpdates?: Partial<SessionData>,
  ): Promise<OnboardingSession> {
    const session = await this.getSession(telegramUserId);
    if (!session) {
      throw new Error('Session not found');
    }

    const updatedSession: OnboardingSession = {
      ...session,
      current_step: nextStep,
      last_activity_at: new Date().toISOString(),
      data: {
        ...session.data,
        ...dataUpdates,
      },
    };

    await this.saveSession(updatedSession);
    return updatedSession;
  }

  async clearSession(telegramUserId: number): Promise<void> {
    const key = this.getSessionKey(telegramUserId);
    await this.cacheManager.del(key);
  }

  async checkTimeout(telegramUserId: number): Promise<boolean> {
    const session = await this.getSession(telegramUserId);
    if (!session) {
      return true; // Session doesn't exist, consider it timed out
    }

    const lastActivity = new Date(session.last_activity_at);
    const now = new Date();
    const diffInSeconds = (now.getTime() - lastActivity.getTime()) / 1000;

    return diffInSeconds > this.SESSION_TTL;
  }

  private async saveSession(session: OnboardingSession): Promise<void> {
    const key = this.getSessionKey(session.telegram_user_id);
    await this.cacheManager.set(key, session, this.SESSION_TTL * 1000);
  }

  private getSessionKey(telegramUserId: number): string {
    return `${this.SESSION_KEY_PREFIX}${telegramUserId}`;
  }
}
