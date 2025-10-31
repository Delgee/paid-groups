import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('GET /v1/membership-plans (Contract Test)', () => {
  let app: INestApplication;
  let authToken: string;
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
      email: 'testowner@membershiplist.com',
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

    // Create a bot configuration for testing
    const botResponse = await request(app.getHttpServer())
      .post('/v1/bot-configurations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        bot_token: process.env.TEST_TELEGRAM_BOT_TOKEN || '8134958196:AAFJbqtBguKzKOCuEdzQkLw3i7vkOUgUh3E',
        bot_username: 'test_list_bot',
        display_name: 'Test List Bot',
        welcome_message: 'Welcome to our test bot!',
      });

    botConfigurationId = botResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Schema', () => {
    it('should return 200 with array of membership plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const plan = response.body[0];
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('tenant_id');
        expect(plan).toHaveProperty('bot_configuration_id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('price');
        expect(plan).toHaveProperty('duration_days');
        expect(plan).toHaveProperty('is_active');
        expect(plan).toHaveProperty('sort_order');
        expect(plan).toHaveProperty('created_at');
        expect(plan).toHaveProperty('updated_at');
      }
    });

    it('should filter by bot_configuration_id', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/membership-plans')
        .query({ project_id: botConfigurationId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (Array.isArray(response.body) && response.body.length > 0) {
        response.body.forEach((plan) => {
          expect(plan.bot_configuration_id).toBe(botConfigurationId);
        });
      }
    });

    it('should filter by is_active status', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/membership-plans')
        .query({ is_active: true })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (Array.isArray(response.body) && response.body.length > 0) {
        response.body.forEach((plan) => {
          expect(plan.is_active).toBe(true);
        });
      }
    });

    it('should sort by sort_order ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/membership-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (Array.isArray(response.body) && response.body.length > 1) {
        for (let i = 1; i < response.body.length; i++) {
          expect(response.body[i].sort_order).toBeGreaterThanOrEqual(
            response.body[i - 1].sort_order,
          );
        }
      }
    });
  });
});
