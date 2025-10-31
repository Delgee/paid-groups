import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelIdBotController } from './channel-id-bot.controller';
import { ChannelIdBotService } from './channel-id-bot.service';
import { BotCommand } from '../onboarding-bot/entities/bot-command.entity';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram-integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotCommand]),
    TelegramIntegrationModule,
  ],
  controllers: [ChannelIdBotController],
  providers: [ChannelIdBotService],
  exports: [ChannelIdBotService],
})
export class ChannelIdBotModule {}
