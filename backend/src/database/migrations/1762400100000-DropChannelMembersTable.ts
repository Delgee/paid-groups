import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to drop the channel_members table after consolidating to memberships table.
 *
 * IMPORTANT: Run this migration ONLY after:
 * 1. EnhanceMembershipsWithChannelMemberFields migration has been applied
 * 2. All existing channel_members data has been migrated to memberships table (if any)
 * 3. All code has been updated to use Membership instead of ChannelMember
 */
export class DropChannelMembersTable1762400100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies first
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON channel_members`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update ON channel_members`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON channel_members`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON channel_members`);

    // Drop the table (this will automatically drop all indexes and foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "channel_members" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-creating the table in case we need to rollback
    // Note: This is a safety measure, but ideally you should not rollback after data migration
    await queryRunner.query(`
      CREATE TABLE "channel_members" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "payment_transaction_id" uuid NOT NULL UNIQUE,
        "project_id" uuid NOT NULL,
        "telegram_user_id" bigint NOT NULL CHECK ("telegram_user_id" > 0),
        "channel_id" bigint NOT NULL CHECK ("channel_id" < 0),
        "invite_link" text,
        "status" varchar NOT NULL DEFAULT 'active',
        "joined_at" timestamp,
        "expires_at" timestamp with time zone NOT NULL,
        "removed_at" timestamp,
        "renewal_reminder_sent_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FK_channel_members_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_channel_members_payment" FOREIGN KEY ("payment_transaction_id")
          REFERENCES "payment_transactions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_channel_members_project" FOREIGN KEY ("project_id")
          REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    // Recreate indexes
    await queryRunner.query(`CREATE INDEX "IDX_channel_members_tenant" ON "channel_members" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_channel_members_user" ON "channel_members" ("telegram_user_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_channel_members_channel" ON "channel_members" ("channel_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_channel_members_expiration" ON "channel_members" ("status", "expires_at") WHERE status = 'active'`);
    await queryRunner.query(`CREATE INDEX "IDX_channel_members_reminders" ON "channel_members" ("status", "expires_at", "renewal_reminder_sent_at") WHERE status = 'active' AND renewal_reminder_sent_at IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_channel_members_payment" ON "channel_members" ("payment_transaction_id")`);

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY');

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON channel_members
      FOR SELECT
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON channel_members
      FOR INSERT
      WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON channel_members
      FOR UPDATE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON channel_members
      FOR DELETE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);
  }
}
