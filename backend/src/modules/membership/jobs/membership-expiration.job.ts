import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between } from 'typeorm';
import { Membership, MembershipStatus } from '../entities/membership.entity';
import { Member } from '../entities/member.entity';
import { MembershipPlan } from '../entities/membership-plan.entity';
import { TelegramApiService } from '../../../integrations/telegram/telegram-api.service';
import { Project } from '@/modules/project/entities/project.entity';

@Injectable()
export class MembershipExpirationJob {
  private readonly logger = new Logger(MembershipExpirationJob.name);

  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MembershipPlan)
    private planRepository: Repository<MembershipPlan>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private telegramApiService: TelegramApiService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleMembershipExpiration() {
    this.logger.log('Starting membership expiration check...');

    try {
      // Mark expired memberships
      const expiredResult = await this.markExpiredMemberships();
      this.logger.log(`Marked ${expiredResult.updated} memberships as expired`);

      // Send expiration warnings (7 days, 3 days, 1 day before)
      await this.sendExpirationWarnings();

      this.logger.log('Membership expiration check completed successfully');
    } catch (error) {
      this.logger.error('Error during membership expiration check:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDailyExpirationReport() {
    this.logger.log('Generating daily expiration report...');

    try {
      const expiringToday = await this.getMembershipsExpiringToday();
      const expiringSoon = await this.getMembershipsExpiringSoon(7);

      this.logger.log(`Memberships expiring today: ${expiringToday.length}`);
      this.logger.log(`Memberships expiring in 7 days: ${expiringSoon.length}`);

      // TODO: Send report to tenant admins via email/webhook
    } catch (error) {
      this.logger.error('Error generating daily expiration report:', error);
    }
  }

  private async markExpiredMemberships(): Promise<{ updated: number }> {
    const now = new Date();

    const expiredMemberships = await this.membershipRepository.find({
      where: {
        status: MembershipStatus.ACTIVE,
        expires_at: LessThan(now),
      },
    });

    if (expiredMemberships.length === 0) {
      return { updated: 0 };
    }

    // Update all expired memberships
    await this.membershipRepository.update(
      {
        status: MembershipStatus.ACTIVE,
        expires_at: LessThan(now),
      },
      {
        status: MembershipStatus.EXPIRED,
      },
    );

    // TODO: Remove expired members from Telegram groups
    for (const membership of expiredMemberships) {
      await this.removeExpiredMemberFromGroup(membership);
    }

    return { updated: expiredMemberships.length };
  }

  private async sendExpirationWarnings() {
    // Send 7-day warnings
    await this.sendWarningsForDays(7, 'Your membership expires in 7 days');

    // Send 3-day warnings
    await this.sendWarningsForDays(3, 'Your membership expires in 3 days');

    // Send 1-day warnings
    await this.sendWarningsForDays(1, 'Your membership expires tomorrow');
  }

  private async sendWarningsForDays(days: number, message: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + days);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const membershipsExpiring = await this.membershipRepository.find({
      where: {
        status: MembershipStatus.ACTIVE,
        expires_at: Between(startDate, endDate),
        // Only send warning once per day
        last_warning_sent_at: LessThan(
          new Date(Date.now() - 24 * 60 * 60 * 1000),
        ),
      },
      relations: ['member', 'plan'],
    });

    this.logger.log(
      `Sending ${days}-day expiration warnings to ${membershipsExpiring.length} members`,
    );

    for (const membership of membershipsExpiring) {
      try {
        await this.sendExpirationWarning(membership, message);

        // Update last warning sent timestamp
        await this.membershipRepository.update(membership.id, {
          last_warning_sent_at: new Date(),
        });
      } catch (error) {
        this.logger.error(
          `Failed to send expiration warning to member ${membership.member_id}:`,
          error,
        );
      }
    }
  }

  private async sendExpirationWarning(membership: any, message: string) {
    try {
      const bot = await this.getBotForMembership(membership);
      if (!bot) {
        this.logger.warn(`No bot found for membership ${membership.id}`);
        return;
      }

      const fullMessage = `${message}\n\nPlan: ${membership.plan.name}\nExpires: ${membership.expires_at.toLocaleDateString()}`;

      const success = await this.telegramApiService.sendMessage(
        bot.bot_token,
        membership.member.telegram_user_id,
        fullMessage,
        { parse_mode: 'HTML' },
      );

      if (success) {
        this.logger.log(
          `Expiration warning sent to member ${membership.member.telegram_user_id}`,
        );
      } else {
        this.logger.error(
          `Failed to send expiration warning to member ${membership.member.telegram_user_id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending expiration warning to member ${membership.member.telegram_user_id}:`,
        error,
      );
    }
  }

  private async removeExpiredMemberFromGroup(membership: Membership) {
    try {
      const bot = await this.getBotForGroup(membership.group_id);
      if (!bot) {
        this.logger.warn(`No bot found for group ${membership.group_id}`);
        return;
      }

      const member = await this.memberRepository.findOne({
        where: { id: membership.member_id },
      });

      if (!member || !member.telegram_user_id) {
        this.logger.warn(
          `Member ${membership.member_id} not found or missing telegram_user_id`,
        );
        return;
      }

      const success = await this.telegramApiService.kickChatMember(
        bot.bot_token,
        parseInt(membership.group_id),
        member.telegram_user_id,
      );

      if (success) {
        this.logger.log(
          `Expired member ${member.telegram_user_id} removed from group ${membership.group_id}`,
        );
      } else {
        this.logger.error(
          `Failed to remove expired member ${member.telegram_user_id} from group ${membership.group_id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error removing expired member from group ${membership.group_id}:`,
        error,
      );
    }
  }

  private async getMembershipsExpiringToday(): Promise<Membership[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.membershipRepository.find({
      where: {
        status: MembershipStatus.ACTIVE,
        expires_at: Between(today, tomorrow),
      },
      relations: ['member', 'plan'],
    });
  }

  private async getMembershipsExpiringSoon(
    days: number,
  ): Promise<Membership[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.membershipRepository.find({
      where: {
        status: MembershipStatus.ACTIVE,
        expires_at: Between(now, futureDate),
      },
      relations: ['member', 'plan'],
      order: { expires_at: 'ASC' },
    });
  }

  // Manual trigger for testing
  async triggerExpirationCheck(): Promise<{
    expired_memberships: number;
    warnings_sent: number;
  }> {
    const expiredResult = await this.markExpiredMemberships();

    // Count warnings that would be sent
    const expiring7Days = await this.getMembershipsExpiringSoon(7);
    const expiring3Days = await this.getMembershipsExpiringSoon(3);
    const expiring1Day = await this.getMembershipsExpiringSoon(1);

    await this.sendExpirationWarnings();

    return {
      expired_memberships: expiredResult.updated,
      warnings_sent:
        expiring7Days.length + expiring3Days.length + expiring1Day.length,
    };
  }

  private async getBotForMembership(membership: any): Promise<Project | null> {
    try {
      // Get bot through the group relationship
      const bot = await this.projectRepository
        .createQueryBuilder('project')
        .innerJoin('telegram_groups', 'tg', 'tg.project_id = project.id')
        .where('tg.id = :groupId', { groupId: membership.group_id })
        .andWhere('project.is_active = :isActive', { isActive: true })
        .getOne();

      return bot;
    } catch (error) {
      this.logger.error(
        `Error getting bot for membership ${membership.id}:`,
        error,
      );
      return null;
    }
  }

  private async getBotForGroup(groupId: string): Promise<Project | null> {
    try {
      const bot = await this.projectRepository
        .createQueryBuilder('project')
        .innerJoin('telegram_groups', 'tg', 'tg.project_id = project.id')
        .where('tg.id = :groupId', { groupId })
        .andWhere('project.is_active = :isActive', { isActive: true })
        .getOne();

      return bot;
    } catch (error) {
      this.logger.error(`Error getting bot for group ${groupId}:`, error);
      return null;
    }
  }
}
