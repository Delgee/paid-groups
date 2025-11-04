import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a QPay merchant (person type)
 * Used when registering a new tenant in the system
 */
export class CreateQPayMerchantPersonDto {
  @ApiProperty({
    description: 'Personal registration number (РД)',
    example: 'АМ05321712',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Register number must be exactly 10 characters' })
  register_number: string;

  @ApiProperty({
    description: 'First name of the person',
    example: 'Batjargal',
  })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({
    description: 'Last name of the person',
    example: 'Oldokh',
  })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    description: 'Full name (Mongolian)',
    example: 'Б.Олдох',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Full name (English)',
    example: 'B.Oldokh',
  })
  @IsString()
  @IsOptional()
  name_eng?: string;

  @ApiProperty({
    description: 'Business/merchant display name',
    example: 'Premium Telegram Groups',
  })
  @IsString()
  @IsNotEmpty()
  business_name: string;

  @ApiPropertyOptional({
    description: 'Business name (English)',
    example: 'Premium Telegram Groups',
  })
  @IsString()
  @IsOptional()
  business_name_eng?: string;

  @ApiProperty({
    description: 'Merchant Category Code (MCC)',
    example: '5816',
    default: '5816',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/, { message: 'MCC code must be 4 digits' })
  mcc_code: string;

  @ApiProperty({
    description: 'City code from QPay',
    example: '11000',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'District code from QPay',
    example: '17000',
  })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty({
    description: 'Full address',
    example: 'Улаанбаатар хот, Сүхбаатар дүүрэг, 1-р хороо',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '99112210',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'Phone must be 8 digits' })
  phone: string;

  @ApiProperty({
    description: 'Contact email address',
    example: 'business@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * Response DTO for merchant creation
 */
export class QPayMerchantResponseDto {
  @ApiProperty({
    description: 'QPay merchant ID (UUID)',
    example: '78fd75dc-7d1f-4cb4-8c08-765a8d4fa499',
  })
  id: string;

  @ApiProperty({
    description: 'Merchant status',
    enum: ['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED'],
    example: 'ACTIVE',
  })
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED';

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-04T12:00:00Z',
  })
  created_at: string;
}

/**
 * DTO for creating merchant from tenant data
 * Simplifies merchant creation using tenant registration info
 */
export class CreateMerchantFromTenantDto {
  @ApiProperty({
    description: 'Personal registration number',
    example: 'АМ05321712',
  })
  @IsString()
  @IsNotEmpty()
  register_number: string;

  @ApiProperty({
    description: 'Owner full name',
    example: 'Batjargal Oldokh',
  })
  @IsString()
  @IsNotEmpty()
  owner_name: string;

  @ApiProperty({
    description: 'Business/company name',
    example: 'Premium Telegram Groups',
  })
  @IsString()
  @IsNotEmpty()
  company_name: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'business@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Contact phone (8 digits)',
    example: '99112210',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8}$/, { message: 'Phone must be 8 digits' })
  phone: string;

  @ApiPropertyOptional({
    description: 'Business address',
    example: 'Улаанбаатар хот, Сүхбаатар дүүрэг',
  })
  @IsString()
  @IsOptional()
  address?: string;
}
