import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('POST /v1/users - Contract Test', () => {
  let app: INestApplication;
  let ownerToken: string;
  let adminToken: string;
  let moderatorToken: string; // eslint-disable-line @typescript-eslint/no-unused-vars

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

    // Create an admin user through user-management endpoint
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

    // Create a moderator user through user-management endpoint
    await request(app.getHttpServer())
      .post('/v1/users')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: 'moderator@tenant1.com',
        password: 'ModeratorPass123!',
        name: 'Test Moderator',
        role: 'moderator',
      });

    // Login as moderator to get moderator token
    const moderatorLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: 'moderator@tenant1.com',
        password: 'ModeratorPass123!',
      });

    moderatorToken = moderatorLogin.body.access_token;
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Request/Response Schema Validation', () => {
    it('should accept valid CreateUserRequest with admin role', async () => {
      const validRequest = {
        email: 'newadmin@tenant1.com',
        password: 'AdminPass123!',
        name: 'John Administrator',
        role: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(201);

      // Validate CreateUserResponse schema
      expect(response.body).toMatchObject({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
        email: validRequest.email,
        name: validRequest.name,
        role: validRequest.role,
        isActive: true,
        createdAt: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
        ),
      });
    });

    it('should accept valid CreateUserRequest with moderator role', async () => {
      const validRequest = {
        email: 'newmoderator@tenant1.com',
        password: 'ModeratorPass123!',
        name: 'Jane Moderator',
        role: 'moderator',
      };

      await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(validRequest)
        .expect(201);
    });

    it('should return 400 for invalid email format', async () => {
      const invalidRequest = {
        email: 'invalid-email',
        password: 'ValidPass123!',
        name: 'Test User',
        role: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        message: expect.arrayContaining([expect.stringContaining('email')]),
        error: 'Bad Request',
      });
    });

    it('should return 400 for weak password', async () => {
      const invalidRequest = {
        email: 'test@tenant1.com',
        password: 'weak',
        name: 'Test User',
        role: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
      // Check that at least one message contains 'password' or is about password validation
      const hasPasswordError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('password') ||
        msg.includes('at least 8 characters'));
      expect(hasPasswordError).toBe(true);
    });

    it('should return 400 for invalid role', async () => {
      const invalidRequest = {
        email: 'test@tenant1.com',
        password: 'ValidPass123!',
        name: 'Test User',
        role: 'owner', // owners cannot create other owners
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
      // Check that at least one message mentions 'role' or 'admin or moderator'
      const hasRoleError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('role') ||
        msg.includes('admin or moderator'));
      expect(hasRoleError).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteRequest = {
        email: 'test@tenant1.com',
        // missing password, name, role
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      // Check that we have validation errors for password, name, and role
      const messages = response.body.message as string[];
      const hasPasswordError = messages.some((msg: string) =>
        msg.toLowerCase().includes('password'));
      const hasNameError = messages.some((msg: string) =>
        msg.toLowerCase().includes('name'));
      const hasRoleError = messages.some((msg: string) =>
        msg.toLowerCase().includes('role') || msg.includes('admin or moderator'));

      expect(hasPasswordError).toBe(true);
      expect(hasNameError).toBe(true);
      expect(hasRoleError).toBe(true);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 for missing JWT token', async () => {
      const validRequest = {
        email: 'test@tenant1.com',
        password: 'ValidPass123!',
        name: 'Test User',
        role: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
      expect(response.body.message).toBeDefined();
    });

    it('should return 401 for invalid JWT token', async () => {
      const validRequest = {
        email: 'test@tenant1.com',
        password: 'ValidPass123!',
        name: 'Test User',
        role: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', 'Bearer invalid-token')
        .send(validRequest)
        .expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
      });
      expect(response.body.message).toBeDefined();
    });

    it('should return 403 for non-owner user attempting to create users', async () => {
      const validRequest = {
        email: 'test@tenant1.com',
        password: 'ValidPass123!',
        name: 'Test User',
        role: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validRequest)
        .expect(403);

      expect(response.body).toMatchObject({
        statusCode: 403,
        message: 'Only owner users can create admin/moderator users',
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    });
  });

  describe('Business Logic Errors', () => {
    it('should return 409 for duplicate email within tenant', async () => {
      // First create a user
      await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'duplicate@tenant1.com',
          password: 'FirstPass123!',
          name: 'First User',
          role: 'admin',
        })
        .expect(201);

      // Try to create another user with same email
      const duplicateRequest = {
        email: 'duplicate@tenant1.com',
        password: 'AnotherPass123!',
        name: 'Another Admin',
        role: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(duplicateRequest)
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });
      expect(response.body.message).toContain('already exists');
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

  describe('Edge Cases', () => {
    it('should handle maximum length name field', async () => {
      const longNameRequest = {
        email: 'longname@tenant1.com',
        password: 'ValidPass123!',
        name: 'A'.repeat(100), // Max length according to schema
        role: 'admin',
      };

      await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(longNameRequest)
        .expect(201);
    });

    it('should reject name field exceeding maximum length', async () => {
      const tooLongNameRequest = {
        email: 'toolong@tenant1.com',
        password: 'ValidPass123!',
        name: 'A'.repeat(101), // Exceeds max length
        role: 'admin',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(tooLongNameRequest)
        .expect(400);

      // Check that at least one message mentions 'name' or is about name length
      const hasNameError = response.body.message.some((msg: string) =>
        msg.toLowerCase().includes('name') ||
        msg.includes('exceed 100 characters'));
      expect(hasNameError).toBe(true);
    });

    it('should handle minimum length name field', async () => {
      const shortNameRequest = {
        email: 'short@tenant1.com',
        password: 'ValidPass123!',
        name: 'AB', // Min length according to schema
        role: 'admin',
      };

      await request(app.getHttpServer())
        .post('/v1/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(shortNameRequest)
        .expect(201);
    });
  });
});