import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('POST /v1/bot-configurations (Contract Test)', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;

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
      email: 'testowner@botconfig.com',
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Request Validation', () => {
    it('should reject request with invalid bot_token format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bot_token: 'invalid-format',
          bot_username: 'test_bot',
          display_name: 'Test Bot',
          welcome_message: 'Welcome to our bot!',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('bot_token');
    });

    it('should reject request with invalid bot_username format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bot_token: process.env.TEST_TELEGRAM_BOT_TOKEN || '8134958196:AAFJbqtBguKzKOCuEdzQkLw3i7vkOUgUh3E',
          bot_username: 'ab',
          display_name: 'Test Bot',
          welcome_message: 'Welcome to our bot!',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('bot_username');
    });

    it('should reject request with welcome_message too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bot_token: process.env.TEST_TELEGRAM_BOT_TOKEN || '8134958196:AAFJbqtBguKzKOCuEdzQkLw3i7vkOUgUh3E',
          bot_username: 'test_bot',
          display_name: 'Test Bot',
          welcome_message: 'Hi',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('welcome_message');
    });

    it('should reject request with invalid channel_id format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bot_token: process.env.TEST_TELEGRAM_BOT_TOKEN || '8134958196:AAFJbqtBguKzKOCuEdzQkLw3i7vkOUgUh3E',
          bot_username: 'test_bot',
          display_name: 'Test Bot',
          welcome_message: 'Welcome to our bot!',
          channel_id: '1234567890',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('channel_id');
    });
  });

  describe('Response Schema', () => {
    it('should return 201 with correct response shape on success', async () => {
      const validRequest = {
        bot_token: process.env.TEST_TELEGRAM_BOT_TOKEN || '8134958196:AAFJbqtBguKzKOCuEdzQkLw3i7vkOUgUh3E',
        bot_username: 'test_contract_bot',
        display_name: 'Test Contract Bot',
        description: 'A test bot for contract testing',
        welcome_message: 'Welcome to our premium content bot!',
        channel_id: '-1001234567890',
        channel_username: 'test_channel',
        is_active: true,
      };

      const response = await request(app.getHttpServer())
        .post('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validRequest)
        .expect(201);

      // Verify response shape
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('tenant_id', tenantId);
      expect(response.body).toHaveProperty('bot_username', validRequest.bot_username);
      expect(response.body).toHaveProperty('display_name', validRequest.display_name);
      expect(response.body).toHaveProperty('description', validRequest.description);
      expect(response.body).toHaveProperty('welcome_message', validRequest.welcome_message);
      expect(response.body).toHaveProperty('channel_id', validRequest.channel_id);
      expect(response.body).toHaveProperty('channel_username', validRequest.channel_username);
      expect(response.body).toHaveProperty('is_active', validRequest.is_active);
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');

      // Verify bot_token is masked
      expect(response.body.bot_token).toBe('***');

      // Verify ID format
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('Business Rules', () => {
    it('should reject duplicate bot_token', async () => {
      const testBotToken = process.env.TEST_TELEGRAM_BOT_TOKEN_2 || process.env.TEST_TELEGRAM_BOT_TOKEN || '8134958196:AAFJbqtBguKzKOCuEdzQkLw3i7vkOUgUh3E';
      const botConfig = {
        bot_token: testBotToken,
        bot_username: 'unique_bot_duplicate_test',
        display_name: 'Unique Bot Duplicate Test',
        welcome_message: 'Welcome to our bot!',
      };

      // First creation should succeed
      const firstResponse = await request(app.getHttpServer())
        .post('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(botConfig)
        .expect(201);

      expect(firstResponse.body).toHaveProperty('id');

      // Second creation with same bot_token should fail
      const response = await request(app.getHttpServer())
        .post('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...botConfig,
          bot_username: 'unique_bot_2',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('DUPLICATE_BOT_TOKEN');
    });
  });
});
