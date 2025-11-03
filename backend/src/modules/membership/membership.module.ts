import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberController } from './member.controller';
import { MembershipController } from './membership.controller';
import { MemberService } from './services/member.service';
import { MembershipService } from './services/membership.service';
import { TrialUsageService } from './services/trial-usage.service';
import { MembershipExpirationJob } from './jobs/membership-expiration.job';
import { TrialExpirationJob } from './jobs/trial-expiration.job';
import { Member } from './entities/member.entity';
import { Membership } from './entities/membership.entity';
import { TrialUsage } from './entities/trial-usage.entity';
import { MembershipPlan } from '../membership-plan/entities/membership-plan.entity';
import { Project } from '../project/entities/project.entity';
import { TelegramGroup } from '../telegram-groups/telegram-groups.entity';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram-integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, Membership, TrialUsage, MembershipPlan, Project, TelegramGroup]),
    TelegramIntegrationModule,
  ],
  controllers: [MemberController, MembershipController],
  providers: [MemberService, MembershipService, TrialUsageService, MembershipExpirationJob, TrialExpirationJob],
  exports: [MemberService, MembershipService, TrialUsageService],
})
export class MembershipModule {}