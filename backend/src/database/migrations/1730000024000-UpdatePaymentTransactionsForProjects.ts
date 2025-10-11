import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class UpdatePaymentTransactionsForProjects1730000024000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if payment_transactions table exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'payment_transactions'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('payment_transactions table does not exist, skipping migration');
      return;
    }

    // Add project_id column (nullable initially for data migration)
    await queryRunner.addColumn(
      'payment_transactions',
      new TableColumn({
        name: 'project_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Migrate data: Set project_id based on bot_configuration_id
    await queryRunner.query(`
      UPDATE payment_transactions pt
      SET project_id = p.id
      FROM projects p, bot_configurations bc
      WHERE pt.bot_configuration_id = bc.id
        AND bc.id = p.id;
    `);

    // Log migration status
    const stats = await queryRunner.query(`
      SELECT
        COUNT(*) as total,
        COUNT(project_id) as migrated,
        COUNT(*) - COUNT(project_id) as unmigrated
      FROM payment_transactions;
    `);

    console.log(`Payment Transactions migration status:
      Total: ${stats[0].total}
      Migrated: ${stats[0].migrated}
      Unmigrated (need manual fix): ${stats[0].unmigrated}
    `);

    // Make project_id NOT NULL (will fail if there are unmigrated records)
    const unmigrated = parseInt(stats[0].unmigrated);
    if (unmigrated === 0) {
      await queryRunner.changeColumn(
        'payment_transactions',
        'project_id',
        new TableColumn({
          name: 'project_id',
          type: 'uuid',
          isNullable: false,
        }),
      );
    } else {
      console.warn(`Warning: ${unmigrated} payment transactions have no project_id. Leaving column nullable.`);
      console.warn('Please fix these records before making project_id NOT NULL.');
    }

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'payment_transactions',
      new TableForeignKey({
        name: 'FK_payment_transactions_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index for project_id
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_project_id" ON "payment_transactions" ("project_id")`,
    );

    // Drop old bot_configuration_id column and its constraints
    const botConfigIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'payment_transactions'
        AND column_name = 'bot_configuration_id'
      );
    `);

    if (botConfigIdExists[0].exists) {
      // Drop foreign key first
      await queryRunner.query(`
        ALTER TABLE payment_transactions
        DROP CONSTRAINT IF EXISTS "FK_payment_transactions_bot_configuration";
      `);

      // Drop column
      await queryRunner.dropColumn('payment_transactions', 'bot_configuration_id');
      console.log('  ✓ Dropped bot_configuration_id column from payment_transactions');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore bot_configuration_id column
    await queryRunner.addColumn(
      'payment_transactions',
      new TableColumn({
        name: 'bot_configuration_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Try to restore data from project_id
    await queryRunner.query(`
      UPDATE payment_transactions pt
      SET bot_configuration_id = pt.project_id
      WHERE pt.project_id IS NOT NULL;
    `);

    // Drop project_id constraints and column
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_transactions_project_id"`);
    await queryRunner.dropForeignKey('payment_transactions', 'FK_payment_transactions_project');
    await queryRunner.dropColumn('payment_transactions', 'project_id');

    console.log('Rolled back payment_transactions to use bot_configuration_id');
  }
}
