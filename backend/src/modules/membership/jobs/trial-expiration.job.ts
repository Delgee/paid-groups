import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership, MembershipStatus } from '../entities/membership.entity';
import { Member } from '../entities/member.entity';
import { TrialUsageService } from '../services/trial-usage.service';
import { TelegramApiService } from '../../../integrations/telegram/telegram-api.service';
import { Project } from '../../project/entities/project.entity';
import { TelegramGroup } from '../../telegram-groups/telegram-groups.entity';

/**
 * Trial Expiration Job
 *
 * Runs every 5 minutes to check for expired trial memberships.
 * When a trial expires:
 * 1. Updates membership status from TRIAL to EXPIRED
 * 2. Removes user from all Telegram channels associated with the plan
 * 3. Sends notification to user about trial expiration
 */
@Injectable()
export class TrialExpirationJob {
  private readonly logger = new Logger(TrialExpirationJob.name);

  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(TelegramGroup)
    private telegramGroupRepository: Repository<TelegramGroup>,
    private trialUsageService: TrialUsageService,
    private telegramApiService: TelegramApiService,
  ) {}

  /**
   * Check for expired trials every minute
   * Short interval ensures users are removed from channels quickly after trial expires
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleTrialExpiration() {
    this.logger.log('Starting trial expiration check...');

    try {
      // Find all expired trials across all tenants
      const expiredTrials = await this.trialUsageService.findExpiredTrials(undefined, 100);

      if (expiredTrials.length === 0) {
        this.logger.log('No expired trials found');
        return;
      }

      this.logger.log(`Found ${expiredTrials.length} expired trials to process`);

      let processed = 0;
      let failed = 0;

      for (const trialUsage of expiredTrials) {
        try {
          await this.processExpiredTrial(trialUsage);
          processed++;
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to process expired trial ${trialUsage.id} for member ${trialUsage.member_id}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Trial expiration check completed: ${processed} processed, ${failed} failed`,
      );
    } catch (error) {
      this.logger.error('Error during trial expiration check', error.stack);
    }
  }

  /**
   * Process a single expired trial
   * - Updates membership status to EXPIRED
   * - Removes user from all Telegram channels
   * - Sends notification to user
   */
  private async processExpiredTrial(trialUsage: any): Promise<void> {
    const { membership, member, membership_plan } = trialUsage;

    if (!membership || membership.status !== MembershipStatus.TRIAL) {
      this.logger.warn(
        `Trial usage ${trialUsage.id} has no TRIAL membership or membership already processed`,
      );
      return;
    }

    // 1. Update membership status to EXPIRED
    await this.membershipRepository.update(membership.id, {
      status: MembershipStatus.EXPIRED,
    });

    this.logger.log(
      `Membership ${membership.id} status updated to EXPIRED (trial expired for member ${member.id})`,
    );

    // 2. Get the project bot for this plan
    const project = await this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('membership_plans', 'mp', 'mp.project_id = project.id')
      .where('mp.id = :planId', { planId: membership_plan.id })
      .andWhere('project.is_active = :isActive', { isActive: true })
      .getOne();

    if (!project) {
      this.logger.warn(
        `No active project found for membership plan ${membership_plan.id}`,
      );
      return;
    }

    // 3. Remove user from all Telegram channels in the plan
    const removedFromGroups = [];
    const failedGroups = [];

    for (const group of membership_plan.telegram_groups || []) {
      try {
        // Get the Telegram group's chat_id
        const telegramGroup = await this.telegramGroupRepository.findOne({
          where: { id: group.id },
        });

        if (!telegramGroup || !telegramGroup.telegram_chat_id) {
          this.logger.warn(
            `Telegram group ${group.id} not found or missing chat_id`,
          );
          continue;
        }

        // Kick user from the channel
        const success = await this.telegramApiService.kickChatMember(
          project.bot_token,
          telegramGroup.telegram_chat_id,
          member.telegram_user_id,
        );

        if (success) {
          removedFromGroups.push(group.group_name || telegramGroup.group_name);
          this.logger.log(
            `Removed expired trial member ${member.telegram_user_id} from group ${telegramGroup.group_name} (${telegramGroup.telegram_chat_id})`,
          );
        } else {
          failedGroups.push(group.group_name || telegramGroup.group_name);
          this.logger.error(
            `Failed to remove member ${member.telegram_user_id} from group ${telegramGroup.telegram_chat_id}`,
          );
        }
      } catch (error) {
        failedGroups.push(group.group_name || `Group ${group.id}`);
        this.logger.error(
          `Error removing member ${member.telegram_user_id} from group ${group.id}`,
          error.stack,
        );
      }
    }

    // 4. Send notification to user about trial expiration
    try {
      await this.sendTrialExpiredNotification(
        project,
        member,
        membership_plan,
        removedFromGroups,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send trial expiration notification to member ${member.telegram_user_id}`,
        error.stack,
      );
    }
  }

  /**
   * Send notification to user about trial expiration
   */
  private async sendTrialExpiredNotification(
    project: Project,
    member: Member,
    membershipPlan: any,
    removedFromGroups: string[],
  ): Promise<void> {
    const message =
      `⏰ <b>Туршилт дууслаа</b>\n\n` +
      `Таны <b>${membershipPlan.name}</b>-ийн туршилт дууссан байна.\n\n` +
      `${removedFromGroups.length > 0 ? `Таныг дараах бүлгүүдээс хассан:\n${removedFromGroups.map((g) => `• ${g}`).join('\n')}\n\n` : ''}` +
      `💳 <b>Үргэлжлүүлэх үү?</b>\n` +
      `Дахин нэвтрэх эрх авахын тулд бүрэн гишүүнчлэл худалдан аваарай!\n\n` +
      `Үнэ: <b>${membershipPlan.price.toLocaleString()} MNT</b>\n` +
      `Хугацаа: <b>${membershipPlan.duration_days} хоног</b>`;

    const success = await this.telegramApiService.sendMessage(
      project.bot_token,
      member.telegram_user_id,
      message,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💳 Гишүүнчлэл авах',
                callback_data: `buy_plan_${membershipPlan.id}`,
              },
            ],
          ],
        },
      },
    );

    if (success) {
      this.logger.log(
        `Trial expiration notification sent to member ${member.telegram_user_id}`,
      );
    } else {
      this.logger.error(
        `Failed to send trial expiration notification to member ${member.telegram_user_id}`,
      );
    }
  }

  /**
   * Manual trigger for testing trial expiration
   */
  async triggerTrialExpirationCheck(): Promise<{
    expired_trials: number;
    processed: number;
    failed: number;
  }> {
    const expiredTrials = await this.trialUsageService.findExpiredTrials(undefined, 100);

    let processed = 0;
    let failed = 0;

    for (const trialUsage of expiredTrials) {
      try {
        await this.processExpiredTrial(trialUsage);
        processed++;
      } catch (error) {
        failed++;
        this.logger.error(
          `Failed to process expired trial ${trialUsage.id}`,
          error.stack,
        );
      }
    }

    return {
      expired_trials: expiredTrials.length,
      processed,
      failed,
    };
  }
}
