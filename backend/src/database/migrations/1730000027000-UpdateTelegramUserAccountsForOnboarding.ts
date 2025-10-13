import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTelegramUserAccountsForOnboarding1730000027000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new columns for onboarding feature
    await queryRunner.query(`
      ALTER TABLE telegram_user_accounts
      ADD COLUMN IF NOT EXISTS telegram_chat_id bigint,
      ADD COLUMN IF NOT EXISTS linked_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_interaction_at timestamp,
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'
    `);

    // Make user_id NOT NULL and UNIQUE (if not already)
    await queryRunner.query(`
      ALTER TABLE telegram_user_accounts
      ALTER COLUMN user_id SET NOT NULL
    `);

    // Create index for telegram_chat_id if it doesn't exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_telegram_user_accounts_telegram_chat_id"
      ON "telegram_user_accounts" ("telegram_chat_id")
    `);

    // Create index for telegram_username if it doesn't exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_telegram_user_accounts_telegram_username"
      ON "telegram_user_accounts" ("telegram_username")
    `);

    // Ensure user_id has a unique index
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_telegram_user_accounts_user_id_unique"
      ON "telegram_user_accounts" ("user_id")
    `);

    // Update RLS policies to match the new schema
    // Drop existing policies if any
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON telegram_user_accounts`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON telegram_user_accounts`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update ON telegram_user_accounts`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON telegram_user_accounts`);

    // Enable RLS if not already enabled
    await queryRunner.query(`ALTER TABLE telegram_user_accounts ENABLE ROW LEVEL SECURITY`);

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON telegram_user_accounts
      FOR SELECT
      USING (
        user_id IN (
          SELECT id FROM users WHERE tenant_id::text = current_setting('app.current_tenant', true)
        )
      )
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON telegram_user_accounts
      FOR INSERT
      WITH CHECK (
        user_id IN (
          SELECT id FROM users WHERE tenant_id::text = current_setting('app.current_tenant', true)
        )
      )
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON telegram_user_accounts
      FOR UPDATE
      USING (
        user_id IN (
          SELECT id FROM users WHERE tenant_id::text = current_setting('app.current_tenant', true)
        )
      )
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON telegram_user_accounts
      FOR DELETE
      USING (
        user_id IN (
          SELECT id FROM users WHERE tenant_id::text = current_setting('app.current_tenant', true)
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON telegram_user_accounts`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON telegram_user_accounts`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update ON telegram_user_accounts`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON telegram_user_accounts`);

    // Drop new indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telegram_user_accounts_telegram_chat_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telegram_user_accounts_telegram_username"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telegram_user_accounts_user_id_unique"`);

    // Drop new columns
    await queryRunner.query(`
      ALTER TABLE telegram_user_accounts
      DROP COLUMN IF EXISTS telegram_chat_id,
      DROP COLUMN IF EXISTS linked_at,
      DROP COLUMN IF EXISTS last_interaction_at,
      DROP COLUMN IF EXISTS is_active,
      DROP COLUMN IF EXISTS metadata
    `);
  }
}
