
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../helpers/test-setup.helper';
import * as crypto from 'crypto';

describe('Payment Processing to Membership Grant Flow (Integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let testUser: any;
  let botId: string;
  let groupId: string;
  let planId: string;

  beforeEach(async () => {
    app = await TestSetupHelper.createTestApp();
    await TestSetupHelper.cleanupDatabase();

    // Setup complete tenant with bot, group, and plan
    const registrationData = {
      email: 'payment-flow@example.com',
      password: 'SecurePassword123!',
      name: 'Payment Flow Test User',
      company_name: 'Payment Test Company',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(registrationData);

    accessToken = registerResponse.body.access_token;
    testUser = registerResponse.body.user;

    // Create bot
    const botResponse = await request(app.getHttpServer())
      .post('/v1/bots')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bot_token: 'payment-flow-bot-token',
        bot_name: 'Payment Flow Bot',
      });

    botId = botResponse.body.id;

    // Create group
    const groupResponse = await request(app.getHttpServer())
      .post(`/v1/bots/${botId}/groups`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        telegram_chat_id: -1001234567890,
        group_name: 'Payment Flow Group',
        group_type: 'supergroup',
      });

    groupId = groupResponse.body.id;

    // Create membership plan
    const planResponse = await request(app.getHttpServer())
      .post('/v1/membership-plans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        group_id: groupId,
        name: 'Premium Monthly',
        price_mnt: 30000,
        duration_days: 30,
        trial_days: 3,
      });

    planId = planResponse.body.id;
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  const createWebhookSignature = (payload: string) => {
    return crypto.createHmac('sha256', process.env.QPAY_WEBHOOK_SECRET || 'test-secret')
      .update(payload)
      .digest('hex');
  };

  describe('Complete payment to membership flow', () => {
    it('should process payment webhook and grant membership', async () => {
      const memberTelegramId = 987654321;

      // Step 1: Simulate payment webhook from QPay
      const webhookPayload = {
        invoice_id: 'qpay_invoice_integration_test',
        payment_id: 'qpay_payment_integration_test',
        amount: 30000,
        status: 'completed',
        payment_method: 'qpay_wallet',
        customer: {
          phone: '+97699123456',
          name: 'Test Member',
        },
        metadata: {
          tenant_id: testUser.tenant_id,
          member_telegram_id: memberTelegramId,
          plan_id: planId,
        },
        paid_at: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createWebhookSignature(payloadString);

      const webhookResponse = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-completed')
        .set('X-QPay-Signature', signature)
        .set('X-QPay-Event-Id', 'integration_test_event_123')
        .set('X-QPay-Timestamp', new Date().toISOString())
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body.success).toBe(true);
      expect(webhookResponse.body.processed).toBe(true);

      // Step 2: Verify payment record was created
      const paymentsResponse = await request(app.getHttpServer())
        .get('/v1/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const payment = paymentsResponse.body.payments.find(
        p => p.qpay_invoice_id === webhookPayload.invoice_id
      );

      expect(payment).toBeDefined();
      expect(payment.status).toBe('completed');
      expect(payment.amount_mnt).toBe(webhookPayload.amount);

      // Step 3: Verify member was created
      const membersResponse = await request(app.getHttpServer())
        .get('/v1/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const member = membersResponse.body.members.find(
        m => m.telegram_user_id === memberTelegramId
      );

      expect(member).toBeDefined();
      expect(member.telegram_user_id).toBe(memberTelegramId);

      // Step 4: Verify membership was created and is active
      const membershipsResponse = await request(app.getHttpServer())
        .get(`/v1/members/${member.id}/memberships`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const membership = membershipsResponse.body.memberships.find(
        m => m.plan_id === planId
      );

      expect(membership).toBeDefined();
      expect(membership.status).toBe('active');
      expect(membership.group_id).toBe(groupId);

      // Verify membership duration
      const startsAt = new Date(membership.starts_at);
      const expiresAt = new Date(membership.expires_at);
      const durationDays = Math.ceil((expiresAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24));
      expect(durationDays).toBe(30);
    });

    it('should handle failed payments correctly', async () => {
      const memberTelegramId = 987654322;

      // Step 1: Simulate failed payment webhook
      const webhookPayload = {
        invoice_id: 'qpay_invoice_failed_test',
        amount: 30000,
        status: 'failed',
        error: {
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds',
        },
        metadata: {
          tenant_id: testUser.tenant_id,
          member_telegram_id: memberTelegramId,
          plan_id: planId,
        },
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createWebhookSignature(payloadString);

      const webhookResponse = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-failed')
        .set('X-QPay-Signature', signature)
        .set('X-QPay-Event-Id', 'failed_payment_event_123')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body.success).toBe(true);

      // Step 2: Verify payment record shows failed status
      const paymentsResponse = await request(app.getHttpServer())
        .get('/v1/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const payment = paymentsResponse.body.payments.find(
        p => p.qpay_invoice_id === webhookPayload.invoice_id
      );

      expect(payment).toBeDefined();
      expect(payment.status).toBe('failed');

      // Step 3: Verify no membership was created
      const membersResponse = await request(app.getHttpServer())
        .get('/v1/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const member = membersResponse.body.members.find(
        m => m.telegram_user_id === memberTelegramId
      );

      expect(member).toBeUndefined();
    });

    it('should handle duplicate webhook events (idempotency)', async () => {
      const memberTelegramId = 987654323;
      const eventId = 'duplicate_event_test_123';

      const webhookPayload = {
        invoice_id: 'qpay_invoice_duplicate_test',
        payment_id: 'qpay_payment_duplicate_test',
        amount: 30000,
        status: 'completed',
        metadata: {
          tenant_id: testUser.tenant_id,
          member_telegram_id: memberTelegramId,
          plan_id: planId,
        },
        paid_at: new Date().toISOString(),
      };

      const payloadString = JSON.stringify(webhookPayload);
      const signature = createWebhookSignature(payloadString);

      // Send first webhook
      const firstResponse = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-completed')
        .set('X-QPay-Signature', signature)
        .set('X-QPay-Event-Id', eventId)
        .send(webhookPayload)
        .expect(200);

      expect(firstResponse.body.success).toBe(true);

      // Send duplicate webhook
      const duplicateResponse = await request(app.getHttpServer())
        .post('/v1/webhooks/qpay/payment-completed')
        .set('X-QPay-Signature', signature)
        .set('X-QPay-Event-Id', eventId)
        .send(webhookPayload)
        .expect(200);

      expect(duplicateResponse.body.success).toBe(true);
      expect(duplicateResponse.body.already_processed).toBe(true);

      // Verify only one payment record exists
      const paymentsResponse = await request(app.getHttpServer())
        .get('/v1/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const payments = paymentsResponse.body.payments.filter(
        p => p.qpay_invoice_id === webhookPayload.invoice_id
      );

      expect(payments).toHaveLength(1);
    });
  });

  describe('Trial membership flow', () => {
    it('should create trial membership with proper expiration', async () => {
      const memberTelegramId = 987654324;

      // Create a plan with trial period
      const trialPlanResponse = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          group_id: groupId,
          name: 'Trial Plan',
          price_mnt: 20000,
          duration_days: 30,
          trial_days: 7,
        });

      const trialPlanId = trialPlanResponse.body.id;

      // Simulate trial membership creation (could be via bot command or direct API)
      const trialMembershipData = {
        telegram_user_id: memberTelegramId,
        plan_id: trialPlanId,
        membership_type: 'trial',
      };

      const membershipResponse = await request(app.getHttpServer())
        .post('/v1/memberships')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(trialMembershipData)
        .expect(201);

      expect(membershipResponse.body.status).toBe('trial');
      
      // Verify trial expiration date
      const startsAt = new Date(membershipResponse.body.starts_at);
      const expiresAt = new Date(membershipResponse.body.expires_at);
      const trialDays = Math.ceil((expiresAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24));
      expect(trialDays).toBe(7);
    });
  });
});