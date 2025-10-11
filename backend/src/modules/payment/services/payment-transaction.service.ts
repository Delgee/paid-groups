import {
  Injectable,
  NotFoundException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction, PaymentStatus } from '../entities/payment-transaction.entity';
import { CreatePaymentTransactionDto } from '../dto/create-payment-transaction.dto';
import { UpdatePaymentTransactionDto } from '../dto/update-payment-transaction.dto';
import { MembershipPlanService } from '../../membership-plan/services/membership-plan.service';
import { MetricsService } from '../../../common/metrics/metrics.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentTransactionService {
  private readonly logger = new Logger(PaymentTransactionService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly metricsService: MetricsService,
  ) {}

  async create(
    tenantId: string,
    createDto: CreatePaymentTransactionDto,
  ): Promise<PaymentTransaction> {
    this.logger.log(`Creating payment transaction for tenant ${tenantId}`);

    // Verify membership plan exists and is active
    const membershipPlan = await this.membershipPlanService.findOne(
      tenantId,
      createDto.membership_plan_id,
    );

    if (!membershipPlan.is_active) {
      throw new UnprocessableEntityException({
        error: {
          code: 'MEMBERSHIP_PLAN_INACTIVE',
          message: 'This membership plan is no longer available',
        },
      });
    }

    const paymentTransaction = this.paymentTransactionRepository.create({
      ...createDto,
      tenant_id: tenantId,
      status: PaymentStatus.PENDING,
    });

    const saved = await this.paymentTransactionRepository.save(paymentTransaction);
    this.logger.log(`Payment transaction created: ${saved.id}`);

    // Record metrics
    this.metricsService.recordPayment('pending', 'qpay', tenantId);

    return saved;
  }

  async initiatePayment(
    tenantId: string,
    createDto: CreatePaymentTransactionDto,
  ): Promise<{ transaction: PaymentTransaction; payment_link: string }> {
    const correlationId = uuidv4();
    this.logger.log(`Initiating payment with correlation ID: ${correlationId}`);

    // Create payment transaction
    const transaction = await this.create(tenantId, createDto);

    // Generate QPay invoice
    // TODO: Integrate with QPay API
    const qpayInvoiceId = `INV_${Date.now()}_${transaction.id.slice(0, 8)}`;
    const paymentLink = `https://payment.qpay.mn/invoice/${qpayInvoiceId}`;

    // Update transaction with QPay details
    transaction.qpay_invoice_id = qpayInvoiceId;
    transaction.payment_link = paymentLink;

    const updated = await this.paymentTransactionRepository.save(transaction);

    this.logger.log(`Payment link generated: ${paymentLink}`, {
      correlationId,
      transactionId: transaction.id,
    });

    return {
      transaction: updated,
      payment_link: paymentLink,
    };
  }

  async findOne(tenantId: string, id: string): Promise<PaymentTransaction> {
    this.logger.log(`Fetching payment transaction ${id} for tenant ${tenantId}`);

    const paymentTransaction = await this.paymentTransactionRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!paymentTransaction) {
      throw new NotFoundException({
        error: {
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment transaction not found',
        },
      });
    }

    return paymentTransaction;
  }

  async findByQPayInvoiceId(qpayInvoiceId: string): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepository.findOne({
      where: { qpay_invoice_id: qpayInvoiceId },
    });
  }

  async findAll(
    tenantId: string,
    filters?: {
      project_id?: string;
      membership_plan_id?: string;
      telegram_user_id?: string;
      status?: PaymentStatus;
    },
  ): Promise<PaymentTransaction[]> {
    this.logger.log(`Fetching payment transactions for tenant ${tenantId}`);

    const where: any = { tenant_id: tenantId };

    if (filters?.project_id) {
      where.project_id = filters.project_id;
    }

    if (filters?.membership_plan_id) {
      where.membership_plan_id = filters.membership_plan_id;
    }

    if (filters?.telegram_user_id) {
      where.telegram_user_id = filters.telegram_user_id;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.paymentTransactionRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdatePaymentTransactionDto,
  ): Promise<PaymentTransaction> {
    this.logger.log(`Updating payment transaction ${id} for tenant ${tenantId}`);

    const paymentTransaction = await this.findOne(tenantId, id);

    Object.assign(paymentTransaction, updateDto);
    const updated = await this.paymentTransactionRepository.save(paymentTransaction);

    this.logger.log(`Payment transaction updated: ${id}`);
    return updated;
  }

  async markAsCompleted(
    tenantId: string,
    id: string,
    qpayData: {
      qpay_transaction_id: string;
      qpay_payment_method?: string;
    },
  ): Promise<PaymentTransaction> {
    this.logger.log(`Marking payment ${id} as completed`);

    const paymentTransaction = await this.findOne(tenantId, id);

    if (paymentTransaction.status === PaymentStatus.COMPLETED) {
      this.logger.warn(`Payment ${id} already completed`);
      return paymentTransaction;
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + paymentTransaction.snapshot_duration_days);

    paymentTransaction.status = PaymentStatus.COMPLETED;
    paymentTransaction.qpay_transaction_id = qpayData.qpay_transaction_id;
    paymentTransaction.qpay_payment_method = qpayData.qpay_payment_method;
    paymentTransaction.membership_starts_at = now;
    paymentTransaction.membership_expires_at = expiresAt;
    paymentTransaction.completed_at = now;

    const updated = await this.paymentTransactionRepository.save(paymentTransaction);
    this.logger.log(`Payment ${id} marked as completed`);

    // Record metrics
    this.metricsService.recordPayment(
      'completed',
      'qpay',
      tenantId,
      paymentTransaction.amount,
      paymentTransaction.snapshot_plan_name
    );

    return updated;
  }

  async markAsFailed(tenantId: string, id: string): Promise<PaymentTransaction> {
    this.logger.log(`Marking payment ${id} as failed`);

    const paymentTransaction = await this.findOne(tenantId, id);
    paymentTransaction.status = PaymentStatus.FAILED;

    // Record metrics
    this.metricsService.recordPayment('failed', 'qpay', tenantId);

    return this.paymentTransactionRepository.save(paymentTransaction);
  }
}
