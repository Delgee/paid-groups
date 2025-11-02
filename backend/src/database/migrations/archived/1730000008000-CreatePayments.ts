import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreatePayments1730000008000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payments',
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
            isNullable: true,
          },
          {
            name: 'membership_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'qpay_invoice_id',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'qpay_payment_id',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'amount_mnt',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'MNT'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
            default: "'pending'",
          },
          {
            name: 'payment_method',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'paid_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'refunded_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'refund_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'webhook_event_id',
            type: 'varchar',
            length: '255',
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
            name: 'FK_payments_tenant',
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_payments_member',
            columnNames: ['member_id'],
            referencedTableName: 'members',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_payments_membership',
            columnNames: ['membership_id'],
            referencedTableName: 'memberships',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true
    );

    await queryRunner.query(`CREATE INDEX "IDX_payments_tenant_id" ON "payments" ("tenant_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_payments_member_id" ON "payments" ("member_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_payments_membership_id" ON "payments" ("membership_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_payments_status" ON "payments" ("status")`);

    await queryRunner.query(`CREATE INDEX "IDX_payments_qpay_invoice_id" ON "payments" ("qpay_invoice_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_payments_webhook_event_id" ON "payments" ("webhook_event_id")`);

    await queryRunner.query(`CREATE INDEX "IDX_payments_created_at" ON "payments" ("created_at")`);

    // Enable Row Level Security
    await queryRunner.query('ALTER TABLE payments ENABLE ROW LEVEL SECURITY');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payments');
  }
}