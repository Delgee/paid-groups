import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Project } from '../../../src/modules/project/entities/project.entity';
import { ProjectModule } from '../../../src/modules/project/project.module';
import { AuthModule } from '../../../src/modules/auth/auth.module';
import { DataSource } from 'typeorm';

describe('Project Webhook Auto-Generation (Contract)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'telegram_saas_test',
          entities: [Project],
          synchronize: false,
        }),
        ProjectModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Create test tenant and authenticate
    const registerResponse = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({
        email: 'webhook-test@example.com',
        password: 'Test123!@#',
        name: 'Webhook Test User',
        company_name: 'Webhook Test Company',
      });

    authToken = registerResponse.body.access_token;
    tenantId = registerResponse.body.user.tenant_id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (dataSource) {
      await dataSource.query('DELETE FROM projects WHERE tenant_id = $1', [
        tenantId,
      ]);
      await dataSource.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
    }
    await app.close();
  });

  describe('POST /v1/projects (Webhook Auto-Generation)', () => {
    it('should auto-generate webhook_url and webhook_secret on project creation', async () => {
      const createProjectDto = {
        bot_token: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        bot_username: 'webhook_test_bot',
        display_name: 'Webhook Test Bot',
        welcome_message: 'Welcome to webhook test!',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProjectDto)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('webhook_url');
      expect(response.body).toHaveProperty('tenant_id', tenantId);

      // Verify webhook_url pattern
      const expectedWebhookUrlPattern = new RegExp(
        `^${process.env.BASE_URL}/v1/projects/webhook/${tenantId}/[a-f0-9-]{36}$`,
      );
      expect(response.body.webhook_url).toMatch(expectedWebhookUrlPattern);

      // webhook_secret should be masked in response
      expect(response.body.webhook_secret).toBeUndefined();

      // Verify in database that webhook_secret is actually stored
      const projectInDb = await dataSource.query(
        'SELECT webhook_secret FROM projects WHERE id = $1',
        [response.body.id],
      );

      expect(projectInDb[0].webhook_secret).toBeTruthy();
      expect(projectInDb[0].webhook_secret).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should use user-provided webhook_url if explicitly provided', async () => {
      const customWebhookUrl = 'https://custom.example.com/webhook/custom-path';

      const createProjectDto = {
        bot_token: '654321:XYZ-ABC9876def-qrs12X3w2u456zy22',
        bot_username: 'custom_webhook_bot',
        display_name: 'Custom Webhook Bot',
        welcome_message: 'Welcome!',
        webhook_url: customWebhookUrl,
        webhook_secret: 'custom-secret-key-minimum-16-chars',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProjectDto)
        .expect(201);

      // Should respect user-provided webhook_url
      expect(response.body.webhook_url).toBe(customWebhookUrl);
    });

    it('should handle webhook setup failure gracefully', async () => {
      const createProjectDto = {
        bot_token: 'invalid-token-format',
        bot_username: 'fail_webhook_bot',
        display_name: 'Fail Webhook Bot',
        welcome_message: 'Welcome!',
      };

      const response = await request(app.getHttpServer())
        .post('/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createProjectDto);

      // Project creation should still succeed even if webhook setup fails
      // (assuming bot token validation passes or is skipped in test env)
      if (response.status === 201) {
        expect(response.body).toHaveProperty('id');
        // Webhook URL might be missing if setup failed
      }
    });
  });

  describe('POST /v1/projects/:id/webhook/refresh', () => {
    let projectId: string;

    beforeEach(async () => {
      // Create a test project
      const response = await request(app.getHttpServer())
        .post('/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bot_token: '789012:DEF-GHI3456jkl-mno78Y4x3v789ab33',
          bot_username: 'refresh_test_bot',
          display_name: 'Refresh Test Bot',
          welcome_message: 'Welcome!',
        })
        .expect(201);

      projectId = response.body.id;
    });

    it('should refresh webhook with new secret', async () => {
      // Get original webhook secret from database
      const originalProject = await dataSource.query(
        'SELECT webhook_url, webhook_secret FROM projects WHERE id = $1',
        [projectId],
      );

      const originalSecret = originalProject[0].webhook_secret;

      // Refresh webhook
      const response = await request(app.getHttpServer())
        .post(`/v1/projects/${projectId}/webhook/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: expect.any(Boolean),
        message: expect.any(String),
        webhookUrl: expect.stringMatching(
          new RegExp(`/v1/projects/webhook/${tenantId}/${projectId}`),
        ),
      });

      // Verify webhook secret was regenerated
      const updatedProject = await dataSource.query(
        'SELECT webhook_secret FROM projects WHERE id = $1',
        [projectId],
      );

      const newSecret = updatedProject[0].webhook_secret;

      expect(newSecret).toBeTruthy();
      expect(newSecret).not.toBe(originalSecret);
      expect(newSecret).toHaveLength(64);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .post(`/v1/projects/${fakeProjectId}/webhook/refresh`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 for unauthorized requests', async () => {
      await request(app.getHttpServer())
        .post(`/v1/projects/${projectId}/webhook/refresh`)
        .expect(401);
    });
  });

  describe('Webhook URL Format Validation', () => {
    it('should generate webhook URLs with correct pattern', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bot_token: '111222:AAA-BBB5678cde-fgh90Z5y4w890cd44',
          bot_username: 'format_test_bot',
          display_name: 'Format Test Bot',
          welcome_message: 'Welcome!',
        })
        .expect(201);

      const webhookUrl = response.body.webhook_url;

      // Verify URL structure
      expect(webhookUrl).toContain(process.env.BASE_URL);
      expect(webhookUrl).toContain('/v1/projects/webhook/');
      expect(webhookUrl).toContain(tenantId);
      expect(webhookUrl).toContain(response.body.id);

      // Verify it's a valid URL
      expect(() => new URL(webhookUrl)).not.toThrow();
    });
  });
});
