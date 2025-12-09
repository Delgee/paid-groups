import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { MembershipModule } from './modules/membership/membership.module';
import { PaymentModule } from './modules/payment/payment.module';
import { HealthModule } from './modules/health/health.module';
import { UserManagementModule } from './modules/user-management/user-management.module';
import { TelegramGroupsModule } from './modules/telegram-groups/telegram-groups.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MembershipPlanModule } from './modules/membership-plan/membership-plan.module';
import { ProjectModule } from './modules/project/project.module';
import { OnboardingBotModule } from './modules/onboarding-bot/onboarding-bot.module';
import { ChannelIdBotModule } from './modules/channel-id-bot/channel-id-bot.module';
import { LoggerModule } from './common/logger/logger.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { RequestContextMiddleware } from './common/middleware/request-context.middleware';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { TelegramIntegrationModule } from './integrations/telegram/telegram-integration.module';
import { QPayIntegrationModule } from './integrations/qpay/qpay-integration.module';
import { GlobalBotWebhookService } from './common/services/global-bot-webhook.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow('DB_HOST'),
        port: configService.getOrThrow('DB_PORT'),
        username: configService.getOrThrow('DB_USERNAME'),
        password: configService.getOrThrow('DB_PASSWORD'),
        database: configService.getOrThrow('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        // Allow override via TYPEORM_SYNCHRONIZE env var, otherwise use NODE_ENV check
        synchronize: configService.get('TYPEORM_SYNCHRONIZE') === 'true' || configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.getOrThrow('REDIS_HOST'),
          port: configService.getOrThrow('REDIS_PORT'),
          password: configService.getOrThrow('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        store: redisStore,
        host: configService.getOrThrow('REDIS_HOST'),
        port: configService.getOrThrow('REDIS_PORT'),
        password: configService.getOrThrow('REDIS_PASSWORD'),
        ttl: 3600, // 1 hour default TTL
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    LoggerModule,
    MetricsModule,
    AuthModule,
    TenantModule,
    ProjectModule,
    MembershipModule,
    MembershipPlanModule,
    PaymentModule,
    HealthModule,
    UserManagementModule,
    TelegramGroupsModule,
    AnalyticsModule,
    AdminModule,
    OnboardingBotModule,
    ChannelIdBotModule,
    TelegramIntegrationModule,
    QPayIntegrationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    GlobalBotWebhookService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, RequestContextMiddleware)
      .forRoutes('*');
  }
}
