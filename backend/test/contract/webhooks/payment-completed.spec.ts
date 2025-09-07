import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import * as crypto from 'crypto';

describe('POST /v1/webhooks/qpay/payment-completed (Contract)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const createSignature = (payload: string, secret: string) => {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  };

  describe('Valid webhook payload', () => {
    it('should return 200 for valid payment completed webhook', async () => {
      const webhookPayload = {
        invoice_id: 'qpay_invoice_123',
        payment_id: 'qpay_payment_456',
        amount: 25000,
        status: 'completed',
        payment_method: 'qpay_wallet',
        customer: {
          phone: '+97699123456',
          name: 'Test User',
        },
        metadata: {
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          member_telegram_id: 123456789,
          plan_id: '550e8400-e29b-41d4-a716-446655440001',
        },
        paid_at: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createSignature(payloadString, process.env.QPAY_WEBHOOK_SECRET || 'test-secret');

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-completed')
        .set('X-QPay-Signature', signature)
        .set('X-QPay-Event-Id', 'event_123')
        .set('X-QPay-Timestamp', new Date().toISOString())
        .set('Content-Type', 'application/json')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('processed', true);
    });
  });

  describe('Invalid webhook requests', () => {
    it('should return 400 for missing signature', async () => {
      const webhookPayload = {
        invoice_id: 'qpay_invoice_123',
        amount: 25000,
        status: 'completed',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-completed')
        .send(webhookPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 401 for invalid signature', async () => {
      const webhookPayload = {
        invoice_id: 'qpay_invoice_123',
        amount: 25000,
        status: 'completed',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-completed')
        .set('X-QPay-Signature', 'invalid-signature')
        .send(webhookPayload)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 400 for missing required fields', async () => {
      const webhookPayload = {
        amount: 25000,
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createSignature(payloadString, process.env.QPAY_WEBHOOK_SECRET || 'test-secret');

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-completed')
        .set('X-QPay-Signature', signature)
        .send(webhookPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhook events', async () => {
      const webhookPayload = {
        invoice_id: 'qpay_invoice_duplicate',
        payment_id: 'qpay_payment_duplicate',
        amount: 25000,
        status: 'completed',
        paid_at: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createSignature(payloadString, process.env.QPAY_WEBHOOK_SECRET || 'test-secret');
      const eventId = 'duplicate_event_123';

      // First request
      await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-completed')
        .set('X-QPay-Signature', signature)
        .set('X-QPay-Event-Id', eventId)
        .send(webhookPayload)
        .expect(200);

      // Duplicate request
      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-completed')
        .set('X-QPay-Signature', signature)
        .set('X-QPay-Event-Id', eventId)
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('already_processed', true);
    });
  });
});