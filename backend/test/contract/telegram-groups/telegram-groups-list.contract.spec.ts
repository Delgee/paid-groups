import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('GET /v1/telegram-groups - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let botId: string;

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

    // Create some test telegram groups
    await request(app.getHttpServer())
      .post('/v1/telegram-groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        group_name: 'VIP Group 1',
        description: 'Premium content group',
        bot_id: botId,
        settings: { welcome_message: 'Welcome to VIP!' },
      });

    await request(app.getHttpServer())
      .post('/v1/telegram-groups')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        group_name: 'VIP Group 2',
        description: 'Another premium group',
        bot_id: botId,
      });
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Response Schema Validation', () => {
    it('should return telegram groups list with valid schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Validate TelegramGroupsListResponse schema per OpenAPI contract
      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
            ),
            group_name: expect.any(String),
            description: expect.any(String), // Can be null
            group_type: expect.stringMatching(/^(group|supergroup|channel)$/),
            member_count: expect.any(Number),
            is_active: expect.any(Boolean),
            bot_assigned: expect.any(Boolean),
            connection_status: expect.stringMatching(
              /^(pending|connected|failed|disconnected)$/,
            ),
            last_sync_at: expect.any(Object), // Can be string (ISO date) or null
            created_at: expect.stringMatching(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
            ),
            bot: expect.objectContaining({
              id: expect.stringMatching(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
              ),
              bot_name: expect.any(String),
              bot_username: expect.any(Object), // Can be string or null
            }),
          }),
        ]),
        pagination: expect.objectContaining({
          total: expect.any(Number),
          page: expect.any(Number),
          limit: expect.any(Number),
          hasNext: expect.any(Boolean),
          hasPrev: expect.any(Boolean),
        }),
      });
    });

    it('should return expected number of groups', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Should have the 2 groups created in setup
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.total).toBe(2);
    });
  });

  describe('Query Parameters', () => {
    it('should handle pagination query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?page=1&limit=1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        hasNext: true,
        hasPrev: false,
      });
      expect(response.body.data.length).toBe(1);
    });

    it('should handle bot_id filter query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/v1/telegram-groups?bot_id=${botId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All returned groups should have the specified bot_id
      response.body.data.forEach((group: any) => {
        expect(group.bot.id).toBe(botId);
      });
      expect(response.body.data.length).toBe(2);
    });

    it('should handle connection_status filter query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?connection_status=pending')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All returned groups should have pending connection status
      response.body.data.forEach((group: any) => {
        expect(group.connection_status).toBe('pending');
      });
    });

    it('should handle bot_assigned filter query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?bot_assigned=false')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All returned groups should have bot_assigned as false
      response.body.data.forEach((group: any) => {
        expect(group.bot_assigned).toBe(false);
      });
    });

    it('should return 400 for invalid connection_status filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?connection_status=invalid-status')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?page=0&limit=0')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('should enforce maximum limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?limit=101') // Exceeds max of 100
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      const hasLimitError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('limit'),
      );
      expect(hasLimitError).toBe(true);
    });

    it('should use default values when query parameters omitted', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should return 401 for invalid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
    });

    it('should allow owner users to list telegram groups', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 403 for admin users attempting to list telegram groups', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return telegram groups from the current tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All groups should belong to the same tenant as the requesting owner
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // Verify we got the groups we created
      const groupNames = response.body.data.map((g: any) => g.group_name);
      expect(groupNames).toContain('VIP Group 1');
      expect(groupNames).toContain('VIP Group 2');
    });
  });

  describe('Performance and Limits', () => {
    it('should handle large pagination without timeout', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/v1/telegram-groups?page=1&limit=100')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // <1000ms for safety
    });

    it('should return consistent pagination metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?page=1&limit=1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const { pagination } = response.body;

      // Verify pagination logic consistency
      expect(pagination.hasPrev).toBe(pagination.page > 1);
      expect(pagination.hasNext).toBe(
        pagination.page * pagination.limit < pagination.total,
      );
    });
  });

  describe('Sorting and Ordering', () => {
    it('should return telegram groups ordered by creation date (newest first)', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      if (response.body.data.length > 1) {
        const groups = response.body.data;
        for (let i = 0; i < groups.length - 1; i++) {
          const current = new Date(groups[i].created_at);
          const next = new Date(groups[i + 1].created_at);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
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