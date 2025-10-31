import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { MembershipPlan } from '../entities/membership-plan.entity';
import { MembershipPlanGroup } from '../entities/membership-plan-group.entity';
import { TelegramGroup } from '../../telegram-groups/telegram-groups.entity';
import { CreateMembershipPlanDto } from '../dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from '../dto/update-membership-plan.dto';
import { ProjectService } from '../../project/services/project.service';

@Injectable()
export class MembershipPlanService {
  private readonly logger = new Logger(MembershipPlanService.name);

  constructor(
    @InjectRepository(MembershipPlan)
    private readonly membershipPlanRepository: Repository<MembershipPlan>,
    @InjectRepository(MembershipPlanGroup)
    private readonly membershipPlanGroupRepository: Repository<MembershipPlanGroup>,
    @InjectRepository(TelegramGroup)
    private readonly telegramGroupRepository: Repository<TelegramGroup>,
    private readonly projectService: ProjectService,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateMembershipPlanDto,
  ): Promise<MembershipPlan> {
    this.logger.log(`Creating membership plan for tenant ${tenantId}`);

    // Verify project exists and belongs to tenant
    await this.projectService.findOne(tenantId, createDto.project_id);

    // Validate telegram groups if provided
    if (createDto.telegram_group_ids && createDto.telegram_group_ids.length > 0) {
      await this.validateTelegramGroups(tenantId, createDto.project_id, createDto.telegram_group_ids);
    }

    // Create membership plan
    const membershipPlan = this.membershipPlanRepository.create({
      name: createDto.name,
      description: createDto.description,
      price_mnt: createDto.price,
      duration_days: createDto.duration_days,
      is_active: createDto.is_active ?? true,
      tenant_id: tenantId,
      project_id: createDto.project_id,
    });

    const saved = await this.membershipPlanRepository.save(membershipPlan);

    // Create group associations if telegram_group_ids provided
    if (createDto.telegram_group_ids && createDto.telegram_group_ids.length > 0) {
      await this.syncGroupAssociations(saved.id, createDto.telegram_group_ids);
    }

    this.logger.log(`Membership plan created: ${saved.id} with ${createDto.telegram_group_ids?.length || 0} groups`);

    // Fetch with relations
    return this.findOne(tenantId, saved.id);
  }

  async findAll(
    tenantId: string,
    filters?: {
      project_id?: string;
      is_active?: boolean;
    },
  ): Promise<MembershipPlan[]> {
    this.logger.log(`Fetching membership plans for tenant ${tenantId}`);

    const where: any = { tenant_id: tenantId };

    if (filters?.project_id) {
      where.project_id = filters.project_id;
    }

    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    return this.membershipPlanRepository.find({
      where,
      relations: ['telegram_groups', 'project'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<MembershipPlan> {
    this.logger.log(`Fetching membership plan ${id} for tenant ${tenantId}`);

    const membershipPlan = await this.membershipPlanRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['telegram_groups', 'project'],
    });

    if (!membershipPlan) {
      throw new NotFoundException({
        error: {
          code: 'MEMBERSHIP_PLAN_NOT_FOUND',
          message: 'Membership plan not found',
        },
      });
    }

    return membershipPlan;
  }

  async findActiveByProject(
    tenantId: string,
    projectId: string,
  ): Promise<MembershipPlan[]> {
    return this.findAll(tenantId, {
      project_id: projectId,
      is_active: true,
    });
  }

  // Deprecated: Use findActiveByProject instead
  async findActiveByBot(
    tenantId: string,
    botConfigurationId: string,
  ): Promise<MembershipPlan[]> {
    // For backward compatibility during migration
    this.logger.warn('findActiveByBot is deprecated. Use findActiveByProject instead');
    return [];
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateMembershipPlanDto,
  ): Promise<MembershipPlan> {
    this.logger.log(`Updating membership plan ${id} for tenant ${tenantId}`);

    const membershipPlan = await this.findOne(tenantId, id);

    // Validate telegram groups if provided
    if (updateDto.telegram_group_ids) {
      await this.validateTelegramGroups(tenantId, membershipPlan.project_id, updateDto.telegram_group_ids);
    }

    // Update plan fields (excluding telegram_group_ids as it's not a direct field)
    const { telegram_group_ids, ...planUpdates } = updateDto;
    Object.assign(membershipPlan, planUpdates);
    const updated = await this.membershipPlanRepository.save(membershipPlan);

    // Update group associations if telegram_group_ids provided
    if (updateDto.telegram_group_ids !== undefined) {
      await this.syncGroupAssociations(id, updateDto.telegram_group_ids);
    }

    this.logger.log(`Membership plan updated: ${id}`);

    // Fetch with updated relations
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting membership plan ${id} for tenant ${tenantId}`);

    const membershipPlan = await this.findOne(tenantId, id);

    // Check if plan has active payments
    // TODO: Add check for active payments/members
    // if (hasActivePayments) {
    //   throw new BadRequestException({
    //     error: {
    //       code: 'PLAN_HAS_ACTIVE_MEMBERS',
    //       message: 'Cannot delete plan with active members',
    //     },
    //   });
    // }

    await this.membershipPlanRepository.remove(membershipPlan);
    this.logger.log(`Membership plan deleted: ${id}`);
  }

  /**
   * Get all groups associated with a membership plan
   */
  async findGroupsForPlan(planId: string): Promise<TelegramGroup[]> {
    const plan = await this.membershipPlanRepository.findOne({
      where: { id: planId },
      relations: ['telegram_groups'],
    });

    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    return plan.telegram_groups || [];
  }

  /**
   * Get all plans that grant access to a specific group
   */
  async findPlansForGroup(groupId: string, tenantId: string): Promise<MembershipPlan[]> {
    return this.membershipPlanRepository
      .createQueryBuilder('plan')
      .innerJoin('plan.telegram_groups', 'group')
      .where('group.id = :groupId', { groupId })
      .andWhere('plan.tenant_id = :tenantId', { tenantId })
      .andWhere('plan.is_active = :isActive', { isActive: true })
      .getMany();
  }

  /**
   * Validate that telegram groups exist, belong to tenant, and are in the same project
   */
  private async validateTelegramGroups(
    tenantId: string,
    projectId: string,
    groupIds: string[],
  ): Promise<void> {
    if (groupIds.length === 0) return;

    const groups = await this.telegramGroupRepository.find({
      where: {
        id: In(groupIds),
        tenant_id: tenantId,
        project_id: projectId,
        is_active: true,
      },
    });

    if (groups.length !== groupIds.length) {
      const foundIds = groups.map(g => g.id);
      const missingIds = groupIds.filter(id => !foundIds.includes(id));

      throw new BadRequestException({
        error: {
          code: 'INVALID_TELEGRAM_GROUPS',
          message: `The following group IDs are invalid or don't belong to this project: ${missingIds.join(', ')}`,
          details: { missingIds },
        },
      });
    }
  }

  /**
   * Sync group associations - replaces all existing associations
   */
  private async syncGroupAssociations(
    planId: string,
    groupIds: string[],
  ): Promise<void> {
    // Remove existing associations
    await this.membershipPlanGroupRepository.delete({
      membership_plan_id: planId,
    });

    // Create new associations
    if (groupIds.length > 0) {
      const associations = groupIds.map(groupId =>
        this.membershipPlanGroupRepository.create({
          membership_plan_id: planId,
          telegram_group_id: groupId,
        }),
      );

      await this.membershipPlanGroupRepository.save(associations);
    }

    this.logger.log(`Synced ${groupIds.length} group associations for plan ${planId}`);
  }

  /**
   * Get statistics for a specific membership plan
   */
  async getPlanStats(
    tenantId: string,
    planId: string,
  ): Promise<{
    total_memberships: number;
    active_memberships: number;
    total_revenue: number;
  }> {
    this.logger.log(`Getting stats for plan ${planId}`);

    // Verify plan exists and belongs to tenant
    await this.findOne(tenantId, planId);

    // Query payment_transactions and channel_members for stats
    const stats = await this.membershipPlanRepository.query(
      `
      SELECT
        COUNT(DISTINCT pt.id) as total_memberships,
        COUNT(DISTINCT CASE WHEN cm.status = 'active' THEN cm.id END) as active_memberships,
        COALESCE(SUM(CASE WHEN pt.status = 'completed' THEN pt.amount END), 0) as total_revenue
      FROM membership_plans mp
      LEFT JOIN payment_transactions pt ON mp.id = pt.membership_plan_id
      LEFT JOIN channel_members cm ON pt.id = cm.payment_transaction_id
      WHERE mp.id = $1 AND mp.tenant_id = $2
      GROUP BY mp.id
    `,
      [planId, tenantId],
    );

    if (stats.length === 0) {
      return {
        total_memberships: 0,
        active_memberships: 0,
        total_revenue: 0,
      };
    }

    return {
      total_memberships: parseInt(stats[0].total_memberships) || 0,
      active_memberships: parseInt(stats[0].active_memberships) || 0,
      total_revenue: parseFloat(stats[0].total_revenue) || 0,
    };
  }

  /**
   * Get popular membership plans ranked by usage
   */
  async getPopularPlans(
    tenantId: string,
  ): Promise<(MembershipPlan & { membership_count: number })[]> {
    this.logger.log(`Getting popular plans for tenant ${tenantId}`);

    const plans = await this.membershipPlanRepository.query(
      `
      SELECT
        mp.*,
        COUNT(DISTINCT pt.id) as membership_count
      FROM membership_plans mp
      LEFT JOIN payment_transactions pt ON mp.id = pt.membership_plan_id AND pt.status = 'completed'
      WHERE mp.tenant_id = $1 AND mp.is_active = true
      GROUP BY mp.id
      ORDER BY membership_count DESC, mp.price_mnt ASC
      LIMIT 10
    `,
      [tenantId],
    );

    return plans.map((plan) => ({
      ...plan,
      membership_count: parseInt(plan.membership_count) || 0,
    }));
  }
}
