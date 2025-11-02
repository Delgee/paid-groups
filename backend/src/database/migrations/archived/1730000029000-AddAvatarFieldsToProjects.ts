import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add avatar fields to projects table
 *
 * Adds bot_avatar_file_id and bot_avatar_url columns to store bot profile photo information.
 * These fields are populated during sync operations with Telegram API.
 */
export class AddAvatarFieldsToProjects1761637537000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check and add bot_avatar_file_id column
    const fileIdExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'bot_avatar_file_id'
      );
    `);

    if (!fileIdExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE projects
        ADD COLUMN bot_avatar_file_id varchar(255) NULL
      `);

      await queryRunner.query(`
        COMMENT ON COLUMN projects.bot_avatar_file_id IS 'Telegram file_id for bot profile photo'
      `);
    }

    // Check and add bot_avatar_url column
    const urlExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'bot_avatar_url'
      );
    `);

    if (!urlExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE projects
        ADD COLUMN bot_avatar_url text NULL
      `);

      await queryRunner.query(`
        COMMENT ON COLUMN projects.bot_avatar_url IS 'Full download URL for bot profile photo from Telegram CDN'
      `);
    }
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