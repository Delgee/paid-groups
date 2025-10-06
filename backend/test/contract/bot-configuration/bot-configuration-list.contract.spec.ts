import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('GET /v1/bot-configurations (Contract Test)', () => {
  let app: INestApplication;
  let authToken: string;

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

    // TODO: Replace with actual authentication
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Schema', () => {
    it('should return 200 with array of bot configurations', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const botConfig = response.body[0];
        expect(botConfig).toHaveProperty('id');
        expect(botConfig).toHaveProperty('tenant_id');
        expect(botConfig).toHaveProperty('bot_username');
        expect(botConfig).toHaveProperty('display_name');
        expect(botConfig).toHaveProperty('welcome_message');
        expect(botConfig).toHaveProperty('is_active');
        expect(botConfig).toHaveProperty('created_at');
        expect(botConfig).toHaveProperty('updated_at');

        // Verify bot_token is masked
        expect(botConfig.bot_token).toBe('***');
      }
    });

    it('should support pagination query parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bot-configurations')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by is_active status', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bot-configurations')
        .query({ is_active: true })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (Array.isArray(response.body) && response.body.length > 0) {
        response.body.forEach((config) => {
          expect(config.is_active).toBe(true);
        });
      }
    });
  });

  describe('Multi-Tenancy', () => {
    it('should only return configurations for authenticated tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/bot-configurations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const tenantId = 'expected-tenant-id'; // TODO: Get from JWT
      if (Array.isArray(response.body) && response.body.length > 0) {
        response.body.forEach((config) => {
          expect(config.tenant_id).toBe(tenantId);
        });
      }
    });
  });
});
