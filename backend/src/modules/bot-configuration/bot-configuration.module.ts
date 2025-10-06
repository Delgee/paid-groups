import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotConfiguration } from './entities/bot-configuration.entity';
import { BotConfigurationService } from './services/bot-configuration.service';
import { BotConfigurationController } from './bot-configuration.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BotConfiguration])],
  controllers: [BotConfigurationController],
  providers: [BotConfigurationService],
  exports: [BotConfigurationService],
})
export class BotConfigurationModule {}
