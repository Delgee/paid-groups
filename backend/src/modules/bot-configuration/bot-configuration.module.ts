import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { BotConfiguration } from './entities/bot-configuration.entity';
import { BotConfigurationService } from './services/bot-configuration.service';
import { BotConfigurationController } from './bot-configuration.controller';
import { TelegramBotHandler } from './handlers/telegram-bot.handler';
import { MembershipPlanModule } from '../membership-plan/membership-plan.module';
import { PaymentModule } from '../payment/payment.module';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram-integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotConfiguration]),
    BullModule.registerQueue({
      name: 'membership',
    }),
    TelegramIntegrationModule,
    forwardRef(() => MembershipPlanModule),
    forwardRef(() => PaymentModule),
  ],
  controllers: [BotConfigurationController],
  providers: [BotConfigurationService, TelegramBotHandler],
  exports: [BotConfigurationService, TelegramBotHandler],
})
export class BotConfigurationModule {}
