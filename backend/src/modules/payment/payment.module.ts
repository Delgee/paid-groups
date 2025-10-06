import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { MembershipPlanModule } from '../membership-plan/membership-plan.module';
import { BotConfigurationModule } from '../bot-configuration/bot-configuration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, ChannelMember]),
    MembershipPlanModule,
    BotConfigurationModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentTransactionService],
  exports: [PaymentTransactionService],
})
export class PaymentModule {}