import { TestSetupHelper } from '../../helpers/test-setup.helper';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';

describe('POST /v1/webhooks/qpay/payment-failed (Contract)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await TestSetupHelper.createTestApp();
    await TestSetupHelper.cleanupDatabase();
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  const createSignature = (payload: string, secret: string) => {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  };

  describe('Valid webhook payload', () => {
    it('should return 200 for valid payment failed webhook', async () => {
      const webhookPayload = {
        invoice_id: 'qpay_invoice_failed_123',
        amount: 15000,
        status: 'failed',
        error: {
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in account',
        },
        metadata: {
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          member_telegram_id: 123456789,
          plan_id: '550e8400-e29b-41d4-a716-446655440001',
        },
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createSignature(
        payloadString,
        process.env.QPAY_WEBHOOK_SECRET || 'test-secret',
      );

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-failed')
        .set('X-QPay-Signature', signature)
        .set('X-QPay-Event-Id', 'failed_event_123')
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
        invoice_id: 'qpay_invoice_failed_456',
        amount: 15000,
        status: 'failed',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-failed')
        .send(webhookPayload)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 401 for invalid signature', async () => {
      const webhookPayload = {
        invoice_id: 'qpay_invoice_failed_789',
        amount: 15000,
        status: 'failed',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-failed')
        .set('X-QPay-Signature', 'invalid-signature')
        .send(webhookPayload)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });
});
