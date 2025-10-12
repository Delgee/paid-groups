import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSyncFieldsFromTelegramGroups1730000026000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_telegram_groups_bot_assigned"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_telegram_groups_sync_enabled"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_telegram_groups_connection_status"`,
    );

    // Drop check constraint
    await queryRunner.query(
      `ALTER TABLE telegram_groups DROP CONSTRAINT IF EXISTS "CHK_connection_status"`,
    );

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE telegram_groups
      DROP COLUMN IF EXISTS bot_assigned,
      DROP COLUMN IF EXISTS connection_status,
      DROP COLUMN IF EXISTS sync_enabled,
      DROP COLUMN IF EXISTS last_sync_at,
      DROP COLUMN IF EXISTS sync_errors
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add columns
    await queryRunner.query(`
      ALTER TABLE telegram_groups
      ADD COLUMN IF NOT EXISTS bot_assigned BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS connection_status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS sync_errors TEXT
    `);

    // Re-add check constraint
    await queryRunner.query(`
      ALTER TABLE telegram_groups
      ADD CONSTRAINT "CHK_connection_status"
      CHECK (connection_status IN ('pending', 'connected', 'failed', 'disconnected'))
    `);

    // Re-add indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_telegram_groups_bot_assigned" ON telegram_groups (bot_assigned)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_telegram_groups_sync_enabled" ON telegram_groups (sync_enabled)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_telegram_groups_connection_status" ON telegram_groups (connection_status)`,
    );
  }
}
