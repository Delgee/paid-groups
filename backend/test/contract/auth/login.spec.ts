import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('POST /v1/auth/login (Contract)', () => {
  let app: INestApplication;
  let testUser: {
    email: string;
    password: string;
    name: string;
    company_name: string;
  };

  beforeEach(async () => {
    app = await TestSetupHelper.createTestApp();
    await TestSetupHelper.cleanupDatabase();

    // Create a test user for login tests
    testUser = {
      email: 'login-test@example.com',
      password: 'SecurePassword123!',
      name: 'Login Test User',
      company_name: 'Test Company',
    };

    await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send(testUser);
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Valid login request', () => {
    it('should return 200 with auth response for valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(200);

      // Contract validation - same structure as register
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
      expect(response.body.user).toHaveProperty('last_login_at');

      // Data type validation
      expect(typeof response.body.user.id).toBe('string');
      expect(typeof response.body.user.tenant_id).toBe('string');
      expect(typeof response.body.user.is_active).toBe('boolean');
      expect(Array.isArray(response.body.user.permissions)).toBe(true);
      expect(['owner', 'admin', 'moderator']).toContain(response.body.user.role);
      expect(response.body.user.is_active).toBe(true);
    });

    it('should update last_login_at timestamp', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.user.last_login_at).toBeDefined();
      expect(typeof response.body.user.last_login_at).toBe('string');
      
      // Verify it's a valid ISO date string
      const lastLogin = new Date(response.body.user.last_login_at);
      expect(lastLogin.getTime()).not.toBeNaN();
    });
  });

  describe('Invalid login requests', () => {
    it('should return 400 for missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          password: testUser.password,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: testUser.email,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'invalid-email-format',
          password: testUser.password,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });
  });

  describe('Response headers', () => {
    it('should include correct content-type header', async () => {
      const loginData = {
        email: testUser.email,
        password: testUser.password,
      };

      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  describe('Case sensitivity', () => {
    it('should be case-insensitive for email', async () => {
      const loginData = {
        email: testUser.email.toUpperCase(),
        password: testUser.password,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(testUser.email.toLowerCase());
    });
  });
});