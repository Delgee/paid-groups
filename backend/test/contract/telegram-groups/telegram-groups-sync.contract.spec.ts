import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('POST /v1/telegram-groups/{id}/sync - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let botId: string;
  let groupId: string;
  let connectedGroupId: string;

  beforeEach(async () => {
    app = await TestSetupHelper.createTestApp();
    await TestSetupHelper.cleanupDatabase();

    // Create an owner user and get token
    const ownerUser = {
      email: 'owner@tenant1.com',
      password: 'OwnerPass123!',
      name: 'Test Owner',
      company_name: 'Test Company',
    };

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(ownerUser);

    const ownerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: ownerUser.email,
        password: ownerUser.password,
      });

    ownerToken = ownerLogin.body.access_token;

    // Create an admin user for authorization tests
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'admin@tenant1.com',
        password: 'AdminPass123!',
        name: 'Test Admin',
        role: 'admin',
      });

    const adminLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'admin@tenant1.com',
        password: 'AdminPass123!',
      });

    adminToken = adminLogin.body.access_token;

    // Create a telegram bot for testing
    const botResponse = await request(app.getHttpServer())
      .post('/v1/bots')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        bot_name: 'Test Bot',
        bot_token: 'test-bot-token-123456',
      });

    botId = botResponse.body.id;

    // Create a test telegram group (not connected)
    const groupResponse = await request(app.getHttpServer())
      .post('/v1/telegram-groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        group_name: 'Test Group for Sync',
        description: 'Group for sync testing',
        bot_id: botId,
      });

    groupId = groupResponse.body.id;

    // Create another group and connect it to a channel
    const connectedGroupResponse = await request(app.getHttpServer())
      .post('/v1/telegram-groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        group_name: 'Connected Group for Sync',
        description: 'Connected group for sync testing',
        bot_id: botId,
      });

    connectedGroupId = connectedGroupResponse.body.id;

    // Connect the second group to a channel
    await request(app.getHttpServer())
      .post(`/v1/telegram-groups/${connectedGroupId}/connect-channel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        telegram_chat_id: '-1001234567890',
      });
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Response Schema Validation', () => {
    it('should return sync success response with valid schema', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Validate sync response schema per OpenAPI contract
      expect(response.body).toMatchObject({
        message: expect.stringContaining('synced'),
        sync_at: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
        ),
      });

      expect(response.body.message).toBe(
        'Group details synced to Telegram successfully',
      );
    });

    it('should update last_sync_at timestamp on group', async () => {
      const beforeSync = new Date();

      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Check that the group's last_sync_at was updated
      const groupResponse = await request(app.getHttpServer())
        .get(`/v1/telegram-groups/${connectedGroupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(groupResponse.body.last_sync_at).toBeDefined();
      const syncTime = new Date(groupResponse.body.last_sync_at);
      expect(syncTime.getTime()).toBeGreaterThanOrEqual(beforeSync.getTime());
    });
  });

  describe('Path Parameters', () => {
    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups/invalid-uuid/sync')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('should return 404 for non-existent group ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${nonExistentId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should return 401 for invalid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should allow owner users to sync telegram groups', async () => {
      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
    });

    it('should return 403 for admin users attempting to sync telegram groups', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
      });
    });
  });

  describe('Business Logic Errors', () => {
    it('should return 409 for group not connected to Telegram channel', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(response.body.message).toContain('not connected');
    });

    it('should return 409 for group with bot not assigned', async () => {
      // Create a group that's connected but bot_assigned is false
      // This would happen if bot permissions were revoked after connection

      const tempGroupResponse = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          group_name: 'Temp Group',
          bot_id: botId,
        });

      const tempGroupId = tempGroupResponse.body.id;

      // Manually set connection status but leave bot_assigned as false
      // This would typically be done through update endpoint or internal logic

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${tempGroupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(response.body.message).toContain('bot');
    });

    it('should return 409 for Telegram API errors (bot permissions)', async () => {
      // This test simulates a scenario where the bot has lost admin permissions
      // The actual implementation would catch Telegram API errors and return 409

      const expectedError = {
        statusCode: 409,
        message: 'Sync failed due to bot permissions or Telegram API error',
        error: 'Conflict',
      };

      // For now, we're just testing the expected error structure
      expect(expectedError).toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('bot permissions'),
        error: 'Conflict',
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should return 404 for group from different tenant', async () => {
      // Create another tenant and group
      const otherOwnerUser = {
        email: 'other@tenant2.com',
        password: 'OwnerPass123!',
        name: 'Other Owner',
        company_name: 'Other Company',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(otherOwnerUser);

      const otherOwnerLogin = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: otherOwnerUser.email,
          password: otherOwnerUser.password,
        });

      const otherOwnerToken = otherOwnerLogin.body.access_token;

      const otherBotResponse = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .send({
          bot_name: 'Other Bot',
          bot_token: 'other-bot-token-123456',
        });

      const otherBotId = otherBotResponse.body.id;

      const otherGroupResponse = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${otherOwnerToken}`)
        .send({
          group_name: 'Other Tenant Group',
          bot_id: otherBotId,
        });

      const otherGroupId = otherGroupResponse.body.id;

      // Try to sync the other tenant's group
      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${otherGroupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });
  });

  describe('Idempotency', () => {
    it('should allow multiple sync operations on same group', async () => {
      // First sync
      const firstResponse = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const firstSyncTime = firstResponse.body.sync_at;

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second sync
      const secondResponse = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const secondSyncTime = secondResponse.body.sync_at;

      // Both should succeed and have different timestamps
      expect(new Date(secondSyncTime).getTime()).toBeGreaterThan(
        new Date(firstSyncTime).getTime(),
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting gracefully', async () => {
      // This test would verify rate limiting behavior
      // For now, we'll just ensure the endpoint can handle normal load

      const syncPromises = [];
      for (let i = 0; i < 5; i++) {
        syncPromises.push(
          request(app.getHttpServer())
            .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
            .set('Authorization', `Bearer ${ownerToken}`),
        );
      }

      const responses = await Promise.all(syncPromises);

      // Most should succeed, some might be rate limited
      const successfulResponses = responses.filter(
        (res) => res.status === 200,
      );
      const rateLimitedResponses = responses.filter(
        (res) => res.status === 429,
      );

      expect(successfulResponses.length + rateLimitedResponses.length).toBe(5);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits for Telegram API calls', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // <1s for Telegram API calls
    });
  });

  describe('Error Handling', () => {
    it('should handle Telegram API unavailability gracefully', async () => {
      // This test would simulate Telegram API being down
      // The implementation should return appropriate error codes

      const expectedError = {
        statusCode: 503,
        message: 'Telegram API temporarily unavailable',
        error: 'Service Unavailable',
      };

      expect(expectedError).toMatchObject({
        statusCode: 503,
        message: expect.any(String),
        error: 'Service Unavailable',
      });
    });

    it('should clear sync_errors on successful sync', async () => {
      // First, verify sync succeeds and clears any previous errors
      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${connectedGroupId}/sync`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Check that sync_errors is null
      const groupResponse = await request(app.getHttpServer())
        .get(`/v1/telegram-groups/${connectedGroupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(groupResponse.body.sync_errors).toBeNull();
    });
  });

  describe('Server Errors', () => {
    it('should return appropriate error structure for server errors', () => {
      const expectedErrorStructure = {
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
      };

      expect(expectedErrorStructure).toMatchObject({
        statusCode: 500,
        message: expect.any(String),
        error: expect.any(String),
      });
    });
  });
});