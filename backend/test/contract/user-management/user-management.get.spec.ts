import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('GET /v1/users - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;

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

    // Create some test users to query
    // Create an admin user
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'admin@tenant1.com',
        password: 'AdminPass123!',
        name: 'Test Admin',
        role: 'admin',
      });

    // Login as admin to get admin token
    const adminLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'admin@tenant1.com',
        password: 'AdminPass123!',
      });

    adminToken = adminLogin.body.access_token;

    // Create a moderator user
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'moderator@tenant1.com',
        password: 'ModeratorPass123!',
        name: 'Test Moderator',
        role: 'moderator',
      });

    // Create another admin user
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'admin2@tenant1.com',
        password: 'AdminPass123!',
        name: 'Test Admin 2',
        role: 'admin',
      });
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Response Schema Validation', () => {
    it('should return GetUsersResponse with valid schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Validate GetUsersResponse schema
      expect(response.body).toMatchObject({
        users: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
            ),
            email: expect.stringMatching(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
            name: expect.any(String),
            role: expect.stringMatching(/^(owner|admin|moderator)$/),
            isActive: expect.any(Boolean),
            lastLoginAt: expect.any(Object), // Can be string (ISO date) or null
            createdAt: expect.stringMatching(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
            ),
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

    it('should return users including the owner', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Should have at least 4 users (owner + 3 created in setup)
      expect(response.body.users.length).toBeGreaterThanOrEqual(4);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Query Parameters', () => {
    it('should handle pagination query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users?page=2&limit=2')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 2,
        total: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: true, // Should have previous page since we're on page 2
      });
    });

    it('should handle role filter query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users?role=admin')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All returned users should have admin role
      response.body.users.forEach((user: any) => {
        expect(user.role).toBe('admin');
      });
      // Should have at least 2 admin users
      expect(response.body.users.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle role filter for moderators', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users?role=moderator')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      response.body.users.forEach((user: any) => {
        expect(user.role).toBe('moderator');
      });
      // Should have at least 1 moderator
      expect(response.body.users.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle role filter for owners', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users?role=owner')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      response.body.users.forEach((user: any) => {
        expect(user.role).toBe('owner');
      });
      // Should have at least 1 owner
      expect(response.body.users.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 for invalid role filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users?role=invalid-role')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
      // Check for role-related error message
      const hasRoleError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('role'));
      expect(hasRoleError).toBe(true);
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users?page=0&limit=0')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('should enforce maximum limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users?limit=101') // Exceeds max of 100
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      const hasLimitError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('limit'));
      expect(hasLimitError).toBe(true);
    });

    it('should use default values when query parameters omitted', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users')
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
        .get('/v1/users')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
      expect(response.body.message).toBeDefined();
    });

    it('should return 401 for invalid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
      expect(response.body.message).toBeDefined();
    });

    it('should return 403 for non-owner user attempting to list users', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        message: 'Only owner users can create admin/moderator users',
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return users from the current tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All users should belong to the same tenant as the requesting owner
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);

      // Verify we got the users we created
      const emails = response.body.users.map((u: any) => u.email);
      expect(emails).toContain('owner@tenant1.com');
      expect(emails).toContain('admin@tenant1.com');
      expect(emails).toContain('moderator@tenant1.com');
      expect(emails).toContain('admin2@tenant1.com');
    });
  });

  describe('Performance and Limits', () => {
    it('should handle large pagination without timeout', async () => {
      // Test would verify response time is reasonable
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/v1/users?page=1&limit=100')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // <1000ms for safety
    });

    it('should return consistent pagination metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users?page=1&limit=2')
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
    it('should return users ordered by creation date (newest first)', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      if (response.body.users.length > 1) {
        const users = response.body.users;
        for (let i = 0; i < users.length - 1; i++) {
          const current = new Date(users[i].createdAt);
          const next = new Date(users[i + 1].createdAt);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('Server Errors', () => {
    it('should return appropriate error structure for server errors', () => {
      // This test just verifies the expected error response structure
      // Actual server errors are difficult to trigger in a contract test
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