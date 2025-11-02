import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMembershipPlanGroups1730000020000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'membership_plan_groups',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'membership_plan_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'telegram_group_id',
            type: 'uuid',
            isNullable: false,
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
            name: 'FK_membership_plan_groups_plan',
            columnNames: ['membership_plan_id'],
            referencedTableName: 'membership_plans',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_membership_plan_groups_group',
            columnNames: ['telegram_group_id'],
            referencedTableName: 'telegram_groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create unique constraint to prevent duplicate associations
    await queryRunner.createIndex(
      'membership_plan_groups',
      new TableIndex({
        name: 'IDX_membership_plan_groups_unique',
        columnNames: ['membership_plan_id', 'telegram_group_id'],
        isUnique: true,
      }),
    );

    // Create indexes for foreign keys
    await queryRunner.query(
      `CREATE INDEX "IDX_membership_plan_groups_plan" ON "membership_plan_groups" ("membership_plan_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_membership_plan_groups_group" ON "membership_plan_groups" ("telegram_group_id")`,
    );

    console.log('Created membership_plan_groups junction table for many-to-many relationship');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_plan_groups_plan"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_plan_groups_group"`);
    await queryRunner.dropIndex('membership_plan_groups', 'IDX_membership_plan_groups_unique');

    // Drop table (foreign keys are dropped automatically)
    await queryRunner.dropTable('membership_plan_groups');
  }
}
