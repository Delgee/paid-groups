import { Module } from '@nestjs/common';
import { TelegramApiService } from './telegram-api.service';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramSyncService } from './telegram-sync.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramGroup } from '../../modules/telegram-groups/telegram-groups.entity';

/**
 * TelegramIntegrationModule
 *
 * Provides shared Telegram integration services for the application.
 * This module replaces the old BotModule and provides:
 * - TelegramApiService: Low-level Telegram Bot API wrapper with caching and rate limiting
 * - TelegramChannelService: High-level channel management operations
 * - TelegramSyncService: Group-to-channel synchronization operations
 *
 * Export this module from any module that needs to use Telegram API functionality.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramGroup]),
  ],
  providers: [
    TelegramApiService,
    TelegramChannelService,
    TelegramSyncService,
  ],
  exports: [
    TelegramApiService,
    TelegramChannelService,
    TelegramSyncService,
  ],
})
export class TelegramIntegrationModule {}
