import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram-integration.module';
import { QPayIntegrationModule } from '../../integrations/qpay/qpay-integration.module';
import { Project } from '../project/entities/project.entity';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    TypeOrmModule.forFeature([Project]),
    TelegramIntegrationModule,
    QPayIntegrationModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}