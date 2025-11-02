import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePaymentTransactions1730000014000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_transactions',
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
            isNullable: false,
          },
          {
            name: 'membership_plan_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'bot_configuration_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'telegram_user_id',
            type: 'bigint',
            isNullable: false,
          },
          {
            name: 'telegram_username',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'telegram_first_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'telegram_last_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'snapshot_plan_name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'snapshot_price',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'snapshot_duration_days',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'completed', 'failed', 'refunded'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'qpay_invoice_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
            isUnique: true,
          },
          {
            name: 'qpay_transaction_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'qpay_payment_method',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'payment_link',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'membership_starts_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'membership_expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_payment_transactions_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_payment_transactions_plan',
            columnNames: ['membership_plan_id'],
            referencedTableName: 'membership_plans',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            name: 'FK_payment_transactions_bot',
            columnNames: ['bot_configuration_id'],
            referencedTableName: 'bot_configurations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        checks: [
          {
            name: 'CHK_payment_transactions_amount',
            expression: 'amount > 0',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_tenant" ON "payment_transactions" ("tenant_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_user" ON "payment_transactions" ("telegram_user_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_status" ON "payment_transactions" ("tenant_id", "status")`,
    );

    // Index on bot_configuration_id is commented out because this column will be replaced by project_id
    // in migration 1730000024000-UpdatePaymentTransactionsForProjects
    // await queryRunner.query(
    //   `CREATE INDEX "IDX_payment_transactions_bot" ON "payment_transactions" ("bot_configuration_id", "status")`,
    // );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_payment_transactions_qpay_invoice" ON "payment_transactions" ("qpay_invoice_id") WHERE qpay_invoice_id IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_expiration" ON "payment_transactions" ("membership_expires_at") WHERE status = 'completed' AND membership_expires_at IS NOT NULL`,
    );

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY');

    // Create RLS policies
    await queryRunner.query(`
      CREATE POLICY tenant_isolation_select ON payment_transactions
      FOR SELECT
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_insert ON payment_transactions
      FOR INSERT
      WITH CHECK (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_update ON payment_transactions
      FOR UPDATE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);

    await queryRunner.query(`
      CREATE POLICY tenant_isolation_delete ON payment_transactions
      FOR DELETE
      USING (tenant_id::text = current_setting('app.current_tenant', true))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop RLS policies
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_select ON payment_transactions`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_insert ON payment_transactions`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_update ON payment_transactions`);
    await queryRunner.query(`DROP POLICY IF EXISTS tenant_isolation_delete ON payment_transactions`);

    // Drop table (indexes and foreign keys are dropped automatically)
    await queryRunner.dropTable('payment_transactions');
  }
}
