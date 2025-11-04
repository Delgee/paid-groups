import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Make Bank Account Fields Required in Projects
 *
 * This migration changes the bank account fields to be NOT NULL:
 * 1. account_bank_code: Required 6-digit bank code
 * 2. account_number: Required bank account number
 * 3. account_name: Required account holder name
 */
export class MakeBankAccountFieldsRequired1762300100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Alter columns to be NOT NULL
    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "account_bank_code" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "account_number" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "account_name" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert columns back to nullable
    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "account_name" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "account_number" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "projects"
      ALTER COLUMN "account_bank_code" DROP NOT NULL
    `);
  }
}
