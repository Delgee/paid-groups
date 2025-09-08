import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotController } from './bot.controller';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramBot } from './entities/telegram-bot.entity';
import { TelegramGroup } from './entities/telegram-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramBot, TelegramGroup])],
  controllers: [BotController],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class BotModule {}