import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateChannelMembers1730000015000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'channel_members',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'payment_transaction_id',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'bot_configuration_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'telegram_user_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'channel_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'invite_link',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'revoked'],
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'joined_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'removed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'renewal_reminder_sent_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_channel_members_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_channel_members_payment',
            columnNames: ['payment_transaction_id'],
            referencedTableName: 'payment_transactions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_channel_members_bot',
            columnNames: ['bot_configuration_id'],
            referencedTableName: 'bot_configurations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        checks: [
          {
            name: 'CHK_channel_members_telegram_user_id',
            expression: 'telegram_user_id > 0',
          },
          {
            name: 'CHK_channel_members_channel_id',
            expression: 'channel_id < 0',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_channel_members_tenant" ON "channel_members" ("tenant_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_channel_members_user" ON "channel_members" ("telegram_user_id", "status")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_channel_members_channel" ON "channel_members" ("channel_id", "status")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_channel_members_expiration" ON "channel_members" ("status", "expires_at") WHERE status = 'active'`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_channel_members_reminders" ON "channel_members" ("status", "expires_at", "renewal_reminder_sent_at") WHERE status = 'active' AND renewal_reminder_sent_at IS NULL`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_channel_members_payment" ON "channel_members" ("payment_transaction_id")`,
    );

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON channel_members`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON channel_members`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update ON channel_members`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON channel_members`);

    // Drop table (indexes and foreign keys are dropped automatically)
    await queryRunner.dropTable('channel_members');
  }
}
