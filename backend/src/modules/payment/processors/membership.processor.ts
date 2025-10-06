import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ChannelMemberService } from '../services/channel-member.service';
import { PaymentTransactionService } from '../services/payment-transaction.service';

interface CreateMembershipJobData {
  tenantId: string;
  paymentTransactionId: string;
  botConfigurationId: string;
  telegramUserId: string;
  channelId: string;
  expiresAt: Date;
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
  ) {}

  @Process('create-membership')
  async handleCreateMembership(job: Job<CreateMembershipJobData>): Promise<void> {
    const { tenantId, paymentTransactionId, botConfigurationId, telegramUserId, channelId, expiresAt } = job.data;

    this.logger.log(`Processing create-membership job for payment ${paymentTransactionId}`);

    try {
      // Check if membership already exists
      const existingMember = await this.channelMemberService.findByPaymentTransaction(
        tenantId,
        paymentTransactionId,
      );

      if (existingMember) {
        this.logger.warn(`Membership already exists for payment ${paymentTransactionId}`);
        return;
      }

      // Get payment transaction to retrieve snapshot data
      const payment = await this.paymentTransactionService.findOne(tenantId, paymentTransactionId);

      // Create channel member
      const channelMember = await this.channelMemberService.create(tenantId, {
        payment_transaction_id: paymentTransactionId,
        bot_configuration_id: botConfigurationId,
        telegram_user_id: telegramUserId,
        channel_id: channelId,
        expires_at: expiresAt.toISOString(),
      });

      this.logger.log(`Channel member created: ${channelMember.id}`);

      // TODO: Generate Telegram invite link
      // const inviteLink = await this.telegramService.createChatInviteLink(botToken, channelId);
      // await this.channelMemberService.update(tenantId, channelMember.id, { invite_link: inviteLink });

      // TODO: Send Telegram notification with invite link
      // await this.telegramService.sendMessage(botToken, telegramUserId, {
      //   text: `Payment successful! Your membership is active until ${expiresAt.toLocaleDateString()}`,
      //   reply_markup: { inline_keyboard: [[{ text: 'Join Channel', url: inviteLink }]] }
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
