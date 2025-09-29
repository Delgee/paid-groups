import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BotController } from './bot.controller';
import { BotWebhookController } from './webhook.controller';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramApiService } from './services/telegram-api.service';
import { WebhookService } from './services/webhook.service';
import { BotValidationService } from './services/bot-validation.service';
import { BotHealthMonitorService } from './services/bot-health-monitor.service';
import { BotSecurityService } from './services/bot-security.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { TelegramBot } from './entities/telegram-bot.entity';
import { MembershipModule } from '../membership/membership.module';
import { TelegramGroupsModule } from '../telegram-groups/telegram-groups.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramBot]),
    ConfigModule,
    ScheduleModule.forRoot(),
    forwardRef(() => MembershipModule),
    forwardRef(() => TelegramGroupsModule),
  ],
  controllers: [BotController, BotWebhookController],
  providers: [
    TelegramBotService,
    TelegramApiService,
    WebhookService,
    BotValidationService,
    BotHealthMonitorService,
    BotSecurityService,
    EncryptionService,
  ],
  exports: [
    TelegramBotService,
    TelegramApiService,
    WebhookService,
    BotValidationService,
    BotHealthMonitorService,
    BotSecurityService,
    EncryptionService,
  ],
})
export class BotModule {}