import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('POST /v1/bot-configurations (Contract Test)', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
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
    await app.init();

    // TODO: Replace with actual authentication flow
    // For now, this will fail until auth is implemented
    authToken = 'mock-jwt-token';
    tenantId = '550e8400-e29b-41d4-a716-446655440000';
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
          bot_token: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
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
          bot_token: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
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
          bot_token: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
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
        bot_token: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz',
        bot_username: 'test_bot',
        display_name: 'Test Bot',
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
      const botConfig = {
        bot_token: '9999999999:UniqueTokenForDuplicateTest',
        bot_username: 'unique_bot_1',
        display_name: 'Unique Bot 1',
        welcome_message: 'Welcome to our bot!',
      };

      // First creation should succeed
      await request(app.getHttpServer())
        .post('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(botConfig)
        .expect(201);

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
