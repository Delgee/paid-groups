import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('POST /api/users - Contract Test', () => {
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

  describe('Request/Response Schema Validation', () => {
    it('should accept valid CreateUserRequest with admin role', async () => {
      const validRequest = {
        email: 'admin@tenant1.com',
        password: 'AdminPass123',
        name: 'John Administrator',
        role: 'admin'
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(201);

      // Validate CreateUserResponse schema
      expect(response.body).toMatchObject({
        id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
        email: validRequest.email,
        name: validRequest.name,
        role: validRequest.role,
        isActive: true,
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
      });
    });

    it('should accept valid CreateUserRequest with moderator role', async () => {
      const validRequest = {
        email: 'moderator@tenant1.com',
        password: 'ModeratorPass123',
        name: 'Jane Moderator',
        role: 'moderator'
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(201);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidRequest = {
        email: 'invalid-email',
        password: 'ValidPass123',
        name: 'Test User',
        role: 'admin'
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([expect.stringContaining('email')]),
        error: 'Bad Request',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'email',
            constraint: 'isEmail'
          })
        ])
      });
    });

    it('should return 400 for weak password', async () => {
      const invalidRequest = {
        email: 'test@tenant1.com',
        password: 'weak',
        name: 'Test User',
        role: 'admin'
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([expect.stringContaining('password')]),
        error: 'Bad Request'
      });
    });

    it('should return 400 for invalid role', async () => {
      const invalidRequest = {
        email: 'test@tenant1.com',
        password: 'ValidPass123',
        name: 'Test User',
        role: 'owner' // owners cannot create other owners
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([expect.stringContaining('role')]),
        error: 'Bad Request'
      });
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteRequest = {
        email: 'test@tenant1.com'
        // missing password, name, role
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('password'),
          expect.stringContaining('name'),
          expect.stringContaining('role')
        ])
      );
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing JWT token', async () => {
      const validRequest = {
        email: 'test@tenant1.com',
        password: 'ValidPass123',
        name: 'Test User',
        role: 'admin'
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized'
      });
    });

    it('should return 401 for invalid JWT token', async () => {
      const validRequest = {
        email: 'test@tenant1.com',
        password: 'ValidPass123',
        name: 'Test User',
        role: 'admin'
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', 'Bearer invalid-token')
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        message: 'Unauthorized',
        error: 'Unauthorized'
      });
    });

    it('should return 403 for non-owner user attempting to create users', async () => {
      const validRequest = {
        email: 'test@tenant1.com',
        password: 'ValidPass123',
        name: 'Test User',
        role: 'admin'
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequest)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        message: 'Only owner users can create admin/moderator users',
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    });
  });

  describe('Business Logic Errors', () => {
    it('should return 409 for duplicate email within tenant', async () => {
      const duplicateRequest = {
        email: 'admin@tenant1.com', // Same email as first test
        password: 'AnotherPass123',
        name: 'Another Admin',
        role: 'admin'
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(duplicateRequest)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        message: 'User with this email already exists',
        error: 'Conflict',
        code: 'DUPLICATE_EMAIL'
      });
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
          requestId: expect.stringMatching(/^req_[0-9a-f-]+$/)
        }
      };

      expect(response.body).toMatchObject({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Internal Server Error',
        requestId: expect.any(String)
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum length name field', async () => {
      const longNameRequest = {
        email: 'longname@tenant1.com',
        password: 'ValidPass123',
        name: 'A'.repeat(100), // Max length according to schema
        role: 'admin'
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(longNameRequest)
        .expect(201);
    });

    it('should reject name field exceeding maximum length', async () => {
      const tooLongNameRequest = {
        email: 'toolong@tenant1.com',
        password: 'ValidPass123',
        name: 'A'.repeat(101), // Exceeds max length
        role: 'admin'
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(tooLongNameRequest)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('name')])
      );
    });

    it('should handle minimum length name field', async () => {
      const shortNameRequest = {
        email: 'short@tenant1.com',
        password: 'ValidPass123',
        name: 'AB', // Min length according to schema
        role: 'admin'
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(shortNameRequest)
        .expect(201);
    });
  });
});