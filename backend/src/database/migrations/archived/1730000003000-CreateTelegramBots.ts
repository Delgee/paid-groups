import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTelegramBots1730000003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'telegram_bots',
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
          },
          {
            name: 'bot_token',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'bot_username',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bot_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
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
            default: "'{}'",
          },
          {
            name: 'message_templates',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_telegram_bots_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    await queryRunner.query(`CREATE INDEX "IDX_telegram_bots_tenant_id" ON "telegram_bots" ("tenant_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_telegram_bots_bot_token" ON "telegram_bots" ("bot_token")`);

    await queryRunner.query(`CREATE INDEX "IDX_telegram_bots_is_active" ON "telegram_bots" ("is_active")`);

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE telegram_bots ENABLE ROW LEVEL SECURITY');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('telegram_bots');
  }
}