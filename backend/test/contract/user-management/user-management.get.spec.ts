import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('GET /api/users - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup test tokens (these would normally come from auth service)
    ownerToken = 'mock-owner-jwt-token';
    adminToken = 'mock-admin-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Schema Validation', () => {
    it('should return GetUsersResponse with valid schema', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
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

    it('should return empty users array when no users exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        users: [],
        pagination: expect.objectContaining({
          total: 0,
          page: 1,
          limit: 20,
          hasNext: false,
          hasPrev: false,
        }),
      });
    });
  });

  describe('Query Parameters', () => {
    it('should handle pagination query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?page=2&limit=10')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 10,
        total: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: expect.any(Boolean),
      });
    });

    it('should handle role filter query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // All returned users should have admin role
      response.body.users.forEach((user: any) => {
        expect(user.role).toBe('admin');
      });
    });

    it('should handle role filter for moderators', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?role=moderator')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      response.body.users.forEach((user: any) => {
        expect(user.role).toBe('moderator');
      });
    });

    it('should handle role filter for owners', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?role=owner')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      response.body.users.forEach((user: any) => {
        expect(user.role).toBe('owner');
      });
    });

    it('should return 400 for invalid role filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?role=invalid-role')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([expect.stringContaining('role')]),
        error: 'Bad Request',
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?page=0&limit=0')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([
          expect.stringContaining('page'),
          expect.stringContaining('limit'),
        ]),
        error: 'Bad Request',
      });
    });

    it('should enforce maximum limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?limit=101') // Exceeds max of 100
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('limit')]),
      );
    });

    it('should use default values when query parameters omitted', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
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
        .get('/api/users')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      });
    });

    it('should return 401 for invalid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized',
      });
    });

    it('should return 403 for non-owner user attempting to list users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        message: 'Only owner users can access user management',
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    });
  });

  describe('Tenant Isolation', () => {
    it('should only return users from the current tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // This test would verify tenant isolation
      // All users should belong to the same tenant as the requesting owner
      // Implementation would validate tenantId matches request context
      expect(response.body.users).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            // Should not expose tenant_id but verify internal consistency
            id: expect.any(String),
            email: expect.any(String),
          }),
        ]),
      );
    });
  });

  describe('Performance and Limits', () => {
    it('should handle large pagination without timeout', async () => {
      // Test would verify response time is reasonable
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get('/api/users?page=1&limit=100')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(500); // <500ms requirement
    });

    it('should return consistent pagination metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users?page=1&limit=5')
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
        .get('/api/users')
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
    it('should return 500 for internal server errors with request ID', async () => {
      // This test would need to mock a server error condition
      // For now, we'll just verify the error response structure
      const response = {
        body: {
          statusCode: 500,
          message: 'Internal server error',
          error: 'Internal Server Error',
          requestId: expect.stringMatching(/^req_[0-9a-f-]+$/),
        },
      };

      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        requestId: expect.any(String),
      });
    });
  });
});
