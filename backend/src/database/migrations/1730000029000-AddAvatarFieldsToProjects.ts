import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add avatar fields to projects table
 *
 * Adds bot_avatar_file_id and bot_avatar_url columns to store bot profile photo information.
 * These fields are populated during sync operations with Telegram API.
 */
export class AddAvatarFieldsToProjects1761637537000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add bot_avatar_file_id column to store Telegram file_id
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN bot_avatar_file_id varchar(255) NULL
    `);

    // Add bot_avatar_url column to store full download URL
    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN bot_avatar_url text NULL
    `);

    // Add comment for documentation
    await queryRunner.query(`
      COMMENT ON COLUMN projects.bot_avatar_file_id IS 'Telegram file_id for bot profile photo'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN projects.bot_avatar_url IS 'Full download URL for bot profile photo from Telegram CDN'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove avatar columns
    await queryRunner.query(`
      ALTER TABLE projects
      DROP COLUMN IF EXISTS bot_avatar_url
    `);

    await queryRunner.query(`
      ALTER TABLE projects
      DROP COLUMN IF EXISTS bot_avatar_file_id
    `);
  }
}