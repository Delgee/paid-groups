import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('GET /v1/auth/me (Contract)', () => {
  let app: INestApplication;
  let testUser: {
    email: string;
    password: string;
    name: string;
    company_name: string;
  };
  let accessToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    // Create and login a test user to get an access token
    testUser = {
      email: 'me-test@example.com',
      password: 'SecurePassword123!',
      name: 'Me Test User',
      company_name: 'Test Company',
    };

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(testUser);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    accessToken = loginResponse.body.access_token;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Valid authenticated request', () => {
    it('should return 200 with user info for valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Contract validation - should return user object
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('name', testUser.name);
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('tenant_id');
      expect(response.body).toHaveProperty('is_active');
      expect(response.body).toHaveProperty('permissions');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
      expect(response.body).toHaveProperty('last_login_at');

      // Data type validation
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.email).toBe('string');
      expect(typeof response.body.name).toBe('string');
      expect(typeof response.body.tenant_id).toBe('string');
      expect(typeof response.body.is_active).toBe('boolean');
      expect(Array.isArray(response.body.permissions)).toBe(true);
      expect(['owner', 'admin', 'moderator']).toContain(response.body.role);
      expect(response.body.is_active).toBe(true);

      // Sensitive data should not be present
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should return consistent user data across requests', async () => {
      const firstResponse = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const secondResponse = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Data should be consistent across calls
      expect(firstResponse.body.id).toBe(secondResponse.body.id);
      expect(firstResponse.body.email).toBe(secondResponse.body.email);
      expect(firstResponse.body.name).toBe(secondResponse.body.name);
      expect(firstResponse.body.tenant_id).toBe(secondResponse.body.tenant_id);
      expect(firstResponse.body.role).toBe(secondResponse.body.role);
    });

    it('should include all expected user properties', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Required properties
      const requiredProps = [
        'id', 'email', 'name', 'role', 'tenant_id', 'is_active', 
        'permissions', 'created_at', 'updated_at'
      ];

      requiredProps.forEach(prop => {
        expect(response.body).toHaveProperty(prop);
      });

      // Optional properties that may be null
      expect(response.body.hasOwnProperty('last_login_at')).toBe(true);
    });
  });

  describe('Authentication validation', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for invalid authorization header format', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for expired token', async () => {
      // Test with a malformed expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.invalid-signature';

      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for token without Bearer prefix', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', accessToken)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('Response headers', () => {
    it('should include correct content-type header', async () => {
      await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  describe('Token validation edge cases', () => {
    it('should handle case-insensitive Bearer prefix', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `bearer ${accessToken}`)
        .expect(401); // Most JWT implementations are case-sensitive for Bearer

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should reject tokens with extra spaces', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer  ${accessToken}`) // Extra space
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('User state validation', () => {
    it('should return current user state', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // User should be active and have expected properties
      expect(response.body.is_active).toBe(true);
      expect(response.body.email).toBe(testUser.email.toLowerCase());
      expect(response.body.name).toBe(testUser.name);
    });
  });
});