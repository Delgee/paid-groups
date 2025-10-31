import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Tenant,
  SubscriptionTier,
  SubscriptionStatus,
} from '../entities/tenant.entity';

export interface CreateTenantDto {
  name: string;
  company_name: string;
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  max_bots?: number;
  max_groups_per_bot?: number;
  max_members?: number;
  settings?: Record<string, any>;
}

export interface UpdateTenantDto {
  name?: string;
  company_name?: string;
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  max_bots?: number;
  max_groups_per_bot?: number;
  max_members?: number;
  settings?: Record<string, any>;
}

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      subscription_tier:
        createTenantDto.subscription_tier || SubscriptionTier.FREE,
      subscription_status:
        createTenantDto.subscription_status || SubscriptionStatus.ACTIVE,
      max_bots: createTenantDto.max_bots || 1,
      max_groups_per_bot: createTenantDto.max_groups_per_bot || 5,
      max_members: createTenantDto.max_members || 1000,
      settings: createTenantDto.settings || {},
    });

    return this.tenantRepository.save(tenant);
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findById(id);

    Object.assign(tenant, updateTenantDto);

    return this.tenantRepository.save(tenant);
  }

  async delete(id: string): Promise<void> {
    const tenant = await this.findById(id);
    await this.tenantRepository.remove(tenant);
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async findBySubscriptionStatus(
    status: SubscriptionStatus,
  ): Promise<Tenant[]> {
    return this.tenantRepository.find({
      where: { subscription_status: status },
    });
  }

  async updateSubscriptionStatus(
    id: string,
    status: SubscriptionStatus,
  ): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.subscription_status = status;
    return this.tenantRepository.save(tenant);
  }

  async updateSubscriptionTier(
    id: string,
    tier: SubscriptionTier,
  ): Promise<Tenant> {
    const tenant = await this.findById(id);
    tenant.subscription_tier = tier;

    // Update limits based on tier
    switch (tier) {
      case SubscriptionTier.FREE:
        tenant.max_bots = 1;
        tenant.max_groups_per_bot = 5;
        tenant.max_members = 1000;
        break;
      case SubscriptionTier.STARTER:
        tenant.max_bots = 3;
        tenant.max_groups_per_bot = 10;
        tenant.max_members = 5000;
        break;
      case SubscriptionTier.PRO:
        tenant.max_bots = 10;
        tenant.max_groups_per_bot = 25;
        tenant.max_members = 25000;
        break;
      case SubscriptionTier.ENTERPRISE:
        tenant.max_bots = -1; // unlimited
        tenant.max_groups_per_bot = -1; // unlimited
        tenant.max_members = -1; // unlimited
        break;
    }

    return this.tenantRepository.save(tenant);
  }

  async getTenantStats(tenantId: string): Promise<{
    total_projects: number;
    total_groups: number;
    total_members: number;
    active_memberships: number;
    total_revenue: number;
  }> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
      relations: [
        'telegram_bots',
        'telegram_groups',
        'members',
        'memberships',
        'payments',
        'projects',
      ],
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${tenantId} not found`);
    }

    const activeMemberships =
      tenant.memberships?.filter((m) => m.status === 'active').length || 0;
    const totalRevenue =
      tenant.payments
        ?.filter((p) => p.status === 'completed')
        .reduce((sum, payment) => sum + Number(payment.amount_mnt), 0) || 0;

    return {
      total_projects: tenant.projects?.length || 0,
      total_groups: tenant.telegram_groups?.length || 0,
      total_members: tenant.members?.length || 0,
      active_memberships: activeMemberships,
      total_revenue: totalRevenue,
    };
  }
}
