import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { AppModule } from '../../../src/app.module';

describe('POST /v1/payments/webhook/qpay (Contract Test)', () => {
  let app: INestApplication;
  const QPAY_SECRET = process.env.QPAY_WEBHOOK_SECRET || 'test-webhook-secret';

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
  });

  afterAll(async () => {
    await app.close();
  });

  const generateHmacSignature = (payload: any, secret: string): string => {
    const payloadString = JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  };

  describe('Security', () => {
    it('should reject webhook without signature header', async () => {
      const webhookPayload = {
        object_type: 'INVOICE',
        object_id: 'INV_123456',
        invoice_status: 'PAID',
        invoice_id: 'INV_123456',
        payment_id: 'PAY_789012',
        payment_status: 'PAID',
        payment_amount: 50000,
        payment_currency: 'MNT',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/payments/webhook/qpay')
        .send(webhookPayload)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('MISSING_SIGNATURE');
    });

    it('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        object_type: 'INVOICE',
        object_id: 'INV_123456',
        invoice_status: 'PAID',
        invoice_id: 'INV_123456',
        payment_id: 'PAY_789012',
        payment_status: 'PAID',
        payment_amount: 50000,
        payment_currency: 'MNT',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/payments/webhook/qpay')
        .set('X-QPay-Signature', 'invalid-signature')
        .send(webhookPayload)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('should accept webhook with valid signature', async () => {
      const webhookPayload = {
        object_type: 'INVOICE',
        object_id: 'INV_123456',
        invoice_status: 'PAID',
        invoice_id: 'INV_123456',
        payment_id: 'PAY_789012',
        payment_status: 'PAID',
        payment_amount: 50000,
        payment_currency: 'MNT',
      };

      const signature = generateHmacSignature(webhookPayload, QPAY_SECRET);

      const response = await request(app.getHttpServer())
        .post('/v1/payments/webhook/qpay')
        .set('X-QPay-Signature', signature)
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate webhook delivery', async () => {
      const webhookPayload = {
        object_type: 'INVOICE',
        object_id: 'INV_UNIQUE_123',
        invoice_status: 'PAID',
        invoice_id: 'INV_UNIQUE_123',
        payment_id: 'PAY_UNIQUE_456',
        payment_status: 'PAID',
        payment_amount: 50000,
        payment_currency: 'MNT',
      };

      const signature = generateHmacSignature(webhookPayload, QPAY_SECRET);

      // First delivery
      await request(app.getHttpServer())
        .post('/v1/payments/webhook/qpay')
        .set('X-QPay-Signature', signature)
        .send(webhookPayload)
        .expect(200);

      // Second delivery (duplicate)
      const response = await request(app.getHttpServer())
        .post('/v1/payments/webhook/qpay')
        .set('X-QPay-Signature', signature)
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'already_processed');
    });
  });

  describe('Payment Status Handling', () => {
    it('should process PAID status correctly', async () => {
      const webhookPayload = {
        object_type: 'INVOICE',
        object_id: 'INV_PAID_TEST',
        invoice_status: 'PAID',
        invoice_id: 'INV_PAID_TEST',
        payment_id: 'PAY_PAID_TEST',
        payment_status: 'PAID',
        payment_amount: 50000,
        payment_currency: 'MNT',
        payment_method: 'qpay_wallet',
      };

      const signature = generateHmacSignature(webhookPayload, QPAY_SECRET);

      const response = await request(app.getHttpServer())
        .post('/v1/payments/webhook/qpay')
        .set('X-QPay-Signature', signature)
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');
      expect(response.body).toHaveProperty('payment_status', 'completed');
    });

    it('should process FAILED status correctly', async () => {
      const webhookPayload = {
        object_type: 'INVOICE',
        object_id: 'INV_FAILED_TEST',
        invoice_status: 'FAILED',
        invoice_id: 'INV_FAILED_TEST',
        payment_id: 'PAY_FAILED_TEST',
        payment_status: 'FAILED',
        payment_amount: 50000,
        payment_currency: 'MNT',
      };

      const signature = generateHmacSignature(webhookPayload, QPAY_SECRET);

      const response = await request(app.getHttpServer())
        .post('/v1/payments/webhook/qpay')
        .set('X-QPay-Signature', signature)
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');
      expect(response.body).toHaveProperty('payment_status', 'failed');
    });
  });

  describe('Response Schema', () => {
    it('should return 200 with acknowledgement', async () => {
      const webhookPayload = {
        object_type: 'INVOICE',
        object_id: 'INV_SCHEMA_TEST',
        invoice_status: 'PAID',
        invoice_id: 'INV_SCHEMA_TEST',
        payment_id: 'PAY_SCHEMA_TEST',
        payment_status: 'PAID',
        payment_amount: 50000,
        payment_currency: 'MNT',
      };

      const signature = generateHmacSignature(webhookPayload, QPAY_SECRET);

      const response = await request(app.getHttpServer())
        .post('/v1/payments/webhook/qpay')
        .set('X-QPay-Signature', signature)
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('received_at');
      expect(['received', 'already_processed']).toContain(response.body.status);
    });
  });
});
