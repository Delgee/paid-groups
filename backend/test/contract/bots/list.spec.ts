import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('GET /v1/bots (Contract)', () => {
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
      email: 'bots-list@example.com',
      password: 'SecurePassword123!',
      name: 'Bots List Test User',
      company_name: 'Test Company',
    };

    await request(app.getHttpServer()).post('/v1/auth/register').send(testUser);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    accessToken = loginResponse.body.access_token;

    // Create a test bot for the list tests
    await request(app.getHttpServer())
      .post('/v1/bots')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bot_token: 'test-bot-token-123',
        bot_name: 'Test Bot',
      });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Valid authenticated request', () => {
    it('should return 200 with bots array for valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Contract validation - should return object with bots array
      expect(response.body).toHaveProperty('bots');
      expect(Array.isArray(response.body.bots)).toBe(true);

      // If we have bots, validate structure
      if (response.body.bots.length > 0) {
        const bot = response.body.bots[0];

        // Required bot properties
        expect(bot).toHaveProperty('id');
        expect(bot).toHaveProperty('bot_username');
        expect(bot).toHaveProperty('bot_name');
        expect(bot).toHaveProperty('is_active');
        expect(bot).toHaveProperty('created_at');
        expect(bot).toHaveProperty('updated_at');
        expect(bot).toHaveProperty('tenant_id');

        // Optional properties
        expect(bot.hasOwnProperty('profile_picture_url')).toBe(true);
        expect(bot.hasOwnProperty('webhook_url')).toBe(true);
        expect(bot.hasOwnProperty('settings')).toBe(true);

        // Data type validation
        expect(typeof bot.id).toBe('string');
        expect(typeof bot.bot_username).toBe('string');
        expect(typeof bot.bot_name).toBe('string');
        expect(typeof bot.is_active).toBe('boolean');
        expect(typeof bot.tenant_id).toBe('string');
        expect(typeof bot.created_at).toBe('string');
        expect(typeof bot.updated_at).toBe('string');

        // Sensitive data should not be present
        expect(bot).not.toHaveProperty('bot_token');
      }
    });

    it('should return empty array when user has no bots', async () => {
      // Create a new user with no bots
      const newUser = {
        email: 'nobots@example.com',
        password: 'SecurePassword123!',
        name: 'No Bots User',
        company_name: 'Test Company',
      };

      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send(newUser);

      const newLoginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: newUser.email,
          password: newUser.password,
        });

      const response = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${newLoginResponse.body.access_token}`)
        .expect(200);

      expect(response.body).toHaveProperty('bots');
      expect(Array.isArray(response.body.bots)).toBe(true);
      expect(response.body.bots.length).toBe(0);
    });

    it('should only return bots for the authenticated tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // All returned bots should belong to the same tenant
      if (response.body.bots.length > 0) {
        const firstBotTenantId = response.body.bots[0].tenant_id;
        response.body.bots.forEach((bot) => {
          expect(bot.tenant_id).toBe(firstBotTenantId);
        });
      }
    });

    it('should return bots sorted by creation date (newest first)', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      if (response.body.bots.length > 1) {
        for (let i = 0; i < response.body.bots.length - 1; i++) {
          const currentBot = new Date(response.body.bots[i].created_at);
          const nextBot = new Date(response.body.bots[i + 1].created_at);
          expect(currentBot.getTime()).toBeGreaterThanOrEqual(
            nextBot.getTime(),
          );
        }
      }
    });
  });

  describe('Authentication validation', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bots')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should return 401 for malformed authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });

  describe('Response headers', () => {
    it('should include correct content-type header', async () => {
      await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  describe('Data structure validation', () => {
    it('should maintain consistent bot object structure', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bots')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      if (response.body.bots.length > 0) {
        const bot = response.body.bots[0];

        // Required fields should be present and not null/undefined
        expect(bot.id).toBeTruthy();
        expect(bot.bot_name).toBeTruthy();
        expect(bot.is_active).toBeDefined();
        expect(bot.created_at).toBeTruthy();
        expect(bot.updated_at).toBeTruthy();
        expect(bot.tenant_id).toBeTruthy();

        // Optional fields can be null but should exist as properties
        expect(bot.hasOwnProperty('profile_picture_url')).toBe(true);
        expect(bot.hasOwnProperty('webhook_url')).toBe(true);
        expect(bot.hasOwnProperty('settings')).toBe(true);
      }
    });
  });

  describe('Query parameters (if supported)', () => {
    it('should handle query parameters gracefully', async () => {
      // Test with unsupported query parameters - should still work
      const response = await request(app.getHttpServer())
        .get('/v1/bots?unsupported=value')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('bots');
      expect(Array.isArray(response.body.bots)).toBe(true);
    });
  });
});
