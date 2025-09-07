import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTenants1730000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    await queryRunner.createTable(
      new Table({
        name: 'tenants',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'company_name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'subscription_tier',
            type: 'enum',
            enum: ['free', 'starter', 'pro', 'enterprise'],
            default: "'free'",
          },
          {
            name: 'subscription_status',
            type: 'enum',
            enum: ['active', 'suspended', 'cancelled'],
            default: "'active'",
          },
          {
            name: 'max_bots',
            type: 'int',
            default: 1,
          },
          {
            name: 'max_groups_per_bot',
            type: 'int',
            default: 5,
          },
          {
            name: 'max_members',
            type: 'int',
            default: 1000,
          },
          {
            name: 'settings',
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
      }),
      true
    );

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_tenants_subscription_status" ON "tenants" ("subscription_status")`);
    await queryRunner.query(`CREATE INDEX "IDX_tenants_created_at" ON "tenants" ("created_at")`);

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE tenants ENABLE ROW LEVEL SECURITY');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('tenants');
  }
}