import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('POST /v1/auth/refresh (Contract)', () => {
  let app: INestApplication;
  let testUser: {
    email: string;
    password: string;
    name: string;
    company_name: string;
  };
  let validRefreshToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    // Create and login a test user to get a valid refresh token
    testUser = {
      email: 'refresh-test@example.com',
      password: 'SecurePassword123!',
      name: 'Refresh Test User',
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

    validRefreshToken = loginResponse.body.refresh_token;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Valid refresh request', () => {
    it('should return 200 with new tokens for valid refresh token', async () => {
      const refreshData = {
        refresh_token: validRefreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send(refreshData)
        .expect(200);

      // Contract validation - should return same structure as login/register
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('expires_in');
      expect(response.body).toHaveProperty('user');

      // Token format validation
      expect(typeof response.body.access_token).toBe('string');
      expect(response.body.access_token.length).toBeGreaterThan(0);
      expect(typeof response.body.refresh_token).toBe('string');
      expect(response.body.refresh_token.length).toBeGreaterThan(0);
      expect(typeof response.body.expires_in).toBe('number');
      expect(response.body.expires_in).toBeGreaterThan(0);

      // New tokens should be different from original
      expect(response.body.refresh_token).not.toBe(validRefreshToken);

      // User object validation
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).toHaveProperty('role');
      expect(response.body.user).toHaveProperty('tenant_id');
      expect(response.body.user).toHaveProperty('is_active');
      expect(response.body.user).toHaveProperty('permissions');
      expect(response.body.user).toHaveProperty('created_at');
      expect(response.body.user).toHaveProperty('updated_at');

      // Data type validation
      expect(typeof response.body.user.id).toBe('string');
      expect(typeof response.body.user.tenant_id).toBe('string');
      expect(typeof response.body.user.is_active).toBe('boolean');
      expect(Array.isArray(response.body.user.permissions)).toBe(true);
      expect(['owner', 'admin', 'moderator']).toContain(response.body.user.role);
      expect(response.body.user.is_active).toBe(true);
    });

    it('should rotate refresh token (new token should be different)', async () => {
      const refreshData = {
        refresh_token: validRefreshToken,
      };

      const firstRefresh = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(firstRefresh.body.refresh_token).not.toBe(validRefreshToken);
      expect(firstRefresh.body.access_token).toBeDefined();

      // Use the new refresh token for a second refresh
      const secondRefresh = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refresh_token: firstRefresh.body.refresh_token })
        .expect(200);

      expect(secondRefresh.body.refresh_token).not.toBe(firstRefresh.body.refresh_token);
      expect(secondRefresh.body.access_token).not.toBe(firstRefresh.body.access_token);
    });
  });

  describe('Invalid refresh requests', () => {
    it('should return 400 for missing refresh_token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({
          refresh_token: 'invalid-refresh-token',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for expired refresh token', async () => {
      // This test assumes we have a way to create expired tokens or wait for expiration
      // For now, we'll test with a malformed token that looks expired
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.invalid-signature';

      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({
          refresh_token: expiredToken,
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for already used refresh token', async () => {
      const refreshData = {
        refresh_token: validRefreshToken,
      };

      // Use the refresh token once
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send(refreshData)
        .expect(200);

      // Try to use the same refresh token again
      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send(refreshData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('Response headers', () => {
    it('should include correct content-type header', async () => {
      const refreshData = {
        refresh_token: validRefreshToken,
      };

      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send(refreshData)
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  describe('Token validation', () => {
    it('should return user info consistent with original login', async () => {
      const refreshData = {
        refresh_token: validRefreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send(refreshData)
        .expect(200);

      // User data should remain consistent
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user.is_active).toBe(true);
    });
  });
});