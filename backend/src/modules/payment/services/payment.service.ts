import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentLogger } from '../../../common/logger/application-loggers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Member } from '../../membership/entities/member.entity';
import { Membership, MembershipStatus } from '../../membership/entities/membership.entity';
import { MembershipPlan } from '../../membership/entities/membership-plan.entity';

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
    @InjectQueue('payment-processing')
    private paymentQueue: Queue,
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

  async queuePaymentCompleted(data: ProcessPaymentCompletedData): Promise<void> {
    this.logger.info(`Queuing payment completed processing for payment ${data.qpayPaymentId}`, {
      paymentId: data.qpayPaymentId,
      tenantId: data.tenantId,
      memberId: data.memberId,
      amount: data.amount,
    });
    
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
    this.logger.log(`Queuing payment failed processing for payment ${data.qpayPaymentId}`);
    
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

  async processPaymentCompleted(data: ProcessPaymentCompletedData): Promise<void> {
    this.logger.paymentProcessed(data.qpayPaymentId, 'processing', data.amount, data.currency);

    try {
      // Check if payment already exists
      const existingPayment = await this.findByQPayPaymentId(data.qpayPaymentId);
      if (existingPayment && existingPayment.status === PaymentStatus.COMPLETED) {
        this.logger.log(`Payment ${data.qpayPaymentId} already processed`);
        return;
      }

      // Create or update payment record
      let payment: Payment;
      if (existingPayment) {
        existingPayment.status = PaymentStatus.COMPLETED;
        existingPayment.paid_at = new Date();
        existingPayment.metadata = { ...existingPayment.metadata, ...data.metadata };
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
      await this.createOrExtendMembership(data.tenantId, data.memberId, data.planId, payment.id);

      // Queue notification sending
      await this.queuePaymentNotification(payment.id, 'completed');

      this.logger.log(`Successfully processed payment completion: ${data.qpayPaymentId}`);
    } catch (error) {
      this.logger.error(`Error processing completed payment ${data.qpayPaymentId}:`, error);
      throw error;
    }
  }

  async processPaymentFailed(data: ProcessPaymentFailedData): Promise<void> {
    this.logger.log(`Processing failed payment: ${data.qpayPaymentId}`);

    try {
      // Check if payment already exists
      const existingPayment = await this.findByQPayPaymentId(data.qpayPaymentId);
      
      let payment: Payment;
      if (existingPayment) {
        existingPayment.status = PaymentStatus.FAILED;
        existingPayment.failed_at = new Date();
        existingPayment.failure_reason = data.failureReason || 'Payment failed';
        existingPayment.metadata = { ...existingPayment.metadata, ...data.metadata };
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

      this.logger.log(`Successfully processed payment failure: ${data.qpayPaymentId}`);
    } catch (error) {
      this.logger.error(`Error processing failed payment ${data.qpayPaymentId}:`, error);
      throw error;
    }
  }

  private async createOrExtendMembership(
    tenantId: string, 
    memberId: string, 
    planId: string | undefined,
    paymentId: string
  ): Promise<void> {
    if (!planId) {
      this.logger.warn(`No plan ID provided for payment ${paymentId}, skipping membership creation`);
      return;
    }

    // Verify member exists
    const member = await this.memberRepository.findOne({
      where: { id: memberId, tenant_id: tenantId },
    });

    if (!member) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    // Get the plan details
    const plan = await this.planRepository.findOne({
      where: { id: planId, tenant_id: tenantId },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
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
      
      await this.membershipRepository.save(existingMembership);
      this.logger.log(`Extended membership ${existingMembership.id} for member ${memberId}`);
    } else {
      // Create new membership
      const membership = this.membershipRepository.create({
        tenant_id: tenantId,
        member_id: memberId,
        group_id: '', // Will be set when member joins a group
        plan_id: planId,
        status: MembershipStatus.ACTIVE,
        starts_at: startsAt,
        expires_at: expiresAt,
        auto_renew: false,
      });

      await this.membershipRepository.save(membership);
      this.logger.log(`Created new membership ${membership.id} for member ${memberId}`);
    }
  }

  private async queuePaymentNotification(paymentId: string, type: 'completed' | 'failed'): Promise<void> {
    // Queue notification sending (to be implemented with telegram notifications)
    await this.paymentQueue.add('send-payment-notification', {
      paymentId,
      type,
    }, {
      delay: 1000, // Send notification after 1 second
      attempts: 2,
      removeOnComplete: 20,
      removeOnFail: 10,
    });
  }

  async getPaymentStats(tenantId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalRevenue: number;
  }> {
    const [
      total,
      completed,
      pending,
      failed,
      revenueResult
    ] = await Promise.all([
      this.paymentRepository.count({ where: { tenant_id: tenantId } }),
      this.paymentRepository.count({ where: { tenant_id: tenantId, status: PaymentStatus.COMPLETED } }),
      this.paymentRepository.count({ where: { tenant_id: tenantId, status: PaymentStatus.PENDING } }),
      this.paymentRepository.count({ where: { tenant_id: tenantId, status: PaymentStatus.FAILED } }),
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount_mnt)', 'total')
        .where('payment.tenant_id = :tenantId', { tenantId })
        .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .getRawOne()
    ]);

    return {
      total,
      completed,
      pending,
      failed,
      totalRevenue: parseFloat(revenueResult?.total) || 0,
    };
  }
}