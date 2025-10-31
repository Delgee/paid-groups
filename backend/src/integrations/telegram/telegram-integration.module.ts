import { Module } from '@nestjs/common';
import { TelegramApiService } from './telegram-api.service';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramSyncService } from './telegram-sync.service';
import { TelegramBotHandlerService } from './telegram-bot-handler.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramGroup } from '../../modules/telegram-groups/telegram-groups.entity';

/**
 * TelegramIntegrationModule
 *
 * Centralized module for all Telegram Bot API integrations.
 * This module provides:
 * - TelegramApiService: Low-level Telegram Bot API wrapper with caching and rate limiting
 * - TelegramChannelService: High-level channel management operations
 * - TelegramSyncService: Group-to-channel synchronization operations
 * - TelegramBotHandlerService: Centralized bot instance management with long-polling
 *
 * All Telegram API interactions should go through this module for consistency.
 * Using Telegraf library instead of direct HTTP requests for type safety.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramGroup]),
  ],
  providers: [
    TelegramApiService,
    TelegramChannelService,
    TelegramSyncService,
    TelegramBotHandlerService,
  ],
  exports: [
    TelegramApiService,
    TelegramChannelService,
    TelegramSyncService,
    TelegramBotHandlerService,
  ],
})
export class TelegramIntegrationModule {}
