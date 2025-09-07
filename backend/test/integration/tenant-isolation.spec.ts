import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Multi-Tenant Data Isolation (Integration)', () => {
  let app: INestApplication;
  let tenant1AccessToken: string;
  let tenant2AccessToken: string;
  let tenant1User: any;
  let tenant2User: any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    // Create first tenant
    const tenant1Data = {
      email: 'tenant1@example.com',
      password: 'SecurePassword123!',
      name: 'Tenant 1 Owner',
      company_name: 'Tenant 1 Company',
    };

    const tenant1Response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(tenant1Data);

    tenant1AccessToken = tenant1Response.body.access_token;
    tenant1User = tenant1Response.body.user;

    // Create second tenant
    const tenant2Data = {
      email: 'tenant2@example.com',
      password: 'SecurePassword123!',
      name: 'Tenant 2 Owner',
      company_name: 'Tenant 2 Company',
    };

    const tenant2Response = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(tenant2Data);

    tenant2AccessToken = tenant2Response.body.access_token;
    tenant2User = tenant2Response.body.user;

    // Verify tenants are different
    expect(tenant1User.tenant_id).not.toBe(tenant2User.tenant_id);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Bot isolation', () => {
    it('should prevent cross-tenant bot access', async () => {
      // Tenant 1 creates a bot
      const tenant1BotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .send({
          bot_token: 'tenant1-bot-token',
          bot_name: 'Tenant 1 Bot',
        })
        .expect(201);

      const tenant1BotId = tenant1BotResponse.body.id;

      // Tenant 2 creates a bot
      const tenant2BotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .send({
          bot_token: 'tenant2-bot-token',
          bot_name: 'Tenant 2 Bot',
        })
        .expect(201);

      const tenant2BotId = tenant2BotResponse.body.id;

      // Tenant 1 should only see their bot
      const tenant1Bots = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .expect(200);

      expect(tenant1Bots.body.bots).toHaveLength(1);
      expect(tenant1Bots.body.bots[0].id).toBe(tenant1BotId);
      expect(tenant1Bots.body.bots[0].tenant_id).toBe(tenant1User.tenant_id);

      // Tenant 2 should only see their bot
      const tenant2Bots = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(200);

      expect(tenant2Bots.body.bots).toHaveLength(1);
      expect(tenant2Bots.body.bots[0].id).toBe(tenant2BotId);
      expect(tenant2Bots.body.bots[0].tenant_id).toBe(tenant2User.tenant_id);

      // Cross-tenant access should be denied
      await request(app.getHttpServer())
        .get(`/v1/bots/${tenant2BotId}`)
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/v1/bots/${tenant1BotId}`)
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(403);
    });
  });

  describe('Group isolation', () => {
    it('should prevent cross-tenant group access', async () => {
      // Setup bots for both tenants
      const tenant1BotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .send({
          bot_token: 'tenant1-group-bot-token',
          bot_name: 'Tenant 1 Group Bot',
        });

      const tenant2BotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .send({
          bot_token: 'tenant2-group-bot-token',
          bot_name: 'Tenant 2 Group Bot',
        });

      // Create groups for each tenant
      const tenant1GroupResponse = await request(app.getHttpServer())
        .post(`/v1/bots/${tenant1BotResponse.body.id}/groups`)
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .send({
          telegram_chat_id: -1001111111111,
          group_name: 'Tenant 1 Group',
          group_type: 'supergroup',
        })
        .expect(201);

      const tenant2GroupResponse = await request(app.getHttpServer())
        .post(`/v1/bots/${tenant2BotResponse.body.id}/groups`)
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .send({
          telegram_chat_id: -1002222222222,
          group_name: 'Tenant 2 Group',
          group_type: 'supergroup',
        })
        .expect(201);

      // Verify isolation
      const tenant1Groups = await request(app.getHttpServer())
        .get(`/v1/bots/${tenant1BotResponse.body.id}/groups`)
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .expect(200);

      expect(tenant1Groups.body.groups).toHaveLength(1);
      expect(tenant1Groups.body.groups[0].id).toBe(tenant1GroupResponse.body.id);

      // Cross-tenant group access should fail
      await request(app.getHttpServer())
        .get(`/v1/groups/${tenant2GroupResponse.body.id}`)
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .expect(403);
    });
  });

  describe('Member and membership isolation', () => {
    it('should prevent cross-tenant member access', async () => {
      // Create members for each tenant
      const tenant1MemberResponse = await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .send({
          telegram_user_id: 111111111,
          first_name: 'Tenant1',
          last_name: 'Member',
        })
        .expect(201);

      const tenant2MemberResponse = await request(app.getHttpServer())
        .post('/v1/members')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .send({
          telegram_user_id: 222222222,
          first_name: 'Tenant2',
          last_name: 'Member',
        })
        .expect(201);

      // Verify isolation
      const tenant1Members = await request(app.getHttpServer())
        .get('/v1/members')
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .expect(200);

      expect(tenant1Members.body.members).toHaveLength(1);
      expect(tenant1Members.body.members[0].id).toBe(tenant1MemberResponse.body.id);

      const tenant2Members = await request(app.getHttpServer())
        .get('/v1/members')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(200);

      expect(tenant2Members.body.members).toHaveLength(1);
      expect(tenant2Members.body.members[0].id).toBe(tenant2MemberResponse.body.id);

      // Cross-tenant member access should fail
      await request(app.getHttpServer())
        .get(`/v1/members/${tenant2MemberResponse.body.id}`)
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/v1/members/${tenant1MemberResponse.body.id}`)
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(403);
    });
  });

  describe('Payment isolation', () => {
    it('should prevent cross-tenant payment access', async () => {
      // Simulate payments for each tenant
      const tenant1PaymentResponse = await request(app.getHttpServer())
        .post('/v1/payments')
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .send({
          qpay_invoice_id: 'tenant1_invoice_123',
          amount_mnt: 25000,
          status: 'completed',
          member_telegram_id: 111111111,
        })
        .expect(201);

      const tenant2PaymentResponse = await request(app.getHttpServer())
        .post('/v1/payments')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .send({
          qpay_invoice_id: 'tenant2_invoice_456',
          amount_mnt: 30000,
          status: 'completed',
          member_telegram_id: 222222222,
        })
        .expect(201);

      // Verify isolation
      const tenant1Payments = await request(app.getHttpServer())
        .get('/v1/payments')
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .expect(200);

      expect(tenant1Payments.body.payments).toHaveLength(1);
      expect(tenant1Payments.body.payments[0].id).toBe(tenant1PaymentResponse.body.id);

      const tenant2Payments = await request(app.getHttpServer())
        .get('/v1/payments')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(200);

      expect(tenant2Payments.body.payments).toHaveLength(1);
      expect(tenant2Payments.body.payments[0].id).toBe(tenant2PaymentResponse.body.id);

      // Cross-tenant payment access should fail
      await request(app.getHttpServer())
        .get(`/v1/payments/${tenant2PaymentResponse.body.id}`)
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .expect(403);
    });
  });

  describe('Analytics isolation', () => {
    it('should provide isolated analytics for each tenant', async () => {
      // Get analytics for each tenant
      const tenant1Analytics = await request(app.getHttpServer())
        .get('/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .expect(200);

      const tenant2Analytics = await request(app.getHttpServer())
        .get('/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .expect(200);

      // Each tenant should have their own isolated analytics
      expect(tenant1Analytics.body).toHaveProperty('active_members');
      expect(tenant1Analytics.body).toHaveProperty('total_revenue');
      expect(tenant2Analytics.body).toHaveProperty('active_members');
      expect(tenant2Analytics.body).toHaveProperty('total_revenue');

      // Initial values should be zero or appropriate defaults
      expect(tenant1Analytics.body.active_members).toBe(0);
      expect(tenant1Analytics.body.total_revenue).toBe(0);
      expect(tenant2Analytics.body.active_members).toBe(0);
      expect(tenant2Analytics.body.total_revenue).toBe(0);
    });
  });

  describe('Resource creation with tenant context', () => {
    it('should automatically associate resources with correct tenant', async () => {
      // Create resources with each tenant
      const tenant1BotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${tenant1AccessToken}`)
        .send({
          bot_token: 'context-test-bot1',
          bot_name: 'Context Test Bot 1',
        })
        .expect(201);

      const tenant2BotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${tenant2AccessToken}`)
        .send({
          bot_token: 'context-test-bot2',
          bot_name: 'Context Test Bot 2',
        })
        .expect(201);

      // Verify correct tenant association
      expect(tenant1BotResponse.body.tenant_id).toBe(tenant1User.tenant_id);
      expect(tenant2BotResponse.body.tenant_id).toBe(tenant2User.tenant_id);

      // Verify tenant IDs are different
      expect(tenant1BotResponse.body.tenant_id).not.toBe(tenant2BotResponse.body.tenant_id);
    });
  });
});