import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotController } from './bot.controller';
import { BotWebhookController } from './webhook.controller';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramApiService } from './services/telegram-api.service';
import { WebhookService } from './services/webhook.service';
import { TelegramBot } from './entities/telegram-bot.entity';
import { TelegramGroup } from './entities/telegram-group.entity';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramBot, TelegramGroup]),
    MembershipModule,
  ],
  controllers: [BotController, BotWebhookController],
  providers: [TelegramBotService, TelegramApiService, WebhookService],
  exports: [TelegramBotService, TelegramApiService, WebhookService],
})
export class BotModule {}