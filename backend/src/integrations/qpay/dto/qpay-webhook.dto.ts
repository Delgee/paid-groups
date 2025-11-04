import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for QPay webhook payload
 * Received when a payment is completed
 */
export class QPayWebhookDto {
  @ApiProperty({
    description: 'Invoice ID associated with the payment',
    example: '84efa8c0-cf3f-43c0-9bc8-71d9c50602a9',
  })
  @IsString()
  @IsNotEmpty()
  invoice_id: string;

  @ApiProperty({
    description: 'Unique payment identifier',
    example: 'pay_123456789',
  })
  @IsString()
  @IsNotEmpty()
  payment_id: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 10000,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'MNT',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: 'Payment status (always PAID for webhooks)',
    example: 'PAID',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    description: 'Payment completion timestamp',
    example: '2025-01-04T12:30:00Z',
  })
  @IsString()
  @IsNotEmpty()
  paid_at: string;

  @ApiProperty({
    description: 'Transaction ID from payment gateway',
    example: 'txn_123456789',
  })
  @IsString()
  @IsNotEmpty()
  transaction_id: string;

  @ApiProperty({
    description: 'HMAC signature for webhook verification',
    example: 'abc123def456...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;
}
