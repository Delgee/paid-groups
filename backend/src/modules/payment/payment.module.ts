import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { PaymentController } from './payment.controller';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { ChannelMemberService } from './services/channel-member.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { MembershipPlanModule } from '../membership-plan/membership-plan.module';
import { BotConfigurationModule } from '../bot-configuration/bot-configuration.module';
import { MembershipProcessor } from './processors/membership.processor';
import { MembershipSchedulerService } from './tasks/membership-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, ChannelMember]),
    BullModule.registerQueue({
      name: 'membership',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
    MembershipPlanModule,
    BotConfigurationModule,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentTransactionService,
    ChannelMemberService,
    MembershipProcessor,
    MembershipSchedulerService,
  ],
  exports: [PaymentTransactionService, ChannelMemberService],
})
export class PaymentModule {}