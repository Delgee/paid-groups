import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PaymentLogger } from '../../../common/logger/application-loggers';
import { PaymentService, ProcessPaymentCompletedData, ProcessPaymentFailedData } from '../services/payment.service';

interface PaymentNotificationData {
  paymentId: string;
  type: 'completed' | 'failed';
}

@Processor('payment-processing')
export class PaymentProcessor {
  private readonly logger = new PaymentLogger();

  constructor(private readonly paymentService: PaymentService) {}

  @Process('process-payment-completed')
  async handlePaymentCompleted(job: Job<ProcessPaymentCompletedData>) {
    this.logger.queueJobStarted('process-payment-completed', job.id.toString(), job.data.qpayPaymentId);
    const startTime = Date.now();
    
    try {
      await this.paymentService.processPaymentCompleted(job.data);
      const duration = Date.now() - startTime;
      this.logger.queueJobCompleted('process-payment-completed', job.id.toString(), duration);
    } catch (error) {
      this.logger.queueJobFailed(
        'process-payment-completed', 
        job.id.toString(), 
        error.message,
        job.attemptsMade
      );
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  @Process('process-payment-failed')
  async handlePaymentFailed(job: Job<ProcessPaymentFailedData>) {
    this.logger.log(`Processing payment failed job: ${job.id}`);
    
    try {
      await this.paymentService.processPaymentFailed(job.data);
      this.logger.log(`Successfully processed payment failed job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Failed to process payment failed job ${job.id}:`, error);
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  @Process('send-payment-notification')
  async handlePaymentNotification(job: Job<PaymentNotificationData>) {
    this.logger.info(`Processing payment notification job: ${job.id}`);

    try {
      const { paymentId, type } = job.data;

      // Get payment with member and membership relations
      const payment = await this.paymentService.findById(paymentId);

      if (!payment.member || !payment.member.telegram_user_id) {
        this.logger.warn(`Cannot send notification - no Telegram user ID for payment ${paymentId}`);
        return;
      }

      // Send notification via payment service helper method
      await this.paymentService.sendPaymentNotification(payment, type);

      this.logger.info(`Payment notification sent for payment ${paymentId} (${type})`);

    } catch (error) {
      this.logger.error(`Failed to send payment notification for job ${job.id}:`, error.message);
      // Don't re-throw notification errors to avoid infinite retries
    }
  }
}