import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '../../../common/logger/logger.service';
import { QPayAuthService } from './qpay-auth.service';
import {
  CreateQPayMerchantPersonDto,
  QPayMerchantResponseDto,
  CreateMerchantFromTenantDto,
} from '../dto/qpay-merchant.dto';
import { QPayMerchantPerson, QPayMerchantResponse } from '../interfaces/qpay.interface';
import axios from 'axios';

/**
 * QPay Merchant Service
 *
 * Handles merchant registration and management with QPay.
 * Creates merchant accounts for tenants to enable payment processing.
 *
 * @see /qpay-doc.md for QPay Merchant API documentation
 */
@Injectable()
export class QPayMerchantService {
  // Default values for Mongolian location codes
  private readonly DEFAULT_CITY_CODE = '11000'; // Ulaanbaatar
  private readonly DEFAULT_DISTRICT_CODE = '12000'; // Bayanzurkh district
  private readonly DEFAULT_MCC_CODE = '5812'; // Digital goods/services

  constructor(
    private readonly qpayAuth: QPayAuthService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(QPayMerchantService.name);
  }

  /**
   * Create a QPay merchant (person type) from tenant registration data
   * This is called automatically when a new tenant registers
   */
  async createMerchantFromTenant(
    dto: CreateMerchantFromTenantDto,
  ): Promise<QPayMerchantResponseDto> {
    const startTime = Date.now();

    this.logger.info('Creating QPay merchant from tenant registration', {
      company_name: dto.company_name,
      email: dto.email,
    });

    try {
      // Parse owner name into first/last name
      const { firstName, lastName } = this.parseOwnerName(dto.owner_name);

      // Build merchant creation request
      const merchantDto: CreateQPayMerchantPersonDto = {
        register_number: dto.register_number,
        first_name: firstName,
        last_name: lastName,
        name: dto.owner_name,
        name_eng: this.transliterateToLatin(dto.owner_name),
        business_name: dto.company_name,
        business_name_eng: this.transliterateToLatin(dto.company_name),
        mcc_code: this.DEFAULT_MCC_CODE,
        city: this.DEFAULT_CITY_CODE,
        district: this.DEFAULT_DISTRICT_CODE,
        address: dto.address || 'Ulaanbaatar, Mongolia',
        phone: dto.phone,
        email: dto.email,
      };

      const result = await this.createMerchantPerson(merchantDto);

      this.logger.info('QPay merchant created successfully', {
        merchant_id: result.id,
        company_name: dto.company_name,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to create QPay merchant from tenant', '', {
        company_name: dto.company_name,
        error: error.message,
        duration: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Create a QPay merchant (person type)
   */
  async createMerchantPerson(
    dto: CreateQPayMerchantPersonDto,
  ): Promise<QPayMerchantResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.debug('Creating QPay person merchant', {
        business_name: dto.business_name,
        register_number: dto.register_number,
      });

      const client = await this.qpayAuth.getAuthenticatedClient();

      const requestBody: QPayMerchantPerson = {
        register_number: dto.register_number,
        first_name: dto.first_name,
        last_name: dto.last_name,
        name: dto.name,
        name_eng: dto.name_eng,
        business_name: dto.business_name,
        business_name_eng: dto.business_name_eng,
        mcc_code: dto.mcc_code,
        city: dto.city,
        district: dto.district,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
      };

      const response = await client.post<QPayMerchantResponse>(
        '/v2/merchant/person',
        requestBody,
      );

      this.logger.info('QPay person merchant created', {
        merchant_id: response.data.id,
        status: response.data.status,
        duration: Date.now() - startTime,
      });

      return {
        id: response.data.id,
        status: response.data.status,
        created_at: response.data.created_at,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const qpayError = error.response?.data;

        this.logger.error('QPay merchant creation failed', '', {
          status: error.response?.status,
          error: qpayError,
          business_name: dto.business_name,
          duration,
        });

        // Handle duplicate merchant error
        if (error.response?.status === 409) {
          throw new BadRequestException({
            error: {
              code: 'DUPLICATE_MERCHANT',
              message: 'A merchant with this registration number already exists in QPay.',
              details: {
                register_number: dto.register_number,
              },
            },
          });
        }

        // Handle validation errors
        if (error.response?.status === 400) {
          throw new BadRequestException({
            error: {
              code: 'INVALID_MERCHANT_DATA',
              message: 'Invalid merchant data provided to QPay.',
              details: qpayError,
            },
          });
        }

        throw new BadRequestException({
          error: {
            code: 'QPAY_MERCHANT_ERROR',
            message: qpayError?.message || 'Failed to create QPay merchant account.',
            details: qpayError || {},
          },
        });
      }

      this.logger.error('Unexpected error creating QPay merchant', '', {
        error: error.message,
        duration,
      });

      throw new BadRequestException({
        error: {
          code: 'MERCHANT_CREATION_FAILED',
          message: 'An unexpected error occurred while creating merchant account.',
        },
      });
    }
  }

  /**
   * Parse owner name into first and last name
   * Handles formats like: "Batjargal Oldokh", "Б.Олдох", etc.
   */
  private parseOwnerName(fullName: string): {
    firstName: string;
    lastName: string;
  } {
    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 1) {
      // Single name - use it for both
      return {
        firstName: parts[0],
        lastName: parts[0],
      };
    }

    // First part is first name, rest is last name
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  }

  /**
   * Simple transliteration from Cyrillic to Latin characters
   * Used for generating English names from Mongolian names
   */
  private transliterateToLatin(text: string): string {
    const cyrillicToLatin: Record<string, string> = {
      а: 'a',
      б: 'b',
      в: 'v',
      г: 'g',
      д: 'd',
      е: 'e',
      ё: 'yo',
      ж: 'zh',
      з: 'z',
      и: 'i',
      й: 'i',
      к: 'k',
      л: 'l',
      м: 'm',
      н: 'n',
      о: 'o',
      ө: 'o',
      п: 'p',
      р: 'r',
      с: 's',
      т: 't',
      у: 'u',
      ү: 'u',
      ф: 'f',
      х: 'kh',
      ц: 'ts',
      ч: 'ch',
      ш: 'sh',
      щ: 'shch',
      ъ: '',
      ы: 'y',
      ь: '',
      э: 'e',
      ю: 'yu',
      я: 'ya',
    };

    return text
      .toLowerCase()
      .split('')
      .map((char) => cyrillicToLatin[char] || char)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
