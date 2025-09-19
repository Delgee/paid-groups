import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramGroupsController } from './telegram-groups.controller';
import { TelegramGroupsService } from './telegram-groups.service';
import { TelegramGroup } from './telegram-groups.entity';
import { TelegramBot } from '../bot/entities/telegram-bot.entity';
import { TelegramApiService } from '../bot/services/telegram-api.service';
import { TelegramChannelService } from '../../integrations/telegram/telegram-channel.service';
import { TelegramSyncService } from '../../integrations/telegram/telegram-sync.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramGroup, TelegramBot]),
  ],
  controllers: [TelegramGroupsController],
  providers: [
    TelegramGroupsService,
    TelegramApiService,
    TelegramChannelService,
    TelegramSyncService,
  ],
  exports: [
    TelegramGroupsService,
    TelegramApiService,
    TelegramChannelService,
    TelegramSyncService,
  ],
})
export class TelegramGroupsModule {}