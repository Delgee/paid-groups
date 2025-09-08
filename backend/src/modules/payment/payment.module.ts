import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookController } from './webhook.controller';
import { Payment } from './entities/payment.entity';
import { Member } from '../membership/entities/member.entity';
import { Membership } from '../membership/entities/membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Member, Membership])],
  controllers: [WebhookController],
  providers: [],
  exports: [],
})
export class PaymentModule {}