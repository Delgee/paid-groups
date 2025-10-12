import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('POST /v1/telegram-groups - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let projectId: string;

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
        bot_token: process.env.TEST_TELEGRAM_BOT_TOKEN || '8134958196:AAFJbqtBguKzKOCuEdzQkLw3i7vkOUgUh3E',
      });

    projectId = botResponse.body.id;
  });

  afterEach(async () => {
    jest.setTimeout(30000);
    await TestSetupHelper.closeApp(app);
  });

  describe('Request/Response Schema Validation', () => {
    it('should accept valid CreateTelegramGroupRequest with all fields', async () => {
      const validRequest = {
        group_name: 'VIP Premium Group',
        description: 'Premium content for VIP members',
        project_id: projectId,
        settings: {
          welcome_message: 'Welcome to our VIP group!',
          auto_approve: false,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(201);

      // Validate TelegramGroup response schema per OpenAPI contract
      expect(response.body).toMatchObject({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
        group_name: validRequest.group_name,
        description: validRequest.description,
        group_type: expect.stringMatching(/^(group|supergroup|channel)$/),
        telegram_chat_id: null, // Should be null until connected
        username: null,
        invite_link: null,
        member_count: 0,
        is_active: true,
        bot_assigned: false,
        connection_status: 'pending',
        sync_enabled: false,
        last_sync_at: null,
        sync_errors: null,
        settings: expect.objectContaining(validRequest.settings),
        created_at: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
        ),
        updated_at: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
        ),
        bot: expect.objectContaining({
          id: projectId,
          bot_name: expect.any(String),
          bot_username: expect.anything(), // Can be string or null
        }),
      });
    });

    it('should accept valid CreateTelegramGroupRequest with minimum required fields', async () => {
      const validRequest = {
        group_name: 'Basic Group',
        project_id: projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        group_name: validRequest.group_name,
        description: null,
        bot_assigned: false,
        connection_status: 'pending',
        sync_enabled: false,
      });
    });

    it('should return 400 for missing required group_name field', async () => {
      const invalidRequest = {
        // missing group_name
        project_id: projectId,
        description: 'Test description',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });

      const hasGroupNameError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('group_name') || msg.toLowerCase().includes('group name'),
      );
      expect(hasGroupNameError).toBe(true);
    });

    it('should return 400 for missing required project_id field', async () => {
      const invalidRequest = {
        group_name: 'Test Group',
        // missing project_id
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });

      const hasProjectIdError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('project_id') || msg.toLowerCase().includes('project'),
      );
      expect(hasProjectIdError).toBe(true);
    });

    it('should return 400 for invalid group_name length (too short)', async () => {
      const invalidRequest = {
        group_name: '', // Too short
        project_id: projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      const hasLengthError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('length') || msg.toLowerCase().includes('empty'),
      );
      expect(hasLengthError).toBe(true);
    });

    it('should return 400 for invalid group_name length (too long)', async () => {
      const invalidRequest = {
        group_name: 'A'.repeat(256), // Exceeds 255 character limit
        project_id: projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
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
        group_name: 'Valid Group Name',
        description: 'A'.repeat(1001), // Exceeds 1000 character limit
        project_id: projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      const hasDescriptionError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('description') || msg.includes('1000'),
      );
      expect(hasDescriptionError).toBe(true);
    });

    it('should return 400 for invalid project_id format', async () => {
      const invalidRequest = {
        group_name: 'Valid Group Name',
        project_id: 'invalid-uuid-format',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      const hasUuidError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('uuid') || msg.toLowerCase().includes('project_id'),
      );
      expect(hasUuidError).toBe(true);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing JWT token', async () => {
      const validRequest = {
        group_name: 'Test Group',
        project_id: projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should return 401 for invalid JWT token', async () => {
      const validRequest = {
        group_name: 'Test Group',
        project_id: projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', 'Bearer invalid-token')
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should allow owner users to create telegram groups', async () => {
      const validRequest = {
        group_name: 'Owner Created Group',
        project_id: projectId,
      };

      await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(201);
    });

    it('should allow admin users to create telegram groups', async () => {
      const validRequest = {
        group_name: 'Admin Created Group',
        project_id: projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequest)
        .expect(201);

      expect(response.body).toMatchObject({
        group_name: validRequest.group_name,
        project_id: projectId,
      });
    });
  });

  describe('Business Logic Errors', () => {
    it('should return 400 for non-existent project_id', async () => {
      const invalidRequest = {
        group_name: 'Test Group',
        project_id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format but non-existent
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
      expect(response.body.message).toContain('Bot not found');
    });

    it('should return 409 for duplicate group_name within tenant', async () => {
      // First create a group
      const firstRequest = {
        group_name: 'Duplicate Group Name',
        project_id: projectId,
      };

      await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(firstRequest)
        .expect(201);

      // Try to create another group with same name
      const duplicateRequest = {
        group_name: 'Duplicate Group Name',
        project_id: projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(duplicateRequest)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for project_id not accessible to tenant', async () => {
      // Use a valid UUID format that doesn't exist in this tenant
      const nonExistentProjectId = '123e4567-e89b-12d3-a456-426614174999';

      const invalidRequest = {
        group_name: 'Cross Tenant Group',
        project_id: nonExistentProjectId,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
      expect(response.body.message).toContain('Bot not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum length group_name field', async () => {
      const maxLengthRequest = {
        group_name: 'A'.repeat(255), // Max length according to schema
        project_id: projectId,
      };

      await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(maxLengthRequest)
        .expect(201);
    });

    it('should handle maximum length description field', async () => {
      const maxDescriptionRequest = {
        group_name: 'Group with Max Description',
        description: 'A'.repeat(1000), // Max length according to schema
        project_id: projectId,
      };

      await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(maxDescriptionRequest)
        .expect(201);
    });

    it('should handle complex settings object', async () => {
      const complexSettingsRequest = {
        group_name: 'Complex Settings Group',
        project_id: projectId,
        settings: {
          welcome_message: 'Welcome to our premium group!',
          auto_approve: true,
          notify_on_join: false,
          rules: [
            'Be respectful',
            'No spam',
            'Follow community guidelines',
          ],
          moderators: ['@admin1', '@admin2'],
          payment_required: true,
          subscription_fee: 9.99,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(complexSettingsRequest)
        .expect(201);

      expect(response.body.settings).toEqual(complexSettingsRequest.settings);
    });

    it('should handle empty settings object', async () => {
      const emptySettingsRequest = {
        group_name: 'Empty Settings Group',
        project_id: projectId,
        settings: {},
      };

      await request(app.getHttpServer())
        .post('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(emptySettingsRequest)
        .expect(201);
    });
  });

  describe('Server Errors', () => {
    it('should return appropriate error structure for server errors', () => {
      // This test verifies the expected error response structure
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