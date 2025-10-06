import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ChannelMemberService } from '../services/channel-member.service';

@Injectable()
export class MembershipSchedulerService {
  private readonly logger = new Logger(MembershipSchedulerService.name);

  constructor(
    private readonly channelMemberService: ChannelMemberService,
    @InjectQueue('membership') private membershipQueue: Queue,
  ) {}

  /**
   * Check for memberships that need renewal reminders
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkRenewalReminders(): Promise<void> {
    this.logger.log('Checking for memberships needing renewal reminders');

    try {
      const members = await this.channelMemberService.findMembersNeedingRenewalReminder();

      this.logger.log(`Found ${members.length} members needing renewal reminders`);

      for (const member of members) {
        await this.membershipQueue.add('send-renewal-reminder', {
          tenantId: member.tenant_id,
          channelMemberId: member.id,
          telegramUserId: member.telegram_user_id,
          channelId: member.channel_id,
          expiresAt: member.expires_at,
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
      }

      this.logger.log(`Queued ${members.length} renewal reminder jobs`);
    } catch (error) {
      this.logger.error('Failed to check renewal reminders', error.stack);
    }
  }

  /**
   * Check for expired memberships
   * Runs every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkExpiredMemberships(): Promise<void> {
    this.logger.log('Checking for expired memberships');

    try {
      const expiredMembers = await this.channelMemberService.findExpiredMembers();

      this.logger.log(`Found ${expiredMembers.length} expired memberships`);

      for (const member of expiredMembers) {
        await this.membershipQueue.add('expire-membership', {
          tenantId: member.tenant_id,
          channelMemberId: member.id,
          telegramUserId: member.telegram_user_id,
          channelId: member.channel_id,
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
      }

      this.logger.log(`Queued ${expiredMembers.length} expire-membership jobs`);
    } catch (error) {
      this.logger.error('Failed to check expired memberships', error.stack);
    }
  }
}
