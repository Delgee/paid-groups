import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for QPay bank account
 */
export class QPayBankAccountDto {
  @ApiProperty({
    description: 'Bank code (e.g., 040000 for Test Bank)',
    example: '040000',
  })
  @IsString()
  @IsNotEmpty()
  account_bank_code: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '490000869',
  })
  @IsString()
  @IsNotEmpty()
  account_number: string;

  @ApiProperty({
    description: 'Account holder name',
    example: 'Test Account',
  })
  @IsString()
  @IsNotEmpty()
  account_name: string;

  @ApiProperty({
    description: 'Whether this is the default account for payments',
    example: true,
  })
  @IsBoolean()
  is_default: boolean;
}

/**
 * DTO for creating a QPay invoice
 */
export class CreateQPayInvoiceDto {
  @ApiProperty({
    description: 'QPay merchant ID',
    example: '78fd75dc-7d1f-4cb4-8c08-765a8d4fa499',
  })
  @IsString()
  @IsNotEmpty()
  merchant_id: string;

  @ApiPropertyOptional({
    description: 'Branch code for multi-branch merchants',
    example: 'BRANCH_001',
  })
  @IsString()
  @IsOptional()
  branch_code?: string;

  @ApiProperty({
    description: 'Invoice amount in specified currency',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Currency code (MNT for Mongolian Tugrik)',
    example: 'MNT',
    default: 'MNT',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiPropertyOptional({
    description: 'Customer display name',
    example: 'Premium Group Membership',
  })
  @IsString()
  @IsOptional()
  customer_name?: string;

  @ApiPropertyOptional({
    description: 'Customer logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsOptional()
  customer_logo?: string;

  @ApiPropertyOptional({
    description: 'Webhook callback URL for payment notifications',
    example: 'https://api.example.com/webhooks/qpay',
  })
  @IsString()
  @IsOptional()
  callback_url?: string;

  @ApiPropertyOptional({
    description: 'Invoice description',
    example: 'Monthly membership payment for Premium Group',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Merchant Category Code',
    example: '5691',
  })
  @IsString()
  @IsOptional()
  mcc_code?: string;

  @ApiProperty({
    description: 'Array of bank accounts for receiving payments',
    type: [QPayBankAccountDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QPayBankAccountDto)
  bank_accounts: QPayBankAccountDto[];
}

/**
 * DTO for QPay invoice response
 */
export class QPayInvoiceUrlDto {
  @ApiProperty({
    description: 'Payment app name',
    example: 'qpay',
  })
  name: string;

  @ApiProperty({
    description: 'Payment app description',
    example: 'QPay app',
  })
  description: string;

  @ApiProperty({
    description: 'Payment app logo URL',
    example: 'https://qpay.mn/logo.png',
  })
  logo: string;

  @ApiProperty({
    description: 'Deep link URL for payment',
    example: 'https://qpay.mn/pay/84efa8c0-cf3f-43c0-9bc8-71d9c50602a9',
  })
  link: string;
}

export class QPayInvoiceResponseDto {
  @ApiProperty({
    description: 'Unique invoice identifier',
    example: '84efa8c0-cf3f-43c0-9bc8-71d9c50602a9',
  })
  invoice_id: string;

  @ApiProperty({
    description: 'QR code text for payment',
    example: 'qpay qr code text',
  })
  qr_text: string;

  @ApiProperty({
    description: 'QR code image URL',
    example: 'https://qpay.mn/qr/image.png',
  })
  qr_image: string;

  @ApiProperty({
    description: 'Payment URLs for different apps',
    type: [QPayInvoiceUrlDto],
  })
  urls: QPayInvoiceUrlDto[];
}

/**
 * DTO for checking payment status
 */
export class QPayPaymentCheckDto {
  @ApiProperty({
    description: 'Invoice ID to check payment status',
    example: '55bfb2ca-3517-4c9c-9427-45a2b5504746',
  })
  @IsString()
  @IsNotEmpty()
  invoice_id: string;
}

export enum QPayPaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

export class QPayPaymentCheckResponseDto {
  @ApiProperty({
    description: 'Invoice ID',
    example: '55bfb2ca-3517-4c9c-9427-45a2b5504746',
  })
  invoice_id: string;

  @ApiProperty({
    description: 'Payment status',
    enum: QPayPaymentStatus,
    example: QPayPaymentStatus.PAID,
  })
  payment_status: QPayPaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment amount',
    example: 10000,
  })
  payment_amount?: number;

  @ApiPropertyOptional({
    description: 'Payment currency',
    example: 'MNT',
  })
  payment_currency?: string;

  @ApiPropertyOptional({
    description: 'Payment date/time',
    example: '2025-01-04T12:30:00Z',
  })
  payment_date?: string;

  @ApiPropertyOptional({
    description: 'Transaction ID',
    example: 'txn_123456789',
  })
  transaction_id?: string;
}

export enum QPayInvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export class QPayInvoiceDetailsDto {
  @ApiProperty({
    description: 'Invoice ID',
    example: '84efa8c0-cf3f-43c0-9bc8-71d9c50602a9',
  })
  invoice_id: string;

  @ApiProperty({
    description: 'Merchant ID',
    example: '78fd75dc-7d1f-4cb4-8c08-765a8d4fa499',
  })
  merchant_id: string;

  @ApiProperty({
    description: 'Invoice amount',
    example: 10000,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'MNT',
  })
  currency: string;

  @ApiProperty({
    description: 'Invoice status',
    enum: QPayInvoiceStatus,
    example: QPayInvoiceStatus.PENDING,
  })
  status: QPayInvoiceStatus;

  @ApiPropertyOptional({
    description: 'Invoice description',
    example: 'Monthly membership payment',
  })
  description?: string;

  @ApiProperty({
    description: 'Invoice creation timestamp',
    example: '2025-01-04T12:00:00Z',
  })
  created_at: string;

  @ApiPropertyOptional({
    description: 'Payment timestamp',
    example: '2025-01-04T12:30:00Z',
  })
  paid_at?: string;

  @ApiProperty({
    description: 'QR code text',
    example: 'qpay qr code text',
  })
  qr_text: string;

  @ApiProperty({
    description: 'QR code image URL',
    example: 'https://qpay.mn/qr/image.png',
  })
  qr_image: string;
}
