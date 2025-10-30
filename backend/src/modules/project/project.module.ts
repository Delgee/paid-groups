import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Project } from './entities/project.entity';
import { ProjectService } from './services/project.service';
import { ProjectController } from './project.controller';
import { ProjectWebhookController } from './project-webhook.controller';
import { BotModule } from '../bot/bot.module';
import { ProjectWebhookService } from './services/project-webhook.service';
import { ProjectWebhookProcessorService } from './services/project-webhook-processor.service';
import { WebhookHealthCheckService } from './services/webhook-health-check.service';
import { ProjectSecurityService } from './services/project-security.service';
import { MessageTemplateService } from './services/message-template.service';
import { ProjectCommandHandlerService } from './services/project-command-handler.service';
import { ProjectHealthMonitorService } from './services/project-health-monitor.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    ConfigModule,
    ScheduleModule.forRoot(),
    BotModule,
  ],
  controllers: [ProjectController, ProjectWebhookController],
  providers: [
    ProjectService,
    ProjectWebhookService,
    ProjectWebhookProcessorService,
    WebhookHealthCheckService,
    ProjectSecurityService,
    MessageTemplateService,
    ProjectCommandHandlerService,
    ProjectHealthMonitorService,
    EncryptionService,
  ],
  exports: [
    ProjectService,
    ProjectWebhookService,
    ProjectSecurityService,
    MessageTemplateService,
    ProjectCommandHandlerService,
    ProjectHealthMonitorService,
  ],
})
export class ProjectModule {}
