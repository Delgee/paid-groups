import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class EnhanceMembershipPlansForBots1730000013000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add bot_configuration_id column
    await queryRunner.addColumn(
      'membership_plans',
      new TableColumn({
        name: 'bot_configuration_id',
        type: 'uuid',
        isNullable: true, // Temporarily nullable for existing data
      }),
    );

    // Add sort_order column
    await queryRunner.addColumn(
      'membership_plans',
      new TableColumn({
        name: 'sort_order',
        type: 'integer',
        default: 0,
        isNullable: false,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'membership_plans',
      new TableForeignKey({
        name: 'FK_membership_plans_bot_configuration',
        columnNames: ['bot_configuration_id'],
        referencedTableName: 'bot_configurations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index for bot_configuration_id with is_active and sort_order
    await queryRunner.createIndex(
      'membership_plans',
      new TableIndex({
        name: 'IDX_membership_plans_bot_sort',
        columnNames: ['bot_configuration_id', 'is_active', 'sort_order'],
      }),
    );

    // Update RLS policies are already created in existing migration
    // No changes needed for RLS
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('membership_plans', 'IDX_membership_plans_bot_sort');

    // Drop foreign key
    await queryRunner.dropForeignKey('membership_plans', 'FK_membership_plans_bot_configuration');

    // Drop columns
    await queryRunner.dropColumn('membership_plans', 'sort_order');
    await queryRunner.dropColumn('membership_plans', 'bot_configuration_id');
  }
}
