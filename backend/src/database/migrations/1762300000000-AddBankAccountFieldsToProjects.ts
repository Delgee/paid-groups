import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Add Bank Account Fields to Projects
 *
 * This migration adds bank account information to projects for QPay integration:
 * 1. account_bank_code: 6-digit bank code (e.g., "040000" for Худалдаа хөгжлийн банк)
 * 2. account_number: Bank account number
 * 3. account_name: Account holder name
 *
 * All fields are optional (nullable) to maintain backward compatibility.
 */
export class AddBankAccountFieldsToProjects1762300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add account_bank_code column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'account_bank_code',
        type: 'varchar',
        length: '6',
        isNullable: true,
        comment: 'Bank code for payment account (6-digit)',
      }),
    );

    // Add account_number column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'account_number',
        type: 'varchar',
        length: '50',
        isNullable: true,
        comment: 'Bank account number',
      }),
    );

    // Add account_name column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'account_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
        comment: 'Account holder name',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop columns in reverse order
    await queryRunner.dropColumn('projects', 'account_name');
    await queryRunner.dropColumn('projects', 'account_number');
    await queryRunner.dropColumn('projects', 'account_bank_code');
  }
}
