import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipPlan } from '../entities/membership-plan.entity';

export interface CreateMembershipPlanDto {
  name: string;
  description?: string;
  price_mnt: number;
  duration_days: number;
  features?: Record<string, any>;
  is_active?: boolean;
}

export interface UpdateMembershipPlanDto {
  name?: string;
  description?: string;
  price_mnt?: number;
  duration_days?: number;
  features?: Record<string, any>;
  is_active?: boolean;
}

@Injectable()
export class MembershipPlanService {
  constructor(
    @InjectRepository(MembershipPlan)
    private planRepository: Repository<MembershipPlan>,
  ) {}

  async create(tenantId: string, createPlanDto: CreateMembershipPlanDto): Promise<MembershipPlan> {
    const plan = this.planRepository.create({
      ...createPlanDto,
      tenant_id: tenantId,
      is_active: createPlanDto.is_active !== false, // Default to true unless explicitly false
      features: createPlanDto.features || {},
    });

    return this.planRepository.save(plan);
  }

  async findAllByTenant(tenantId: string, includeInactive = false): Promise<MembershipPlan[]> {
    const where: any = { tenant_id: tenantId };
    
    if (!includeInactive) {
      where.is_active = true;
    }

    return this.planRepository.find({
      where,
      order: { price_mnt: 'ASC' },
    });
  }

  async findById(tenantId: string, planId: string): Promise<MembershipPlan> {
    const plan = await this.planRepository.findOne({
      where: { id: planId, tenant_id: tenantId },
    });

    if (!plan) {
      throw new NotFoundException(`Membership plan with ID ${planId} not found`);
    }

    return plan;
  }

  async update(
    tenantId: string,
    planId: string,
    updatePlanDto: UpdateMembershipPlanDto
  ): Promise<MembershipPlan> {
    const plan = await this.findById(tenantId, planId);
    
    Object.assign(plan, updatePlanDto);
    
    return this.planRepository.save(plan);
  }

  async deactivate(tenantId: string, planId: string): Promise<MembershipPlan> {
    return this.update(tenantId, planId, { is_active: false });
  }

  async activate(tenantId: string, planId: string): Promise<MembershipPlan> {
    return this.update(tenantId, planId, { is_active: true });
  }

  async delete(tenantId: string, planId: string): Promise<void> {
    const plan = await this.findById(tenantId, planId);
    
    // Check if plan has active memberships
    const activeMemberships = await this.planRepository.query(
      `SELECT COUNT(*) as count 
       FROM memberships 
       WHERE plan_id = $1 AND status = 'active'`,
      [planId]
    );

    if (activeMemberships[0].count > 0) {
      throw new Error('Cannot delete plan with active memberships. Deactivate it instead.');
    }

    await this.planRepository.remove(plan);
  }

  async getPlanStats(tenantId: string, planId: string): Promise<{
    total_memberships: number;
    active_memberships: number;
    total_revenue: number;
  }> {
    const plan = await this.findById(tenantId, planId);

    const stats = await this.planRepository.query(`
      SELECT 
        COUNT(m.id) as total_memberships,
        COUNT(CASE WHEN m.status = 'active' THEN 1 END) as active_memberships,
        COALESCE(SUM(p.amount_mnt), 0) as total_revenue
      FROM membership_plans mp
      LEFT JOIN memberships m ON mp.id = m.plan_id
      LEFT JOIN payments p ON m.id = p.membership_id AND p.status = 'completed'
      WHERE mp.id = $1 AND mp.tenant_id = $2
      GROUP BY mp.id
    `, [planId, tenantId]);

    if (stats.length === 0) {
      return {
        total_memberships: 0,
        active_memberships: 0,
        total_revenue: 0,
      };
    }

    return {
      total_memberships: parseInt(stats[0].total_memberships),
      active_memberships: parseInt(stats[0].active_memberships),
      total_revenue: parseFloat(stats[0].total_revenue),
    };
  }

  async getPopularPlans(tenantId: string): Promise<(MembershipPlan & { membership_count: number })[]> {
    const plans = await this.planRepository.query(`
      SELECT 
        mp.*,
        COUNT(m.id) as membership_count
      FROM membership_plans mp
      LEFT JOIN memberships m ON mp.id = m.plan_id
      WHERE mp.tenant_id = $1 AND mp.is_active = true
      GROUP BY mp.id
      ORDER BY membership_count DESC, mp.price_mnt ASC
    `, [tenantId]);

    return plans.map(plan => ({
      ...plan,
      membership_count: parseInt(plan.membership_count),
    }));
  }
}