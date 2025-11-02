import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBotEventLogs1730000016000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bot_event_logs',
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
            name: 'bot_configuration_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'event_data',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['info', 'warning', 'error', 'critical'],
            default: "'info'",
            isNullable: false,
          },
          {
            name: 'telegram_user_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'correlation_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'occurred_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_bot_event_logs_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_bot_event_logs_bot',
            columnNames: ['bot_configuration_id'],
            referencedTableName: 'bot_configurations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_bot_event_logs_tenant" ON "bot_event_logs" ("tenant_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_event_logs_bot" ON "bot_event_logs" ("bot_configuration_id", "occurred_at" DESC) WHERE bot_configuration_id IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_event_logs_type" ON "bot_event_logs" ("tenant_id", "event_type", "occurred_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_event_logs_severity" ON "bot_event_logs" ("tenant_id", "severity", "occurred_at" DESC) WHERE severity IN ('error', 'critical')`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_event_logs_correlation" ON "bot_event_logs" ("correlation_id") WHERE correlation_id IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_event_logs_user" ON "bot_event_logs" ("telegram_user_id", "occurred_at" DESC) WHERE telegram_user_id IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_event_logs_occurred" ON "bot_event_logs" ("occurred_at" DESC)`,
    );

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE bot_event_logs ENABLE ROW LEVEL SECURITY');

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON bot_event_logs
      FOR SELECT
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON bot_event_logs
      FOR INSERT
      WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON bot_event_logs
      FOR DELETE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON bot_event_logs`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON bot_event_logs`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON bot_event_logs`);

    // Drop table (indexes and foreign keys are dropped automatically)
    await queryRunner.dropTable('bot_event_logs');
  }
}
