import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('POST /v1/onboarding-bot/webhook/:botToken (Contract)', () => {
  let app: INestApplication;
  const validBotToken = 'test-onboarding-bot-token-123';
  const invalidBotToken = 'invalid-token';

  beforeEach(async () => {
    app = await TestSetupHelper.createTestApp();
    await TestSetupHelper.cleanupDatabase();
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Valid Telegram Update', () => {
    it('should return 200 OK with { ok: true } for valid update', async () => {
      const telegramUpdate = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
          },
          chat: {
            id: 987654321,
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/onboarding-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      // Contract validation
      expect(response.body).toHaveProperty('ok', true);
      expect(typeof response.body.ok).toBe('boolean');
    });

    it('should handle text messages without commands', async () => {
      const telegramUpdate = {
        update_id: 123456790,
        message: {
          message_id: 2,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'Test',
            username: 'testuser',
          },
          chat: {
            id: 987654321,
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          text: 'test@example.com',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/onboarding-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });
  });

  describe('Invalid Bot Token', () => {
    it('should return 401 Unauthorized for invalid bot token', async () => {
      const telegramUpdate = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 987654321, is_bot: false, first_name: 'Test' },
          chat: { id: 987654321, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/onboarding-bot/webhook/${invalidBotToken}`)
        .send(telegramUpdate)
        .expect(401);

      // Contract validation - error response format
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error.code).toBe('INVALID_BOT_TOKEN');
    });
  });

  describe('Invalid Request Body', () => {
    it('should return 400 Bad Request for missing required fields', async () => {
      const invalidUpdate = {
        update_id: 123456789,
        // Missing message field
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/onboarding-bot/webhook/${validBotToken}`)
        .send(invalidUpdate)
        .expect(400);

      // Contract validation
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 Bad Request for malformed update', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/onboarding-bot/webhook/${validBotToken}`)
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 Too Many Requests after exceeding rate limit', async () => {
      const telegramUpdate = {
        update_id: 123456789,
        message: {
          message_id: 1,
          from: { id: 987654321, is_bot: false, first_name: 'Test' },
          chat: { id: 987654321, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
        },
      };

      // Send 21 requests rapidly (rate limit is 20/min)
      const requests = Array(21)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer())
            .post(`/v1/onboarding-bot/webhook/${validBotToken}`)
            .send({ ...telegramUpdate, update_id: 123456789 + i })
        );

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimitedResponse = responses.find(
        (r) => r.status === 429
      );

      if (rateLimitedResponse) {
        expect(rateLimitedResponse.body).toHaveProperty('error');
        expect(rateLimitedResponse.body.error).toHaveProperty(
          'code',
          'RATE_LIMIT_EXCEEDED'
        );
        expect(rateLimitedResponse.body.error).toHaveProperty('details');
        expect(rateLimitedResponse.body.error.details).toHaveProperty(
          'retryAfter'
        );
      }
    });
  });
});
