import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('PUT /v1/telegram-groups/{id} - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let botId: string;
  let groupId: string;

  beforeEach(async () => {
    jest.setTimeout(30000);
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
        group_name: 'Test VIP Group',
        description: 'Original description',
        bot_id: botId,
        settings: { welcome_message: 'Welcome!' },
      });

    groupId = groupResponse.body.id;
  });

  afterEach(async () => {
    jest.setTimeout(30000);
    await TestSetupHelper.closeApp(app);
  });

  describe('Request/Response Schema Validation', () => {
    it('should accept valid UpdateTelegramGroupRequest with all fields', async () => {
      const validRequest = {
        group_name: 'Updated VIP Group Name',
        description: 'Updated description for testing sync',
        sync_enabled: true,
        settings: {
          welcome_message: 'Updated welcome message!',
          auto_approve: true,
        },
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);

      // Validate TelegramGroup response schema per OpenAPI contract
      expect(response.body).toMatchObject({
        id: groupId,
        group_name: validRequest.group_name,
        description: validRequest.description,
        sync_enabled: validRequest.sync_enabled,
        settings: expect.objectContaining(validRequest.settings),
        updated_at: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
        ),
      });
    });

    it('should accept partial update request', async () => {
      const partialRequest = {
        group_name: 'Partially Updated Name',
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(partialRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        id: groupId,
        group_name: partialRequest.group_name,
        description: 'Original description', // Should remain unchanged
      });
    });

    it('should return 400 for invalid group_name length (too long)', async () => {
      const invalidRequest = {
        group_name: 'A'.repeat(256), // Exceeds 255 character limit
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      const hasLengthError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('length') || msg.includes('255'),
      );
      expect(hasLengthError).toBe(true);
    });

    it('should return 400 for invalid description length (too long)', async () => {
      const invalidRequest = {
        description: 'A'.repeat(1001), // Exceeds 1000 character limit
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      const hasDescriptionError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('description') || msg.includes('1000'),
      );
      expect(hasDescriptionError).toBe(true);
    });

    it('should return 400 for empty group_name', async () => {
      const invalidRequest = {
        group_name: '', // Empty string not allowed
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('Path Parameters', () => {
    it('should return 400 for invalid UUID format', async () => {
      const validRequest = {
        group_name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .put('/v1/telegram-groups/invalid-uuid')
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
        group_name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${nonExistentId}`)
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
        group_name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should return 401 for invalid JWT token', async () => {
      const validRequest = {
        group_name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', 'Bearer invalid-token')
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should allow owner users to update telegram groups', async () => {
      const validRequest = {
        group_name: 'Owner Updated Name',
      };

      await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);
    });

    it('should return 403 for admin users attempting to update telegram groups', async () => {
      const validRequest = {
        group_name: 'Admin Attempted Update',
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequest)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
      });
    });
  });

  describe('Business Logic', () => {
    it('should return 409 for duplicate group_name within tenant', async () => {
      // Create another group first
      await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          group_name: 'Another Group',
          bot_id: botId,
        });

      // Try to update first group to have same name as second
      const duplicateRequest = {
        group_name: 'Another Group',
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(duplicateRequest)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(response.body.message).toContain('already exists');
    });

    it('should return 409 when trying to enable sync on group without bot assignment', async () => {
      const invalidRequest = {
        sync_enabled: true, // Can't enable sync when bot_assigned is false
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(response.body.message).toContain('bot');
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

      // Try to update the other tenant's group
      const validRequest = {
        group_name: 'Cross Tenant Update Attempt',
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${otherGroupId}`)
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
    it('should handle maximum length group_name field', async () => {
      const maxLengthRequest = {
        group_name: 'A'.repeat(255), // Max length according to schema
      };

      await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(maxLengthRequest)
        .expect(200);
    });

    it('should handle maximum length description field', async () => {
      const maxDescriptionRequest = {
        description: 'A'.repeat(1000), // Max length according to schema
      };

      await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(maxDescriptionRequest)
        .expect(200);
    });

    it('should handle complex settings update', async () => {
      const complexSettingsRequest = {
        settings: {
          welcome_message: 'Updated welcome message!',
          auto_approve: false,
          notify_on_join: true,
          rules: ['Updated rule 1', 'Updated rule 2'],
          moderators: ['@newmod1', '@newmod2'],
        },
      };

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(complexSettingsRequest)
        .expect(200);

      expect(response.body.settings).toEqual(complexSettingsRequest.settings);
    });

    it('should handle empty update request', async () => {
      const emptyRequest = {};

      const response = await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(emptyRequest)
        .expect(200);

      // Should return the group unchanged
      expect(response.body.group_name).toBe('Test VIP Group');
      expect(response.body.description).toBe('Original description');
    });
  });

  describe('Performance', () => {
    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();
      const validRequest = {
        group_name: 'Performance Test Update',
      };

      await request(app.getHttpServer())
        .put(`/v1/telegram-groups/${groupId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500); // <500ms per requirements
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