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
import { QPayInvoiceService } from '../../../integrations/qpay/services/qpay-invoice.service';
import { TenantService } from '../../tenant/services/tenant.service';
import { ProjectService } from '../../project/services/project.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentTransactionService {
  private readonly logger = new Logger(PaymentTransactionService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    private readonly membershipPlanService: MembershipPlanService,
    private readonly metricsService: MetricsService,
    private readonly qpayInvoiceService: QPayInvoiceService,
    private readonly tenantService: TenantService,
    private readonly projectService: ProjectService,
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
  ): Promise<{
    transaction: PaymentTransaction;
    payment_link: string;
    qr_image?: string;
    payment_urls?: Array<{ name: string; link: string; logo: string; description: string }>;
  }> {
    const correlationId = uuidv4();
    this.logger.log(`Initiating payment with correlation ID: ${correlationId}`);

    // Create payment transaction
    const transaction = await this.create(tenantId, createDto);

    try {
      // Get tenant details for QPay merchant ID
      const tenant = await this.tenantService.findById(tenantId);

      if (!tenant.qpay_merchant_id) {
        throw new UnprocessableEntityException({
          error: {
            code: 'MERCHANT_NOT_CONFIGURED',
            message: 'Payment gateway not configured. Please contact support.',
            details: {
              correlationId,
              transactionId: transaction.id,
            },
          },
        });
      }

      // Get project details for bank account information
      const project = await this.projectService.findOne(
        tenantId,
        createDto.project_id,
      );

      if (!project.account_bank_code || !project.account_number || !project.account_name) {
        throw new UnprocessableEntityException({
          error: {
            code: 'BANK_ACCOUNT_NOT_CONFIGURED',
            message: 'Bank account not configured for this project. Please contact support.',
            details: {
              correlationId,
              transactionId: transaction.id,
            },
          },
        });
      }

      // Create QPay invoice
      const invoiceResponse = await this.qpayInvoiceService.createInvoice({
        merchantId: tenant.qpay_merchant_id,
        amount: transaction.amount,
        description: `${transaction.snapshot_plan_name} - ${transaction.telegram_first_name || 'User'}`,
        customerName: transaction.telegram_username || transaction.telegram_first_name,
        bankAccount: {
          accountBankCode: project.account_bank_code,
          accountNumber: project.account_number,
          accountName: project.account_name,
        },
        transactionId: transaction.id,
      });

      // Extract payment link from QPay response
      const qpayPaymentLink = invoiceResponse.urls.find(
        (url) => url.name === 'qpay',
      )?.link;

      if (!qpayPaymentLink) {
        throw new UnprocessableEntityException({
          error: {
            code: 'PAYMENT_LINK_NOT_GENERATED',
            message: 'Failed to generate payment link. Please try again.',
            details: {
              correlationId,
              transactionId: transaction.id,
            },
          },
        });
      }

      // Update transaction with QPay details
      transaction.qpay_invoice_id = invoiceResponse.invoice_id;
      transaction.payment_link = qpayPaymentLink;

      const updated = await this.paymentTransactionRepository.save(transaction);

      this.logger.log(`QPay invoice created successfully`, {
        correlationId,
        transactionId: transaction.id,
        invoiceId: invoiceResponse.invoice_id,
        paymentLink: qpayPaymentLink,
      });

      return {
        transaction: updated,
        payment_link: qpayPaymentLink,
        qr_image: invoiceResponse.qr_image, // Base64 encoded QR code image
        payment_urls: invoiceResponse.urls, // Array of mobile app deeplinks
      };
    } catch (error) {
      // Mark transaction as failed
      transaction.status = PaymentStatus.FAILED;
      await this.paymentTransactionRepository.save(transaction);

      this.logger.error('Failed to create QPay invoice', '', {
        correlationId,
        transactionId: transaction.id,
        error: error.message,
      });

      // Re-throw the error to be handled by the caller
      throw error;
    }
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
