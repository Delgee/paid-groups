import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Project } from './entities/project.entity';
import { ProjectService } from './services/project.service';
import { ProjectController } from './project.controller';
import { BotModule } from '../bot/bot.module';
import { ProjectWebhookService } from './services/project-webhook.service';
import { WebhookHealthCheckService } from './services/webhook-health-check.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    ConfigModule,
    BotModule,
  ],
  controllers: [ProjectController],
  providers: [
    ProjectService,
    ProjectWebhookService,
    WebhookHealthCheckService,
    EncryptionService,
  ],
  exports: [ProjectService, ProjectWebhookService],
})
export class ProjectModule {}
