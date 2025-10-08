import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseEnumPipe,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { PaymentTransaction, PaymentStatus } from './entities/payment-transaction.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { CorrelationId } from '../../common/middleware/correlation-id.middleware';
import * as crypto from 'crypto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  private readonly QPAY_SECRET = process.env.QPAY_WEBHOOK_SECRET || 'test-webhook-secret';

  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
    @InjectQueue('membership') private membershipQueue: Queue,
  ) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a new payment transaction' })
  @ApiResponse({
    status: 201,
    description: 'Payment initiated successfully with QPay link',
  })
  @ApiResponse({ status: 404, description: 'Membership plan not found' })
  @ApiResponse({ status: 422, description: 'Membership plan is inactive' })
  async initiatePayment(
    @TenantId() tenantId: string,
    @Body() createDto: CreatePaymentTransactionDto,
  ): Promise<{ transaction: PaymentTransaction; payment_link: string }> {
    return this.paymentTransactionService.initiatePayment(tenantId, createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all payment transactions for tenant' })
  @ApiQuery({
    name: 'bot_configuration_id',
    required: false,
    description: 'Filter by bot configuration',
  })
  @ApiQuery({
    name: 'membership_plan_id',
    required: false,
    description: 'Filter by membership plan',
  })
  @ApiQuery({
    name: 'telegram_user_id',
    required: false,
    description: 'Filter by Telegram user',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Filter by payment status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payment transactions',
    type: [PaymentTransaction],
  })
  async findAll(
    @TenantId() tenantId: string,
    @Query('bot_configuration_id') botConfigurationId?: string,
    @Query('membership_plan_id') membershipPlanId?: string,
    @Query('telegram_user_id') telegramUserId?: string,
    @Query('status', new ParseEnumPipe(PaymentStatus, { optional: true }))
    status?: PaymentStatus,
  ): Promise<PaymentTransaction[]> {
    return this.paymentTransactionService.findAll(tenantId, {
      bot_configuration_id: botConfigurationId,
      membership_plan_id: membershipPlanId,
      telegram_user_id: telegramUserId,
      status,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment transaction by ID' })
  @ApiParam({ name: 'id', description: 'Payment transaction UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payment transaction details',
    type: PaymentTransaction,
  })
  @ApiResponse({ status: 404, description: 'Payment transaction not found' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentTransaction> {
    return this.paymentTransactionService.findOne(tenantId, id);
  }

  @Post('webhook/qpay')
  @ApiOperation({ summary: 'QPay webhook endpoint for payment notifications' })
  @ApiHeader({ name: 'X-QPay-Signature', description: 'HMAC signature for verification' })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid signature' })
  async handleQPayWebhook(
    @Headers('x-qpay-signature') signature: string,
    @Body() payload: any,
  ): Promise<any> {
    this.logger.log('Received QPay webhook', { invoice_id: payload.invoice_id });

    // Verify HMAC signature
    if (!signature) {
      this.logger.error('Missing signature header');
      throw new UnauthorizedException({
        error: {
          code: 'MISSING_SIGNATURE',
          message: 'Webhook signature is required',
        },
      });
    }

    const expectedSignature = this.generateHmacSignature(payload);
    if (signature !== expectedSignature) {
      this.logger.error('Invalid webhook signature');
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed',
        },
      });
    }

    // Find payment transaction by QPay invoice ID
    const transaction = await this.paymentTransactionService.findByQPayInvoiceId(
      payload.invoice_id,
    );

    if (!transaction) {
      this.logger.warn(`Transaction not found for invoice ${payload.invoice_id}`);
      return {
        status: 'received',
        received_at: new Date().toISOString(),
        message: 'Transaction not found',
      };
    }

    // Check idempotency - if already processed, return success
    if (transaction.status === PaymentStatus.COMPLETED) {
      this.logger.log(`Payment ${transaction.id} already processed`);
      return {
        status: 'already_processed',
        received_at: new Date().toISOString(),
        payment_status: 'completed',
      };
    }

    // Process payment based on status
    let updatedTransaction: PaymentTransaction;

    if (payload.payment_status === 'PAID' || payload.invoice_status === 'PAID') {
      updatedTransaction = await this.paymentTransactionService.markAsCompleted(
        transaction.tenant_id,
        transaction.id,
        {
          qpay_transaction_id: payload.payment_id || payload.object_id,
          qpay_payment_method: payload.payment_method,
        },
      );

      this.logger.log(`Payment ${transaction.id} marked as completed`);

      // Queue membership creation job
      await this.membershipQueue.add('create-membership', {
        tenantId: transaction.tenant_id,
        paymentTransactionId: transaction.id,
        botConfigurationId: transaction.bot_configuration_id,
        telegramUserId: transaction.telegram_user_id,
        channelId: transaction.bot_configuration?.channel_id, // TODO: Get from bot config
        expiresAt: transaction.membership_expires_at,
      }, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });

      this.logger.log(`Queued membership creation job for payment ${transaction.id}`);
    } else if (payload.payment_status === 'FAILED' || payload.invoice_status === 'FAILED') {
      updatedTransaction = await this.paymentTransactionService.markAsFailed(
        transaction.tenant_id,
        transaction.id,
      );

      this.logger.log(`Payment ${transaction.id} marked as failed`);
    }

    return {
      status: 'received',
      received_at: new Date().toISOString(),
      payment_status: updatedTransaction.status,
    };
  }

  private generateHmacSignature(payload: any): string {
    const payloadString = JSON.stringify(payload);
    return crypto.createHmac('sha256', this.QPAY_SECRET).update(payloadString).digest('hex');
  }
}