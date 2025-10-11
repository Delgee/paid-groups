import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddProjectIdToTelegramGroups1730000019000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add project_id column (nullable initially for data migration)
    await queryRunner.addColumn(
      'telegram_groups',
      new TableColumn({
        name: 'project_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Migrate data: Set project_id based on bot_configuration_id if it exists
    // First, try to migrate from bot_configurations that were migrated to projects
    await queryRunner.query(`
      UPDATE telegram_groups tg
      SET project_id = p.id
      FROM projects p
      WHERE tg.bot_id = p.id;
    `);

    // For groups that still reference old telegram_bots table (if any)
    // We'll leave project_id as NULL for now - these will need manual intervention
    // or a more complex migration strategy

    // Log migration status
    const stats = await queryRunner.query(`
      SELECT
        COUNT(*) as total,
        COUNT(project_id) as migrated,
        COUNT(*) - COUNT(project_id) as unmigrated
      FROM telegram_groups;
    `);

    console.log(`Telegram Groups migration status:
      Total: ${stats[0].total}
      Migrated: ${stats[0].migrated}
      Unmigrated (need manual fix): ${stats[0].unmigrated}
    `);

    // Make project_id NOT NULL (will fail if there are unmigrated records)
    // If you have unmigrated records, you'll need to handle them first
    const unmigrated = parseInt(stats[0].unmigrated);
    if (unmigrated === 0) {
      await queryRunner.changeColumn(
        'telegram_groups',
        'project_id',
        new TableColumn({
          name: 'project_id',
          type: 'uuid',
          isNullable: false,
        }),
      );
    } else {
      console.warn(`Warning: ${unmigrated} telegram groups have no project_id. Leaving column nullable.`);
      console.warn('Please fix these records before making project_id NOT NULL.');
    }

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'telegram_groups',
      new TableForeignKey({
        name: 'FK_telegram_groups_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index for project_id
    await queryRunner.query(
      `CREATE INDEX "IDX_telegram_groups_project_id" ON "telegram_groups" ("project_id")`,
    );

    // Create composite index for tenant + project queries
    await queryRunner.query(
      `CREATE INDEX "IDX_telegram_groups_tenant_project" ON "telegram_groups" ("tenant_id", "project_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telegram_groups_project_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_telegram_groups_tenant_project"`);

    // Drop foreign key
    await queryRunner.dropForeignKey('telegram_groups', 'FK_telegram_groups_project');

    // Drop column
    await queryRunner.dropColumn('telegram_groups', 'project_id');
  }
}
