import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUserAccount } from './entities/telegram-user-account.entity';

@Injectable()
export class TelegramUserAccountService {
  constructor(
    @InjectRepository(TelegramUserAccount)
    private readonly telegramUserAccountRepository: Repository<TelegramUserAccount>,
  ) {}

  async create(data: {
    user_id: string;
    telegram_user_id: number;
    telegram_chat_id?: number;
    telegram_username?: string;
    telegram_first_name?: string;
    telegram_last_name?: string;
    metadata?: Record<string, any>;
  }): Promise<TelegramUserAccount> {
    // Check for existing account
    const existing = await this.findByTelegramUserId(data.telegram_user_id);
    if (existing) {
      throw new ConflictException({
        error: {
          code: 'DUPLICATE_TELEGRAM_ACCOUNT',
          message: 'This Telegram account is already linked to another user.',
        },
      });
    }

    const telegramUserAccount = this.telegramUserAccountRepository.create({
      ...data,
      linked_at: new Date(),
      is_active: true,
    });

    return await this.telegramUserAccountRepository.save(telegramUserAccount);
  }

  async findByTelegramUserId(telegramUserId: number): Promise<TelegramUserAccount | null> {
    return await this.telegramUserAccountRepository.findOne({
      where: { telegram_user_id: telegramUserId },
      relations: ['user'],
    });
  }

  async findByUserId(userId: string): Promise<TelegramUserAccount | null> {
    return await this.telegramUserAccountRepository.findOne({
      where: { user_id: userId },
    });
  }

  async updateLastInteraction(telegramUserId: number): Promise<void> {
    await this.telegramUserAccountRepository.update(
      { telegram_user_id: telegramUserId },
      { last_interaction_at: new Date() },
    );
  }

  async deactivate(telegramUserId: number): Promise<void> {
    const account = await this.findByTelegramUserId(telegramUserId);
    if (!account) {
      throw new NotFoundException({
        error: {
          code: 'TELEGRAM_ACCOUNT_NOT_FOUND',
          message: 'Telegram account not found.',
        },
      });
    }

    await this.telegramUserAccountRepository.update(
      { telegram_user_id: telegramUserId },
      { is_active: false },
    );
  }
}
