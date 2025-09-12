import { Module, forwardRef } from '@nestjs/common';
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
import { TelegramBot } from '../bot/entities/telegram-bot.entity';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, Membership, MembershipPlan, TelegramBot]),
    forwardRef(() => BotModule),
  ],
  controllers: [MemberController, MembershipController, MembershipPlanController],
  providers: [MemberService, MembershipService, MembershipPlanService, MembershipExpirationJob],
  exports: [MemberService, MembershipService, MembershipPlanService],
})
export class MembershipModule {}