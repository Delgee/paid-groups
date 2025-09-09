import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { PaymentService } from './services/payment.service';
import { PaymentStatus } from './entities/payment.entity';

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
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentService: PaymentService) {}

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
    this.logger.log(`Received QPay webhook: ${payload.event_type} for payment ${payload.data.payment_id}`);

    // Verify webhook signature
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Check for idempotency
    const existingPayment = await this.paymentService.findByQPayPaymentId(payload.data.payment_id);
    
    if (existingPayment && existingPayment.status !== 'pending') {
      this.logger.log(`Payment ${payload.data.payment_id} already processed with status: ${existingPayment.status}`);
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

    this.logger.log(`Successfully queued processing for payment ${payload.data.payment_id}`);
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

  private async handlePaymentCompleted(payload: QPayWebhookPayload): Promise<void> {
    const { data } = payload;
    
    // Get tenant and member from metadata
    const tenantId = data.metadata?.tenant_id;
    const memberId = data.metadata?.member_id;
    const planId = data.metadata?.plan_id;

    if (!tenantId || !memberId) {
      throw new BadRequestException('Missing required metadata');
    }

    // Queue the payment processing
    await this.paymentService.queuePaymentCompleted({
      paymentId: '', // Will be generated in processor
      qpayPaymentId: data.payment_id,
      invoiceId: data.invoice_id,
      amount: data.amount,
      currency: data.currency,
      tenantId,
      memberId,
      planId,
      metadata: data.metadata || {},
    });
  }

  private async handlePaymentFailed(payload: QPayWebhookPayload): Promise<void> {
    const { data } = payload;
    
    const tenantId = data.metadata?.tenant_id;
    const memberId = data.metadata?.member_id;

    if (!tenantId || !memberId) {
      this.logger.warn(`Payment failed webhook missing required metadata: ${data.payment_id}`);
      return; // Skip if no metadata
    }

    // Queue the payment failure processing
    await this.paymentService.queuePaymentFailed({
      paymentId: '', // Will be generated in processor
      qpayPaymentId: data.payment_id,
      invoiceId: data.invoice_id,
      amount: data.amount,
      currency: data.currency,
      tenantId,
      memberId,
      failureReason: 'Payment failed via webhook',
      metadata: data.metadata || {},
    });
  }

  private async handlePaymentPending(payload: QPayWebhookPayload): Promise<void> {
    const { data } = payload;
    
    const tenantId = data.metadata?.tenant_id;
    const memberId = data.metadata?.member_id;

    if (!tenantId || !memberId) {
      this.logger.warn(`Payment pending webhook missing required metadata: ${data.payment_id}`);
      return; // Skip if no metadata
    }

    // Create payment record directly for pending status (no queue needed)
    await this.paymentService.createPayment({
      tenant_id: tenantId,
      member_id: memberId,
      amount_mnt: data.amount,
      currency: data.currency,
      status: PaymentStatus.PENDING,
      qpay_payment_id: data.payment_id,
      qpay_invoice_id: data.invoice_id,
      metadata: data.metadata || {},
    });
  }
}