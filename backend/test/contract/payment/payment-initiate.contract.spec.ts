import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('POST /v1/payments/initiate (Contract Test)', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;
  let botConfigurationId: string;
  let membershipPlanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // TODO: Replace with actual setup
    authToken = 'mock-jwt-token';
    tenantId = '550e8400-e29b-41d4-a716-446655440000';
    botConfigurationId = '550e8400-e29b-41d4-a716-446655440001';
    membershipPlanId = '550e8400-e29b-41d4-a716-446655440002';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Request Validation', () => {
    it('should reject request with invalid membership_plan_id', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          membership_plan_id: 'not-a-uuid',
          project_id: botConfigurationId,
          telegram_user_id: '123456789',
          amount: 50000,
          snapshot_plan_name: 'Monthly Premium',
          snapshot_price: 50000,
          snapshot_duration_days: 30,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('membership_plan_id');
    });

    it('should reject request with invalid telegram_user_id format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          membership_plan_id: membershipPlanId,
          project_id: botConfigurationId,
          telegram_user_id: 'not-a-number',
          amount: 50000,
          snapshot_plan_name: 'Monthly Premium',
          snapshot_price: 50000,
          snapshot_duration_days: 30,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('telegram_user_id');
    });

    it('should reject request with amount <= 0', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          membership_plan_id: membershipPlanId,
          project_id: botConfigurationId,
          telegram_user_id: '123456789',
          amount: 0,
          snapshot_plan_name: 'Monthly Premium',
          snapshot_price: 50000,
          snapshot_duration_days: 30,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('amount');
    });

    it('should reject request with missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          membership_plan_id: membershipPlanId,
          telegram_user_id: '123456789',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Response Schema', () => {
    it('should return 201 with payment transaction and QPay link', async () => {
      const validRequest = {
        membership_plan_id: membershipPlanId,
        project_id: botConfigurationId,
        telegram_user_id: '123456789',
        telegram_username: 'testuser',
        telegram_first_name: 'Test',
        telegram_last_name: 'User',
        amount: 50000,
        snapshot_plan_name: 'Monthly Premium',
        snapshot_price: 50000,
        snapshot_duration_days: 30,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validRequest)
        .expect(201);

      // Verify payment transaction shape
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('tenant_id', tenantId);
      expect(response.body).toHaveProperty('membership_plan_id', membershipPlanId);
      expect(response.body).toHaveProperty('bot_configuration_id', botConfigurationId);
      expect(response.body).toHaveProperty('telegram_user_id', '123456789');
      expect(response.body).toHaveProperty('amount', 50000);
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body).toHaveProperty('qpay_invoice_id');
      expect(response.body).toHaveProperty('payment_link');
      expect(response.body).toHaveProperty('created_at');

      // Verify snapshot fields
      expect(response.body).toHaveProperty('snapshot_plan_name', 'Monthly Premium');
      expect(response.body).toHaveProperty('snapshot_price', 50000);
      expect(response.body).toHaveProperty('snapshot_duration_days', 30);

      // Verify payment_link is a valid URL
      expect(response.body.payment_link).toMatch(/^https?:\/\//);
    });
  });

  describe('Business Rules', () => {
    it('should reject non-existent membership_plan_id', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          membership_plan_id: '550e8400-e29b-41d4-a716-999999999999',
          project_id: botConfigurationId,
          telegram_user_id: '123456789',
          amount: 50000,
          snapshot_plan_name: 'Monthly Premium',
          snapshot_price: 50000,
          snapshot_duration_days: 30,
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('MEMBERSHIP_PLAN_NOT_FOUND');
    });

    it('should reject inactive membership plan', async () => {
      // TODO: Create inactive plan and test
      // This test requires plan creation in setup
    });
  });
});
