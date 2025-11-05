import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../entities/member.entity';

export interface CreateMemberDto {
  telegram_user_id: number;
  telegram_username?: string;
  username?: string;
  first_name: string;
  last_name?: string;
  phone_number?: string;
  is_bot?: boolean;
  tenant_id?: string;
}

export interface CreateOrUpdateMemberDto {
  telegram_user_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  is_bot?: boolean;
  tenant_id: string;
}

export interface UpdateMemberDto {
  telegram_username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
  ) {}

  async create(
    tenantId: string,
    createMemberDto: CreateMemberDto,
  ): Promise<Member> {
    const member = this.memberRepository.create({
      telegram_user_id: createMemberDto.telegram_user_id,
      username: createMemberDto.telegram_username,
      first_name: createMemberDto.first_name,
      last_name: createMemberDto.last_name,
      phone_number: createMemberDto.phone_number,
      tenant_id: tenantId,
    });

    return this.memberRepository.save(member);
  }

  async findAllByTenant(tenantId: string): Promise<Member[]> {
    return this.memberRepository.find({
      where: { tenant_id: tenantId },
      relations: ['memberships'],
      order: { created_at: 'DESC' },
    });
  }

  async findById(tenantId: string, memberId: string): Promise<Member> {
    const member = await this.memberRepository.findOne({
      where: { id: memberId, tenant_id: tenantId },
      relations: ['memberships', 'memberships.group', 'memberships.plan'],
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    return member;
  }

  async findByTelegramId(
    tenantId: string,
    telegramUserId: number,
  ): Promise<Member | null> {
    return this.memberRepository.findOne({
      where: { telegram_user_id: telegramUserId, tenant_id: tenantId },
      relations: ['memberships'],
    });
  }

  async findByUsername(
    tenantId: string,
    username: string,
  ): Promise<Member | null> {
    return this.memberRepository.findOne({
      where: { username: username, tenant_id: tenantId },
      relations: ['memberships'],
    });
  }

  async update(
    tenantId: string,
    memberId: string,
    updateMemberDto: UpdateMemberDto,
  ): Promise<Member> {
    const member = await this.findById(tenantId, memberId);
    Object.assign(member, updateMemberDto);
    return this.memberRepository.save(member);
  }

  async delete(tenantId: string, memberId: string): Promise<void> {
    const member = await this.findById(tenantId, memberId);
    await this.memberRepository.remove(member);
  }

  async getActiveMembers(tenantId: string): Promise<Member[]> {
    const members = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.memberships', 'membership')
      .where('member.tenant_id = :tenantId', { tenantId })
      .andWhere('membership.status = :status', { status: 'active' })
      .andWhere('membership.expires_at > :now', { now: new Date() })
      .getMany();

    return members;
  }

  async getMemberStats(tenantId: string): Promise<{
    total: number;
    active: number;
    expired: number;
    trial: number;
  }> {
    const totalQuery = await this.memberRepository
      .createQueryBuilder('member')
      .where('member.tenant_id = :tenantId', { tenantId })
      .getCount();

    const activeQuery = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoin('member.memberships', 'membership')
      .where('member.tenant_id = :tenantId', { tenantId })
      .andWhere('membership.status = :status', { status: 'active' })
      .andWhere('membership.expires_at > :now', { now: new Date() })
      .getCount();

    const expiredQuery = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoin('member.memberships', 'membership')
      .where('member.tenant_id = :tenantId', { tenantId })
      .andWhere('membership.status = :status', { status: 'expired' })
      .getCount();

    const trialQuery = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoin('member.memberships', 'membership')
      .where('member.tenant_id = :tenantId', { tenantId })
      .andWhere('membership.status = :status', { status: 'trial' })
      .getCount();

    return {
      total: totalQuery,
      active: activeQuery,
      expired: expiredQuery,
      trial: trialQuery,
    };
  }

  /**
   * Create or update member (for webhook processing)
   */
  async createOrUpdateMember(data: CreateOrUpdateMemberDto): Promise<Member> {
    // Try to find existing member
    const existingMember = await this.memberRepository.findOne({
      where: {
        telegram_user_id: data.telegram_user_id,
        tenant_id: data.tenant_id,
      },
    });

    if (existingMember) {
      // Update existing member
      Object.assign(existingMember, {
        username: data.username || existingMember.username,
        first_name: data.first_name,
        last_name: data.last_name,
        is_bot: data.is_bot ?? existingMember.is_bot,
        updated_at: new Date(),
      });

      return await this.memberRepository.save(existingMember);
    } else {
      // Create new member
      const newMember = this.memberRepository.create({
        telegram_user_id: data.telegram_user_id,
        username: data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        is_bot: data.is_bot || false,
        tenant_id: data.tenant_id,
      });

      return await this.memberRepository.save(newMember);
    }
  }

  /**
   * Find member by Telegram user ID
   */
  async findByTelegramUserId(
    telegramUserId: number,
    tenantId: string,
  ): Promise<Member | null> {
    return await this.memberRepository.findOne({
      where: {
        telegram_user_id: telegramUserId,
        tenant_id: tenantId,
      },
      relations: ['memberships'],
    });
  }

  /**
   * Handle member leaving a group
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleMemberLeft(memberId: string, _chatId: number): Promise<void> {
    // Update member status or log the event
    // This could be extended to handle membership cleanup
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (member) {
      // You could update last_seen, log the event, etc.
      member.updated_at = new Date();
      await this.memberRepository.save(member);
    }
  }
}
