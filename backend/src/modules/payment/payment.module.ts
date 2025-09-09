import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { PaymentController } from './payment.controller';
import { WebhookController } from './webhook.controller';
import { PaymentService } from './services/payment.service';
import { PaymentProcessor } from './processors/payment.processor';
import { Payment } from './entities/payment.entity';
import { Member } from '../membership/entities/member.entity';
import { Membership } from '../membership/entities/membership.entity';
import { MembershipPlan } from '../membership/entities/membership-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Member, Membership, MembershipPlan]),
    BullModule.registerQueue({
      name: 'payment-processing',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [PaymentController, WebhookController],
  providers: [PaymentService, PaymentProcessor],
  exports: [PaymentService],
})
export class PaymentModule {}