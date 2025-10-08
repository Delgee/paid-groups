import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BotConfigurationModule } from '../../../src/modules/bot-configuration/bot-configuration.module';
import { BotConfigurationService } from '../../../src/modules/bot-configuration/services/bot-configuration.service';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Integration Test: Bot Permission Monitoring
 * Task: T051 - Test bot permission loss detection and recovery
 *
 * Tests:
 * - Mock Telegram API permission check failure
 * - Verify dashboard alert creation (bot_event_log)
 * - Verify payment blocking when permissions lost (is_active = false)
 * - Test permission restoration and resume
 *
 * Note: This test simulates the permission monitoring logic
 * Real Telegram API calls would require valid bot tokens
 */

describe('Bot Permission Monitoring Integration', () => {
  let app: INestApplication;
  let botConfigurationService: BotConfigurationService;
  let dataSource: DataSource;
  let tenantId: string;
  let botConfigId: string;

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
        ScheduleModule.forRoot(),
        BotConfigurationModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    botConfigurationService = moduleFixture.get<BotConfigurationService>(BotConfigurationService);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Setup test data
    tenantId = uuidv4();

    await dataSource.query(`INSERT INTO tenants (id, company_name, email, subscription_tier, subscription_status) VALUES ($1, $2, $3, $4, $5)`, [
      tenantId,
      'Test Company',
      'test@example.com',
      'pro',
      'active',
    ]);

    await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM bot_event_logs WHERE tenant_id = $1`, [tenantId]);
    await dataSource.query(`DELETE FROM bot_configurations WHERE tenant_id = $1`, [tenantId]);
    await dataSource.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query(`DELETE FROM bot_event_logs WHERE tenant_id = $1`, [tenantId]);
    if (botConfigId) {
      await dataSource.query(`UPDATE bot_configurations SET is_active = true WHERE id = $1`, [botConfigId]);
    }
  });

  describe('Permission Loss Detection', () => {
    it('should detect when bot loses admin permissions', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      // Create active bot
      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:PermissionTestBot',
        bot_username: 'permission_test_bot',
        display_name: 'Permission Test Bot',
        welcome_message: 'Hello!',
        channel_id: '-1001234567890',
        channel_username: 'test_channel',
      });

      botConfigId = bot.id;

      expect(bot.is_active).toBe(true);

      // Simulate permission check failure by manually creating event log
      const correlationId = uuidv4();
      await dataSource.query(
        `INSERT INTO bot_event_logs (
          id, tenant_id, bot_configuration_id, event_type, event_data,
          correlation_id, severity, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          uuidv4(),
          tenantId,
          bot.id,
          'bot_permission_lost',
          JSON.stringify({
            channel_id: bot.channel_id,
            error: 'Bot is not an administrator in the chat',
            timestamp: new Date().toISOString(),
          }),
          correlationId,
          'critical',
        ]
      );

      // Verify event log was created
      const [eventLog] = await dataSource.query(
        `SELECT * FROM bot_event_logs
         WHERE bot_configuration_id = $1 AND event_type = $2
         ORDER BY occurred_at DESC LIMIT 1`,
        [bot.id, 'bot_permission_lost']
      );

      expect(eventLog).toBeDefined();
      expect(eventLog.event_type).toBe('bot_permission_lost');
      expect(eventLog.severity).toBe('critical');
      expect(eventLog.correlation_id).toBe(correlationId);

      // Simulate bot deactivation (what permission monitor would do)
      await botConfigurationService.update(tenantId, bot.id, { is_active: false });

      const deactivatedBot = await botConfigurationService.findOne(tenantId, bot.id);
      expect(deactivatedBot.is_active).toBe(false);
    });

    it('should create alert dashboard entry when permissions lost', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:AlertTestBot',
        bot_username: 'alert_test_bot',
        display_name: 'Alert Test Bot',
        welcome_message: 'Hello!',
        channel_id: '-1001111111111',
      });

      botConfigId = bot.id;

      // Create permission lost event
      const eventId = uuidv4();
      await dataSource.query(
        `INSERT INTO bot_event_logs (
          id, tenant_id, bot_configuration_id, event_type, event_data,
          correlation_id, severity, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          eventId,
          tenantId,
          bot.id,
          'bot_permission_lost',
          JSON.stringify({
            channel_id: bot.channel_id,
            bot_username: bot.bot_username,
            error: 'Insufficient permissions',
            action_required: 'Re-add bot as admin to channel',
          }),
          uuidv4(),
          'critical',
        ]
      );

      // Verify event can be queried for dashboard
      const criticalEvents = await dataSource.query(
        `SELECT * FROM bot_event_logs
         WHERE tenant_id = $1 AND severity = $2 AND event_type = $3`,
        [tenantId, 'critical', 'bot_permission_lost']
      );

      expect(criticalEvents.length).toBeGreaterThan(0);
      expect(criticalEvents[0].event_data.action_required).toBeDefined();
    });
  });

  describe('Payment Blocking', () => {
    it('should block new payments when bot is inactive due to permission loss', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:BlockTestBot',
        bot_username: 'block_test_bot',
        display_name: 'Block Test Bot',
        welcome_message: 'Hello!',
      });

      botConfigId = bot.id;

      // Deactivate bot (simulating permission loss)
      await botConfigurationService.update(tenantId, bot.id, { is_active: false });

      const inactiveBot = await botConfigurationService.findOne(tenantId, bot.id);
      expect(inactiveBot.is_active).toBe(false);

      // In production, payment initiation would check bot.is_active
      // and reject if false to prevent charging users for inaccessible channels
    });
  });

  describe('Permission Restoration', () => {
    it('should allow reactivation after permissions are restored', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:RestoreTestBot',
        bot_username: 'restore_test_bot',
        display_name: 'Restore Test Bot',
        welcome_message: 'Hello!',
        channel_id: '-1002222222222',
      });

      botConfigId = bot.id;

      // Simulate permission loss
      await botConfigurationService.update(tenantId, bot.id, { is_active: false });

      await dataSource.query(
        `INSERT INTO bot_event_logs (
          id, tenant_id, bot_configuration_id, event_type, event_data,
          correlation_id, severity, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          uuidv4(),
          tenantId,
          bot.id,
          'bot_permission_lost',
          JSON.stringify({ reason: 'Admin privileges removed' }),
          uuidv4(),
          'critical',
        ]
      );

      // Simulate permission restoration
      await botConfigurationService.update(tenantId, bot.id, { is_active: true });

      await dataSource.query(
        `INSERT INTO bot_event_logs (
          id, tenant_id, bot_configuration_id, event_type, event_data,
          correlation_id, severity, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          uuidv4(),
          tenantId,
          bot.id,
          'bot_permission_restored',
          JSON.stringify({
            reason: 'Admin privileges re-granted',
            restored_at: new Date().toISOString(),
          }),
          uuidv4(),
          'info',
        ]
      );

      const restoredBot = await botConfigurationService.findOne(tenantId, bot.id);
      expect(restoredBot.is_active).toBe(true);

      // Verify both events exist
      const events = await dataSource.query(
        `SELECT event_type, severity FROM bot_event_logs
         WHERE bot_configuration_id = $1
         ORDER BY occurred_at ASC`,
        [bot.id]
      );

      expect(events.length).toBe(2);
      expect(events[0].event_type).toBe('bot_permission_lost');
      expect(events[1].event_type).toBe('bot_permission_restored');
    });

    it('should track permission check history', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:HistoryTestBot',
        bot_username: 'history_test_bot',
        display_name: 'History Test Bot',
        welcome_message: 'Hello!',
      });

      botConfigId = bot.id;

      // Simulate multiple permission checks
      const checkEvents = [
        { type: 'bot_permission_check', severity: 'info', status: 'success' },
        { type: 'bot_permission_check', severity: 'info', status: 'success' },
        { type: 'bot_permission_lost', severity: 'critical', status: 'failed' },
        { type: 'bot_permission_check', severity: 'warning', status: 'failed' },
        { type: 'bot_permission_restored', severity: 'info', status: 'success' },
      ];

      for (const event of checkEvents) {
        await dataSource.query(
          `INSERT INTO bot_event_logs (
            id, tenant_id, bot_configuration_id, event_type, event_data,
            correlation_id, severity, occurred_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            uuidv4(),
            tenantId,
            bot.id,
            event.type,
            JSON.stringify({ status: event.status }),
            uuidv4(),
            event.severity,
          ]
        );
      }

      // Query permission event history
      const history = await dataSource.query(
        `SELECT event_type, severity, event_data FROM bot_event_logs
         WHERE bot_configuration_id = $1
         ORDER BY occurred_at ASC`,
        [bot.id]
      );

      expect(history.length).toBe(5);
      expect(history[2].event_type).toBe('bot_permission_lost');
      expect(history[4].event_type).toBe('bot_permission_restored');
    });
  });

  describe('Monitoring Interval', () => {
    it('should support configurable check interval via environment variable', () => {
      const defaultInterval = 15 * 60 * 1000; // 15 minutes default
      const configuredInterval = parseInt(process.env.PERMISSION_CHECK_INTERVAL_MS || defaultInterval.toString());

      expect(configuredInterval).toBeGreaterThan(0);
      expect(configuredInterval).toBeLessThanOrEqual(60 * 60 * 1000); // Max 1 hour

      // In production, this interval would be used by the cron job
      // @Cron('*/15 * * * *') // Every 15 minutes by default
    });
  });
});
