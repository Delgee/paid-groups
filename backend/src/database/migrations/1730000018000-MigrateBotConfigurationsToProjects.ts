import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateBotConfigurationsToProjects1730000018000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if bot_configurations table exists and has data
    const botConfigsExist = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'bot_configurations'
      );
    `);

    if (!botConfigsExist[0].exists) {
      console.log('bot_configurations table does not exist, skipping migration');
      return;
    }

    // Migrate data from bot_configurations to projects
    await queryRunner.query(`
      INSERT INTO projects (
        id,
        tenant_id,
        bot_token,
        bot_username,
        display_name,
        description,
        welcome_message,
        channel_id,
        channel_username,
        is_active,
        last_sync_at,
        created_at,
        updated_at,
        settings,
        message_templates
      )
      SELECT
        id,
        tenant_id,
        bot_token,
        bot_username,
        display_name,
        description,
        welcome_message,
        channel_id,
        channel_username,
        is_active,
        last_sync_at,
        created_at,
        updated_at,
        '{}'::jsonb as settings,
        '{}'::jsonb as message_templates
      FROM bot_configurations
      ON CONFLICT (id) DO NOTHING;
    `);

    // Log migration results
    const migratedCount = await queryRunner.query(`
      SELECT COUNT(*) as count FROM projects;
    `);

    console.log(`Migrated ${migratedCount[0].count} bot configurations to projects table`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if bot_configurations table exists
    const botConfigsExist = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'bot_configurations'
      );
    `);

    if (!botConfigsExist[0].exists) {
      console.log('bot_configurations table does not exist, cannot rollback migration');
      return;
    }

    // Restore data back to bot_configurations if needed
    // Note: This only restores records that don't already exist in bot_configurations
    await queryRunner.query(`
      INSERT INTO bot_configurations (
        id,
        tenant_id,
        bot_token,
        bot_username,
        display_name,
        description,
        welcome_message,
        channel_id,
        channel_username,
        is_active,
        last_sync_at,
        created_at,
        updated_at
      )
      SELECT
        id,
        tenant_id,
        bot_token,
        bot_username,
        display_name,
        description,
        welcome_message,
        channel_id,
        channel_username,
        is_active,
        last_sync_at,
        created_at,
        updated_at
      FROM projects
      WHERE id IN (
        SELECT id FROM bot_configurations
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    // Delete migrated records from projects
    await queryRunner.query(`
      DELETE FROM projects
      WHERE id IN (SELECT id FROM bot_configurations);
    `);

    console.log('Rolled back project data to bot_configurations table');
  }
}
