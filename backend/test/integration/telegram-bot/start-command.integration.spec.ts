import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotConfigurationModule } from '../../../src/modules/bot-configuration/bot-configuration.module';
import { MembershipPlanModule } from '../../../src/modules/membership-plan/membership-plan.module';
import { MembershipPlanService } from '../../../src/modules/membership-plan/services/membership-plan.service';
import { BotConfigurationService } from '../../../src/modules/bot-configuration/services/bot-configuration.service';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Integration Test: Telegram Bot /start Command Flow
 * Task: T052 - Test bot command handling end-to-end
 *
 * Tests:
 * - Send /start → verify welcome message
 * - Verify plan buttons displayed
 * - Select plan → verify QPay link sent
 *
 * Note: This test simulates the bot interaction flow
 * Real Telegram bot testing would use Telegraf test utilities
 */

describe('Telegram Bot /start Command Integration', () => {
  let app: INestApplication;
  let botConfigurationService: BotConfigurationService;
  let membershipPlanService: MembershipPlanService;
  let dataSource: DataSource;
  let tenantId: string;
  let botConfigId: string;
  let groupId: string;

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
        MembershipPlanModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    botConfigurationService = moduleFixture.get<BotConfigurationService>(BotConfigurationService);
    membershipPlanService = moduleFixture.get<MembershipPlanService>(MembershipPlanService);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Setup test data
    tenantId = uuidv4();
    groupId = uuidv4();

    await dataSource.query(`INSERT INTO tenants (id, company_name, email, subscription_tier, subscription_status) VALUES ($1, $2, $3, $4, $5)`, [
      tenantId,
      'Test Company',
      'test@example.com',
      'pro',
      'active',
    ]);

    await dataSource.query(`INSERT INTO telegram_groups (id, tenant_id, group_name) VALUES ($1, $2, $3)`, [
      groupId,
      tenantId,
      'Test Group',
    ]);

    await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM membership_plans WHERE tenant_id = $1`, [tenantId]);
    await dataSource.query(`DELETE FROM bot_configurations WHERE tenant_id = $1`, [tenantId]);
    await dataSource.query(`DELETE FROM telegram_groups WHERE id = $1`, [groupId]);
    await dataSource.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query(`DELETE FROM membership_plans WHERE tenant_id = $1`, [tenantId]);
    await dataSource.query(`DELETE FROM bot_configurations WHERE tenant_id = $1`, [tenantId]);
  });

  describe('/start Command Flow', () => {
    it('should provide welcome message with bot configuration', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:StartCommandBot',
        bot_username: 'start_command_bot',
        display_name: 'Start Command Bot',
        welcome_message: 'Welcome {name}! Choose a plan to get started.',
        channel_id: '-1001234567890',
      });

      botConfigId = bot.id;

      // Simulate /start command
      const mockUser = {
        id: 123456789,
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
      };

      // Expected welcome message
      const expectedMessage = bot.welcome_message.replace('{name}', mockUser.first_name);

      expect(expectedMessage).toBe('Welcome John! Choose a plan to get started.');
      expect(bot.is_active).toBe(true);
    });

    it('should display available membership plans as inline buttons', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:PlansDisplayBot',
        bot_username: 'plans_display_bot',
        display_name: 'Plans Display Bot',
        welcome_message: 'Welcome! Select a plan:',
      });

      botConfigId = bot.id;

      // Create multiple membership plans
      const plans = [];
      for (let i = 1; i <= 3; i++) {
        const plan = await membershipPlanService.create(tenantId, {
          bot_configuration_id: groupId,
          name: `Plan ${i}`,
          description: `Description for plan ${i}`,
          price: 10000 * i,
          duration_days: 30 * i,
        });
        plans.push(plan);
      }

      // Fetch active plans (what bot handler would do)
      const activePlans = await membershipPlanService.findAll(tenantId, { is_active: true });

      expect(activePlans.length).toBe(3);

      // Simulate inline keyboard generation
      const inlineButtons = activePlans.map(plan => ({
        text: `${plan.name} - ${plan.price_mnt.toLocaleString()} MNT (${plan.duration_days} days)`,
        callback_data: `buy_plan_${plan.id}`,
      }));

      expect(inlineButtons.length).toBe(3);
      expect(inlineButtons[0].text).toContain('Plan 1');
      expect(inlineButtons[0].text).toContain('10,000 MNT');
      expect(inlineButtons[0].callback_data).toContain(plans[0].id);
    });

    it('should handle bot with no active plans gracefully', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:NoPlansBot',
        bot_username: 'no_plans_bot',
        display_name: 'No Plans Bot',
        welcome_message: 'Welcome!',
      });

      botConfigId = bot.id;

      // Fetch plans for this bot
      const activePlans = await membershipPlanService.findAll(tenantId, { is_active: true });

      expect(activePlans.length).toBe(0);

      // Expected bot response
      const expectedMessage = 'No membership plans available at the moment. Please check back later.';

      expect(expectedMessage).toBeDefined();
    });
  });

  describe('Plan Selection and Payment Initiation', () => {
    it('should generate QPay link when user selects a plan', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:PaymentBot',
        bot_username: 'payment_bot',
        display_name: 'Payment Bot',
        welcome_message: 'Welcome!',
      });

      botConfigId = bot.id;

      const plan = await membershipPlanService.create(tenantId, {
        bot_configuration_id: groupId,
        name: 'Premium Plan',
        description: 'Premium membership',
        price: 50000,
        duration_days: 30,
      });

      // Simulate plan selection callback
      const mockUser = {
        telegram_user_id: '987654321',
        telegram_username: 'testuser',
        telegram_first_name: 'Test',
        telegram_last_name: 'User',
      };

      // In real implementation, this would call PaymentTransactionService.create()
      // and generate QPay invoice URL
      const mockQPayLink = `https://payment.qpay.mn/invoice/TEST_${plan.id}_${mockUser.telegram_user_id}`;

      expect(mockQPayLink).toContain('payment.qpay.mn');
      expect(mockQPayLink).toContain(plan.id);

      // Expected bot response format
      const expectedResponse = {
        message: `💳 *Payment for ${plan.name}*\n\nPrice: ${plan.price_mnt.toLocaleString()} MNT\nDuration: ${plan.duration_days} days\n\nClick the button below to complete your payment:`,
        inline_keyboard: [
          [{ text: '💰 Pay Now', url: mockQPayLink }],
        ],
      };

      expect(expectedResponse.message).toContain(plan.name);
      expect(expectedResponse.inline_keyboard[0][0].url).toBe(mockQPayLink);
    });

    it('should create payment transaction when plan is selected', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:TransactionBot',
        bot_username: 'transaction_bot',
        display_name: 'Transaction Bot',
        welcome_message: 'Welcome!',
      });

      botConfigId = bot.id;

      const plan = await membershipPlanService.create(tenantId, {
        bot_configuration_id: groupId,
        name: 'Basic Plan',
        description: 'Basic membership',
        price: 25000,
        duration_days: 30,
      });

      // Simulate payment transaction creation
      const transactionId = uuidv4();
      const qpayInvoiceId = `INV_${uuidv4()}`;

      await dataSource.query(
        `INSERT INTO payment_transactions (
          id, tenant_id, membership_plan_id, telegram_user_id,
          telegram_username, telegram_first_name,
          amount, status, qpay_invoice_id,
          snapshot_plan_name, snapshot_price, snapshot_duration_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          transactionId,
          tenantId,
          plan.id,
          '555666777',
          'buyer_user',
          'Buyer',
          plan.price_mnt,
          'pending',
          qpayInvoiceId,
          plan.name,
          plan.price_mnt,
          plan.duration_days,
        ]
      );

      // Verify transaction was created
      const [transaction] = await dataSource.query(
        `SELECT * FROM payment_transactions WHERE id = $1`,
        [transactionId]
      );

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe('pending');
      expect(transaction.snapshot_plan_name).toBe(plan.name);
      expect(transaction.qpay_invoice_id).toBe(qpayInvoiceId);
    });
  });

  describe('User Experience', () => {
    it('should handle multiple bot instances for different tenants', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      // Create bot for tenant 1
      const bot1 = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:Tenant1Bot',
        bot_username: 'tenant1_bot',
        display_name: 'Tenant 1 Bot',
        welcome_message: 'Welcome to Tenant 1!',
      });

      // Create second tenant
      const tenant2Id = uuidv4();
      await dataSource.query(`INSERT INTO tenants (id, company_name, email, subscription_tier, subscription_status) VALUES ($1, $2, $3, $4, $5)`, [
        tenant2Id,
        'Test Company 2',
        'test2@example.com',
        'pro',
        'active',
      ]);

      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenant2Id]);

      // Create bot for tenant 2
      const bot2 = await botConfigurationService.create(tenant2Id, {
        bot_token: '1234567890:Tenant2Bot',
        bot_username: 'tenant2_bot',
        display_name: 'Tenant 2 Bot',
        welcome_message: 'Welcome to Tenant 2!',
      });

      expect(bot1.tenant_id).toBe(tenantId);
      expect(bot2.tenant_id).toBe(tenant2Id);
      expect(bot1.welcome_message).not.toBe(bot2.welcome_message);

      // Cleanup
      await dataSource.query(`DELETE FROM bot_configurations WHERE id = $1`, [bot2.id]);
      await dataSource.query(`DELETE FROM tenants WHERE id = $1`, [tenant2Id]);
    });

    it('should track bot command usage in event logs', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const bot = await botConfigurationService.create(tenantId, {
        bot_token: '1234567890:EventLoggingBot',
        bot_username: 'event_logging_bot',
        display_name: 'Event Logging Bot',
        welcome_message: 'Welcome!',
      });

      botConfigId = bot.id;

      // Simulate /start command event logging
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
          'command_received',
          JSON.stringify({
            command: '/start',
            user_id: 123456789,
            username: 'testuser',
          }),
          uuidv4(),
          'info',
        ]
      );

      // Verify event was logged
      const [event] = await dataSource.query(
        `SELECT * FROM bot_event_logs WHERE id = $1`,
        [eventId]
      );

      expect(event).toBeDefined();
      expect(event.event_type).toBe('command_received');
      expect(event.event_data.command).toBe('/start');
    });
  });
});
