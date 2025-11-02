import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateMembershipPlanGroupRelationships1730000022000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migrate existing single-group relationships (from group_id column)
    // to the new many-to-many junction table
    await queryRunner.query(`
      INSERT INTO membership_plan_groups (membership_plan_id, telegram_group_id, created_at)
      SELECT
        mp.id as membership_plan_id,
        mp.group_id as telegram_group_id,
        CURRENT_TIMESTAMP as created_at
      FROM membership_plans mp
      WHERE mp.group_id IS NOT NULL
      ON CONFLICT (membership_plan_id, telegram_group_id) DO NOTHING;
    `);

    // Log migration results
    const stats = await queryRunner.query(`
      SELECT
        (SELECT COUNT(*) FROM membership_plans WHERE group_id IS NOT NULL) as plans_with_groups,
        (SELECT COUNT(*) FROM membership_plan_groups) as junction_records
    `);

    console.log(`Migrated membership plan group relationships:
      Plans with group_id: ${stats[0].plans_with_groups}
      Junction table records: ${stats[0].junction_records}
    `);

    // Verify data integrity: Check for plans that should have junction records but don't
    const orphaned = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM membership_plans mp
      WHERE mp.group_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM membership_plan_groups mpg
          WHERE mpg.membership_plan_id = mp.id
        );
    `);

    if (orphaned[0].count > 0) {
      console.warn(`Warning: ${orphaned[0].count} membership plans have group_id but no junction records.`);
      console.warn('This may indicate a data integrity issue that needs investigation.');
    } else {
      console.log('✓ All membership plans with group_id have corresponding junction records.');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Delete junction records that were created from group_id migration
    // This matches plans where group_id still exists
    await queryRunner.query(`
      DELETE FROM membership_plan_groups mpg
      USING membership_plans mp
      WHERE mpg.membership_plan_id = mp.id
        AND mpg.telegram_group_id = mp.group_id;
    `);

    console.log('Rolled back membership plan group relationships from junction table');
  }
}
