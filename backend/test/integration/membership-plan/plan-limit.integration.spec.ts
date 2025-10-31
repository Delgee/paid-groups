import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ConflictException } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipPlanModule } from '../../../src/modules/membership-plan/membership-plan.module';
import { MembershipPlanService } from '../../../src/modules/membership-plan/services/membership-plan.service';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Integration Test: Membership Plan Limit Enforcement
 * Task: T049 - Test 5-plan limit per bot and existing member pricing preservation
 */

describe('Membership Plan Limit Integration', () => {
  let app: INestApplication;
  let membershipPlanService: MembershipPlanService;
  let dataSource: DataSource;
  let tenantId: string;
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
        MembershipPlanModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

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

    await dataSource.query(`INSERT INTO telegram_groups (id, tenant_id, group_name, group_username) VALUES ($1, $2, $3, $4)`, [
      groupId,
      tenantId,
      'Test Group',
      'test_group',
    ]);

    await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM telegram_groups WHERE id = $1`, [groupId]);
    await dataSource.query(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
    await app.close();
  });

  afterEach(async () => {
    await dataSource.query(`DELETE FROM membership_plans WHERE tenant_id = $1`, [tenantId]);
  });

  describe('5-Plan Limit Enforcement', () => {
    it('should create up to 5 plans successfully', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      const plans = [];
      for (let i = 1; i <= 5; i++) {
        const plan = await membershipPlanService.create(tenantId, {
          project_id: groupId,
          name: `Plan ${i}`,
          description: `Test plan ${i}`,
          price: 10000 * i,
          duration_days: 30,
        });
        plans.push(plan);
        expect(plan.id).toBeDefined();
      }

      expect(plans.length).toBe(5);
    });

    it('should reject 6th plan with 409 error', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      // Create 5 plans
      for (let i = 1; i <= 5; i++) {
        await membershipPlanService.create(tenantId, {
          project_id: groupId,
          name: `Plan ${i}`,
          description: `Test plan ${i}`,
          price: 10000,
          duration_days: 30,
        });
      }

      // Attempt to create 6th plan
      await expect(
        membershipPlanService.create(tenantId, {
          project_id: groupId,
          name: 'Plan 6',
          description: 'This should fail',
          price: 10000,
          duration_days: 30,
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should allow new plan after deleting one', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      // Create 5 plans
      const plans = [];
      for (let i = 1; i <= 5; i++) {
        const plan = await membershipPlanService.create(tenantId, {
          project_id: groupId,
          name: `Plan ${i}`,
          description: `Test plan ${i}`,
          price: 10000,
          duration_days: 30,
        });
        plans.push(plan);
      }

      // Delete one plan
      await membershipPlanService.delete(tenantId, plans[0].id);

      // Should now be able to create a new plan
      const newPlan = await membershipPlanService.create(tenantId, {
        project_id: groupId,
        name: 'Replacement Plan',
        description: 'Should work now',
        price: 15000,
        duration_days: 60,
      });

      expect(newPlan.id).toBeDefined();
    });
  });

  describe('Price Grandfathering', () => {
    it('should preserve original pricing for existing members when plan price changes', async () => {
      await dataSource.query(`SET LOCAL app.current_tenant = $1`, [tenantId]);

      // Create initial plan
      const originalPlan = await membershipPlanService.create(tenantId, {
        project_id: groupId,
        name: 'Basic Plan',
        description: 'Original pricing',
        price: 10000,
        duration_days: 30,
      });

      // Simulate existing member purchase (create payment transaction with snapshot)
      const paymentId = uuidv4();
      await dataSource.query(
        `INSERT INTO payment_transactions (
          id, tenant_id, membership_plan_id, telegram_user_id,
          amount, status, snapshot_plan_name, snapshot_price, snapshot_duration_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          paymentId,
          tenantId,
          originalPlan.id,
          123456789,
          10000,
          'completed',
          originalPlan.name,
          10000, // Original price
          30,
        ]
      );

      // Update plan price
      const updatedPlan = await membershipPlanService.update(tenantId, originalPlan.id, {
        price: 15000, // Increased price
      });

      expect(updatedPlan.price_mnt).toBe(15000);

      // Verify existing member payment still has original price
      const [payment] = await dataSource.query(
        `SELECT * FROM payment_transactions WHERE id = $1`,
        [paymentId]
      );

      expect(payment.snapshot_price).toBe('10000.00'); // Original price preserved
      expect(payment.amount).toBe('10000.00');
    });
  });
});
