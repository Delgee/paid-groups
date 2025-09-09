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
    this.logger.log(`Processing payment notification job: ${job.id}`);
    
    try {
      const { paymentId, type } = job.data;
      const payment = await this.paymentService.findById(paymentId);
      
      // TODO: Implement Telegram notification sending
      // This would typically:
      // 1. Get member's Telegram user ID
      // 2. Send appropriate message based on payment status
      // 3. Include payment details and membership information
      
      this.logger.log(`Payment notification sent for payment ${paymentId} (${type})`);
      
    } catch (error) {
      this.logger.error(`Failed to send payment notification for job ${job.id}:`, error);
      // Don't re-throw notification errors to avoid infinite retries
    }
  }
}