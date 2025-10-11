import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceTelegramGroups1730000011000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns to telegram_groups table (with IF NOT EXISTS check)
    await queryRunner.query(`
      ALTER TABLE telegram_groups
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS bot_assigned BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS connection_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS sync_errors TEXT
    `);

    // Add check constraint for connection_status
    await queryRunner.query(`
      ALTER TABLE telegram_groups
      ADD CONSTRAINT "CHK_connection_status"
      CHECK (connection_status IN ('pending', 'connected', 'failed', 'disconnected'))
    `);

    // Add new indexes for enhanced functionality
    await queryRunner.query(`CREATE INDEX "IDX_telegram_groups_bot_assigned" ON telegram_groups (bot_assigned)`);
    await queryRunner.query(`CREATE INDEX "IDX_telegram_groups_sync_enabled" ON telegram_groups (sync_enabled)`);
    await queryRunner.query(`CREATE INDEX "IDX_telegram_groups_connection_status" ON telegram_groups (connection_status)`);

    // Update existing records to have proper initial state
    // Active groups should be marked as connected with bot assigned
    await queryRunner.query(`
      UPDATE telegram_groups
      SET connection_status = 'connected',
          bot_assigned = true,
          sync_enabled = false
      WHERE is_active = true
    `);

    // Inactive groups should be marked as disconnected
    await queryRunner.query(`
      UPDATE telegram_groups
      SET connection_status = 'disconnected',
          bot_assigned = false,
          sync_enabled = false
      WHERE is_active = false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telegram_groups_connection_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telegram_groups_sync_enabled"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telegram_groups_bot_assigned"`);

    // Drop check constraint
    await queryRunner.query(`ALTER TABLE telegram_groups DROP CONSTRAINT IF EXISTS "CHK_connection_status"`);

    // Drop new columns
    await queryRunner.query(`
      ALTER TABLE telegram_groups
      DROP COLUMN IF EXISTS sync_errors,
      DROP COLUMN IF EXISTS connection_status,
      DROP COLUMN IF EXISTS sync_enabled,
      DROP COLUMN IF EXISTS last_sync_at,
      DROP COLUMN IF EXISTS bot_assigned,
      DROP COLUMN IF EXISTS description
    `);
  }
}