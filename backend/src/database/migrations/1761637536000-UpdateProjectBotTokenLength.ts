import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Update bot_token column length for encryption
 *
 * Increases bot_token column from 255 to 500 characters to accommodate
 * encrypted tokens using AES-256-GCM encryption (iv:authTag:encrypted format).
 */
export class UpdateProjectBotTokenLength1761637536000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update bot_token column length to 500 for encrypted tokens
    await queryRunner.query(`
      ALTER TABLE projects
      ALTER COLUMN bot_token TYPE varchar(500)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to original length of 255
    // WARNING: This may fail if encrypted tokens exceed 255 chars
    await queryRunner.query(`
      ALTER TABLE projects
      ALTER COLUMN bot_token TYPE varchar(255)
    `);
  }
}
