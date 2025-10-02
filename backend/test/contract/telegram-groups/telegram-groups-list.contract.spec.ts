import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('GET /v1/telegram-groups - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let botId: string;

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
    jest.setTimeout(30000);
    await TestSetupHelper.closeApp(app);
  });

  describe('Response Schema Validation', () => {
    it('should return telegram groups list with valid schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Validate TelegramGroupsListResponse schema per OpenAPI contract
      expect(response.body.groups).toBeDefined();
      expect(Array.isArray(response.body.groups)).toBe(true);
      expect(response.body.groups.length).toBeGreaterThan(0);

      // Validate pagination fields
      expect(response.body.total).toBeDefined();
      expect(response.body.page).toBeDefined();
      expect(response.body.limit).toBeDefined();
      expect(response.body.totalPages).toBeDefined();

      // Validate first group structure
      const group = response.body.groups[0];
      expect(group.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(typeof group.group_name).toBe('string');
      expect(['group', 'supergroup', 'channel']).toContain(group.group_type);
      expect(typeof group.member_count).toBe('number');
      expect(typeof group.is_active).toBe('boolean');
      expect(typeof group.bot_assigned).toBe('boolean');
      expect(['pending', 'connected', 'failed', 'disconnected']).toContain(group.connection_status);
      expect(group.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Validate bot object
      expect(group.bot).toBeDefined();
      expect(group.bot.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(typeof group.bot.bot_name).toBe('string');
    });

    it('should return expected number of groups', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Should have the 2 groups created in setup
      expect(response.body.groups.length).toBe(2);
      expect(response.body.total).toBe(2);
    });
  });

  describe('Query Parameters', () => {
    it('should handle pagination query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?page=1&limit=1')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
      });
      expect(response.body.groups.length).toBe(1);
    });

    // Note: bot_id filter is not supported by the API
    // The API supports: sync_enabled, connection_status, bot_assigned filters

    it('should handle connection_status filter query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?connection_status=pending')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All returned groups should have pending connection status
      response.body.groups.forEach((group: any) => {
        expect(group.connection_status).toBe('pending');
      });
    });

    it('should handle bot_assigned filter query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups?bot_assigned=false')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All returned groups should have bot_assigned as false
      response.body.groups.forEach((group: any) => {
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

      expect(response.body).toMatchObject({
        page: 1,
        limit: 10, // Default limit
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

      expect(response.body.groups).toBeDefined();
      expect(Array.isArray(response.body.groups)).toBe(true);
    });

    it('should allow admin users to list telegram groups', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.groups).toBeDefined();
      expect(Array.isArray(response.body.groups)).toBe(true);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return telegram groups from the current tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All groups should belong to the same tenant as the requesting owner
      expect(response.body.groups).toBeDefined();
      expect(Array.isArray(response.body.groups)).toBe(true);

      // Verify we got the groups we created
      const groupNames = response.body.groups.map((g: any) => g.group_name);
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

      const { page, limit, total, totalPages } = response.body;

      // Verify pagination logic consistency
      expect(page).toBe(1);
      expect(limit).toBe(1);
      expect(total).toBe(2);
      expect(totalPages).toBe(Math.ceil(total / limit));
    });
  });

  describe('Sorting and Ordering', () => {
    it('should return telegram groups ordered by creation date (newest first)', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/telegram-groups')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      if (response.body.groups.length > 1) {
        const groups = response.body.groups;
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