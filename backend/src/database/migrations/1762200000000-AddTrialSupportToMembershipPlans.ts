import { MigrationInterface, QueryRunner, TableColumn, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Add Trial Support to Membership Plans
 *
 * This migration adds trial functionality to the membership plan system:
 * 1. Replaces trial_days with trial_enabled (boolean) and trial_duration_seconds (integer)
 * 2. Creates trial_usage table to track which users have used trials
 * 3. Prevents users from using the same trial twice
 *
 * Default trial duration: 300 seconds (5 minutes)
 */
export class AddTrialSupportToMembershipPlans1762200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new trial columns to membership_plans table
    await queryRunner.addColumn(
      'membership_plans',
      new TableColumn({
        name: 'trial_enabled',
        type: 'boolean',
        default: false,
        comment: 'Whether trial period is enabled for this plan',
      }),
    );

    await queryRunner.addColumn(
      'membership_plans',
      new TableColumn({
        name: 'trial_duration_seconds',
        type: 'integer',
        default: 300,
        comment: 'Duration of trial period in seconds (default: 300 = 5 minutes)',
      }),
    );

    // Step 2: Migrate existing trial_days data to new format
    // If trial_days > 0, enable trial and convert to seconds
    await queryRunner.query(`
      UPDATE membership_plans
      SET
        trial_enabled = true,
        trial_duration_seconds = trial_days * 86400
      WHERE trial_days > 0
    `);

    // Step 3: Drop old trial_days column
    await queryRunner.dropColumn('membership_plans', 'trial_days');

    // Step 4: Create trial_usage table to track which users used trials
    await queryRunner.createTable(
      new Table({
        name: 'trial_usage',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Tenant ID for multi-tenant isolation',
          },
          {
            name: 'member_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Member who used the trial',
          },
          {
            name: 'membership_plan_id',
            type: 'uuid',
            isNullable: false,
            comment: 'Membership plan for which trial was used',
          },
          {
            name: 'membership_id',
            type: 'uuid',
            isNullable: false,
            comment: 'The trial membership that was created',
          },
          {
            name: 'trial_started_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: 'When the trial was activated',
          },
          {
            name: 'trial_ends_at',
            type: 'timestamp',
            isNullable: false,
            comment: 'When the trial expires',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Step 5: Add indexes for performance
    await queryRunner.createIndex(
      'trial_usage',
      new TableIndex({
        name: 'IDX_trial_usage_tenant_id',
        columnNames: ['tenant_id'],
      }),
    );

    await queryRunner.createIndex(
      'trial_usage',
      new TableIndex({
        name: 'IDX_trial_usage_member_id',
        columnNames: ['member_id'],
      }),
    );

    await queryRunner.createIndex(
      'trial_usage',
      new TableIndex({
        name: 'IDX_trial_usage_membership_plan_id',
        columnNames: ['membership_plan_id'],
      }),
    );

    // Unique constraint: one trial per member per plan
    await queryRunner.createIndex(
      'trial_usage',
      new TableIndex({
        name: 'IDX_trial_usage_member_plan_unique',
        columnNames: ['member_id', 'membership_plan_id'],
        isUnique: true,
      }),
    );

    // Index for finding expired trials
    await queryRunner.createIndex(
      'trial_usage',
      new TableIndex({
        name: 'IDX_trial_usage_trial_ends_at',
        columnNames: ['trial_ends_at'],
      }),
    );

    // Step 6: Add foreign keys
    await queryRunner.createForeignKey(
      'trial_usage',
      new TableForeignKey({
        name: 'FK_trial_usage_member',
        columnNames: ['member_id'],
        referencedTableName: 'members',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'trial_usage',
      new TableForeignKey({
        name: 'FK_trial_usage_membership_plan',
        columnNames: ['membership_plan_id'],
        referencedTableName: 'membership_plans',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'trial_usage',
      new TableForeignKey({
        name: 'FK_trial_usage_membership',
        columnNames: ['membership_id'],
        referencedTableName: 'memberships',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Step 7: Enable RLS on trial_usage table
    await queryRunner.query(`ALTER TABLE trial_usage ENABLE ROW LEVEL SECURITY`);

    // Step 8: Create RLS policies for trial_usage
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON trial_usage
      FOR SELECT
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON trial_usage
      FOR INSERT
      WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON trial_usage
      FOR UPDATE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON trial_usage
      FOR DELETE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON trial_usage`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update ON trial_usage`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON trial_usage`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON trial_usage`);

    // Drop trial_usage table (cascades foreign keys and indexes)
    await queryRunner.dropTable('trial_usage', true);

    // Re-add trial_days column to membership_plans
    await queryRunner.addColumn(
      'membership_plans',
      new TableColumn({
        name: 'trial_days',
        type: 'integer',
        default: 0,
        comment: 'Trial period in days',
      }),
    );

    // Migrate data back: convert seconds to days (if trial was enabled)
    await queryRunner.query(`
      UPDATE membership_plans
      SET trial_days = FLOOR(trial_duration_seconds / 86400)
      WHERE trial_enabled = true
    `);

    // Drop new trial columns
    await queryRunner.dropColumn('membership_plans', 'trial_duration_seconds');
    await queryRunner.dropColumn('membership_plans', 'trial_enabled');
  }
}