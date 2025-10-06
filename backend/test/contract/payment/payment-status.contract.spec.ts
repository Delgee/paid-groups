import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('GET /v1/payments/:id (Contract Test)', () => {
  let app: INestApplication;
  let authToken: string;
  let paymentTransactionId: string;

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
    paymentTransactionId = '550e8400-e29b-41d4-a716-446655440003';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Schema', () => {
    it('should return 200 with payment transaction details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/payments/${paymentTransactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', paymentTransactionId);
      expect(response.body).toHaveProperty('tenant_id');
      expect(response.body).toHaveProperty('membership_plan_id');
      expect(response.body).toHaveProperty('bot_configuration_id');
      expect(response.body).toHaveProperty('telegram_user_id');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('snapshot_plan_name');
      expect(response.body).toHaveProperty('snapshot_price');
      expect(response.body).toHaveProperty('snapshot_duration_days');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');

      // Verify status is valid enum value
      expect(['pending', 'completed', 'failed', 'refunded']).toContain(response.body.status);
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/payments/550e8400-e29b-41d4-a716-999999999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('PAYMENT_NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/payments/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Multi-Tenancy', () => {
    it('should not return payment from different tenant', async () => {
      // TODO: Create payment with tenant A, try to access with tenant B auth
      // Should return 404 (not 403 to avoid leaking existence)
    });
  });

  describe('Payment Status Progression', () => {
    it('should include QPay details when status is completed', async () => {
      // TODO: Create completed payment and verify QPay fields are populated
    });

    it('should include membership dates when status is completed', async () => {
      // TODO: Create completed payment and verify membership_starts_at, membership_expires_at
    });
  });
});
