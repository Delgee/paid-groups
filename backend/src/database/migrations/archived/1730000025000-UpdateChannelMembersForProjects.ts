import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class UpdateChannelMembersForProjects1730000025000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if channel_members table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'channel_members'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('channel_members table does not exist, skipping migration');
      return;
    }

    // Drop unique constraint on payment_transaction_id (one payment can have multiple channel members now)
    await queryRunner.query(`
      ALTER TABLE channel_members
      DROP CONSTRAINT IF EXISTS "UQ_channel_members_payment_transaction_id";
    `);

    // Add project_id column (nullable initially for data migration)
    await queryRunner.addColumn(
      'channel_members',
      new TableColumn({
        name: 'project_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Migrate data: Set project_id based on bot_configuration_id
    await queryRunner.query(`
      UPDATE channel_members cm
      SET project_id = p.id
      FROM projects p, bot_configurations bc
      WHERE cm.bot_configuration_id = bc.id
        AND bc.id = p.id;
    `);

    // Log migration status
    const stats = await queryRunner.query(`
      SELECT
        COUNT(*) as total,
        COUNT(project_id) as migrated,
        COUNT(*) - COUNT(project_id) as unmigrated
      FROM channel_members;
    `);

    console.log(`Channel Members migration status:
      Total: ${stats[0].total}
      Migrated: ${stats[0].migrated}
      Unmigrated (need manual fix): ${stats[0].unmigrated}
    `);

    // Make project_id NOT NULL (will fail if there are unmigrated records)
    const unmigrated = parseInt(stats[0].unmigrated);
    if (unmigrated === 0 || stats[0].total === '0') {
      await queryRunner.changeColumn(
        'channel_members',
        'project_id',
        new TableColumn({
          name: 'project_id',
          type: 'uuid',
          isNullable: false,
        }),
      );
    } else {
      console.warn(`Warning: ${unmigrated} channel members have no project_id. Leaving column nullable.`);
      console.warn('Please fix these records before making project_id NOT NULL.');
    }

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'channel_members',
      new TableForeignKey({
        name: 'FK_channel_members_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index for project_id
    await queryRunner.query(
      `CREATE INDEX "IDX_channel_members_project_id" ON "channel_members" ("project_id")`,
    );

    // Drop old bot_configuration_id column and its constraints
    const botConfigIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'channel_members'
        AND column_name = 'bot_configuration_id'
      );
    `);

    if (botConfigIdExists[0].exists) {
      // Drop foreign key first
      await queryRunner.query(`
        ALTER TABLE channel_members
        DROP CONSTRAINT IF EXISTS "FK_channel_members_bot_configuration";
      `);

      // Drop column
      await queryRunner.dropColumn('channel_members', 'bot_configuration_id');
      console.log('  ✓ Dropped bot_configuration_id column from channel_members');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore bot_configuration_id column
    await queryRunner.addColumn(
      'channel_members',
      new TableColumn({
        name: 'bot_configuration_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Try to restore data from project_id
    await queryRunner.query(`
      UPDATE channel_members cm
      SET bot_configuration_id = cm.project_id
      WHERE cm.project_id IS NOT NULL;
    `);

    // Drop project_id constraints and column
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_channel_members_project_id"`);
    await queryRunner.dropForeignKey('channel_members', 'FK_channel_members_project');
    await queryRunner.dropColumn('channel_members', 'project_id');

    // Restore unique constraint
    await queryRunner.query(`
      ALTER TABLE channel_members
      ADD CONSTRAINT "UQ_channel_members_payment_transaction_id" UNIQUE (payment_transaction_id);
    `);

    console.log('Rolled back channel_members to use bot_configuration_id');
  }
}
