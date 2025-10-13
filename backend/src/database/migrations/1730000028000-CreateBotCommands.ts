import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBotCommands1730000028000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bot_commands',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'telegram_user_account_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'telegram_user_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'telegram_chat_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'command',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'parameters',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'session_step',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'response_status',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'error_code',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'response_time_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'correlation_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_bot_commands_telegram_user_account',
            columnNames: ['telegram_user_account_id'],
            referencedTableName: 'telegram_user_accounts',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_bot_commands_telegram_user_id" ON "bot_commands" ("telegram_user_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_commands_command" ON "bot_commands" ("command")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_commands_created_at" ON "bot_commands" ("created_at" DESC)`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_commands_correlation_id" ON "bot_commands" ("correlation_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_bot_commands_response_status" ON "bot_commands" ("response_status")`,
    );

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY');

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON bot_commands
      FOR SELECT
      USING (
        telegram_user_account_id IS NULL OR
        telegram_user_account_id IN (
          SELECT id FROM telegram_user_accounts WHERE user_id IN (
            SELECT id FROM users WHERE tenant_id::text = current_setting('app.current_tenant', true)
          )
        )
      )
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON bot_commands
      FOR INSERT
      WITH CHECK (TRUE)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON bot_commands`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON bot_commands`);

    // Disable RLS
    await queryRunner.query('ALTER TABLE bot_commands DISABLE ROW LEVEL SECURITY');

    // Drop table (indexes and foreign keys are dropped automatically)
    await queryRunner.dropTable('bot_commands');
  }
}
