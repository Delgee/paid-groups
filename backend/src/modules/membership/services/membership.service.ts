import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { Membership, MembershipStatus } from '../entities/membership.entity';
import { Member } from '../entities/member.entity';
import { MembershipPlan } from '../entities/membership-plan.entity';

export interface CreateMembershipDto {
  member_id: string;
  group_id: string;
  plan_id: string;
  starts_at?: Date;
  expires_at?: Date;
  auto_renew?: boolean;
}

export interface UpdateMembershipDto {
  status?: MembershipStatus;
  expires_at?: Date;
  auto_renew?: boolean;
}

@Injectable()
export class MembershipService {
  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MembershipPlan)
    private planRepository: Repository<MembershipPlan>,
  ) {}

  async create(tenantId: string, createMembershipDto: CreateMembershipDto): Promise<Membership> {
    // Verify member belongs to tenant
    const member = await this.memberRepository.findOne({
      where: { id: createMembershipDto.member_id, tenant_id: tenantId },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Verify plan exists and belongs to tenant
    const plan = await this.planRepository.findOne({
      where: { id: createMembershipDto.plan_id, tenant_id: tenantId },
    });

    if (!plan) {
      throw new NotFoundException('Membership plan not found');
    }

    // Check for existing active membership for same member/group
    const existing = await this.membershipRepository.findOne({
      where: {
        member_id: createMembershipDto.member_id,
        group_id: createMembershipDto.group_id,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new BadRequestException('Member already has active membership for this group');
    }

    // Calculate default dates
    const startsAt = createMembershipDto.starts_at || new Date();
    const expiresAt = createMembershipDto.expires_at || this.calculateExpirationDate(plan.duration_days);

    const membership = this.membershipRepository.create({
      tenant_id: tenantId,
      member_id: createMembershipDto.member_id,
      group_id: createMembershipDto.group_id,
      plan_id: createMembershipDto.plan_id,
      status: MembershipStatus.ACTIVE,
      starts_at: startsAt,
      expires_at: expiresAt,
      auto_renew: createMembershipDto.auto_renew || false,
    });

    return this.membershipRepository.save(membership);
  }

  async findAllByTenant(tenantId: string): Promise<Membership[]> {
    return this.membershipRepository.find({
      where: { tenant_id: tenantId },
      relations: ['member', 'plan'],
      order: { created_at: 'DESC' },
    });
  }

  async findByMember(tenantId: string, memberId: string): Promise<Membership[]> {
    return this.membershipRepository.find({
      where: { 
        member_id: memberId, 
        tenant_id: tenantId 
      },
      relations: ['plan'],
      order: { created_at: 'DESC' },
    });
  }

  async findByGroup(tenantId: string, groupId: string): Promise<Membership[]> {
    return this.membershipRepository.find({
      where: { 
        group_id: groupId, 
        tenant_id: tenantId 
      },
      relations: ['member', 'plan'],
      order: { created_at: 'DESC' },
    });
  }

  async findActiveByGroup(tenantId: string, groupId: string): Promise<Membership[]> {
    return this.membershipRepository.find({
      where: { 
        group_id: groupId, 
        tenant_id: tenantId,
        status: MembershipStatus.ACTIVE,
      },
      relations: ['member', 'plan'],
      order: { expires_at: 'ASC' },
    });
  }

  async findById(tenantId: string, membershipId: string): Promise<Membership> {
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId, tenant_id: tenantId },
      relations: ['member', 'plan'],
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  async update(
    tenantId: string,
    membershipId: string,
    updateMembershipDto: UpdateMembershipDto
  ): Promise<Membership> {
    const membership = await this.findById(tenantId, membershipId);
    
    Object.assign(membership, updateMembershipDto);
    
    return this.membershipRepository.save(membership);
  }

  async cancel(tenantId: string, membershipId: string): Promise<Membership> {
    return this.update(tenantId, membershipId, {
      status: MembershipStatus.CANCELLED,
      auto_renew: false,
    });
  }

  async suspend(tenantId: string, membershipId: string): Promise<Membership> {
    return this.update(tenantId, membershipId, {
      status: MembershipStatus.SUSPENDED,
    });
  }

  async reactivate(tenantId: string, membershipId: string): Promise<Membership> {
    const membership = await this.findById(tenantId, membershipId);
    
    // Check if membership hasn't expired
    if (membership.expires_at <= new Date()) {
      throw new BadRequestException('Cannot reactivate expired membership');
    }

    return this.update(tenantId, membershipId, {
      status: MembershipStatus.ACTIVE,
    });
  }

  async extend(
    tenantId: string, 
    membershipId: string, 
    additionalDays: number
  ): Promise<Membership> {
    const membership = await this.findById(tenantId, membershipId);
    
    const newExpiresAt = new Date(membership.expires_at);
    newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);

    return this.update(tenantId, membershipId, {
      expires_at: newExpiresAt,
      status: MembershipStatus.ACTIVE, // Reactivate if needed
    });
  }

  async getExpiringMemberships(
    tenantId: string, 
    daysAhead: number = 7
  ): Promise<Membership[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return this.membershipRepository.find({
      where: {
        tenant_id: tenantId,
        status: MembershipStatus.ACTIVE,
        expires_at: Between(now, futureDate),
      },
      relations: ['member', 'plan'],
      order: { expires_at: 'ASC' },
    });
  }

  async markExpired(): Promise<{ updated: number }> {
    const expiredMemberships = await this.membershipRepository.find({
      where: {
        status: MembershipStatus.ACTIVE,
        expires_at: LessThan(new Date()),
      },
    });

    if (expiredMemberships.length === 0) {
      return { updated: 0 };
    }

    await this.membershipRepository.update(
      { 
        status: MembershipStatus.ACTIVE,
        expires_at: LessThan(new Date()),
      },
      { 
        status: MembershipStatus.EXPIRED 
      }
    );

    return { updated: expiredMemberships.length };
  }

  async getMembershipStats(tenantId: string): Promise<{
    total: number;
    active: number;
    expired: number;
    cancelled: number;
    suspended: number;
    trial: number;
    expiring_soon: number;
  }> {
    const total = await this.membershipRepository.count({
      where: { tenant_id: tenantId },
    });

    const active = await this.membershipRepository.count({
      where: { tenant_id: tenantId, status: MembershipStatus.ACTIVE },
    });

    const expired = await this.membershipRepository.count({
      where: { tenant_id: tenantId, status: MembershipStatus.EXPIRED },
    });

    const cancelled = await this.membershipRepository.count({
      where: { tenant_id: tenantId, status: MembershipStatus.CANCELLED },
    });

    const suspended = await this.membershipRepository.count({
      where: { tenant_id: tenantId, status: MembershipStatus.SUSPENDED },
    });

    const trial = await this.membershipRepository.count({
      where: { tenant_id: tenantId, status: MembershipStatus.TRIAL },
    });

    const expiringSoon = (await this.getExpiringMemberships(tenantId, 7)).length;

    return {
      total,
      active,
      expired,
      cancelled,
      suspended,
      trial,
      expiring_soon: expiringSoon,
    };
  }

  private calculateExpirationDate(durationDays: number): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    return expiresAt;
  }

  /**
   * Check if member has valid membership for a specific group
   */
  async hasValidMembershipForGroup(memberId: string, groupId: string): Promise<boolean> {
    const membership = await this.membershipRepository.findOne({
      where: {
        member_id: memberId,
        group_id: groupId,
        status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      return false;
    }

    // Check if not expired
    if (membership.expires_at && new Date() > membership.expires_at) {
      return false;
    }

    return true;
  }

  /**
   * Get active memberships for a member
   */
  async getActiveMembershipsForMember(memberId: string): Promise<Membership[]> {
    return await this.membershipRepository.find({
      where: {
        member_id: memberId,
        status: MembershipStatus.ACTIVE,
      },
      relations: ['plan', 'group', 'member'],
    });
  }

  /**
   * Get active membership plans for a tenant
   */
  async getActivePlansForTenant(tenantId: string): Promise<any[]> {
    // This would be implemented by the MembershipPlanService
    // For now, return empty array
    return [];
  }
}