import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMembers1730000006000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'members',
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
            name: 'telegram_user_id',
            type: 'bigint',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'phone_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'language_code',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'is_bot',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_premium',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
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
            name: 'FK_members_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    await queryRunner.query(`CREATE INDEX "IDX_members_tenant_id" ON "members" ("tenant_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_members_telegram_user_id" ON "members" ("telegram_user_id")`);

    await queryRunner.query(`CREATE UNIQUE INDEX "UNIQUE_members_tenant_telegram_user" ON "members" ("tenant_id", "telegram_user_id")`);

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE members ENABLE ROW LEVEL SECURITY');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('members');
  }
}