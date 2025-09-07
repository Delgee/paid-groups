import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRLSPolicies1730000010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create RLS policies for tenants table
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON tenants
      FOR SELECT USING (id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON tenants
      FOR INSERT WITH CHECK (id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON tenants
      FOR UPDATE USING (id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON tenants
      FOR DELETE USING (id::text = current_setting('app.current_tenant', true))
    `);

    // Create RLS policies for users table
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON users
      FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON users
      FOR INSERT WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON users
      FOR UPDATE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON users
      FOR DELETE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    // Create RLS policies for telegram_bots table
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON telegram_bots
      FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON telegram_bots
      FOR INSERT WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON telegram_bots
      FOR UPDATE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON telegram_bots
      FOR DELETE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    // Create RLS policies for telegram_groups table
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON telegram_groups
      FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON telegram_groups
      FOR INSERT WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON telegram_groups
      FOR UPDATE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON telegram_groups
      FOR DELETE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    // Create RLS policies for membership_plans table
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON membership_plans
      FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON membership_plans
      FOR INSERT WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON membership_plans
      FOR UPDATE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON membership_plans
      FOR DELETE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    // Create RLS policies for members table
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON members
      FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON members
      FOR INSERT WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON members
      FOR UPDATE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON members
      FOR DELETE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    // Create RLS policies for memberships table
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON memberships
      FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON memberships
      FOR INSERT WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON memberships
      FOR UPDATE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON memberships
      FOR DELETE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    // Create RLS policies for payments table
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON payments
      FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON payments
      FOR INSERT WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON payments
      FOR UPDATE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON payments
      FOR DELETE USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    // Create RLS policies for audit_logs table
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON audit_logs
      FOR SELECT USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON audit_logs
      FOR INSERT WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all RLS policies
    const tables = [
      'tenants', 'users', 'telegram_bots', 'telegram_groups',
      'membership_plans', 'members', 'memberships', 'payments', 'audit_logs'
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON ${table}`);
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON ${table}`);
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update ON ${table}`);
      await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON ${table}`);
    }
  }
}