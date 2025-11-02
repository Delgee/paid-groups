import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBotConfigurations1730000012000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bot_configurations',
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
            name: 'bot_token',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'bot_username',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'display_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'welcome_message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'channel_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'channel_username',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'last_sync_at',
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
            name: 'FK_bot_configurations_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_bot_configurations_tenant" ON "bot_configurations" ("tenant_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_configurations_active" ON "bot_configurations" ("tenant_id", "is_active")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bot_configurations_token" ON "bot_configurations" ("bot_token")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_configurations_channel" ON "bot_configurations" ("channel_id") WHERE channel_id IS NOT NULL`,
    );

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY');

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON bot_configurations
      FOR SELECT
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON bot_configurations
      FOR INSERT
      WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON bot_configurations
      FOR UPDATE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON bot_configurations
      FOR DELETE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON bot_configurations`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON bot_configurations`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update ON bot_configurations`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON bot_configurations`);

    // Drop table (indexes are dropped automatically)
    await queryRunner.dropTable('bot_configurations');
  }
}
