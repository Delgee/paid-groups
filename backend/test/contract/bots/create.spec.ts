import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('POST /v1/bots (Contract)', () => {
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

    // Create and login a test user
    testUser = {
      email: 'bots-create@example.com',
      password: 'SecurePassword123!',
      name: 'Bots Create Test User',
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

  describe('Valid bot creation request', () => {
    it('should return 201 with bot object for valid data', async () => {
      const botData = {
        bot_token: 'valid-telegram-bot-token-123',
        bot_name: 'My Test Bot',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(botData)
        .expect(201);

      // Contract validation - should return created bot object
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('bot_username');
      expect(response.body).toHaveProperty('bot_name', botData.bot_name);
      expect(response.body).toHaveProperty('is_active');
      expect(response.body).toHaveProperty('tenant_id');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');

      // Optional properties should exist
      expect(response.body.hasOwnProperty('profile_picture_url')).toBe(true);
      expect(response.body.hasOwnProperty('webhook_url')).toBe(true);
      expect(response.body.hasOwnProperty('settings')).toBe(true);

      // Data type validation
      expect(typeof response.body.id).toBe('string');
      expect(typeof response.body.bot_username).toBe('string');
      expect(typeof response.body.bot_name).toBe('string');
      expect(typeof response.body.is_active).toBe('boolean');
      expect(typeof response.body.tenant_id).toBe('string');
      expect(typeof response.body.created_at).toBe('string');
      expect(typeof response.body.updated_at).toBe('string');

      // Default values
      expect(response.body.is_active).toBe(true);
      expect(response.body.settings).toEqual({});

      // Sensitive data should not be present
      expect(response.body).not.toHaveProperty('bot_token');
    });

    it('should create bot with profile picture', async () => {
      const botData = {
        bot_token: 'valid-telegram-bot-token-456',
        bot_name: 'Bot With Picture',
        profile_picture: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(botData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('bot_name', botData.bot_name);
      expect(response.body.profile_picture_url).toBeTruthy();
      expect(typeof response.body.profile_picture_url).toBe('string');
    });

    it('should fetch and set bot_username from Telegram API', async () => {
      const botData = {
        bot_token: 'valid-telegram-bot-token-789',
        bot_name: 'Username Test Bot',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(botData)
        .expect(201);

      expect(response.body.bot_username).toBeTruthy();
      expect(typeof response.body.bot_username).toBe('string');
      expect(response.body.bot_username.length).toBeGreaterThan(0);
    });
  });

  describe('Invalid bot creation requests', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for missing bot_token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_name: 'Bot Without Token',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for missing bot_name', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: 'valid-telegram-bot-token',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for invalid bot_token format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: 'invalid-token-format',
          bot_name: 'Test Bot',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for empty bot_name', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: 'valid-telegram-bot-token',
          bot_name: '',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for bot_name that is too long', async () => {
      const longName = 'a'.repeat(256); // Assuming max length is 255 characters

      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: 'valid-telegram-bot-token',
          bot_name: longName,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for invalid profile picture format', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: 'valid-telegram-bot-token',
          bot_name: 'Test Bot',
          profile_picture: 'not-base64-data',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 409 for duplicate bot_token', async () => {
      const botData = {
        bot_token: 'duplicate-bot-token-123',
        bot_name: 'First Bot',
      };

      // Create first bot
      await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(botData)
        .expect(201);

      // Try to create second bot with same token
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: botData.bot_token,
          bot_name: 'Second Bot',
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 409);
    });

    it('should return 401 for invalid Telegram bot token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bot_token: 'telegram-api-will-reject-this-token',
          bot_name: 'Invalid Token Bot',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('Authentication validation', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .send({
          bot_token: 'valid-telegram-bot-token',
          bot_name: 'Test Bot',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          bot_token: 'valid-telegram-bot-token',
          bot_name: 'Test Bot',
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('Response headers', () => {
    it('should include correct content-type header', async () => {
      const botData = {
        bot_token: 'content-type-test-token',
        bot_name: 'Content Type Test Bot',
      };

      await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(botData)
        .expect(201)
        .expect('Content-Type', /json/);
    });

    it('should include location header with created resource', async () => {
      const botData = {
        bot_token: 'location-header-test-token',
        bot_name: 'Location Header Test Bot',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(botData)
        .expect(201);

      expect(response.headers.location).toBeDefined();
      expect(response.headers.location).toMatch(/\/v1\/bots\/.+/);
    });
  });

  describe('Tenant isolation', () => {
    it('should associate bot with authenticated user tenant', async () => {
      const botData = {
        bot_token: 'tenant-isolation-test-token',
        bot_name: 'Tenant Isolation Test Bot',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(botData)
        .expect(201);

      expect(response.body.tenant_id).toBeTruthy();
      expect(typeof response.body.tenant_id).toBe('string');
    });
  });
});