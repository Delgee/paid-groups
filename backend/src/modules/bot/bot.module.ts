import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotController } from './bot.controller';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramApiService } from './services/telegram-api.service';
import { TelegramBot } from './entities/telegram-bot.entity';
import { TelegramGroup } from './entities/telegram-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramBot, TelegramGroup])],
  controllers: [BotController],
  providers: [TelegramBotService, TelegramApiService],
  exports: [TelegramBotService, TelegramApiService],
})
export class BotModule {}