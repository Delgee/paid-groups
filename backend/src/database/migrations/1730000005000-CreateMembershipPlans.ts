import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMembershipPlans1730000005000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'membership_plans',
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
            name: 'group_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'price_mnt',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'MNT'",
          },
          {
            name: 'duration_days',
            type: 'int',
          },
          {
            name: 'trial_days',
            type: 'int',
            default: 0,
          },
          {
            name: 'features',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'max_members',
            type: 'int',
            isNullable: true,
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
            name: 'FK_membership_plans_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_membership_plans_group',
            columnNames: ['group_id'],
            referencedTableName: 'telegram_groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true
    );

    await queryRunner.query(`CREATE INDEX "IDX_membership_plans_tenant_id" ON "membership_plans" ("tenant_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_membership_plans_group_id" ON "membership_plans" ("group_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_membership_plans_is_active" ON "membership_plans" ("is_active")`);

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('membership_plans');
  }
}