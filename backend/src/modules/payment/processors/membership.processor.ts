import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChannelMemberService } from '../services/channel-member.service';
import { PaymentTransactionService } from '../services/payment-transaction.service';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';
import { TelegramApiService } from '../../../integrations/telegram/telegram-api.service';
import { Project } from '../../project/entities/project.entity';

interface CreateMembershipJobData {
  tenantId: string;
  paymentTransactionId: string;
  projectId: string;
  membershipPlanId: string;
  telegramUserId: string;
  expiresAt: Date;
}

interface ActivateTrialJobData {
  tenant_id: string;
  project_id: string;
  member_id: string;
  membership_plan_id: string;
  membership_ids: string[];
  telegram_user_id: number;
  plan_name: string;
  trial_ends_at: string;
}

interface RenewalReminderJobData {
  tenantId: string;
  channelMemberId: string;
  telegramUserId: string;
  channelId: string;
  expiresAt: Date;
}

interface ExpireMembershipJobData {
  tenantId: string;
  channelMemberId: string;
  telegramUserId: string;
  channelId: string;
}

@Processor('membership')
export class MembershipProcessor {
  private readonly logger = new Logger(MembershipProcessor.name);

  constructor(
    private readonly channelMemberService: ChannelMemberService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly telegramApiService: TelegramApiService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  @Process('create-membership')
  async handleCreateMembership(job: Job<CreateMembershipJobData>): Promise<void> {
    const { tenantId, paymentTransactionId, projectId, membershipPlanId, telegramUserId, expiresAt } = job.data;

    this.logger.log(`Processing create-membership job for payment ${paymentTransactionId}`);

    try {
      // Check if membership already exists
      const existingMembers = await this.channelMemberService.findByPaymentTransaction(
        tenantId,
        paymentTransactionId,
      );

      if (existingMembers && existingMembers.length > 0) {
        this.logger.warn(`Membership already exists for payment ${paymentTransactionId}`);
        return;
      }

      // Get payment transaction to retrieve snapshot data
      const payment = await this.paymentTransactionService.findOne(tenantId, paymentTransactionId);

      // Get all telegram groups associated with the membership plan
      const telegramGroups = await this.membershipPlanService.findGroupsForPlan(membershipPlanId);

      if (!telegramGroups || telegramGroups.length === 0) {
        this.logger.warn(`No telegram groups found for membership plan ${membershipPlanId}`);
        return;
      }

      this.logger.log(`Granting access to ${telegramGroups.length} groups for user ${telegramUserId}`);

      // Create channel member records for ALL groups in the plan
      const channelMembers = [];
      for (const group of telegramGroups) {
        if (!group.telegram_chat_id) {
          this.logger.warn(`Telegram group ${group.id} has no telegram_chat_id, skipping`);
          continue;
        }

        const channelMember = await this.channelMemberService.create(tenantId, {
          payment_transaction_id: paymentTransactionId,
          project_id: projectId,
          telegram_user_id: telegramUserId,
          channel_id: group.telegram_chat_id.toString(),
          expires_at: expiresAt.toISOString(),
        });

        channelMembers.push(channelMember);
        this.logger.log(`Channel member created for group ${group.group_name}: ${channelMember.id}`);
      }

      this.logger.log(`Successfully created ${channelMembers.length} channel memberships for payment ${paymentTransactionId}`);

      // TODO: Generate Telegram invite links for each group
      // for (const member of channelMembers) {
      //   const inviteLink = await this.telegramService.createChatInviteLink(botToken, member.channel_id);
      //   await this.channelMemberService.update(tenantId, member.id, { invite_link: inviteLink });
      // }

      // TODO: Send Telegram notification with all invite links
      // const groupLinks = channelMembers.map((m, i) => `• ${telegramGroups[i].group_name}: ${m.invite_link}`).join('\n');
      // await this.telegramService.sendMessage(botToken, telegramUserId, {
      //   text: `Payment successful! Your membership is active until ${expiresAt.toLocaleDateString()}\n\nJoin your groups:\n${groupLinks}`,
      // });

    } catch (error) {
      this.logger.error(`Failed to create membership for payment ${paymentTransactionId}`, error.stack);
      throw error;
    }
  }

  @Process('send-renewal-reminder')
  async handleRenewalReminder(job: Job<RenewalReminderJobData>): Promise<void> {
    const { tenantId, channelMemberId, telegramUserId, expiresAt } = job.data;

    this.logger.log(`Processing renewal reminder for member ${channelMemberId}`);

    try {
      // TODO: Send Telegram notification
      // const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      // await this.telegramService.sendMessage(botToken, telegramUserId, {
      //   text: `Your membership expires in ${daysRemaining} days. Renew now to maintain access!`,
      //   reply_markup: { inline_keyboard: [[{ text: 'Renew Membership', callback_data: 'renew' }]] }
      // });

      // Record that reminder was sent
      await this.channelMemberService.recordRenewalReminderSent(tenantId, channelMemberId);

      this.logger.log(`Renewal reminder sent for member ${channelMemberId}`);
    } catch (error) {
      this.logger.error(`Failed to send renewal reminder for member ${channelMemberId}`, error.stack);
      throw error;
    }
  }

  @Process('activate-trial')
  async handleActivateTrial(job: Job<ActivateTrialJobData>): Promise<void> {
    const { tenant_id, project_id, member_id, membership_plan_id, membership_ids, telegram_user_id, plan_name, trial_ends_at } = job.data;

    this.logger.log(`Processing activate-trial job for member ${member_id}, plan: ${plan_name}`);

    try {
      // Get project (with bot_token)
      const project = await this.projectRepository.findOne({
        where: { id: project_id, tenant_id },
        relations: ['telegram_groups'],
      });

      if (!project) {
        this.logger.error(`Project not found: ${project_id}`);
        throw new Error(`Project not found: ${project_id}`);
      }

      // Get membership plan with telegram groups
      const membershipPlan = await this.membershipPlanService.findOne(tenant_id, membership_plan_id);
      if (!membershipPlan) {
        this.logger.error(`Membership plan not found: ${membership_plan_id}`);
        return;
      }

      const telegramGroups = membershipPlan.telegram_groups || [];

      if (telegramGroups.length === 0) {
        this.logger.warn(`No telegram groups found for trial activation, member ${member_id}`);
        return;
      }

      this.logger.log(`Generating invite links for ${telegramGroups.length} groups for user ${telegram_user_id}`);

      // Generate invite links for each group
      const inviteLinks: Array<{ groupName: string; inviteLink: string }> = [];

      for (const group of telegramGroups) {
        if (!group.telegram_chat_id) {
          this.logger.warn(`Telegram group ${group.id} has no telegram_chat_id, skipping`);
          continue;
        }

        try {
          // Generate invite link that expires when trial ends
          const trialExpiresAt = new Date(trial_ends_at);

          const inviteLink = await this.telegramApiService.generateInviteLink(
            project.bot_token,
            group.telegram_chat_id,
            trialExpiresAt, // Pass Date object directly
            1, // member_limit: 1 (single-use link)
          );

          if (inviteLink) {
            inviteLinks.push({
              groupName: group.group_name,
              inviteLink,
            });
            this.logger.log(`Generated invite link for group ${group.group_name}: ${inviteLink}`);
          } else {
            this.logger.error(`Failed to generate invite link for group ${group.group_name}`);
          }
        } catch (error) {
          this.logger.error(`Error generating invite link for group ${group.group_name}:`, error.stack);
        }
      }

      // Send message with invite links to user
      if (inviteLinks.length > 0) {
        const groupLinksText = inviteLinks
          .map((link, index) => `${index + 1}. [${link.groupName}](${link.inviteLink})`)
          .join('\n');

        const message =
          `🎉 *Туршилт гишүүнчлэл идэвхжлээ!*\n\n` +
          `✅ Таны *${plan_name}*-ийн туршилт идэвхтэй болсон.\n` +
          `⏰ Дуусах огноо: ${new Date(trial_ends_at).toLocaleString()}\n\n` +
          `📱 *Бүлгүүддээ нэгдэх:*\n${groupLinksText}\n\n` +
          `⚠️ *Анхаар:* Эдгээр холбоос нь ганцхан удаа ашиглагдах бөгөөд туршилт дуусахад хүчингүй болно. ` +
          `Туршилт дууссаны дараа бүрэн гишүүнчлэл худалдан авахгүй бол таныг бүлгүүдээс хасна.`;

        const sent = await this.telegramApiService.sendMessage(
          project.bot_token,
          telegram_user_id,
          message,
          { parse_mode: 'Markdown' },
        );

        if (sent) {
          this.logger.log(`Trial activation message sent to user ${telegram_user_id}`);
        } else {
          this.logger.error(`Failed to send trial activation message to user ${telegram_user_id}`);
        }
      } else {
        this.logger.error(`No invite links generated for trial activation, member ${member_id}`);
      }

      this.logger.log(`Successfully activated trial for member ${member_id}`);
    } catch (error) {
      this.logger.error(`Failed to activate trial for member ${member_id}`, error.stack);
      throw error;
    }
  }

  @Process('expire-membership')
  async handleExpireMembership(job: Job<ExpireMembershipJobData>): Promise<void> {
    const { tenantId, channelMemberId, telegramUserId, channelId } = job.data;

    this.logger.log(`Processing expire-membership for member ${channelMemberId}`);

    try {
      // Mark membership as expired
      await this.channelMemberService.markAsExpired(tenantId, channelMemberId);

      // TODO: Remove user from Telegram channel
      // await this.telegramService.banChatMember(botToken, channelId, telegramUserId);
      // await this.telegramService.unbanChatMember(botToken, channelId, telegramUserId); // Unban to allow rejoining later

      // TODO: Send expiration notification
      // await this.telegramService.sendMessage(botToken, telegramUserId, {
      //   text: 'Your membership has expired. Renew to regain access to the channel.',
      //   reply_markup: { inline_keyboard: [[{ text: 'Renew Now', callback_data: 'renew' }]] }
      // });

      this.logger.log(`Membership expired for member ${channelMemberId}`);
    } catch (error) {
      this.logger.error(`Failed to expire membership for member ${channelMemberId}`, error.stack);
      throw error;
    }
  }
}
