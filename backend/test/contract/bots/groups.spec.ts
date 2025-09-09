import { INestApplication } from '@nestjs/common';
import { TestSetupHelper } from '../../helpers/test-setup.helper';
import * as request from 'supertest';

describe('GET /v1/bots/{id}/groups (Contract)', () => {
  let app: INestApplication;
  let testUser: {
    email: string;
    password: string;
    name: string;
    company_name: string;
  };
  let accessToken: string;
  let testBotId: string;

  beforeEach(async () => {
    app = await TestSetupHelper.createTestApp();
    await TestSetupHelper.cleanupDatabase();

    // Create and login a test user
    testUser = {
      email: 'bot-groups@example.com',
      password: 'SecurePassword123!',
      name: 'Bot Groups Test User',
      company_name: 'Test Company',
    };

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(testUser);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    accessToken = loginResponse.body.access_token;

    // Create a test bot
    const botResponse = await request(app.getHttpServer())
      .post('/v1/bots')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bot_token: 'bot-groups-test-token',
        bot_name: 'Bot Groups Test Bot',
      });

    testBotId = botResponse.body.id;

    // Connect a test group to the bot
    await request(app.getHttpServer())
      .post(`/v1/bots/${testBotId}/groups`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        telegram_chat_id: -1001234567890,
        group_name: 'Test Group',
        group_type: 'supergroup',
      });
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Valid authenticated request', () => {
    it('should return 200 with groups array for valid bot ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${testBotId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Contract validation - should return object with groups array
      expect(response.body).toHaveProperty('groups');
      expect(Array.isArray(response.body.groups)).toBe(true);

      // If we have groups, validate structure
      if (response.body.groups.length > 0) {
        const group = response.body.groups[0];
        
        // Required group properties
        expect(group).toHaveProperty('id');
        expect(group).toHaveProperty('telegram_chat_id');
        expect(group).toHaveProperty('group_name');
        expect(group).toHaveProperty('group_type');
        expect(group).toHaveProperty('is_active');
        expect(group).toHaveProperty('member_count');
        expect(group).toHaveProperty('bot_id', testBotId);
        expect(group).toHaveProperty('tenant_id');
        expect(group).toHaveProperty('created_at');
        expect(group).toHaveProperty('updated_at');

        // Optional properties
        expect(group.hasOwnProperty('synced_at')).toBe(true);
        expect(group.hasOwnProperty('settings')).toBe(true);

        // Data type validation
        expect(typeof group.id).toBe('string');
        expect(typeof group.telegram_chat_id).toBe('number');
        expect(typeof group.group_name).toBe('string');
        expect(['channel', 'group', 'supergroup']).toContain(group.group_type);
        expect(typeof group.is_active).toBe('boolean');
        expect(typeof group.member_count).toBe('number');
        expect(typeof group.bot_id).toBe('string');
        expect(typeof group.tenant_id).toBe('string');
        expect(typeof group.created_at).toBe('string');
        expect(typeof group.updated_at).toBe('string');

        // Value validation
        expect(group.member_count).toBeGreaterThanOrEqual(0);
        expect(group.bot_id).toBe(testBotId);
      }
    });

    it('should return empty array when bot has no groups', async () => {
      // Create a new bot with no groups
      const newBotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: 'no-groups-bot-token',
          bot_name: 'No Groups Bot',
        });

      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${newBotResponse.body.id}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('groups');
      expect(Array.isArray(response.body.groups)).toBe(true);
      expect(response.body.groups.length).toBe(0);
    });

    it('should only return groups for the specified bot', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${testBotId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // All returned groups should belong to the requested bot
      response.body.groups.forEach(group => {
        expect(group.bot_id).toBe(testBotId);
      });
    });

    it('should only return groups for the authenticated tenant', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${testBotId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // All returned groups should belong to the same tenant
      if (response.body.groups.length > 0) {
        const firstGroupTenantId = response.body.groups[0].tenant_id;
        response.body.groups.forEach(group => {
          expect(group.tenant_id).toBe(firstGroupTenantId);
        });
      }
    });

    it('should return groups sorted by creation date (newest first)', async () => {
      // Add another group to test sorting
      await request(app.getHttpServer())
        .post(`/v1/bots/${testBotId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          telegram_chat_id: -1001234567891,
          group_name: 'Second Test Group',
          group_type: 'group',
        });

      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${testBotId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      if (response.body.groups.length > 1) {
        for (let i = 0; i < response.body.groups.length - 1; i++) {
          const currentGroup = new Date(response.body.groups[i].created_at);
          const nextGroup = new Date(response.body.groups[i + 1].created_at);
          expect(currentGroup.getTime()).toBeGreaterThanOrEqual(nextGroup.getTime());
        }
      }
    });
  });

  describe('Invalid requests', () => {
    it('should return 404 for non-existent bot ID', async () => {
      const nonExistentBotId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${nonExistentBotId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 404);
    });

    it('should return 400 for invalid bot ID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bots/invalid-uuid-format/groups')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 403 for bot belonging to different tenant', async () => {
      // Create another user and bot
      const otherUser = {
        email: 'other-user@example.com',
        password: 'SecurePassword123!',
        name: 'Other User',
        company_name: 'Other Company',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(otherUser);

      const otherLoginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: otherUser.email,
          password: otherUser.password,
        });

      const otherBotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${otherLoginResponse.body.access_token}`)
        .send({
          bot_token: 'other-user-bot-token',
          bot_name: 'Other User Bot',
        });

      // Try to access other user's bot groups
      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${otherBotResponse.body.id}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 403);
    });
  });

  describe('Authentication validation', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${testBotId}/groups`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${testBotId}/groups`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('Response headers', () => {
    it('should include correct content-type header', async () => {
      await request(app.getHttpServer())
        .get(`/v1/bots/${testBotId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  describe('Data consistency validation', () => {
    it('should maintain consistent group object structure', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${testBotId}/groups`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      if (response.body.groups.length > 0) {
        const group = response.body.groups[0];
        
        // Required fields should be present and not null/undefined
        expect(group.id).toBeTruthy();
        expect(group.telegram_chat_id).toBeDefined();
        expect(group.group_name).toBeTruthy();
        expect(group.group_type).toBeTruthy();
        expect(group.is_active).toBeDefined();
        expect(group.member_count).toBeDefined();
        expect(group.bot_id).toBeTruthy();
        expect(group.tenant_id).toBeTruthy();
        expect(group.created_at).toBeTruthy();
        expect(group.updated_at).toBeTruthy();

        // Optional fields can be null but should exist as properties
        expect(group.hasOwnProperty('synced_at')).toBe(true);
        expect(group.hasOwnProperty('settings')).toBe(true);
      }
    });
  });

  describe('Query parameters (if supported)', () => {
    it('should handle query parameters gracefully', async () => {
      // Test with unsupported query parameters - should still work
      const response = await request(app.getHttpServer())
        .get(`/v1/bots/${testBotId}/groups?unsupported=value`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('groups');
      expect(Array.isArray(response.body.groups)).toBe(true);
    });
  });
});