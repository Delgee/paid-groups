import { PartialType } from '@nestjs/swagger';
import { CreateMembershipPlanDto } from './create-membership-plan.dto';
import { OmitType } from '@nestjs/swagger';

/**
 * Update Membership Plan DTO
 *
 * All fields are optional for updates.
 * project_id is omitted because plans cannot be moved between projects.
 * telegram_group_ids can be updated to add/remove groups from the plan.
 */
export class UpdateMembershipPlanDto extends PartialType(
  OmitType(CreateMembershipPlanDto, ['project_id'] as const),
) {}
