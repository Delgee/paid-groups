import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaymentService } from './services/payment.service';
import { Payment } from './entities/payment.entity';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payments for tenant' })
  @ApiResponse({ status: 200, description: 'Returns list of payments' })
  async getPayments(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ): Promise<{
    payments: Payment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const tenantId = (req.user as any).tenant_id;
    
    // TODO: Implement pagination and filtering
    // For now, return basic stats to demonstrate the service
    const stats = await this.paymentService.getPaymentStats(tenantId);
    
    return {
      payments: [],
      total: stats.total,
      page,
      limit,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get payment statistics for tenant' })
  @ApiResponse({ status: 200, description: 'Returns payment statistics' })
  async getPaymentStats(@Req() req: Request): Promise<{
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalRevenue: number;
  }> {
    const tenantId = (req.user as any).tenant_id;
    return this.paymentService.getPaymentStats(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Returns payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(
    @Param('id') paymentId: string,
    @Req() req: Request,
  ): Promise<Payment> {
    const payment = await this.paymentService.findById(paymentId);
    
    // Verify payment belongs to user's tenant
    const tenantId = (req.user as any).tenant_id;
    if (payment.tenant_id !== tenantId) {
      throw new Error('Payment not found');
    }
    
    return payment;
  }

  @Post(':id/retry')
  @ApiOperation({ 
    summary: 'Retry processing a failed payment',
    description: 'Manually retry processing for a failed payment by re-queuing it'
  })
  @ApiResponse({ status: 200, description: 'Payment retry queued successfully' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  @ApiResponse({ status: 400, description: 'Payment cannot be retried' })
  async retryPayment(
    @Param('id') paymentId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const payment = await this.paymentService.findById(paymentId);
    
    // Verify payment belongs to user's tenant
    const tenantId = (req.user as any).tenant_id;
    if (payment.tenant_id !== tenantId) {
      throw new Error('Payment not found');
    }

    // Only retry failed or pending payments
    if (!['failed', 'pending'].includes(payment.status)) {
      return {
        success: false,
        message: 'Only failed or pending payments can be retried',
      };
    }

    // Queue payment for retry processing
    if (payment.qpay_payment_id) {
      await this.paymentService.queuePaymentCompleted({
        paymentId: payment.id,
        qpayPaymentId: payment.qpay_payment_id,
        invoiceId: payment.qpay_invoice_id,
        amount: Number(payment.amount_mnt),
        currency: payment.currency,
        tenantId: payment.tenant_id,
        memberId: payment.member_id,
        planId: payment.metadata?.plan_id,
        metadata: payment.metadata || {},
      });

      return {
        success: true,
        message: 'Payment retry queued successfully',
      };
    }

    return {
      success: false,
      message: 'Cannot retry payment without QPay payment ID',
    };
  }
}