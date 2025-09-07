import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Bot Setup Flow (Integration)', () => {
  let app: INestApplication;
  let accessToken: string;
  let testUser: any;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    // Register and login a test user
    const registrationData = {
      email: 'bot-setup@example.com',
      password: 'SecurePassword123!',
      name: 'Bot Setup Test User',
      company_name: 'Bot Setup Test Company',
    };

    const registerResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(registrationData);

    accessToken = registerResponse.body.access_token;
    testUser = registerResponse.body.user;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Complete bot setup and group connection flow', () => {
    it('should create bot, connect group, and configure messages', async () => {
      // Step 1: Create a Telegram bot
      const botData = {
        bot_token: 'test-bot-token-integration',
        bot_name: 'Integration Test Bot',
      };

      const botResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(botData)
        .expect(201);

      expect(botResponse.body).toHaveProperty('id');
      expect(botResponse.body.bot_name).toBe(botData.bot_name);
      expect(botResponse.body.tenant_id).toBe(testUser.tenant_id);
      expect(botResponse.body.is_active).toBe(true);

      const botId = botResponse.body.id;

      // Step 2: Verify bot appears in user's bot list
      const botListResponse = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(botListResponse.body.bots).toHaveLength(1);
      expect(botListResponse.body.bots[0].id).toBe(botId);

      // Step 3: Connect a Telegram group to the bot
      const groupData = {
        telegram_chat_id: -1001234567890,
        group_name: 'Integration Test Group',
        group_type: 'supergroup',
      };

      const groupResponse = await request(app.getHttpServer())
        .post(`/v1/bots/${botId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(groupData)
        .expect(201);

      expect(groupResponse.body).toHaveProperty('id');
      expect(groupResponse.body.telegram_chat_id).toBe(groupData.telegram_chat_id);
      expect(groupResponse.body.group_name).toBe(groupData.group_name);
      expect(groupResponse.body.bot_id).toBe(botId);
      expect(groupResponse.body.tenant_id).toBe(testUser.tenant_id);

      const groupId = groupResponse.body.id;

      // Step 4: Verify group appears in bot's group list
      const groupListResponse = await request(app.getHttpServer())
        .get(`/v1/bots/${botId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(groupListResponse.body.groups).toHaveLength(1);
      expect(groupListResponse.body.groups[0].id).toBe(groupId);

      // Step 5: Configure bot message templates
      const welcomeMessageData = {
        message_type: 'welcome',
        content: 'Welcome {{user_name}} to our premium group!',
        variables: { user_name: 'string' },
      };

      const messageResponse = await request(app.getHttpServer())
        .post(`/v1/bots/${botId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(welcomeMessageData)
        .expect(201);

      expect(messageResponse.body).toHaveProperty('id');
      expect(messageResponse.body.message_type).toBe(welcomeMessageData.message_type);
      expect(messageResponse.body.content).toBe(welcomeMessageData.content);
      expect(messageResponse.body.bot_id).toBe(botId);
      expect(messageResponse.body.tenant_id).toBe(testUser.tenant_id);

      // Step 6: Create a membership plan for the group
      const membershipPlanData = {
        group_id: groupId,
        name: 'Monthly Premium',
        description: 'Premium access to exclusive content',
        price_mnt: 25000,
        duration_days: 30,
        trial_days: 7,
        features: ['Exclusive content', 'Direct support', 'Early access'],
      };

      const planResponse = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(membershipPlanData)
        .expect(201);

      expect(planResponse.body).toHaveProperty('id');
      expect(planResponse.body.name).toBe(membershipPlanData.name);
      expect(planResponse.body.price_mnt).toBe(membershipPlanData.price_mnt);
      expect(planResponse.body.group_id).toBe(groupId);
      expect(planResponse.body.tenant_id).toBe(testUser.tenant_id);

      // Step 7: Verify complete setup by checking all created resources
      const finalBotCheck = await request(app.getHttpServer())
        .get(`/v1/bots/${botId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalBotCheck.body.id).toBe(botId);
      expect(finalBotCheck.body.is_active).toBe(true);
    });

    it('should handle bot creation with immediate group connection', async () => {
      // Create bot and group in sequence
      const botData = {
        bot_token: 'quick-setup-bot-token',
        bot_name: 'Quick Setup Bot',
      };

      const botResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(botData)
        .expect(201);

      const botId = botResponse.body.id;

      // Immediately connect multiple groups
      const groups = [
        {
          telegram_chat_id: -1001111111111,
          group_name: 'Premium Group 1',
          group_type: 'supergroup',
        },
        {
          telegram_chat_id: -1002222222222,
          group_name: 'Premium Group 2',
          group_type: 'channel',
        },
      ];

      const groupPromises = groups.map(group =>
        request(app.getHttpServer())
          .post(`/v1/bots/${botId}/groups`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send(group)
          .expect(201)
      );

      const groupResponses = await Promise.all(groupPromises);

      expect(groupResponses).toHaveLength(2);
      groupResponses.forEach((response, index) => {
        expect(response.body.group_name).toBe(groups[index].group_name);
        expect(response.body.bot_id).toBe(botId);
      });

      // Verify all groups are listed
      const groupListResponse = await request(app.getHttpServer())
        .get(`/v1/bots/${botId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(groupListResponse.body.groups).toHaveLength(2);
    });

    it('should maintain tenant isolation during bot setup', async () => {
      // Create a second tenant
      const secondTenantData = {
        email: 'second-tenant-bot@example.com',
        password: 'SecurePassword123!',
        name: 'Second Tenant User',
        company_name: 'Second Tenant Company',
      };

      const secondTenantResponse = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(secondTenantData);

      const secondAccessToken = secondTenantResponse.body.access_token;

      // First tenant creates a bot
      const firstBotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: 'first-tenant-bot-token',
          bot_name: 'First Tenant Bot',
        })
        .expect(201);

      // Second tenant creates a bot
      const secondBotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .send({
          bot_token: 'second-tenant-bot-token',
          bot_name: 'Second Tenant Bot',
        })
        .expect(201);

      // Each tenant should only see their own bot
      const firstTenantBots = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const secondTenantBots = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(200);

      expect(firstTenantBots.body.bots).toHaveLength(1);
      expect(firstTenantBots.body.bots[0].id).toBe(firstBotResponse.body.id);

      expect(secondTenantBots.body.bots).toHaveLength(1);
      expect(secondTenantBots.body.bots[0].id).toBe(secondBotResponse.body.id);

      // First tenant cannot access second tenant's bot
      await request(app.getHttpServer())
        .get(`/v1/bots/${secondBotResponse.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      // Second tenant cannot access first tenant's bot
      await request(app.getHttpServer())
        .get(`/v1/bots/${firstBotResponse.body.id}`)
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(403);
    });
  });

  describe('Bot configuration updates', () => {
    it('should allow updating bot configuration after creation', async () => {
      // Create initial bot
      const botResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: 'update-test-bot-token',
          bot_name: 'Initial Bot Name',
        })
        .expect(201);

      const botId = botResponse.body.id;

      // Update bot configuration
      const updateData = {
        bot_name: 'Updated Bot Name',
        settings: {
          auto_welcome: true,
          reminder_hours: 24,
        },
      };

      const updateResponse = await request(app.getHttpServer())
        .patch(`/v1/bots/${botId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.bot_name).toBe(updateData.bot_name);
      expect(updateResponse.body.settings).toEqual(updateData.settings);

      // Verify update persisted
      const getResponse = await request(app.getHttpServer())
        .get(`/v1/bots/${botId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getResponse.body.bot_name).toBe(updateData.bot_name);
      expect(getResponse.body.settings).toEqual(updateData.settings);
    });
  });
});