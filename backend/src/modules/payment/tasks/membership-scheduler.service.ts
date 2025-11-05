import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MembershipService } from '../../membership/services/membership.service';

@Injectable()
export class MembershipSchedulerService {
  private readonly logger = new Logger(MembershipSchedulerService.name);

  constructor(
    private readonly membershipService: MembershipService,
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
      const memberships = await this.membershipService.findMembershipsNeedingRenewalReminder();

      this.logger.log(`Found ${memberships.length} memberships needing renewal reminders`);

      for (const membership of memberships) {
        await this.membershipQueue.add('send-renewal-reminder', {
          tenantId: membership.tenant_id,
          membershipId: membership.id,
          telegramUserId: membership.member.telegram_user_id,
          groupId: membership.group_id,
          expiresAt: membership.expires_at,
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
      }

      this.logger.log(`Queued ${memberships.length} renewal reminder jobs`);
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
      const expiredMemberships = await this.membershipService.findExpiredMemberships();

      this.logger.log(`Found ${expiredMemberships.length} expired memberships`);

      for (const membership of expiredMemberships) {
        await this.membershipQueue.add('expire-membership', {
          tenantId: membership.tenant_id,
          membershipId: membership.id,
          telegramUserId: membership.member.telegram_user_id,
          groupId: membership.group_id,
        }, {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        });
      }

      this.logger.log(`Queued ${expiredMemberships.length} expire-membership jobs`);
    } catch (error) {
      this.logger.error('Failed to check expired memberships', error.stack);
    }
  }
}
