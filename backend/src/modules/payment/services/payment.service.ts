import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentLogger } from '../../../common/logger/application-loggers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Member } from '../../membership/entities/member.entity';
import {
  Membership,
  MembershipStatus,
} from '../../membership/entities/membership.entity';
import { MembershipPlan } from '../../membership-plan/entities/membership-plan.entity';
import { TelegramGroup } from '../../telegram-groups/telegram-groups.entity';
import { TelegramApiService } from '../../../integrations/telegram/telegram-api.service';
import { MessageTemplateService } from '@/modules/project/services/message-template.service';

export interface ProcessPaymentCompletedData {
  paymentId: string;
  qpayPaymentId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  tenantId: string;
  memberId: string;
  planId?: string;
  metadata: Record<string, any>;
}

export interface ProcessPaymentFailedData {
  paymentId: string;
  qpayPaymentId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  tenantId: string;
  memberId: string;
  failureReason?: string;
  metadata: Record<string, any>;
}

@Injectable()
export class PaymentService {
  private readonly logger = new PaymentLogger();

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(MembershipPlan)
    private planRepository: Repository<MembershipPlan>,
    @InjectRepository(TelegramGroup)
    private telegramGroupRepository: Repository<TelegramGroup>,
    @InjectQueue('payment-processing')
    private paymentQueue: Queue,
    private telegramApiService: TelegramApiService,
    private messageTemplateService: MessageTemplateService,
  ) {}

  async createPayment(data: Partial<Payment>): Promise<Payment> {
    const payment = this.paymentRepository.create(data);
    return this.paymentRepository.save(payment);
  }

  async findById(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['member', 'membership'],
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    return payment;
  }

  async findByQPayPaymentId(qpayPaymentId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { qpay_payment_id: qpayPaymentId },
      relations: ['member', 'membership'],
    });
  }

  async queuePaymentCompleted(
    data: ProcessPaymentCompletedData,
  ): Promise<void> {
    this.logger.info(
      `Queuing payment completed processing for payment ${data.qpayPaymentId}`,
      {
        paymentId: data.qpayPaymentId,
        tenantId: data.tenantId,
        memberId: data.memberId,
        amount: data.amount,
      },
    );

    await this.paymentQueue.add('process-payment-completed', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  }

  async queuePaymentFailed(data: ProcessPaymentFailedData): Promise<void> {
    this.logger.log(
      `Queuing payment failed processing for payment ${data.qpayPaymentId}`,
    );

    await this.paymentQueue.add('process-payment-failed', data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 50,
      removeOnFail: 25,
    });
  }

  async processPaymentCompleted(
    data: ProcessPaymentCompletedData,
  ): Promise<void> {
    this.logger.paymentProcessed(
      data.qpayPaymentId,
      'processing',
      data.amount,
      data.currency,
    );

    try {
      // Check if payment already exists
      const existingPayment = await this.findByQPayPaymentId(
        data.qpayPaymentId,
      );
      if (
        existingPayment &&
        existingPayment.status === PaymentStatus.COMPLETED
      ) {
        this.logger.log(`Payment ${data.qpayPaymentId} already processed`);
        return;
      }

      // Create or update payment record
      let payment: Payment;
      if (existingPayment) {
        existingPayment.status = PaymentStatus.COMPLETED;
        existingPayment.paid_at = new Date();
        existingPayment.metadata = {
          ...existingPayment.metadata,
          ...data.metadata,
        };
        payment = await this.paymentRepository.save(existingPayment);
      } else {
        payment = await this.createPayment({
          tenant_id: data.tenantId,
          member_id: data.memberId,
          amount_mnt: data.amount,
          currency: data.currency,
          status: PaymentStatus.COMPLETED,
          qpay_payment_id: data.qpayPaymentId,
          qpay_invoice_id: data.invoiceId,
          paid_at: new Date(),
          metadata: data.metadata,
        });
      }

      // Process membership
      await this.createOrExtendMembership(
        data.tenantId,
        data.memberId,
        data.planId,
        payment.id,
      );

      // Queue notification sending
      await this.queuePaymentNotification(payment.id, 'completed');

      this.logger.log(
        `Successfully processed payment completion: ${data.qpayPaymentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing completed payment ${data.qpayPaymentId}:`,
        error,
      );
      throw error;
    }
  }

  async processPaymentFailed(data: ProcessPaymentFailedData): Promise<void> {
    this.logger.log(`Processing failed payment: ${data.qpayPaymentId}`);

    try {
      // Check if payment already exists
      const existingPayment = await this.findByQPayPaymentId(
        data.qpayPaymentId,
      );

      let payment: Payment;
      if (existingPayment) {
        existingPayment.status = PaymentStatus.FAILED;
        existingPayment.failed_at = new Date();
        existingPayment.failure_reason = data.failureReason || 'Payment failed';
        existingPayment.metadata = {
          ...existingPayment.metadata,
          ...data.metadata,
        };
        payment = await this.paymentRepository.save(existingPayment);
      } else {
        payment = await this.createPayment({
          tenant_id: data.tenantId,
          member_id: data.memberId,
          amount_mnt: data.amount,
          currency: data.currency,
          status: PaymentStatus.FAILED,
          qpay_payment_id: data.qpayPaymentId,
          qpay_invoice_id: data.invoiceId,
          failed_at: new Date(),
          failure_reason: data.failureReason || 'Payment failed',
          metadata: data.metadata,
        });
      }

      // Queue failure notification
      await this.queuePaymentNotification(payment.id, 'failed');

      this.logger.log(
        `Successfully processed payment failure: ${data.qpayPaymentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing failed payment ${data.qpayPaymentId}:`,
        error,
      );
      throw error;
    }
  }

  private async createOrExtendMembership(
    tenantId: string,
    memberId: string,
    planId: string | undefined,
    paymentId: string,
  ): Promise<void> {
    if (!planId) {
      this.logger.warn(
        `No plan ID provided for payment ${paymentId}, skipping membership creation`,
      );
      return;
    }

    // Verify member exists
    const member = await this.memberRepository.findOne({
      where: { id: memberId, tenant_id: tenantId },
    });

    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    // Get the plan details with telegram_groups relation
    const plan = await this.planRepository.findOne({
      where: { id: planId, tenant_id: tenantId },
      relations: ['group_associations', 'group_associations.telegram_group'],
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    // TODO: Support multi-group memberships - currently only creating for first group
    // In future, should create multiple membership records, one per group
    const firstGroup = plan.telegram_groups?.[0];
    if (!firstGroup) {
      this.logger.warn(
        `Plan ${planId} has no telegram groups associated, skipping membership creation`,
      );
      return;
    }

    // Calculate expiration date
    const startsAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

    // Check for existing active membership
    const existingMembership = await this.membershipRepository.findOne({
      where: {
        member_id: memberId,
        plan_id: planId,
        status: MembershipStatus.ACTIVE,
      },
    });

    let membership: Membership;
    let isNewMembership = false;

    if (existingMembership) {
      // Extend existing membership
      if (existingMembership.expires_at > new Date()) {
        // Extend from current expiry date
        const newExpiresAt = new Date(existingMembership.expires_at);
        newExpiresAt.setDate(newExpiresAt.getDate() + plan.duration_days);
        existingMembership.expires_at = newExpiresAt;
      } else {
        // Extend from now
        existingMembership.expires_at = expiresAt;
      }
      existingMembership.status = MembershipStatus.ACTIVE;
      existingMembership.group_id = firstGroup.id; // Update to first group

      membership = await this.membershipRepository.save(existingMembership);
      this.logger.log(
        `Extended membership ${membership.id} for member ${memberId}`,
      );
    } else {
      // Create new membership
      membership = this.membershipRepository.create({
        tenant_id: tenantId,
        member_id: memberId,
        group_id: firstGroup.id,
        plan_id: planId,
        status: MembershipStatus.ACTIVE,
        starts_at: startsAt,
        expires_at: expiresAt,
        auto_renew: false,
      });

      membership = await this.membershipRepository.save(membership);
      isNewMembership = true;
      this.logger.log(
        `Created new membership ${membership.id} for member ${memberId}`,
      );
    }

    // Auto-add user to Telegram group (only for new memberships)
    if (isNewMembership) {
      try {
        await this.addMemberToTelegramGroup(
          member,
          plan,
          membership,
          expiresAt,
        );
      } catch (error) {
        this.logger.error(
          `Failed to add member ${memberId} to Telegram group: ${error.message}`,
        );
        // Don't throw - membership is still valid, user can join manually
      }
    }
  }

  /**
   * Add member to Telegram group by generating invite link and sending DM
   */
  private async addMemberToTelegramGroup(
    member: Member,
    plan: MembershipPlan,
    membership: Membership,
    expiresAt: Date,
  ): Promise<void> {
    // Get the telegram group with project details from the membership
    const telegramGroup = await this.telegramGroupRepository.findOne({
      where: { id: membership.group_id },
      relations: ['project'],
    });

    if (!telegramGroup) {
      this.logger.warn(
        `Telegram group ${membership.group_id} not found for membership ${membership.id}`,
      );
      return;
    }

    if (!telegramGroup.telegram_chat_id) {
      this.logger.warn(
        `Telegram group ${membership.group_id} has no chat_id configured`,
      );
      return;
    }

    if (!telegramGroup.project || !telegramGroup.project.bot_token) {
      this.logger.warn(
        `No project configured for telegram group ${membership.group_id}`,
      );
      return;
    }

    const botToken = telegramGroup.project.bot_token;
    const chatId = telegramGroup.telegram_chat_id;

    // Generate a personalized invite link (expires in 7 days, single use)
    const linkExpireDate = new Date();
    linkExpireDate.setDate(linkExpireDate.getDate() + 7);

    const inviteLink = await this.telegramApiService.generateInviteLink(
      botToken,
      chatId,
      linkExpireDate,
      1, // Single use
    );

    if (!inviteLink) {
      this.logger.error(`Failed to generate invite link for chat ${chatId}`);
      return;
    }

    // Send welcome message with invite link to user via DM
    const welcomeMessage = this.buildWelcomeMessage(
      member,
      telegramGroup.group_name,
      plan.name,
      inviteLink,
      expiresAt,
      telegramGroup.project.message_templates || {},
    );

    const sent = await this.telegramApiService.sendMessage(
      botToken,
      member.telegram_user_id,
      welcomeMessage,
      { parse_mode: 'HTML' },
    );

    if (sent) {
      this.logger.log(
        `Sent invite link to member ${member.telegram_user_id} for group ${telegramGroup.group_name}`,
      );

      // Store invite link in membership metadata
      membership.metadata = {
        ...membership.metadata,
        invite_link: inviteLink,
        invite_sent_at: new Date().toISOString(),
      };
      await this.membershipRepository.save(membership);
    } else {
      this.logger.error(
        `Failed to send invite link to member ${member.telegram_user_id}`,
      );
    }
  }

  /**
   * Build welcome message with invite link
   */
  private buildWelcomeMessage(
    member: Member,
    groupName: string,
    planName: string,
    inviteLink: string,
    expiresAt: Date,
    botTemplates: Record<string, any>,
  ): string {
    const fullName =
      [member.first_name, member.last_name].filter(Boolean).join(' ') ||
      member.username ||
      `User ${member.telegram_user_id}`;
    const firstName =
      member.first_name || member.username || `User ${member.telegram_user_id}`;

    return this.messageTemplateService.buildWelcomeMessage(botTemplates, {
      user_name: fullName,
      user_first_name: firstName,
      plan_name: planName,
      group_name: groupName,
      expires_at: expiresAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      invite_link: inviteLink,
    });
  }

  private async queuePaymentNotification(
    paymentId: string,
    type: 'completed' | 'failed',
  ): Promise<void> {
    // Queue notification sending (to be implemented with telegram notifications)
    await this.paymentQueue.add(
      'send-payment-notification',
      {
        paymentId,
        type,
      },
      {
        delay: 1000, // Send notification after 1 second
        attempts: 2,
        removeOnComplete: 20,
        removeOnFail: 10,
      },
    );
  }

  async getPaymentStats(tenantId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalRevenue: number;
  }> {
    const [total, completed, pending, failed, revenueResult] =
      await Promise.all([
        this.paymentRepository.count({ where: { tenant_id: tenantId } }),
        this.paymentRepository.count({
          where: { tenant_id: tenantId, status: PaymentStatus.COMPLETED },
        }),
        this.paymentRepository.count({
          where: { tenant_id: tenantId, status: PaymentStatus.PENDING },
        }),
        this.paymentRepository.count({
          where: { tenant_id: tenantId, status: PaymentStatus.FAILED },
        }),
        this.paymentRepository
          .createQueryBuilder('payment')
          .select('SUM(payment.amount_mnt)', 'total')
          .where('payment.tenant_id = :tenantId', { tenantId })
          .andWhere('payment.status = :status', {
            status: PaymentStatus.COMPLETED,
          })
          .getRawOne(),
      ]);

    return {
      total,
      completed,
      pending,
      failed,
      totalRevenue: parseFloat(revenueResult?.total) || 0,
    };
  }

  /**
   * Send payment notification to user via Telegram
   */
  async sendPaymentNotification(
    payment: Payment,
    type: 'completed' | 'failed',
  ): Promise<void> {
    if (!payment.member || !payment.member.telegram_user_id) {
      this.logger.warn(
        `Cannot send payment notification - no Telegram user ID for payment ${payment.id}`,
      );
      return;
    }

    try {
      // Get membership to find the group and bot
      let membership: Membership | null = null;
      let telegramGroup: TelegramGroup | null = null;
      let botToken: string | null = null;

      if (payment.membership_id) {
        membership = await this.membershipRepository.findOne({
          where: { id: payment.membership_id },
          relations: ['plan', 'group', 'group.project'],
        });

        // Note: MembershipPlan no longer has direct group relation, use membership.group
        if (membership?.group?.project) {
          telegramGroup = membership.group;
          botToken = telegramGroup.project.bot_token;
        }
      }

      // If no bot token found, try to get the first active bot for the tenant
      if (!botToken) {
        this.logger.warn(
          `No bot token found for payment ${payment.id}, skipping notification`,
        );
        return;
      }

      // Build and send notification message
      const message = this.buildPaymentNotificationMessage(
        payment,
        membership,
        telegramGroup,
        type,
        telegramGroup?.project?.message_templates || {},
      );

      const sent = await this.telegramApiService.sendMessage(
        botToken,
        payment.member.telegram_user_id,
        message,
        { parse_mode: 'HTML' },
      );

      if (sent) {
        this.logger.log(
          `Payment notification sent to user ${payment.member.telegram_user_id} for payment ${payment.id}`,
        );
      } else {
        this.logger.error(
          `Failed to send payment notification to user ${payment.member.telegram_user_id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error sending payment notification for payment ${payment.id}:`,
        error,
      );
      // Don't throw - notifications are best effort
    }
  }

  /**
   * Build payment notification message
   */
  private buildPaymentNotificationMessage(
    payment: Payment,
    membership: Membership | null,
    telegramGroup: TelegramGroup | null,
    type: 'completed' | 'failed',
    botTemplates: Record<string, any>,
  ): string {
    const member = payment.member;
    const fullName = member
      ? [member.first_name, member.last_name].filter(Boolean).join(' ') ||
        member.username ||
        `User ${member.telegram_user_id}`
      : '';
    const firstName = member
      ? member.first_name ||
        member.username ||
        `User ${member.telegram_user_id}`
      : '';

    const variables = {
      user_name: fullName,
      user_first_name: firstName,
      amount: payment.amount_mnt.toLocaleString(),
      currency: payment.currency,
      payment_id: payment.qpay_payment_id || payment.id,
      payment_date:
        payment.paid_at?.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) || '',
      group_name: telegramGroup?.group_name || '',
      plan_name: membership?.plan?.name || '',
      expires_at:
        membership?.expires_at.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) || '',
      failure_reason: payment.failure_reason
        ? `<b>Reason:</b> ${payment.failure_reason}`
        : '',
    };

    if (type === 'completed') {
      return this.messageTemplateService.buildPaymentSuccessMessage(
        botTemplates,
        variables,
      );
    } else {
      return this.messageTemplateService.buildPaymentFailedMessage(
        botTemplates,
        variables,
      );
    }
  }
}
