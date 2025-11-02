import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProjects1730000017000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'projects',
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
          // Bot configuration fields
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
          // Bot infrastructure fields
          {
            name: 'webhook_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'webhook_secret',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'message_templates',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          // Status fields
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
            name: 'FK_projects_tenant',
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
      `CREATE INDEX "IDX_projects_tenant" ON "projects" ("tenant_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_projects_active" ON "projects" ("tenant_id", "is_active")`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_projects_bot_token" ON "projects" ("bot_token")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_projects_bot_username" ON "projects" ("bot_username")`,
    );

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE projects ENABLE ROW LEVEL SECURITY');

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON projects
      FOR SELECT
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON projects
      FOR INSERT
      WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON projects
      FOR UPDATE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON projects
      FOR DELETE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON projects`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON projects`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update ON projects`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON projects`);

    // Disable RLS
    await queryRunner.query('ALTER TABLE projects DISABLE ROW LEVEL SECURITY');

    // Drop table (indexes are dropped automatically)
    await queryRunner.dropTable('projects');
  }
}
