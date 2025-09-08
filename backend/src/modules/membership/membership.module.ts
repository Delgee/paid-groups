import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberController } from './member.controller';
import { MemberService } from './services/member.service';
import { Member } from './entities/member.entity';
import { Membership } from './entities/membership.entity';
import { MembershipPlan } from './entities/membership-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Member, Membership, MembershipPlan])],
  controllers: [MemberController],
  providers: [MemberService],
  exports: [MemberService],
})
export class MembershipModule {}