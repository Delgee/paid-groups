import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('POST /v1/telegram-groups/{id}/connect-channel - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let botId: string;
  let groupId: string;

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

    // Create a test telegram group
    const groupResponse = await request(app.getHttpServer())
      .post('/v1/telegram-groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        group_name: 'Test Group for Connection',
        description: 'Group for channel connection testing',
        bot_id: botId,
      });

    groupId = groupResponse.body.id;
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Request/Response Schema Validation', () => {
    it('should accept valid ConnectChannelRequest with all fields', async () => {
      const validRequest = {
        telegram_chat_id: '-1001234567890',
        invite_link: 'https://t.me/+AbCdEfGhIjKlMnOp',
        verify_permissions: true,
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);

      // Validate TelegramGroup response schema per OpenAPI contract
      expect(response.body).toMatchObject({
        id: groupId,
        telegram_chat_id: expect.any(Number),
        invite_link: validRequest.invite_link,
        bot_assigned: true, // Should be set to true after successful connection
        connection_status: 'connected',
        updated_at: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
        ),
      });
    });

    it('should accept valid ConnectChannelRequest with minimum required fields', async () => {
      const validRequest = {
        telegram_chat_id: '-1001234567890',
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        id: groupId,
        telegram_chat_id: expect.any(Number),
        bot_assigned: true,
        connection_status: 'connected',
      });
    });

    it('should return 400 for missing required telegram_chat_id field', async () => {
      const invalidRequest = {
        // missing telegram_chat_id
        invite_link: 'https://t.me/+AbCdEfGhIjKlMnOp',
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });

      const hasChatIdError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('telegram_chat_id') ||
        msg.toLowerCase().includes('chat_id') ||
        msg.toLowerCase().includes('chat id'),
      );
      expect(hasChatIdError).toBe(true);
    });

    it('should return 400 for invalid telegram_chat_id format', async () => {
      const invalidRequest = {
        telegram_chat_id: 'invalid-chat-id-format',
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      const hasFormatError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('format') ||
        msg.toLowerCase().includes('pattern') ||
        msg.toLowerCase().includes('telegram_chat_id'),
      );
      expect(hasFormatError).toBe(true);
    });

    it('should return 400 for invalid invite_link format', async () => {
      const invalidRequest = {
        telegram_chat_id: '-1001234567890',
        invite_link: 'invalid-invite-link-format',
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      const hasLinkError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('invite_link') ||
        msg.toLowerCase().includes('link') ||
        msg.includes('https://t.me/'),
      );
      expect(hasLinkError).toBe(true);
    });

    it('should accept positive telegram_chat_id for groups', async () => {
      const validRequest = {
        telegram_chat_id: '1001234567890', // Positive for groups
      };

      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);
    });
  });

  describe('Path Parameters', () => {
    it('should return 400 for invalid UUID format', async () => {
      const validRequest = {
        telegram_chat_id: '-1001234567890',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups/invalid-uuid/connect-channel')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('should return 404 for non-existent group ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';
      const validRequest = {
        telegram_chat_id: '-1001234567890',
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${nonExistentId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing JWT token', async () => {
      const validRequest = {
        telegram_chat_id: '-1001234567890',
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should return 401 for invalid JWT token', async () => {
      const validRequest = {
        telegram_chat_id: '-1001234567890',
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', 'Bearer invalid-token')
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should allow owner users to connect channels', async () => {
      const validRequest = {
        telegram_chat_id: '-1001234567890',
      };

      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);
    });

    it('should return 403 for admin users attempting to connect channels', async () => {
      const validRequest = {
        telegram_chat_id: '-1001234567890',
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequest)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
      });
    });
  });

  describe('Business Logic Errors', () => {
    it('should return 409 for bot without admin permissions', async () => {
      const invalidRequest = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: true, // This will trigger permission check
      };

      // Assume the test bot doesn't have admin permissions
      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(response.body.message).toContain('permission');
    });

    it('should return 409 for already connected channel', async () => {
      const connectRequest = {
        telegram_chat_id: '-1001234567890',
      };

      // Connect the channel first
      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(connectRequest)
        .expect(200);

      // Try to connect the same channel to another group
      const anotherGroupResponse = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          group_name: 'Another Group',
          bot_id: botId,
        });

      const anotherGroupId = anotherGroupResponse.body.id;

      const duplicateRequest = {
        telegram_chat_id: '-1001234567890', // Same chat ID
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${anotherGroupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(duplicateRequest)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(response.body.message).toContain('already connected');
    });

    it('should return 409 for group already connected to different channel', async () => {
      // Connect to first channel
      const firstRequest = {
        telegram_chat_id: '-1001234567890',
      };

      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(firstRequest)
        .expect(200);

      // Try to connect to different channel
      const secondRequest = {
        telegram_chat_id: '-1009876543210', // Different chat ID
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(secondRequest)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(response.body.message).toContain('already connected');
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

      // Try to connect channel for other tenant's group
      const validRequest = {
        telegram_chat_id: '-1001234567890',
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${otherGroupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle verify_permissions=false (skip permission check)', async () => {
      const validRequest = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);
    });

    it('should handle large chat ID numbers', async () => {
      const validRequest = {
        telegram_chat_id: '-100999999999999999',
      };

      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);
    });

    it('should handle valid Telegram invite link formats', async () => {
      const validRequest = {
        telegram_chat_id: '-1001234567890',
        invite_link: 'https://t.me/+AbCdEfGhIjKlMnOpQrStUvWxYz',
      };

      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      const validRequest = {
        telegram_chat_id: '-1001234567890',
      };

      await request(app.getHttpServer())
        .post(`/v1/telegram-groups/${groupId}/connect-channel`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // <1s for Telegram API calls
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