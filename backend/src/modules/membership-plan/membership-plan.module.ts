import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipPlan } from './entities/membership-plan.entity';
import { MembershipPlanService } from './services/membership-plan.service';
import { MembershipPlanController } from './membership-plan.controller';
import { BotConfigurationModule } from '../bot-configuration/bot-configuration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MembershipPlan]),
    forwardRef(() => BotConfigurationModule),
  ],
  controllers: [MembershipPlanController],
  providers: [MembershipPlanService],
  exports: [MembershipPlanService],
})
export class MembershipPlanModule {}
