import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberController } from './member.controller';
import { MembershipController } from './membership.controller';
import { MembershipPlanController } from './membership-plan.controller';
import { MemberService } from './services/member.service';
import { MembershipService } from './services/membership.service';
import { MembershipPlanService } from './services/membership-plan.service';
import { MembershipExpirationJob } from './jobs/membership-expiration.job';
import { Member } from './entities/member.entity';
import { Membership } from './entities/membership.entity';
import { MembershipPlan } from './entities/membership-plan.entity';
import { Project } from '../project/entities/project.entity';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram-integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, Membership, MembershipPlan, Project]),
    TelegramIntegrationModule,
  ],
  controllers: [MemberController, MembershipController, MembershipPlanController],
  providers: [MemberService, MembershipService, MembershipPlanService, MembershipExpirationJob],
  exports: [MemberService, MembershipService, MembershipPlanService],
})
export class MembershipModule {}