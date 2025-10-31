import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberController } from './member.controller';
import { MembershipController } from './membership.controller';
import { MemberService } from './services/member.service';
import { MembershipService } from './services/membership.service';
import { MembershipExpirationJob } from './jobs/membership-expiration.job';
import { Member } from './entities/member.entity';
import { Membership } from './entities/membership.entity';
import { Project } from '../project/entities/project.entity';
import { TelegramIntegrationModule } from '../../integrations/telegram/telegram-integration.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, Membership, Project]),
    TelegramIntegrationModule,
  ],
  controllers: [MemberController, MembershipController],
  providers: [MemberService, MembershipService, MembershipExpirationJob],
  exports: [MemberService, MembershipService],
})
export class MembershipModule {}