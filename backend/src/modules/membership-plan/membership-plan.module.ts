import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipPlan } from './entities/membership-plan.entity';
import { MembershipPlanGroup } from './entities/membership-plan-group.entity';
import { TelegramGroup } from '../telegram-groups/telegram-groups.entity';
import { MembershipPlanService } from './services/membership-plan.service';
import { MembershipPlanController } from './membership-plan.controller';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MembershipPlan, MembershipPlanGroup, TelegramGroup]),
    forwardRef(() => ProjectModule),
  ],
  controllers: [MembershipPlanController],
  providers: [MembershipPlanService],
  exports: [MembershipPlanService],
})
export class MembershipPlanModule {}
