import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Member } from '../membership/entities/member.entity';
import { Membership, MembershipStatus } from '../membership/entities/membership.entity';

interface QPayWebhookPayload {
  event_type: 'payment.completed' | 'payment.failed' | 'payment.pending';
  event_id: string;
  timestamp: string;
  data: {
    payment_id: string;
    invoice_id: string;
    amount: number;
    currency: string;
    status: string;
    customer: {
      email?: string;
      phone?: string;
      name?: string;
    };
    metadata?: {
      tenant_id?: string;
      member_id?: string;
      plan_id?: string;
      telegram_user_id?: string;
    };
  };
}

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
  ) {}

  @Post('qpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'QPay payment webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  async handleQPayWebhook(
    @Body() payload: QPayWebhookPayload,
    @Headers('x-qpay-signature') signature: string,
  ) {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Check for idempotency
    const existingPayment = await this.paymentRepository.findOne({
      where: { qpay_payment_id: payload.data.payment_id },
    });

    if (existingPayment) {
      return { success: true, message: 'Payment already processed' };
    }

    // Process based on event type
    switch (payload.event_type) {
      case 'payment.completed':
        await this.handlePaymentCompleted(payload);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;
      case 'payment.pending':
        await this.handlePaymentPending(payload);
        break;
      default:
        throw new BadRequestException(`Unknown event type: ${payload.event_type}`);
    }

    return { success: true };
  }

  private verifyWebhookSignature(payload: QPayWebhookPayload, signature: string): boolean {
    const webhookSecret = process.env.QPAY_WEBHOOK_SECRET || 'test-secret';
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return computedSignature === signature;
  }

  private async handlePaymentCompleted(payload: QPayWebhookPayload) {
    const { data } = payload;
    
    // Get tenant and member from metadata
    const tenantId = data.metadata?.tenant_id;
    const memberId = data.metadata?.member_id;
    const planId = data.metadata?.plan_id;

    if (!tenantId || !memberId) {
      throw new BadRequestException('Missing required metadata');
    }

    // Create payment record
    const payment = this.paymentRepository.create({
      tenant_id: tenantId,
      member_id: memberId,
      amount_mnt: data.amount,
      currency: data.currency,
      status: PaymentStatus.COMPLETED,
      qpay_payment_id: data.payment_id,
      qpay_invoice_id: data.invoice_id,
      metadata: data.metadata,
    });

    await this.paymentRepository.save(payment);

    // Create or update membership
    const member = await this.memberRepository.findOne({
      where: { id: memberId, tenant_id: tenantId },
    });

    if (!member) {
      throw new BadRequestException('Member not found');
    }

    // Find existing membership or create new one
    let membership = await this.membershipRepository.findOne({
      where: { 
        member_id: memberId,
        plan_id: planId,
      },
    });

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // Add 1 month

    if (membership) {
      // Extend existing membership
      membership.expires_at = expiresAt;
      membership.status = MembershipStatus.ACTIVE;
      // TODO: Add last_payment_id field to Membership entity
    } else {
      // Create new membership
      membership = this.membershipRepository.create({
        tenant_id: tenantId,
        member_id: memberId,
        group_id: '', // TODO: Get group_id from context
        plan_id: planId,
        status: MembershipStatus.ACTIVE,
        starts_at: new Date(),
        expires_at: expiresAt,
        auto_renew: false,
      });
    }

    await this.membershipRepository.save(membership);

    // TODO: Send confirmation message to member via Telegram
  }

  private async handlePaymentFailed(payload: QPayWebhookPayload) {
    const { data } = payload;
    
    const tenantId = data.metadata?.tenant_id;
    const memberId = data.metadata?.member_id;

    if (!tenantId || !memberId) {
      return; // Skip if no metadata
    }

    // Create payment record with failed status
    const payment = this.paymentRepository.create({
      tenant_id: tenantId,
      member_id: memberId,
      amount_mnt: data.amount,
      currency: data.currency,
      status: PaymentStatus.FAILED,
      qpay_payment_id: data.payment_id,
      qpay_invoice_id: data.invoice_id,
      metadata: data.metadata,
    });

    await this.paymentRepository.save(payment);

    // TODO: Send failure notification to member
  }

  private async handlePaymentPending(payload: QPayWebhookPayload) {
    const { data } = payload;
    
    const tenantId = data.metadata?.tenant_id;
    const memberId = data.metadata?.member_id;

    if (!tenantId || !memberId) {
      return; // Skip if no metadata
    }

    // Create payment record with pending status
    const payment = this.paymentRepository.create({
      tenant_id: tenantId,
      member_id: memberId,
      amount_mnt: data.amount,
      currency: data.currency,
      status: PaymentStatus.PENDING,
      qpay_payment_id: data.payment_id,
      qpay_invoice_id: data.invoice_id,
      metadata: data.metadata,
    });

    await this.paymentRepository.save(payment);
  }
}