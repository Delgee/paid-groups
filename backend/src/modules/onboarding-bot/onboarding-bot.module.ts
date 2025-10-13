import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { OnboardingBotController } from './onboarding-bot.controller';
import { OnboardingBotService } from './onboarding-bot.service';
import { OnboardingSessionService } from './onboarding-session.service';
import { TelegramUserAccountService } from './telegram-user-account.service';
import { BotCommandLogger } from './bot-command-logger.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramUserAccount } from './entities/telegram-user-account.entity';
import { BotCommand } from './entities/bot-command.entity';
import { RegistrationHandler } from './handlers/registration.handler';
import { HelpHandler } from './handlers/help.handler';
import { CancelHandler } from './handlers/cancel.handler';
import { User } from '../auth/entities/user.entity';
import { Tenant } from '../tenant/entities/tenant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramUserAccount, BotCommand, User, Tenant]),
    CacheModule.register(),
  ],
  controllers: [OnboardingBotController],
  providers: [
    OnboardingBotService,
    OnboardingSessionService,
    TelegramUserAccountService,
    BotCommandLogger,
    TelegramBotService,
    RegistrationHandler,
    HelpHandler,
    CancelHandler,
  ],
  exports: [OnboardingBotService, TelegramUserAccountService],
})
export class OnboardingBotModule {}
