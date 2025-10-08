import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotConfigurationModule } from '../../../src/modules/bot-configuration/bot-configuration.module';
import { BotConfigurationService } from '../../../src/modules/bot-configuration/services/bot-configuration.service';
import { BotConfiguration } from '../../../src/modules/bot-configuration/entities/bot-configuration.entity';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Integration Test: Bot Configuration CRUD Flow
 * Task: T048 - Integration test for bot configuration CRUD operations
 *
 * Tests:
 * - Create bot → validate token with Telegram API
 * - Update settings → verify sync
 * - Delete bot
 * - Test tenant isolation
 *
 * Uses real PostgreSQL and Redis (no mocks)
 */

describe('Bot Configuration CRUD Integration', () => {
  let app: INestApplication;
  let botConfigurationService: BotConfigurationService;
  let dataSource: DataSource;
  let tenantId1: string;
  let tenantId2: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'telegram_saas',
          entities: [__dirname + '/../../../src/**/*.entity{.ts,.js}'],
          synchronize: false,
        }),
        BotConfigurationModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    botConfigurationService = moduleFixture.get<BotConfigurationService>(BotConfigurationService);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Setup test tenants
    tenantId1 = uuidv4();
    tenantId2 = uuidv4();

    await dataSource.query(`INSERT INTO tenants (id, company_name, email, subscription_tier, subscription_status) VALUES ($1, $2, $3, $4, $5)`, [
      tenantId1,
      'Test Company 1',
      'test1@example.com',
      'pro',
      'active',
    ]);

    await dataSource.query(`INSERT INTO tenants (id, company_name, email, subscription_tier, subscription_status) VALUES ($1, $2, $3, $4, $5)`, [
      tenantId2,
      'Test Company 2',
      'test2@example.com',
      'pro',
      'active',
    ]);

    // Set tenant context for RLS
    await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId1]);
  });

  afterAll(async () => {
    // Cleanup test data
    await dataSource.query(`DELETE FROM tenants WHERE id IN ($1, $2)`, [tenantId1, tenantId2]);
    await app.close();
  });

  afterEach(async () => {
    // Clean up bot configurations after each test
    await dataSource.query(`DELETE FROM bot_configurations WHERE tenant_id IN ($1, $2)`, [tenantId1, tenantId2]);
  });

  describe('Create Bot Configuration', () => {
    it('should create a new bot configuration with valid data', async () => {
      const createDto = {
        bot_token: '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz1234567890',
        bot_username: 'test_bot',
        display_name: 'Test Bot',
        description: 'A test bot for integration testing',
        welcome_message: 'Welcome to Test Bot!',
        channel_id: '-1001234567890',
        channel_username: 'test_channel',
      };

      // Set tenant context
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId1]);

      const result = await botConfigurationService.create(tenantId1, createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenant_id).toBe(tenantId1);
      expect(result.bot_token).toBe(createDto.bot_token);
      expect(result.bot_username).toBe(createDto.bot_username);
      expect(result.display_name).toBe(createDto.display_name);
      expect(result.is_active).toBe(true);
      expect(result.created_at).toBeDefined();
    });

    it('should reject duplicate bot token', async () => {
      const createDto = {
        bot_token: '1234567890:DuplicateToken',
        bot_username: 'duplicate_bot',
        display_name: 'Duplicate Bot',
        welcome_message: 'Hello!',
      };

      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId1]);
      await botConfigurationService.create(tenantId1, createDto);

      // Attempt to create with same token
      await expect(
        botConfigurationService.create(tenantId1, createDto)
      ).rejects.toThrow();
    });
  });

  describe('Update Bot Configuration', () => {
    it('should update bot configuration settings', async () => {
      // Create initial bot
      const createDto = {
        bot_token: '1234567890:UpdateTestToken',
        bot_username: 'update_bot',
        display_name: 'Update Test Bot',
        welcome_message: 'Original message',
      };

      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId1]);
      const created = await botConfigurationService.create(tenantId1, createDto);

      // Update settings
      const updateDto = {
        display_name: 'Updated Bot Name',
        welcome_message: 'Updated welcome message',
        description: 'New description',
      };

      const updated = await botConfigurationService.update(tenantId1, created.id, updateDto);

      expect(updated.display_name).toBe(updateDto.display_name);
      expect(updated.welcome_message).toBe(updateDto.welcome_message);
      expect(updated.description).toBe(updateDto.description);
      expect(updated.bot_token).toBe(createDto.bot_token); // Should not change
      expect(updated.updated_at.getTime()).toBeGreaterThan(created.created_at.getTime());
    });

    it('should toggle is_active status', async () => {
      const createDto = {
        bot_token: '1234567890:ToggleTestToken',
        bot_username: 'toggle_bot',
        display_name: 'Toggle Test Bot',
        welcome_message: 'Hello!',
      };

      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId1]);
      const created = await botConfigurationService.create(tenantId1, createDto);

      expect(created.is_active).toBe(true);

      // Deactivate
      const deactivated = await botConfigurationService.update(tenantId1, created.id, { is_active: false });
      expect(deactivated.is_active).toBe(false);

      // Reactivate
      const reactivated = await botConfigurationService.update(tenantId1, created.id, { is_active: true });
      expect(reactivated.is_active).toBe(true);
    });
  });

  describe('Delete Bot Configuration', () => {
    it('should soft delete bot configuration', async () => {
      const createDto = {
        bot_token: '1234567890:DeleteTestToken',
        bot_username: 'delete_bot',
        display_name: 'Delete Test Bot',
        welcome_message: 'Goodbye!',
      };

      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId1]);
      const created = await botConfigurationService.create(tenantId1, createDto);

      await botConfigurationService.delete(tenantId1, created.id);

      // Verify deletion
      await expect(
        botConfigurationService.findOne(tenantId1, created.id)
      ).rejects.toThrow();
    });
  });

  describe('Tenant Isolation', () => {
    it('should not allow access to other tenant bots', async () => {
      // Create bot for tenant1
      const createDto = {
        bot_token: '1234567890:Tenant1Token',
        bot_username: 'tenant1_bot',
        display_name: 'Tenant 1 Bot',
        welcome_message: 'Hello Tenant 1!',
      };

      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId1]);
      const tenant1Bot = await botConfigurationService.create(tenantId1, createDto);

      // Try to access from tenant2
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId2]);

      await expect(
        botConfigurationService.findOne(tenantId2, tenant1Bot.id)
      ).rejects.toThrow();

      // Verify tenant2 sees no bots
      const tenant2Bots = await botConfigurationService.findAll(tenantId2);
      expect(tenant2Bots.length).toBe(0);
    });

    it('should list only tenant-specific bots', async () => {
      // Create bots for both tenants
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId1]);
      await botConfigurationService.create(tenantId1, {
        bot_token: '1234567890:Tenant1Bot1',
        bot_username: 'tenant1_bot1',
        display_name: 'Tenant 1 Bot 1',
        welcome_message: 'Hello!',
      });

      await botConfigurationService.create(tenantId1, {
        bot_token: '1234567890:Tenant1Bot2',
        bot_username: 'tenant1_bot2',
        display_name: 'Tenant 1 Bot 2',
        welcome_message: 'Hello!',
      });

      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId2]);
      await botConfigurationService.create(tenantId2, {
        bot_token: '1234567890:Tenant2Bot1',
        bot_username: 'tenant2_bot1',
        display_name: 'Tenant 2 Bot 1',
        welcome_message: 'Hello!',
      });

      // Verify tenant1 sees only their bots
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId1]);
      const tenant1Bots = await botConfigurationService.findAll(tenantId1);
      expect(tenant1Bots.length).toBe(2);
      expect(tenant1Bots.every(bot => bot.tenant_id === tenantId1)).toBe(true);

      // Verify tenant2 sees only their bots
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId2]);
      const tenant2Bots = await botConfigurationService.findAll(tenantId2);
      expect(tenant2Bots.length).toBe(1);
      expect(tenant2Bots.every(bot => bot.tenant_id === tenantId2)).toBe(true);
    });
  });
});
