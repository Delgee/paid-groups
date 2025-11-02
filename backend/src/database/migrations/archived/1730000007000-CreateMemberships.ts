import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMemberships1730000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'memberships',
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
            name: 'member_id',
            type: 'uuid',
          },
          {
            name: 'group_id',
            type: 'uuid',
          },
          {
            name: 'plan_id',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'expired', 'cancelled', 'suspended', 'trial'],
            default: "'active'",
          },
          {
            name: 'starts_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expires_at',
            type: 'timestamp',
          },
          {
            name: 'trial_ends_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'auto_renew',
            type: 'boolean',
            default: false,
          },
          {
            name: 'cancelled_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'cancellation_reason',
            type: 'text',
            isNullable: true,
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
            name: 'FK_memberships_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_memberships_member',
            columnNames: ['member_id'],
            referencedTableName: 'members',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_memberships_group',
            columnNames: ['group_id'],
            referencedTableName: 'telegram_groups',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_memberships_plan',
            columnNames: ['plan_id'],
            referencedTableName: 'membership_plans',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true
    );

    await queryRunner.query(`CREATE INDEX "IDX_memberships_tenant_id" ON "memberships" ("tenant_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_memberships_member_id" ON "memberships" ("member_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_memberships_group_id" ON "memberships" ("group_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_memberships_status" ON "memberships" ("status")`);

    await queryRunner.query(`CREATE INDEX "IDX_memberships_expires_at" ON "memberships" ("expires_at")`);

    await queryRunner.query(`CREATE UNIQUE INDEX "UNIQUE_memberships_member_group_active" ON "memberships" ("member_id", "group_id", "status") WHERE "status" IN ('active', 'trial')`);

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE memberships ENABLE ROW LEVEL SECURITY');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('memberships');
  }
}