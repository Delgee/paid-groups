import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { QPayAuthService } from './services/qpay-auth.service';
import { QPayMerchantService } from './services/qpay-merchant.service';
import { LoggerModule } from '../../common/logger/logger.module';

/**
 * QPay Integration Module
 *
 * Provides services for integrating with QPay payment gateway:
 * - Authentication (token management)
 * - Merchant registration and management
 * - Invoice creation and management
 * - Payment verification
 * - Webhook handling
 *
 * @see /qpay-doc.md for complete API documentation
 */
@Module({
  imports: [ConfigModule, CacheModule.register(), LoggerModule],
  providers: [QPayAuthService, QPayMerchantService],
  exports: [QPayAuthService, QPayMerchantService],
})
export class QPayIntegrationModule {}
