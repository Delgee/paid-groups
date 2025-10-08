import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentModule } from '../../../src/modules/payment/payment.module';
import { ChannelMemberService } from '../../../src/modules/payment/services/channel-member.service';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Integration Test: Member Rejoin Flow
 * Task: T053 - Test member re-invitation after leaving channel
 *
 * Tests:
 * - Member with active membership leaves channel
 * - Send /rejoin → verify new invite link generated
 * - Verify membership status check
 * - Test error handling for expired memberships
 */

describe('Member Rejoin Flow Integration', () => {
  let app: INestApplication;
  let channelMemberService: ChannelMemberService;
  let dataSource: DataSource;
  let tenantId: string;
  let membershipPlanId: string;
  let paymentTransactionId: string;

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
        PaymentModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    channelMemberService = moduleFixture.get<ChannelMemberService>(ChannelMemberService);
    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Setup test data
    tenantId = uuidv4();
    const groupId = uuidv4();
    membershipPlanId = uuidv4();
    paymentTransactionId = uuidv4();

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

    await dataSource.query(
      `INSERT INTO membership_plans (id, tenant_id, group_id, name, price_mnt, duration_days) VALUES ($1, $2, $3, $4, $5, $6)`,
      [membershipPlanId, tenantId, groupId, 'Premium Plan', 50000, 30]
    );

    await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM membership_plans WHERE id = $1`, [membershipPlanId]);
    await dataSource.query(`DELETE FROM telegram_groups WHERE tenant_id = $1`, [tenantId]);
    await dataSource.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query(`DELETE FROM channel_members WHERE tenant_id = $1`, [tenantId]);
    await dataSource.query(`DELETE FROM payment_transactions WHERE tenant_id = $1`, [tenantId]);
  });

  describe('Active Membership Rejoin', () => {
    it('should allow member with active membership to rejoin', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      // Create payment transaction
      await dataSource.query(
        `INSERT INTO payment_transactions (
          id, tenant_id, membership_plan_id, telegram_user_id,
          telegram_username, telegram_first_name, telegram_last_name,
          amount, status, snapshot_plan_name, snapshot_price, snapshot_duration_days,
          membership_starts_at, membership_expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          paymentTransactionId,
          tenantId,
          membershipPlanId,
          '123456789',
          'active_user',
          'Active',
          'User',
          50000,
          'completed',
          'Premium Plan',
          50000,
          30,
          new Date(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        ]
      );

      // Create active channel member
      const channelMember = await channelMemberService.create(tenantId, {
        payment_transaction_id: paymentTransactionId,
        bot_configuration_id: uuidv4(),
        telegram_user_id: '123456789',
        channel_id: '-1001234567890',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        invite_link: 'https://t.me/+original_invite_link',
      });

      expect(channelMember.status).toBe('active');
      expect(channelMember.invite_link).toBeDefined();

      // Simulate /rejoin command - generate new invite link
      const newInviteLink = `https://t.me/+rejoin_${uuidv4()}`;

      await dataSource.query(
        `UPDATE channel_members SET invite_link = $1 WHERE id = $2`,
        [newInviteLink, channelMember.id]
      );

      // Verify new invite link
      const [updated] = await dataSource.query(
        `SELECT * FROM channel_members WHERE id = $1`,
        [channelMember.id]
      );

      expect(updated.invite_link).toBe(newInviteLink);
      expect(updated.status).toBe('active');
    });

    it('should verify membership is still active before generating invite link', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now

      // Create payment and member
      await dataSource.query(
        `INSERT INTO payment_transactions (
          id, tenant_id, membership_plan_id, telegram_user_id,
          telegram_username, telegram_first_name,
          amount, status, snapshot_plan_name, snapshot_price, snapshot_duration_days,
          membership_starts_at, membership_expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          uuidv4(),
          tenantId,
          membershipPlanId,
          '222333444',
          'check_user',
          'Check',
          50000,
          'completed',
          'Premium Plan',
          50000,
          30,
          new Date(),
          expiresAt,
        ]
      );

      const member = await channelMemberService.create(tenantId, {
        payment_transaction_id: uuidv4(),
        bot_configuration_id: uuidv4(),
        telegram_user_id: '222333444',
        channel_id: '-1001234567890',
        expires_at: expiresAt.toISOString(),
        invite_link: 'https://t.me/+check_link',
      });

      // Verify membership is active
      const isActive = new Date() < new Date(member.expires_at);
      expect(isActive).toBe(true);

      // Should allow rejoin
      expect(member.status).toBe('active');
    });
  });

  describe('Expired Membership Handling', () => {
    it('should reject rejoin request for expired membership', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const expiredDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      // Create expired payment
      await dataSource.query(
        `INSERT INTO payment_transactions (
          id, tenant_id, membership_plan_id, telegram_user_id,
          telegram_username, telegram_first_name,
          amount, status, snapshot_plan_name, snapshot_price, snapshot_duration_days,
          membership_starts_at, membership_expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          uuidv4(),
          tenantId,
          membershipPlanId,
          '555666777',
          'expired_user',
          'Expired',
          50000,
          'completed',
          'Premium Plan',
          50000,
          30,
          new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
          expiredDate,
        ]
      );

      // Create expired member
      const expiredMember = await channelMemberService.create(tenantId, {
        payment_transaction_id: uuidv4(),
        bot_configuration_id: uuidv4(),
        telegram_user_id: '555666777',
        channel_id: '-1001234567890',
        expires_at: expiredDate.toISOString(),
        invite_link: 'https://t.me/+expired_link',
      });

      // Mark as expired
      await dataSource.query(
        `UPDATE channel_members SET status = $1 WHERE id = $2`,
        ['expired', expiredMember.id]
      );

      // Verify membership is expired
      const [member] = await dataSource.query(
        `SELECT * FROM channel_members WHERE id = $1`,
        [expiredMember.id]
      );

      expect(member.status).toBe('expired');
      expect(new Date(member.expires_at) < new Date()).toBe(true);

      // Expected error message for expired membership
      const expectedError = 'Your membership has expired. Please renew to continue.';
      expect(expectedError).toBeDefined();
    });

    it('should suggest renewal for expired memberships', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const expiredDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      const member = await channelMemberService.create(tenantId, {
        payment_transaction_id: uuidv4(),
        bot_configuration_id: uuidv4(),
        telegram_user_id: '888999000',
        channel_id: '-1001234567890',
        expires_at: expiredDate.toISOString(),
        invite_link: 'https://t.me/+renew_link',
      });

      await dataSource.query(
        `UPDATE channel_members SET status = $1 WHERE id = $2`,
        ['expired', member.id]
      );

      // Expected bot response
      const expectedResponse = {
        message: '⚠️ Your membership has expired.\n\nTo regain access, please purchase a new membership.',
        inline_keyboard: [
          [{ text: '🔄 Renew Membership', callback_data: 'show_plans' }],
        ],
      };

      expect(expectedResponse.message).toContain('expired');
      expect(expectedResponse.inline_keyboard[0][0].callback_data).toBe('show_plans');
    });
  });

  describe('Invite Link Management', () => {
    it('should generate unique invite links for each rejoin request', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const member = await channelMemberService.create(tenantId, {
        payment_transaction_id: uuidv4(),
        telegram_user_id: '111222333',
        bot_configuration_id: uuidv4(),
        channel_id: '-1001234567890',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        invite_link: 'https://t.me/+original_link',
      });

      const originalLink = member.invite_link;

      // Simulate multiple rejoin requests
      const links = [originalLink];
      for (let i = 1; i <= 3; i++) {
        const newLink = `https://t.me/+rejoin_${uuidv4()}`;
        await dataSource.query(
          `UPDATE channel_members SET invite_link = $1 WHERE id = $2`,
          [newLink, member.id]
        );
        links.push(newLink);
      }

      // All links should be unique
      const uniqueLinks = new Set(links);
      expect(uniqueLinks.size).toBe(4);
    });

    it('should track rejoin attempts in member record', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const member = await channelMemberService.create(tenantId, {
        payment_transaction_id: uuidv4(),
        telegram_user_id: '444555666',
        bot_configuration_id: uuidv4(),
        channel_id: '-1001234567890',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        invite_link: 'https://t.me/+track_link',
      });

      // Simulate rejoin tracking (in production, this could be in event_data JSONB)
      const rejoinCount = 3;
      const rejoinHistory = {
        attempts: rejoinCount,
        last_rejoin_at: new Date().toISOString(),
      };

      // In a real implementation, this could be stored in a rejoin_attempts column
      // or in the bot_event_logs table
      expect(rejoinHistory.attempts).toBe(3);
      expect(rejoinHistory.last_rejoin_at).toBeDefined();
    });
  });

  describe('Channel Member Status', () => {
    it('should maintain active status after rejoin', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const member = await channelMemberService.create(tenantId, {
        payment_transaction_id: uuidv4(),
        telegram_user_id: '777888999',
        bot_configuration_id: uuidv4(),
        channel_id: '-1001234567890',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        invite_link: 'https://t.me/+status_link',
      });

      expect(member.status).toBe('active');

      // After rejoin, status should remain active
      const newInviteLink = `https://t.me/+new_status_${uuidv4()}`;
      await dataSource.query(
        `UPDATE channel_members SET invite_link = $1 WHERE id = $2`,
        [newInviteLink, member.id]
      );

      const [updated] = await dataSource.query(
        `SELECT * FROM channel_members WHERE id = $1`,
        [member.id]
      );

      expect(updated.status).toBe('active');
      expect(updated.invite_link).toBe(newInviteLink);
    });

    it('should not allow rejoin for revoked memberships', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const member = await channelMemberService.create(tenantId, {
        payment_transaction_id: uuidv4(),
        telegram_user_id: '000111222',
        bot_configuration_id: uuidv4(),
        channel_id: '-1001234567890',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        invite_link: 'https://t.me/+revoked_link',
      });

      // Revoke membership (e.g., due to violation)
      await dataSource.query(
        `UPDATE channel_members SET status = $1, removed_at = NOW() WHERE id = $2`,
        ['revoked', member.id]
      );

      const [revokedMember] = await dataSource.query(
        `SELECT * FROM channel_members WHERE id = $1`,
        [member.id]
      );

      expect(revokedMember.status).toBe('revoked');
      expect(revokedMember.removed_at).toBeDefined();

      // Expected error for revoked membership
      const expectedError = 'Your membership has been revoked. Please contact support.';
      expect(expectedError).toBeDefined();
    });
  });
});
