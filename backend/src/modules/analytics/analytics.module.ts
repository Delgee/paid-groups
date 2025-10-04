import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Payment } from '../payment/entities/payment.entity';
import { Membership } from '../membership/entities/membership.entity';
import { Member } from '../membership/entities/member.entity';
import { MembershipPlan } from '../membership/entities/membership-plan.entity';
import { TelegramGroup } from '../telegram-groups/telegram-groups.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Membership,
      Member,
      MembershipPlan,
      TelegramGroup,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
