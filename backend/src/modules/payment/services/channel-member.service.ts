import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { ChannelMember, MembershipStatus } from '../entities/channel-member.entity';
import { CreateChannelMemberDto } from '../dto/create-channel-member.dto';
import { UpdateChannelMemberDto } from '../dto/update-channel-member.dto';

@Injectable()
export class ChannelMemberService {
  private readonly logger = new Logger(ChannelMemberService.name);

  constructor(
    @InjectRepository(ChannelMember)
    private readonly channelMemberRepository: Repository<ChannelMember>,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateChannelMemberDto,
  ): Promise<ChannelMember> {
    this.logger.log(`Creating channel member for tenant ${tenantId}`);

    const channelMember = this.channelMemberRepository.create({
      ...createDto,
      tenant_id: tenantId,
      expires_at: new Date(createDto.expires_at),
      joined_at: createDto.joined_at ? new Date(createDto.joined_at) : undefined,
    });

    const saved = await this.channelMemberRepository.save(channelMember);
    this.logger.log(`Channel member created: ${saved.id}`);

    return saved;
  }

  async findOne(tenantId: string, id: string): Promise<ChannelMember> {
    this.logger.log(`Fetching channel member ${id} for tenant ${tenantId}`);

    const channelMember = await this.channelMemberRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!channelMember) {
      throw new NotFoundException({
        error: {
          code: 'CHANNEL_MEMBER_NOT_FOUND',
          message: 'Channel member not found',
        },
      });
    }

    return channelMember;
  }

  async findByPaymentTransaction(
    tenantId: string,
    paymentTransactionId: string,
  ): Promise<ChannelMember | null> {
    return this.channelMemberRepository.findOne({
      where: {
        payment_transaction_id: paymentTransactionId,
        tenant_id: tenantId,
      },
    });
  }

  async findByTelegramUser(
    tenantId: string,
    telegramUserId: string,
    channelId: string,
  ): Promise<ChannelMember | null> {
    return this.channelMemberRepository.findOne({
      where: {
        telegram_user_id: telegramUserId,
        channel_id: channelId,
        tenant_id: tenantId,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  async findAll(
    tenantId: string,
    filters?: {
      bot_configuration_id?: string;
      channel_id?: string;
      status?: MembershipStatus;
    },
  ): Promise<ChannelMember[]> {
    this.logger.log(`Fetching channel members for tenant ${tenantId}`);

    const where: any = { tenant_id: tenantId };

    if (filters?.bot_configuration_id) {
      where.bot_configuration_id = filters.bot_configuration_id;
    }

    if (filters?.channel_id) {
      where.channel_id = filters.channel_id;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.channelMemberRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateChannelMemberDto,
  ): Promise<ChannelMember> {
    this.logger.log(`Updating channel member ${id} for tenant ${tenantId}`);

    const channelMember = await this.findOne(tenantId, id);

    // Convert date strings to Date objects
    if (updateDto.joined_at) {
      channelMember.joined_at = new Date(updateDto.joined_at);
    }
    if (updateDto.expires_at) {
      channelMember.expires_at = new Date(updateDto.expires_at);
    }
    if (updateDto.removed_at) {
      channelMember.removed_at = new Date(updateDto.removed_at);
    }
    if (updateDto.renewal_reminder_sent_at) {
      channelMember.renewal_reminder_sent_at = new Date(updateDto.renewal_reminder_sent_at);
    }

    Object.assign(channelMember, {
      invite_link: updateDto.invite_link,
      status: updateDto.status,
    });

    const updated = await this.channelMemberRepository.save(channelMember);
    this.logger.log(`Channel member updated: ${id}`);

    return updated;
  }

  async markAsJoined(
    tenantId: string,
    id: string,
  ): Promise<ChannelMember> {
    this.logger.log(`Marking channel member ${id} as joined`);

    const channelMember = await this.findOne(tenantId, id);
    channelMember.joined_at = new Date();

    return this.channelMemberRepository.save(channelMember);
  }

  async markAsExpired(
    tenantId: string,
    id: string,
  ): Promise<ChannelMember> {
    this.logger.log(`Marking channel member ${id} as expired`);

    const channelMember = await this.findOne(tenantId, id);
    channelMember.status = MembershipStatus.EXPIRED;
    channelMember.removed_at = new Date();

    return this.channelMemberRepository.save(channelMember);
  }

  async markAsRevoked(
    tenantId: string,
    id: string,
  ): Promise<ChannelMember> {
    this.logger.log(`Marking channel member ${id} as revoked`);

    const channelMember = await this.findOne(tenantId, id);
    channelMember.status = MembershipStatus.REVOKED;
    channelMember.removed_at = new Date();

    return this.channelMemberRepository.save(channelMember);
  }

  /**
   * Find members whose membership is about to expire (within 3 days)
   * and haven't received a renewal reminder yet
   */
  async findMembersNeedingRenewalReminder(): Promise<ChannelMember[]> {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    return this.channelMemberRepository.find({
      where: {
        status: MembershipStatus.ACTIVE,
        expires_at: LessThan(threeDaysFromNow),
        renewal_reminder_sent_at: IsNull(),
      },
      order: { expires_at: 'ASC' },
    });
  }

  /**
   * Find members whose membership has expired but status is still active
   */
  async findExpiredMembers(): Promise<ChannelMember[]> {
    const now = new Date();

    return this.channelMemberRepository.find({
      where: {
        status: MembershipStatus.ACTIVE,
        expires_at: LessThan(now),
      },
      order: { expires_at: 'ASC' },
    });
  }

  async recordRenewalReminderSent(
    tenantId: string,
    id: string,
  ): Promise<ChannelMember> {
    this.logger.log(`Recording renewal reminder sent for member ${id}`);

    const channelMember = await this.findOne(tenantId, id);
    channelMember.renewal_reminder_sent_at = new Date();

    return this.channelMemberRepository.save(channelMember);
  }
}
