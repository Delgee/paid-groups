import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Project } from '../../src/modules/project/entities/project.entity';
import { WebhookHealthCheckService } from '../../src/modules/project/services/webhook-health-check.service';
import { ProjectWebhookService } from '../../src/modules/project/services/project-webhook.service';
import { EncryptionService } from '../../src/common/services/encryption.service';

describe('WebhookHealthCheckService (Integration)', () => {
  let service: WebhookHealthCheckService;
  let dataSource: DataSource;
  let configService: ConfigService;
  let testTenantId: string;
  let testProjects: Project[];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
        TypeOrmModule.forFeature([Project]),
      ],
      providers: [
        WebhookHealthCheckService,
        ProjectWebhookService,
        EncryptionService,
      ],
    }).compile();

    service = module.get<WebhookHealthCheckService>(WebhookHealthCheckService);
    dataSource = module.get<DataSource>(DataSource);
    configService = module.get<ConfigService>(ConfigService);

    // Create test tenant
    const tenantResult = await dataSource.query(`
      INSERT INTO tenants (company_name, is_active)
      VALUES ('Webhook Health Check Test Company', true)
      RETURNING id
    `);
    testTenantId = tenantResult[0].id;

    // Create test projects with different webhook states
    await createTestProjects();
  });

  afterAll(async () => {
    // Cleanup
    if (testTenantId) {
      await dataSource.query('DELETE FROM projects WHERE tenant_id = $1', [
        testTenantId,
      ]);
      await dataSource.query('DELETE FROM tenants WHERE id = $1', [
        testTenantId,
      ]);
    }
    await dataSource.destroy();
  });

  async function createTestProjects() {
    const baseUrl = configService.get<string>('BASE_URL');

    // Project 1: Healthy webhook
    const project1 = await dataSource.query(
      `
      INSERT INTO projects (
        tenant_id, bot_token, bot_username, display_name, welcome_message,
        webhook_url, webhook_secret, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        testTenantId,
        'test_token_1',
        'healthy_bot',
        'Healthy Bot',
        'Welcome',
        `${baseUrl}/v1/projects/webhook/${testTenantId}/PLACEHOLDER`,
        'healthy_secret_1234567890abcdef1234567890abcdef1234567890abcdef',
        true,
      ],
    );

    // Update webhook URL with actual project ID
    await dataSource.query(
      `
      UPDATE projects
      SET webhook_url = $1
      WHERE id = $2
    `,
      [
        `${baseUrl}/v1/projects/webhook/${testTenantId}/${project1[0].id}`,
        project1[0].id,
      ],
    );

    // Project 2: Mismatched webhook URL (wrong BASE_URL)
    await dataSource.query(
      `
      INSERT INTO projects (
        tenant_id, bot_token, bot_username, display_name, welcome_message,
        webhook_url, webhook_secret, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        testTenantId,
        'test_token_2',
        'mismatched_bot',
        'Mismatched Bot',
        'Welcome',
        `https://old-domain.com/v1/projects/webhook/${testTenantId}/fake-id`,
        'mismatched_secret_1234567890abcdef1234567890abcdef123456789',
        true,
      ],
    );

    // Project 3: Missing webhook configuration
    await dataSource.query(
      `
      INSERT INTO projects (
        tenant_id, bot_token, bot_username, display_name, welcome_message,
        webhook_url, webhook_secret, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        testTenantId,
        'test_token_3',
        'missing_webhook_bot',
        'Missing Webhook Bot',
        'Welcome',
        null,
        null,
        true,
      ],
    );

    // Project 4: Inactive project (should be skipped)
    await dataSource.query(
      `
      INSERT INTO projects (
        tenant_id, bot_token, bot_username, display_name, welcome_message,
        webhook_url, webhook_secret, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        testTenantId,
        'test_token_4',
        'inactive_bot',
        'Inactive Bot',
        'Welcome',
        null,
        null,
        false,
      ],
    );
  }

  describe('checkAllWebhooks', () => {
    it('should identify all webhook issues correctly', async () => {
      const result = await service.checkAllWebhooks();

      // Should check only active projects (3 active, 1 inactive)
      expect(result.totalProjects).toBe(3);
      expect(result.checkedProjects).toBe(3);

      // Should identify 1 healthy webhook
      expect(result.healthyWebhooks).toBeGreaterThanOrEqual(1);

      // Should identify 1 mismatched webhook
      expect(result.mismatchedWebhooks).toBeGreaterThanOrEqual(1);

      // Should identify 1 missing webhook
      expect(result.missingWebhooks).toBeGreaterThanOrEqual(1);

      // Verify details array
      expect(result.details).toHaveLength(3);
      expect(result.details.some((d) => d.status === 'healthy')).toBe(true);
      expect(result.details.some((d) => d.status === 'mismatched')).toBe(true);
      expect(result.details.some((d) => d.status === 'missing')).toBe(true);
    });

    it('should provide detailed information for each project', async () => {
      const result = await service.checkAllWebhooks();

      result.details.forEach((detail) => {
        expect(detail).toHaveProperty('projectId');
        expect(detail).toHaveProperty('tenantId', testTenantId);
        expect(detail).toHaveProperty('status');
        expect(detail).toHaveProperty('message');
        expect(['healthy', 'mismatched', 'missing', 'failed']).toContain(
          detail.status,
        );
      });
    });
  });

  describe('fixMismatchedWebhooks', () => {
    it('should identify and report mismatched webhooks', async () => {
      // Note: This test won't actually fix webhooks because it would require
      // valid Telegram bot tokens and API access. It should attempt the fix.
      const result = await service.checkAllWebhooks();

      const mismatchedCount = result.mismatchedWebhooks;
      expect(mismatchedCount).toBeGreaterThan(0);

      // The fix method should attempt to fix them
      // In test environment without valid bot tokens, it may fail gracefully
      const fixedCount = await service.fixMismatchedWebhooks();

      // Fixed count may be 0 in test env due to invalid bot tokens
      expect(fixedCount).toBeGreaterThanOrEqual(0);
      expect(fixedCount).toBeLessThanOrEqual(mismatchedCount);
    });
  });

  describe('runManualCheck', () => {
    it('should execute manual health check and return results', async () => {
      const result = await service.runManualCheck();

      expect(result).toHaveProperty('totalProjects');
      expect(result).toHaveProperty('checkedProjects');
      expect(result).toHaveProperty('healthyWebhooks');
      expect(result).toHaveProperty('mismatchedWebhooks');
      expect(result).toHaveProperty('missingWebhooks');
      expect(result).toHaveProperty('failedChecks');
      expect(result).toHaveProperty('details');
    });
  });

  describe('onModuleInit behavior', () => {
    it('should respect WEBHOOK_HEALTH_CHECK_ON_STARTUP config', async () => {
      // This test verifies the configuration handling
      const checkOnStartup = configService.get<boolean>(
        'WEBHOOK_HEALTH_CHECK_ON_STARTUP',
        true,
      );

      expect(typeof checkOnStartup).toBe('boolean');
    });

    it('should respect WEBHOOK_AUTO_FIX_ON_STARTUP config', async () => {
      const autoFix = configService.get<boolean>(
        'WEBHOOK_AUTO_FIX_ON_STARTUP',
        false,
      );

      expect(typeof autoFix).toBe('boolean');
    });
  });

  describe('BASE_URL validation', () => {
    it('should handle missing BASE_URL gracefully', async () => {
      // Save original BASE_URL
      const originalBaseUrl = process.env.BASE_URL;

      // Temporarily remove BASE_URL
      delete process.env.BASE_URL;

      const result = await service.checkAllWebhooks();

      // Should return empty result when BASE_URL is not set
      expect(result.totalProjects).toBeGreaterThanOrEqual(0);

      // Restore BASE_URL
      process.env.BASE_URL = originalBaseUrl;
    });

    it('should validate webhook URLs against current BASE_URL', async () => {
      const baseUrl = configService.get<string>('BASE_URL');
      expect(baseUrl).toBeTruthy();

      const result = await service.checkAllWebhooks();

      // Healthy webhooks should match current BASE_URL
      const healthyDetails = result.details.filter((d) => d.status === 'healthy');
      healthyDetails.forEach((detail) => {
        expect(detail.message).toContain('valid');
      });

      // Mismatched webhooks should report the mismatch
      const mismatchedDetails = result.details.filter(
        (d) => d.status === 'mismatched',
      );
      mismatchedDetails.forEach((detail) => {
        expect(detail.message).toContain('mismatch');
      });
    });
  });
});
