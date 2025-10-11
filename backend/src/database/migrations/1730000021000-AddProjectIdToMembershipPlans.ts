import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddProjectIdToMembershipPlans1730000021000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add project_id column (nullable initially for data migration)
    await queryRunner.addColumn(
      'membership_plans',
      new TableColumn({
        name: 'project_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Migrate data: Use group_id to find the project
    // (bot_configuration_id doesn't exist in this database)
    await queryRunner.query(`
      UPDATE membership_plans mp
      SET project_id = tg.project_id
      FROM telegram_groups tg
      WHERE mp.group_id = tg.id
        AND tg.project_id IS NOT NULL;
    `);

    // Log migration status
    const stats = await queryRunner.query(`
      SELECT
        COUNT(*) as total,
        COUNT(project_id) as migrated,
        COUNT(*) - COUNT(project_id) as unmigrated
      FROM membership_plans;
    `);

    console.log(`Membership Plans migration status:
      Total: ${stats[0].total}
      Migrated: ${stats[0].migrated}
      Unmigrated (need manual fix): ${stats[0].unmigrated}
    `);

    // Make project_id NOT NULL (will fail if there are unmigrated records)
    const unmigrated = parseInt(stats[0].unmigrated);
    if (unmigrated === 0) {
      await queryRunner.changeColumn(
        'membership_plans',
        'project_id',
        new TableColumn({
          name: 'project_id',
          type: 'uuid',
          isNullable: false,
        }),
      );
    } else {
      console.warn(`Warning: ${unmigrated} membership plans have no project_id. Leaving column nullable.`);
      console.warn('Please fix these records before making project_id NOT NULL.');
    }

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'membership_plans',
      new TableForeignKey({
        name: 'FK_membership_plans_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index for project_id
    await queryRunner.query(
      `CREATE INDEX "IDX_membership_plans_project_id" ON "membership_plans" ("project_id")`,
    );

    // Create composite index for project + active queries
    await queryRunner.query(
      `CREATE INDEX "IDX_membership_plans_project_active" ON "membership_plans" ("project_id", "is_active")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_plans_project_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_membership_plans_project_active"`);

    // Drop foreign key
    await queryRunner.dropForeignKey('membership_plans', 'FK_membership_plans_project');

    // Drop column
    await queryRunner.dropColumn('membership_plans', 'project_id');
  }
}
