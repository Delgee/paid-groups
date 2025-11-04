import {
  Injectable,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { LoggerService } from '../../../common/logger/logger.service';
import { QPayAuthService } from './qpay-auth.service';
import {
  QPayInvoiceRequest,
  QPayInvoiceResponse,
  QPayInvoiceDetails,
  QPayPaymentCheckRequest,
  QPayPaymentCheckResponse,
  QPayErrorResponse,
} from '../interfaces/qpay.interface';

/**
 * QPay Invoice Service
 *
 * Handles invoice creation, payment verification, and invoice management.
 * Integrates with QPay v2 Invoice API for payment processing.
 *
 * @see /qpay-doc.md Section: Invoice Management
 */
@Injectable()
export class QPayInvoiceService {
  private readonly baseUrl: string;
  private readonly callbackBaseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly qpayAuthService: QPayAuthService,
  ) {
    this.baseUrl = this.configService.getOrThrow<string>('QPAY_BASE_URL');
    this.callbackBaseUrl = this.configService.getOrThrow<string>(
      'QPAY_CALLBACK_BASE_URL',
    );
    this.logger.setContext(QPayInvoiceService.name);
  }

  /**
   * Create a payment invoice for a membership purchase
   *
   * @param merchantId - QPay merchant ID (from tenant)
   * @param amount - Invoice amount in MNT
   * @param description - Invoice description (plan name)
   * @param bankAccount - Bank account details for receiving payment
   * @param metadata - Additional metadata for callback identification
   * @returns Invoice details with payment link and QR code
   */
  async createInvoice(params: {
    merchantId: string;
    amount: number;
    description: string;
    customerName?: string;
    bankAccount: {
      accountBankCode: string;
      accountNumber: string;
      accountName: string;
    };
    transactionId: string; // Payment transaction ID for callback identification
  }): Promise<QPayInvoiceResponse> {
    const startTime = Date.now();
    const correlationId = params.transactionId;

    try {
      this.logger.info('Creating QPay invoice', {
        correlationId,
        merchantId: params.merchantId,
        amount: params.amount,
        description: params.description,
      });

      // Get authenticated HTTP client
      const client = await this.getAuthenticatedClient();

      // Build invoice request
      const invoiceRequest: QPayInvoiceRequest = {
        merchant_id: params.merchantId,
        amount: params.amount,
        currency: 'MNT',
        customer_name: params.customerName,
        callback_url: `${this.callbackBaseUrl}/v1/webhooks/qpay/${params.transactionId}`,
        description: params.description,
        bank_accounts: [
          {
            account_bank_code: params.bankAccount.accountBankCode,
            account_number: params.bankAccount.accountNumber,
            account_name: params.bankAccount.accountName,
            is_default: true,
          },
        ],
      };

      this.logger.debug('Sending invoice request to QPay', {
        correlationId,
        invoiceRequest: {
          ...invoiceRequest,
          // Mask account number in logs
          bank_accounts: invoiceRequest.bank_accounts.map((acc) => ({
            ...acc,
            account_number: `***${acc.account_number.slice(-4)}`,
          })),
        },
      });

      // Create invoice via QPay API
      const response = await client.post<QPayInvoiceResponse>(
        '/v2/invoice',
        invoiceRequest,
      );

      const duration = Date.now() - startTime;

      this.logger.info('QPay invoice created successfully', {
        correlationId,
        invoiceId: response.data.invoice_id,
        duration,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const qpayError = error.response?.data as QPayErrorResponse;

        this.logger.error('QPay invoice creation failed', '', {
          correlationId,
          status: error.response?.status,
          errorCode: qpayError?.error?.code,
          errorMessage: qpayError?.error?.message,
          duration,
        });

        // Handle specific error cases
        if (error.response?.status === 404) {
          throw new BadRequestException({
            error: {
              code: 'MERCHANT_NOT_FOUND',
              message: 'Merchant not found. Please check merchant registration.',
              details: {
                merchantId: params.merchantId,
                correlationId,
              },
            },
          });
        }

        if (error.response?.status === 422) {
          throw new UnprocessableEntityException({
            error: {
              code: 'INVALID_INVOICE_DATA',
              message: 'Invoice data validation failed. Please check bank account details.',
              details: {
                qpayError: qpayError?.error?.message,
                correlationId,
              },
            },
          });
        }

        throw new UnprocessableEntityException({
          error: {
            code: 'QPAY_INVOICE_FAILED',
            message: 'Failed to create payment invoice. Please try again.',
            details: {
              qpayError: qpayError?.error?.message,
              correlationId,
            },
          },
        });
      }

      this.logger.error('Unexpected error during QPay invoice creation', '', {
        correlationId,
        error: error.message,
        duration,
      });

      throw new UnprocessableEntityException({
        error: {
          code: 'INVOICE_CREATE_ERROR',
          message: 'An unexpected error occurred while creating the invoice.',
          details: {
            correlationId,
          },
        },
      });
    }
  }

  /**
   * Get invoice details by invoice ID
   *
   * @param invoiceId - QPay invoice ID
   * @returns Invoice details including payment status
   */
  async getInvoice(invoiceId: string): Promise<QPayInvoiceDetails> {
    const startTime = Date.now();

    try {
      this.logger.debug('Fetching QPay invoice details', { invoiceId });

      const client = await this.getAuthenticatedClient();

      const response = await client.get<QPayInvoiceDetails>(
        `/v2/invoice/${invoiceId}`,
      );

      const duration = Date.now() - startTime;

      this.logger.debug('QPay invoice details fetched successfully', {
        invoiceId,
        status: response.data.status,
        duration,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const qpayError = error.response?.data as QPayErrorResponse;

        this.logger.error('Failed to fetch QPay invoice details', '', {
          invoiceId,
          status: error.response?.status,
          errorCode: qpayError?.error?.code,
          errorMessage: qpayError?.error?.message,
          duration,
        });

        if (error.response?.status === 404) {
          throw new BadRequestException({
            error: {
              code: 'INVOICE_NOT_FOUND',
              message: 'Invoice not found',
              details: { invoiceId },
            },
          });
        }
      }

      this.logger.error('Unexpected error fetching invoice details', '', {
        invoiceId,
        error: error.message,
        duration,
      });

      throw new BadRequestException({
        error: {
          code: 'INVOICE_FETCH_ERROR',
          message: 'Failed to fetch invoice details',
        },
      });
    }
  }

  /**
   * Check payment status for an invoice
   *
   * @param invoiceId - QPay invoice ID
   * @returns Payment status and details
   */
  async checkPaymentStatus(
    invoiceId: string,
  ): Promise<QPayPaymentCheckResponse> {
    const startTime = Date.now();

    try {
      this.logger.debug('Checking QPay payment status', { invoiceId });

      const client = await this.getAuthenticatedClient();

      const request: QPayPaymentCheckRequest = { invoice_id: invoiceId };

      const response = await client.post<QPayPaymentCheckResponse>(
        '/v2/payment/check',
        request,
      );

      const duration = Date.now() - startTime;

      this.logger.info('QPay payment status checked', {
        invoiceId,
        paymentStatus: response.data.payment_status,
        duration,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const qpayError = error.response?.data as QPayErrorResponse;

        this.logger.error('Failed to check QPay payment status', '', {
          invoiceId,
          status: error.response?.status,
          errorCode: qpayError?.error?.code,
          errorMessage: qpayError?.error?.message,
          duration,
        });
      }

      this.logger.error('Unexpected error checking payment status', '', {
        invoiceId,
        error: error.message,
        duration,
      });

      throw new BadRequestException({
        error: {
          code: 'PAYMENT_CHECK_ERROR',
          message: 'Failed to check payment status',
        },
      });
    }
  }

  /**
   * Cancel an unpaid invoice
   *
   * @param invoiceId - QPay invoice ID
   * @returns Cancellation result
   */
  async cancelInvoice(invoiceId: string): Promise<{ success: boolean }> {
    const startTime = Date.now();

    try {
      this.logger.info('Cancelling QPay invoice', { invoiceId });

      const client = await this.getAuthenticatedClient();

      await client.delete(`/v2/invoice/${invoiceId}`);

      const duration = Date.now() - startTime;

      this.logger.info('QPay invoice cancelled successfully', {
        invoiceId,
        duration,
      });

      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const qpayError = error.response?.data as QPayErrorResponse;

        this.logger.error('Failed to cancel QPay invoice', '', {
          invoiceId,
          status: error.response?.status,
          errorCode: qpayError?.error?.code,
          errorMessage: qpayError?.error?.message,
          duration,
        });

        if (error.response?.status === 422) {
          throw new UnprocessableEntityException({
            error: {
              code: 'INVOICE_ALREADY_PAID',
              message: 'Cannot cancel an invoice that has already been paid',
              details: { invoiceId },
            },
          });
        }
      }

      this.logger.error('Unexpected error cancelling invoice', '', {
        invoiceId,
        error: error.message,
        duration,
      });

      throw new UnprocessableEntityException({
        error: {
          code: 'INVOICE_CANCEL_ERROR',
          message: 'Failed to cancel invoice',
        },
      });
    }
  }

  /**
   * Get authenticated HTTP client with QPay bearer token
   */
  private async getAuthenticatedClient(): Promise<AxiosInstance> {
    return this.qpayAuthService.getAuthenticatedClient();
  }
}