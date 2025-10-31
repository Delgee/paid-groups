import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('POST /v1/membership-plans (Contract Test)', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;
  let botConfigurationId: string;

  beforeAll(async () => {
    jest.setTimeout(30000);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('v1');
    await app.init();

    // Register and authenticate a test user
    const testUser = {
      email: 'testowner@membershipplan.com',
      password: 'OwnerPass123!',
      name: 'Test Owner',
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

    authToken = loginResponse.body.access_token;
    tenantId = loginResponse.body.user.tenant_id;

    // Create a bot configuration for testing
    const botResponse = await request(app.getHttpServer())
      .post('/v1/bot-configurations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bot_token: process.env.TEST_TELEGRAM_BOT_TOKEN || '8134958196:AAFJbqtBguKzKOCuEdzQkLw3i7vkOUgUh3E',
        bot_username: 'test_membership_bot',
        display_name: 'Test Membership Bot',
        welcome_message: 'Welcome to our membership bot!',
      });

    botConfigurationId = botResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Request Validation', () => {
    it('should reject request with price below minimum', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_id: botConfigurationId,
          name: 'Cheap Plan',
          price: 500,
          duration_days: 30,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('price');
      expect(response.body.error).toContain('1,000');
    });

    it('should reject request with price above maximum', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_id: botConfigurationId,
          name: 'Expensive Plan',
          price: 15000000,
          duration_days: 30,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('price');
      expect(response.body.error).toContain('10,000,000');
    });

    it('should reject request with duration_days below minimum', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_id: botConfigurationId,
          name: 'Invalid Duration',
          price: 10000,
          duration_days: 0,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('duration');
    });

    it('should reject request with duration_days above maximum', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_id: botConfigurationId,
          name: 'Too Long Plan',
          price: 10000,
          duration_days: 400,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('duration');
      expect(response.body.error).toContain('365');
    });

    it('should reject request with invalid project_id format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_id: 'not-a-uuid',
          name: 'Valid Plan',
          price: 50000,
          duration_days: 30,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('project_id');
    });
  });

  describe('Response Schema', () => {
    it('should return 201 with correct response shape on success', async () => {
      const validRequest = {
        bot_configuration_id: botConfigurationId,
        name: 'Monthly Premium',
        description: 'Access to all premium content for 30 days',
        price: 50000,
        duration_days: 30,
        is_active: true,
        sort_order: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validRequest)
        .expect(201);

      // Verify response shape
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('tenant_id', tenantId);
      expect(response.body).toHaveProperty('project_id', botConfigurationId);
      expect(response.body).toHaveProperty('name', validRequest.name);
      expect(response.body).toHaveProperty('description', validRequest.description);
      expect(response.body).toHaveProperty('price', validRequest.price);
      expect(response.body).toHaveProperty('duration_days', validRequest.duration_days);
      expect(response.body).toHaveProperty('is_active', validRequest.is_active);
      expect(response.body).toHaveProperty('sort_order', validRequest.sort_order);
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');

      // Verify ID format
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should apply default values when optional fields omitted', async () => {
      const minimalRequest = {
        bot_configuration_id: botConfigurationId,
        name: 'Minimal Plan',
        price: 25000,
        duration_days: 15,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send(minimalRequest)
        .expect(201);

      expect(response.body.is_active).toBe(true);
      expect(response.body.sort_order).toBe(0);
    });
  });

  describe('Business Rules', () => {
    it('should reject non-existent project_id', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_id: '550e8400-e29b-41d4-a716-999999999999',
          name: 'Plan for Non-existent Project',
          price: 50000,
          duration_days: 30,
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });
  });
});
