import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Revert bot_token column to plaintext storage
 *
 * Reverts bot_token column from 500 to 255 characters as encryption is no longer used.
 * Bot tokens will be stored as plaintext for direct use with Telegram API.
 *
 * NOTE: This migration assumes all existing encrypted tokens have been decrypted.
 * If there are encrypted tokens in the database, they will need to be decrypted first.
 */
export class RevertProjectBotTokenToPlaintext1761650000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Revert bot_token column length to 255 (original length for plaintext tokens)
    await queryRunner.query(`
      ALTER TABLE projects
      ALTER COLUMN bot_token TYPE varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-increase to 500 if rollback is needed
    await queryRunner.query(`
      ALTER TABLE projects
      ALTER COLUMN bot_token TYPE varchar(500)
    `);
  }
}
