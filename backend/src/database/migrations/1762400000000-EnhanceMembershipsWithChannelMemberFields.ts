import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class EnhanceMembershipsWithChannelMemberFields1762400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add invite link tracking
    await queryRunner.addColumn(
      'memberships',
      new TableColumn({
        name: 'invite_link',
        type: 'text',
        isNullable: true,
      }),
    );

    // Add timestamp for when member actually joined the channel
    await queryRunner.addColumn(
      'memberships',
      new TableColumn({
        name: 'joined_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add timestamp for when member was removed from channel
    await queryRunner.addColumn(
      'memberships',
      new TableColumn({
        name: 'removed_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add renewal reminder tracking (migrated from channel_members)
    await queryRunner.addColumn(
      'memberships',
      new TableColumn({
        name: 'renewal_reminder_sent_at',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add payment transaction reference
    await queryRunner.addColumn(
      'memberships',
      new TableColumn({
        name: 'payment_transaction_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add project reference (for bot-based flows)
    await queryRunner.addColumn(
      'memberships',
      new TableColumn({
        name: 'project_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Create indexes for the new fields
    await queryRunner.query(
      `CREATE INDEX "IDX_memberships_payment_transaction_id" ON "memberships" ("payment_transaction_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_memberships_project_id" ON "memberships" ("project_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_memberships_renewal_reminder" ON "memberships" ("status", "expires_at", "renewal_reminder_sent_at") WHERE status = 'active' AND renewal_reminder_sent_at IS NULL`,
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'memberships',
      new TableForeignKey({
        name: 'FK_memberships_payment_transaction',
        columnNames: ['payment_transaction_id'],
        referencedTableName: 'payment_transactions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'memberships',
      new TableForeignKey({
        name: 'FK_memberships_project',
        columnNames: ['project_id'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.dropForeignKey('memberships', 'FK_memberships_project');
    await queryRunner.dropForeignKey('memberships', 'FK_memberships_payment_transaction');

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_memberships_renewal_reminder"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_memberships_project_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_memberships_payment_transaction_id"`);

    // Drop columns
    await queryRunner.dropColumn('memberships', 'project_id');
    await queryRunner.dropColumn('memberships', 'payment_transaction_id');
    await queryRunner.dropColumn('memberships', 'renewal_reminder_sent_at');
    await queryRunner.dropColumn('memberships', 'removed_at');
    await queryRunner.dropColumn('memberships', 'joined_at');
    await queryRunner.dropColumn('memberships', 'invite_link');
  }
}
