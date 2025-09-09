import { INestApplication } from '@nestjs/common';
import { TestSetupHelper } from '../../helpers/test-setup.helper';
import * as request from 'supertest';

describe('POST /v1/bots/{id}/messages (Contract)', () => {
  let app: INestApplication;
  let accessToken: string;
  let testBotId: string;

  beforeEach(async () => {
    app = await TestSetupHelper.createTestApp();
    await TestSetupHelper.cleanupDatabase();

    // Setup user and bot
    const testUser = {
      email: 'bot-messages@example.com',
      password: 'SecurePassword123!',
      name: 'Bot Messages Test User',
      company_name: 'Test Company',
    };

    await request(app.getHttpServer()).post('/v1/auth/register').send(testUser);

    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    accessToken = loginResponse.body.access_token;

    const botResponse = await request(app.getHttpServer())
      .post('/v1/bots')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bot_token: 'bot-messages-test-token',
        bot_name: 'Bot Messages Test Bot',
      });

    testBotId = botResponse.body.id;
  });

  afterEach(async () => {
    await TestSetupHelper.closeApp(app);
  });

  describe('Valid message creation', () => {
    it('should return 201 with message object for valid data', async () => {
      const messageData = {
        message_type: 'welcome',
        content: 'Welcome to our paid group! {{user_name}}',
        variables: { user_name: 'string' },
      };

      const response = await request(app.getHttpServer())
        .post(`/v1/bots/${testBotId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('bot_id', testBotId);
      expect(response.body).toHaveProperty(
        'message_type',
        messageData.message_type,
      );
      expect(response.body).toHaveProperty('content', messageData.content);
      expect(response.body).toHaveProperty('variables', messageData.variables);
      expect(response.body).toHaveProperty('is_active', true);
      expect(response.body).toHaveProperty('tenant_id');
      expect(response.body).toHaveProperty('created_at');
      expect(response.body).toHaveProperty('updated_at');
    });
  });

  describe('Invalid requests', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/bots/${testBotId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 400 for invalid message_type', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/bots/${testBotId}/messages`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message_type: 'invalid_type',
          content: 'Test message',
        })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should return 404 for non-existent bot', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/bots/00000000-0000-0000-0000-000000000000/messages')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message_type: 'welcome',
          content: 'Test message',
        })
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
    });
  });

  describe('Authentication validation', () => {
    it('should return 401 for missing authorization header', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/bots/${testBotId}/messages`)
        .send({
          message_type: 'welcome',
          content: 'Test message',
        })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });
  });
});
