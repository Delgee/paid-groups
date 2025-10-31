import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TestSetupHelper } from '../../helpers/test-setup.helper';

describe('POST /v1/channel-id-bot/webhook/:botToken (Contract)', () => {
  let app: INestApplication;
  const validBotToken = 'test-channel-id-bot-token-123';
  const invalidBotToken = 'invalid-token';

  beforeEach(async () => {
    app = await TestSetupHelper.createTestApp();
    await TestSetupHelper.cleanupDatabase();
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Forwarded Channel Message', () => {
    it('should return 200 OK and extract channel ID from forward_from_chat', async () => {
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
          forward_from_chat: {
            id: -1001234567890,
            title: 'Test Channel',
            username: 'testchannel',
            type: 'channel',
          },
          date: Math.floor(Date.now() / 1000),
          text: 'Forwarded message content',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      // Contract validation
      expect(response.body).toHaveProperty('ok', true);
      expect(typeof response.body.ok).toBe('boolean');
    });

    it('should return 200 OK and extract channel ID from sender_chat', async () => {
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
          sender_chat: {
            id: -1001234567890,
            title: 'Test Group',
            type: 'supergroup',
          },
          date: Math.floor(Date.now() / 1000),
          text: 'Message sent on behalf of channel',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });

    it('should handle forwarded message without username', async () => {
      const telegramUpdate = {
        update_id: 123456791,
        message: {
          message_id: 3,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'Test',
          },
          chat: {
            id: 987654321,
            type: 'private',
          },
          forward_from_chat: {
            id: -1001234567890,
            title: 'Private Channel',
            type: 'channel',
          },
          date: Math.floor(Date.now() / 1000),
          text: 'Forwarded from private channel',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });
  });

  describe('Bot Commands', () => {
    it('should handle /start command', async () => {
      const telegramUpdate = {
        update_id: 123456792,
        message: {
          message_id: 4,
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
          text: '/start',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });

    it('should handle /help command', async () => {
      const telegramUpdate = {
        update_id: 123456793,
        message: {
          message_id: 5,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'Test',
          },
          chat: {
            id: 987654321,
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          text: '/help',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });
  });

  describe('Non-Forwarded Messages', () => {
    it('should handle regular text messages (guide user to forward)', async () => {
      const telegramUpdate = {
        update_id: 123456794,
        message: {
          message_id: 6,
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
          text: 'Hello bot',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });

    it('should handle unknown commands', async () => {
      const telegramUpdate = {
        update_id: 123456795,
        message: {
          message_id: 7,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'Test',
          },
          chat: {
            id: 987654321,
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          text: '/unknown',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('ok', true);
    });
  });

  describe('Invalid Bot Token', () => {
    it('should return 401 Unauthorized for invalid bot token', async () => {
      const telegramUpdate = {
        update_id: 123456796,
        message: {
          message_id: 8,
          from: { id: 987654321, is_bot: false, first_name: 'Test' },
          chat: { id: 987654321, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${invalidBotToken}`)
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
        update_id: 123456797,
        // Missing message field
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(invalidUpdate)
        .expect(400);

      // Contract validation
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 Bad Request for malformed update', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 Bad Request for missing from field', async () => {
      const invalidUpdate = {
        update_id: 123456798,
        message: {
          message_id: 9,
          // Missing from field
          chat: { id: 987654321, type: 'private' },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 Bad Request for missing chat field', async () => {
      const invalidUpdate = {
        update_id: 123456799,
        message: {
          message_id: 10,
          from: { id: 987654321, is_bot: false, first_name: 'Test' },
          // Missing chat field
          date: Math.floor(Date.now() / 1000),
          text: '/start',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response structure for all valid requests', async () => {
      const telegramUpdate = {
        update_id: 123456800,
        message: {
          message_id: 11,
          from: {
            id: 987654321,
            is_bot: false,
            first_name: 'Test',
          },
          chat: {
            id: 987654321,
            type: 'private',
          },
          date: Math.floor(Date.now() / 1000),
          text: '/start',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/channel-id-bot/webhook/${validBotToken}`)
        .send(telegramUpdate)
        .expect(200);

      // Validate response structure
      expect(response.body).toEqual({
        ok: true,
      });
      expect(Object.keys(response.body)).toHaveLength(1);
    });
  });
});
