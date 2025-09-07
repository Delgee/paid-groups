import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Tenant Registration Flow (Integration)', () => {
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

  describe('Complete tenant registration flow', () => {
    it('should successfully register tenant and create owner user', async () => {
      const registrationData = {
        email: 'tenant-owner@example.com',
        password: 'SecurePassword123!',
        name: 'Tenant Owner',
        company_name: 'Test Tenant Company',
      };

      // Step 1: Register the tenant
      const registerResponse = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registrationData)
        .expect(201);

      // Validate registration response
      expect(registerResponse.body).toHaveProperty('access_token');
      expect(registerResponse.body).toHaveProperty('refresh_token');
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user.email).toBe(registrationData.email);
      expect(registerResponse.body.user.name).toBe(registrationData.name);
      expect(registerResponse.body.user.role).toBe('owner');
      expect(registerResponse.body.user.is_active).toBe(true);

      const { access_token, user } = registerResponse.body;

      // Step 2: Verify authentication works with returned token
      const meResponse = await request(app.getHttpServer())
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(meResponse.body.id).toBe(user.id);
      expect(meResponse.body.email).toBe(user.email);
      expect(meResponse.body.tenant_id).toBe(user.tenant_id);

      // Step 3: Verify tenant isolation (try to access bots - should return empty array)
      const botsResponse = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(botsResponse.body).toHaveProperty('bots');
      expect(Array.isArray(botsResponse.body.bots)).toBe(true);
      expect(botsResponse.body.bots).toHaveLength(0);

      // Step 4: Verify login works with the created account
      const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password,
        })
        .expect(200);

      expect(loginResponse.body.user.id).toBe(user.id);
      expect(loginResponse.body.user.tenant_id).toBe(user.tenant_id);

      // Step 5: Verify refresh token works
      const refreshResponse = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({
          refresh_token: registerResponse.body.refresh_token,
        })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('access_token');
      expect(refreshResponse.body).toHaveProperty('refresh_token');
      expect(refreshResponse.body.user.id).toBe(user.id);
    });

    it('should create separate tenants for different registrations', async () => {
      const firstTenant = {
        email: 'first-tenant@example.com',
        password: 'SecurePassword123!',
        name: 'First Tenant Owner',
        company_name: 'First Company',
      };

      const secondTenant = {
        email: 'second-tenant@example.com',
        password: 'SecurePassword123!',
        name: 'Second Tenant Owner',
        company_name: 'Second Company',
      };

      // Register first tenant
      const firstResponse = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(firstTenant)
        .expect(201);

      // Register second tenant
      const secondResponse = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(secondTenant)
        .expect(201);

      // Verify different tenant IDs
      expect(firstResponse.body.user.tenant_id).not.toBe(secondResponse.body.user.tenant_id);

      // Verify each tenant can access their own data
      const firstUserBots = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${firstResponse.body.access_token}`)
        .expect(200);

      const secondUserBots = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${secondResponse.body.access_token}`)
        .expect(200);

      // Both should have empty bot arrays but structure should be consistent
      expect(firstUserBots.body.bots).toHaveLength(0);
      expect(secondUserBots.body.bots).toHaveLength(0);
    });

    it('should handle registration errors gracefully', async () => {
      const validRegistration = {
        email: 'valid-registration@example.com',
        password: 'SecurePassword123!',
        name: 'Valid User',
        company_name: 'Valid Company',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(validRegistration)
        .expect(201);

      // Duplicate email should fail
      const duplicateResponse = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(validRegistration)
        .expect(409);

      expect(duplicateResponse.body).toHaveProperty('error');
      expect(duplicateResponse.body).toHaveProperty('statusCode', 409);

      // Original registration should still work
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: validRegistration.email,
          password: validRegistration.password,
        })
        .expect(200);
    });

    it('should validate all required fields during registration', async () => {
      const testCases = [
        { data: {}, expectedFields: ['email', 'password', 'name', 'company_name'] },
        { 
          data: { email: 'test@example.com' }, 
          expectedFields: ['password', 'name', 'company_name'] 
        },
        { 
          data: { email: 'test@example.com', password: 'SecurePass123!' }, 
          expectedFields: ['name', 'company_name'] 
        },
        { 
          data: { 
            email: 'test@example.com', 
            password: 'SecurePass123!', 
            name: 'Test User' 
          }, 
          expectedFields: ['company_name'] 
        },
      ];

      for (const testCase of testCases) {
        const response = await request(app.getHttpServer())
          .post('/v1/auth/register')
          .send(testCase.data)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('statusCode', 400);
      }
    });
  });

  describe('Authentication persistence', () => {
    it('should maintain session across multiple requests', async () => {
      const registrationData = {
        email: 'session-test@example.com',
        password: 'SecurePassword123!',
        name: 'Session Test User',
        company_name: 'Session Test Company',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(registrationData)
        .expect(201);

      const { access_token } = registerResponse.body;

      // Multiple authenticated requests should work
      for (let i = 0; i < 3; i++) {
        const meResponse = await request(app.getHttpServer())
          .get('/v1/auth/me')
          .set('Authorization', `Bearer ${access_token}`)
          .expect(200);

        expect(meResponse.body.email).toBe(registrationData.email);
      }
    });
  });
});