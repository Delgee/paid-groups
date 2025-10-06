import { PartialType } from '@nestjs/swagger';
import { CreateMembershipPlanDto } from './create-membership-plan.dto';
import { OmitType } from '@nestjs/swagger';

export class UpdateMembershipPlanDto extends PartialType(
  OmitType(CreateMembershipPlanDto, ['bot_configuration_id'] as const),
) {}
