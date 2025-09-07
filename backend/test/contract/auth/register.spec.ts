import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('POST /v1/auth/register (Contract)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Valid registration request', () => {
    it('should return 201 with auth response for valid data', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
        company_name: 'Test Company',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      // Contract validation
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
      expect(response.body.user).toHaveProperty('email', registerData.email);
      expect(response.body.user).toHaveProperty('name', registerData.name);
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
    });
  });

  describe('Invalid registration requests', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePassword123!',
          name: 'Test User',
          company_name: 'Test Company',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
          company_name: 'Test Company',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 409 for duplicate email', async () => {
      const registerData = {
        email: 'duplicate@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
        company_name: 'Test Company',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 409);
    });
  });

  describe('Response headers', () => {
    it('should include correct content-type header', async () => {
      const registerData = {
        email: 'header@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
        company_name: 'Test Company',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registerData)
        .expect(201)
        .expect('Content-Type', /json/);
    });
  });
});