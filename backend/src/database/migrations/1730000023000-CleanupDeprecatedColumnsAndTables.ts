import { MigrationInterface, QueryRunner } from 'typeorm';

export class CleanupDeprecatedColumnsAndTables1730000023000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting cleanup of deprecated columns and tables...');

    // STEP 1: Drop deprecated columns from membership_plans
    console.log('Step 1: Cleaning up membership_plans table...');

    // Drop the old single group_id column (replaced by junction table)
    const groupIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'membership_plans'
        AND column_name = 'group_id'
      );
    `);

    if (groupIdExists[0].exists) {
      // Drop foreign key first
      await queryRunner.query(`
        ALTER TABLE membership_plans
        DROP CONSTRAINT IF EXISTS "FK_membership_plans_group";
      `);

      // Drop index
      await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_membership_plans_group_id";
      `);

      // Drop column
      await queryRunner.dropColumn('membership_plans', 'group_id');
      console.log('  ✓ Dropped group_id column from membership_plans');
    }

    // Drop the old bot_configuration_id column (replaced by project_id)
    const botConfigIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'membership_plans'
        AND column_name = 'bot_configuration_id'
      );
    `);

    if (botConfigIdExists[0].exists) {
      // Drop foreign key first
      await queryRunner.query(`
        ALTER TABLE membership_plans
        DROP CONSTRAINT IF EXISTS "FK_membership_plans_bot_configuration";
      `);

      // Drop index
      await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_membership_plans_bot_sort";
      `);

      // Drop column
      await queryRunner.dropColumn('membership_plans', 'bot_configuration_id');
      console.log('  ✓ Dropped bot_configuration_id column from membership_plans');
    }

    // STEP 2: Drop deprecated columns from telegram_groups
    console.log('Step 2: Cleaning up telegram_groups table...');

    const botIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'telegram_groups'
        AND column_name = 'bot_id'
      );
    `);

    if (botIdExists[0].exists) {
      // Drop foreign key first
      await queryRunner.query(`
        ALTER TABLE telegram_groups
        DROP CONSTRAINT IF EXISTS "FK_telegram_groups_bot";
      `);

      // Drop index
      await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_telegram_groups_bot_id";
      `);

      // Drop column
      await queryRunner.dropColumn('telegram_groups', 'bot_id');
      console.log('  ✓ Dropped bot_id column from telegram_groups');
    }

    // STEP 3: Drop deprecated tables (OPTIONAL - commented out for safety)
    console.log('Step 3: Checking deprecated tables...');

    // Check if bot_configurations should be dropped
    const botConfigsExist = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'bot_configurations'
      );
    `);

    if (botConfigsExist[0].exists) {
      console.log('  ⚠ bot_configurations table still exists');
      console.log('  To drop it, verify all data is migrated to projects and run:');
      console.log('    DROP TABLE bot_configurations CASCADE;');

      // Uncomment to actually drop the table:
      // await queryRunner.dropTable('bot_configurations', true, true);
      // console.log('  ✓ Dropped bot_configurations table');
    }

    // Check if telegram_bots should be dropped
    const telegramBotsExist = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'telegram_bots'
      );
    `);

    if (telegramBotsExist[0].exists) {
      console.log('  ⚠ telegram_bots table still exists');
      console.log('  To drop it, verify no dependencies remain and run:');
      console.log('    DROP TABLE telegram_bots CASCADE;');

      // Uncomment to actually drop the table:
      // await queryRunner.dropTable('telegram_bots', true, true);
      // console.log('  ✓ Dropped telegram_bots table');
    }

    console.log('✓ Cleanup migration completed successfully');
    console.log('Note: Deprecated tables were preserved for safety. Drop manually if needed.');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back cleanup migration...');
    console.log('WARNING: This will restore deprecated columns but NOT restore deleted tables.');

    // Restore bot_configuration_id to membership_plans
    const botConfigIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'membership_plans'
        AND column_name = 'bot_configuration_id'
      );
    `);

    if (!botConfigIdExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE membership_plans
        ADD COLUMN bot_configuration_id uuid;
      `);

      // Try to restore data from project_id if projects table exists
      await queryRunner.query(`
        UPDATE membership_plans mp
        SET bot_configuration_id = mp.project_id
        WHERE mp.project_id IS NOT NULL;
      `);

      console.log('  ✓ Restored bot_configuration_id column');
    }

    // Restore group_id to membership_plans
    const groupIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'membership_plans'
        AND column_name = 'group_id'
      );
    `);

    if (!groupIdExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE membership_plans
        ADD COLUMN group_id uuid;
      `);

      // Try to restore data from junction table (take first group)
      await queryRunner.query(`
        UPDATE membership_plans mp
        SET group_id = (
          SELECT telegram_group_id
          FROM membership_plan_groups mpg
          WHERE mpg.membership_plan_id = mp.id
          LIMIT 1
        )
        WHERE EXISTS (
          SELECT 1 FROM membership_plan_groups mpg
          WHERE mpg.membership_plan_id = mp.id
        );
      `);

      console.log('  ✓ Restored group_id column (with first group from junction table)');
    }

    // Restore bot_id to telegram_groups
    const botIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'telegram_groups'
        AND column_name = 'bot_id'
      );
    `);

    if (!botIdExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE telegram_groups
        ADD COLUMN bot_id uuid;
      `);

      // Try to restore data from project_id
      await queryRunner.query(`
        UPDATE telegram_groups tg
        SET bot_id = tg.project_id
        WHERE tg.project_id IS NOT NULL;
      `);

      console.log('  ✓ Restored bot_id column');
    }

    console.log('✓ Rollback completed');
    console.log('Note: Foreign keys and indexes were not restored. Manual intervention may be needed.');
  }
}
