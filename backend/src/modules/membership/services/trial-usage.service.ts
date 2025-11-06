import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TrialUsage } from '../entities/trial-usage.entity';
import { Member } from '../entities/member.entity';
import { Membership, MembershipStatus } from '../entities/membership.entity';
import { MembershipPlan } from '../../membership-plan/entities/membership-plan.entity';

/**
 * Trial Usage Service
 *
 * Manages trial period usage tracking:
 * - Checks if a member has already used a trial for a specific plan
 * - Creates trial usage records when trials are activated
 * - Finds expired trials that need to be processed
 * - Prevents trial reuse (one trial per member per plan)
 */
@Injectable()
export class TrialUsageService {
  private readonly logger = new Logger(TrialUsageService.name);

  constructor(
    @InjectRepository(TrialUsage)
    private readonly trialUsageRepository: Repository<TrialUsage>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

  /**
   * Check if a member has already used a trial for a specific membership plan
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param telegramUserId - Telegram user ID
   * @param membershipPlanId - Membership plan ID
   * @returns true if trial was already used, false otherwise
   */
  async hasUsedTrial(
    tenantId: string,
    telegramUserId: number,
    membershipPlanId: string,
  ): Promise<boolean> {
    // Find member by telegram_user_id
    const member = await this.memberRepository.findOne({
      where: {
        tenant_id: tenantId,
        telegram_user_id: telegramUserId,
      },
    });

    if (!member) {
      // If member doesn't exist yet, they haven't used a trial
      return false;
    }

    // Check if trial usage record exists
    const trialUsage = await this.trialUsageRepository.findOne({
      where: {
        tenant_id: tenantId,
        member_id: member.id,
        membership_plan_id: membershipPlanId,
      },
    });

    return !!trialUsage;
  }

  /**
   * Create a trial usage record when a member activates a trial
   *
   * @param tenantId - Tenant ID for multi-tenant isolation
   * @param memberId - Member ID
   * @param membershipPlanId - Membership plan ID
   * @param membershipId - The trial membership that was created
   * @param trialEndsAt - When the trial expires
   * @returns Created trial usage record
   * @throws ConflictException if member already used this trial
   */
  async createTrialUsage(
    tenantId: string,
    memberId: string,
    membershipPlanId: string,
    membershipId: string,
    trialEndsAt: Date,
  ): Promise<TrialUsage> {
    // Check for existing trial usage (should be prevented by unique constraint, but check anyway)
    const existing = await this.trialUsageRepository.findOne({
      where: {
        tenant_id: tenantId,
        member_id: memberId,
        membership_plan_id: membershipPlanId,
      },
    });

    if (existing) {
      throw new ConflictException({
        error: {
          code: 'TRIAL_ALREADY_USED',
          message: 'You have already used the trial for this membership plan.',
          details: {
            membership_plan_id: membershipPlanId,
            trial_used_at: existing.trial_started_at,
          },
        },
      });
    }

    // Create new trial usage record
    const trialUsage = this.trialUsageRepository.create({
      tenant_id: tenantId,
      member_id: memberId,
      membership_plan_id: membershipPlanId,
      membership_id: membershipId,
      trial_started_at: new Date(),
      trial_ends_at: trialEndsAt,
    });

    const saved = await this.trialUsageRepository.save(trialUsage);

    this.logger.log(
      `Trial usage created for member ${memberId}, plan ${membershipPlanId}, expires ${trialEndsAt.toISOString()}`,
    );

    return saved;
  }

  /**
   * Find all expired trials that need to be processed
   *
   * @param tenantId - Optional tenant ID to filter by tenant
   * @param limit - Maximum number of expired trials to return (default: 100)
   * @returns Array of expired trial usage records with membership relations
   */
  async findExpiredTrials(
    tenantId?: string,
    limit: number = 100,
  ): Promise<TrialUsage[]> {
    const query = this.trialUsageRepository
      .createQueryBuilder('trial_usage')
      .leftJoinAndSelect('trial_usage.membership', 'membership')
      .leftJoinAndSelect('trial_usage.member', 'member')
      .leftJoinAndSelect('trial_usage.membership_plan', 'membership_plan')
      .leftJoinAndSelect('membership_plan.group_associations', 'group_associations')
      .leftJoinAndSelect('group_associations.telegram_group', 'telegram_groups')
      .where('trial_usage.trial_ends_at < :now', { now: new Date() })
      .andWhere('membership.status = :status', { status: MembershipStatus.TRIAL })
      .orderBy('trial_usage.trial_ends_at', 'ASC')
      .take(limit);

    if (tenantId) {
      query.andWhere('trial_usage.tenant_id = :tenantId', { tenantId });
    }

    return query.getMany();
  }

  /**
   * Get trial usage statistics for a member
   *
   * @param tenantId - Tenant ID
   * @param memberId - Member ID
   * @returns Array of trial usage records
   */
  async getMemberTrialHistory(
    tenantId: string,
    memberId: string,
  ): Promise<TrialUsage[]> {
    return this.trialUsageRepository.find({
      where: {
        tenant_id: tenantId,
        member_id: memberId,
      },
      relations: ['membership_plan', 'membership'],
      order: {
        trial_started_at: 'DESC',
      },
    });
  }

  /**
   * Get trial usage statistics for a membership plan
   *
   * @param tenantId - Tenant ID
   * @param membershipPlanId - Membership plan ID
   * @returns Count of trial usages
   */
  async getPlanTrialUsageCount(
    tenantId: string,
    membershipPlanId: string,
  ): Promise<number> {
    return this.trialUsageRepository.count({
      where: {
        tenant_id: tenantId,
        membership_plan_id: membershipPlanId,
      },
    });
  }
}
