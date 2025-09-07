import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTelegramGroups1730000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'telegram_groups',
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
            name: 'bot_id',
            type: 'uuid',
          },
          {
            name: 'telegram_chat_id',
            type: 'bigint',
            isUnique: true,
          },
          {
            name: 'group_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'group_type',
            type: 'enum',
            enum: ['group', 'supergroup', 'channel'],
          },
          {
            name: 'username',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'invite_link',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'member_count',
            type: 'int',
            default: 0,
          },
          {
            name: 'settings',
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
            name: 'FK_telegram_groups_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_telegram_groups_bot',
            columnNames: ['bot_id'],
            referencedTableName: 'telegram_bots',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    await queryRunner.query(`CREATE INDEX "IDX_telegram_groups_tenant_id" ON "telegram_groups" ("tenant_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_telegram_groups_bot_id" ON "telegram_groups" ("bot_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_telegram_groups_telegram_chat_id" ON "telegram_groups" ("telegram_chat_id")`);

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE telegram_groups ENABLE ROW LEVEL SECURITY');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('telegram_groups');
  }
}