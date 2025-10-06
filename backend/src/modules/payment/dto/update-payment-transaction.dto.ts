import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, IsDateString } from 'class-validator';
import { PaymentStatus } from '../entities/payment-transaction.entity';

export class UpdatePaymentTransactionDto {
  @ApiPropertyOptional({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'QPay invoice identifier',
    example: 'INV_1234567890',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  qpay_invoice_id?: string;

  @ApiPropertyOptional({
    description: 'QPay transaction identifier',
    example: 'TXN_0987654321',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  qpay_transaction_id?: string;

  @ApiPropertyOptional({
    description: 'Payment method used',
    example: 'qpay_wallet',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  qpay_payment_method?: string;

  @ApiPropertyOptional({
    description: 'QPay payment link',
    example: 'https://payment.qpay.mn/invoice/123456',
  })
  @IsString()
  @IsOptional()
  payment_link?: string;

  @ApiPropertyOptional({
    description: 'Membership start date',
    example: '2024-01-20T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  membership_starts_at?: string;

  @ApiPropertyOptional({
    description: 'Membership expiration date',
    example: '2024-02-20T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  membership_expires_at?: string;

  @ApiPropertyOptional({
    description: 'Payment completion timestamp',
    example: '2024-01-20T10:05:00Z',
  })
  @IsDateString()
  @IsOptional()
  completed_at?: string;
}
