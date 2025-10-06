import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipPlan } from '../entities/membership-plan.entity';
import { CreateMembershipPlanDto } from '../dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from '../dto/update-membership-plan.dto';
import { BotConfigurationService } from '../../bot-configuration/services/bot-configuration.service';

@Injectable()
export class MembershipPlanService {
  private readonly logger = new Logger(MembershipPlanService.name);

  constructor(
    @InjectRepository(MembershipPlan)
    private readonly membershipPlanRepository: Repository<MembershipPlan>,
    private readonly botConfigurationService: BotConfigurationService,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateMembershipPlanDto,
  ): Promise<MembershipPlan> {
    this.logger.log(`Creating membership plan for tenant ${tenantId}`);

    // Verify bot configuration exists and belongs to tenant
    await this.botConfigurationService.findOne(tenantId, createDto.bot_configuration_id);

    const membershipPlan = this.membershipPlanRepository.create({
      ...createDto,
      tenant_id: tenantId,
    });

    const saved = await this.membershipPlanRepository.save(membershipPlan);
    this.logger.log(`Membership plan created: ${saved.id}`);

    return saved;
  }

  async findAll(
    tenantId: string,
    filters?: {
      bot_configuration_id?: string;
      is_active?: boolean;
    },
  ): Promise<MembershipPlan[]> {
    this.logger.log(`Fetching membership plans for tenant ${tenantId}`);

    const where: any = { tenant_id: tenantId };

    if (filters?.bot_configuration_id) {
      where.bot_configuration_id = filters.bot_configuration_id;
    }

    if (filters?.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    return this.membershipPlanRepository.find({
      where,
      order: { sort_order: 'ASC', created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<MembershipPlan> {
    this.logger.log(`Fetching membership plan ${id} for tenant ${tenantId}`);

    const membershipPlan = await this.membershipPlanRepository.findOne({
      where: { id, tenant_id: tenantId },
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

  async findActiveByBot(
    tenantId: string,
    botConfigurationId: string,
  ): Promise<MembershipPlan[]> {
    return this.findAll(tenantId, {
      bot_configuration_id: botConfigurationId,
      is_active: true,
    });
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateMembershipPlanDto,
  ): Promise<MembershipPlan> {
    this.logger.log(`Updating membership plan ${id} for tenant ${tenantId}`);

    const membershipPlan = await this.findOne(tenantId, id);

    Object.assign(membershipPlan, updateDto);
    const updated = await this.membershipPlanRepository.save(membershipPlan);

    this.logger.log(`Membership plan updated: ${id}`);
    return updated;
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
}
