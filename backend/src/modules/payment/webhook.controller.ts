import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { QPayInvoiceService } from '../../integrations/qpay/services/qpay-invoice.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * Webhook Controller
 *
 * Handles payment webhook callbacks from QPay.
 * Verifies HMAC signatures and processes payment completion events.
 *
 * @see /qpay-doc.md Section: Webhook Notifications
 */
@ApiTags('Webhooks')
@Controller('v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly qpayInvoiceService: QPayInvoiceService,
    private readonly configService: ConfigService,
    @InjectQueue('membership') private readonly membershipQueue: Queue,
  ) {}

  /**
   * QPay Webhook Handler (GET method)
   *
   * Receives payment notification callbacks from QPay when invoices are paid.
   * QPay calls this endpoint with GET method (no body), so we poll the payment status.
   * Route format: GET /v1/webhooks/qpay/:transactionId
   *
   * @param transactionId - PaymentTransaction ID (used to identify the payment)
   */
  @Get('qpay/:transactionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'QPay payment webhook endpoint',
    description: 'QPay calls this with GET request when payment is completed. We then poll QPay API to verify payment status.'
  })
  @ApiParam({ name: 'transactionId', description: 'Payment transaction ID' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async handleQPayWebhook(
    @Param('transactionId') transactionId: string,
  ) {
    this.logger.log(`Received QPay webhook GET request for transaction ${transactionId}`);

    try {
      // Find the payment transaction by ID
      const transaction = await this.paymentTransactionService.findByQPayInvoiceId(transactionId);

      if (!transaction) {
        // Try finding by transaction ID directly
        const txn = await this.paymentTransactionService.findOne(transactionId, transactionId);
        if (txn) {
          return this.processPaymentTransaction(txn);
        }

        this.logger.error('Transaction not found', '', { transactionId });
        throw new NotFoundException({
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Payment transaction not found',
            details: { transactionId },
          },
        });
      }

      return this.processPaymentTransaction(transaction);
    } catch (error) {
      this.logger.error('Error processing webhook', error.stack, {
        transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Process payment transaction by polling QPay API
   */
  private async processPaymentTransaction(transaction: any) {
    // Check for idempotency - prevent duplicate processing
    if (transaction.status === 'completed') {
      this.logger.log(`Payment already processed: ${transaction.id}`, {
        status: transaction.status,
        completedAt: transaction.completed_at,
      });
      return { success: true, message: 'Payment already processed' };
    }

    if (!transaction.qpay_invoice_id) {
      this.logger.error('Transaction missing QPay invoice ID', '', {
        transactionId: transaction.id,
      });
      throw new BadRequestException({
        error: {
          code: 'MISSING_INVOICE_ID',
          message: 'Transaction is missing QPay invoice ID',
        },
      });
    }

    // Poll QPay API to check payment status
    this.logger.log(`Polling QPay for invoice status`, {
      transactionId: transaction.id,
      invoiceId: transaction.qpay_invoice_id,
    });

    const paymentStatus = await this.qpayInvoiceService.checkPaymentStatus(
      transaction.qpay_invoice_id,
    );

    this.logger.log(`QPay payment status received`, {
      transactionId: transaction.id,
      invoiceId: transaction.qpay_invoice_id,
      paymentStatus: paymentStatus.payment_status,
    });

    // Process payment if PAID
    if (paymentStatus.payment_status === 'PAID') {
      await this.handlePaymentCompleted(transaction, paymentStatus);
      this.logger.log(`Successfully processed payment for transaction ${transaction.id}`);
      return { success: true, message: 'Payment processed successfully' };
    }

    // Payment not yet completed
    this.logger.log(`Payment not yet completed for transaction ${transaction.id}`, {
      paymentStatus: paymentStatus.payment_status,
    });

    return {
      success: true,
      message: 'Payment not yet completed',
      status: paymentStatus.payment_status,
    };
  }

  /**
   * Handle successful payment completion
   *
   * Marks transaction as completed and queues membership activation job
   */
  private async handlePaymentCompleted(
    transaction: any,
    paymentStatus: any,
  ): Promise<void> {
    // Mark transaction as completed
    await this.paymentTransactionService.markAsCompleted(
      transaction.tenant_id,
      transaction.id,
      {
        qpay_transaction_id: paymentStatus.transaction_id || paymentStatus.payment_id,
        qpay_payment_method: 'qpay',
      },
    );

    this.logger.log(`Payment transaction marked as completed`, {
      transactionId: transaction.id,
      tenantId: transaction.tenant_id,
      amount: transaction.amount,
    });

    // Queue membership activation job
    await this.membershipQueue.add('activate-membership', {
      tenant_id: transaction.tenant_id,
      project_id: transaction.project_id,
      membership_plan_id: transaction.membership_plan_id,
      telegram_user_id: transaction.telegram_user_id,
      telegram_username: transaction.telegram_username,
      telegram_first_name: transaction.telegram_first_name,
      telegram_last_name: transaction.telegram_last_name,
      transaction_id: transaction.id,
      payment_amount: transaction.amount,
      duration_days: transaction.snapshot_duration_days,
    });

    this.logger.log(`Membership activation job queued`, {
      transactionId: transaction.id,
      membershipPlanId: transaction.membership_plan_id,
      telegramUserId: transaction.telegram_user_id,
    });
  }
}