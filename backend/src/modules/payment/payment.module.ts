import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { PaymentController } from './payment.controller';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { ChannelMemberService } from './services/channel-member.service';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { ChannelMember } from './entities/channel-member.entity';
import { Project } from '../project/entities/project.entity';
import { MembershipPlanModule } from '../membership-plan/membership-plan.module';
import { MetricsModule } from '../../common/metrics/metrics.module';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram-integration.module';
import { QPayIntegrationModule } from '../../integrations/qpay/qpay-integration.module';
import { TenantModule } from '../tenant/tenant.module';
import { ProjectModule } from '../project/project.module';
import { MembershipProcessor } from './processors/membership.processor';
import { MembershipSchedulerService } from './tasks/membership-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTransaction, ChannelMember, Project]),
    BullModule.registerQueue({
      name: 'membership',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
    MembershipPlanModule,
    MetricsModule,
    TelegramIntegrationModule,
    QPayIntegrationModule,
    TenantModule,
    forwardRef(() => ProjectModule),
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