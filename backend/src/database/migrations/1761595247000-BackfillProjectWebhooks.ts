import { MigrationInterface, QueryRunner } from 'typeorm';
import * as crypto from 'crypto';

/**
 * BackfillProjectWebhooks Migration
 *
 * This migration updates existing projects that don't have webhook_url or webhook_secret configured.
 * It generates webhook URLs based on the BASE_URL environment variable pattern and creates secure secrets.
 *
 * Pattern: {BASE_URL}/v1/projects/webhook/{tenant_id}/{project_id}
 */
export class BackfillProjectWebhooks1761595247000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Starting webhook backfill for existing projects...');

    // Get BASE_URL from environment
    const baseUrl = process.env.BASE_URL;

    if (!baseUrl) {
      console.warn(
        'BASE_URL not set in environment. Skipping webhook backfill. ' +
          'Run this migration again after setting BASE_URL or use the /webhook/refresh endpoint.',
      );
      return;
    }

    console.log(`Using BASE_URL: ${baseUrl}`);

    // Find all active projects without webhook configuration
    const projects = await queryRunner.query(`
      SELECT id, tenant_id, webhook_url, webhook_secret
      FROM projects
      WHERE is_active = true
        AND (webhook_url IS NULL OR webhook_url = '' OR webhook_secret IS NULL OR webhook_secret = '')
    `);

    console.log(`Found ${projects.length} projects needing webhook configuration`);

    let updatedCount = 0;

    for (const project of projects) {
      try {
        // Generate webhook URL
        const webhookUrl = `${baseUrl}/v1/projects/webhook/${project.tenant_id}/${project.id}`;

        // Generate secure webhook secret (64 character hex string)
        const webhookSecret = crypto.randomBytes(32).toString('hex');

        // Update project
        await queryRunner.query(
          `
          UPDATE projects
          SET webhook_url = $1, webhook_secret = $2
          WHERE id = $3
        `,
          [webhookUrl, webhookSecret, project.id],
        );

        updatedCount++;
        console.log(
          `✅ Updated project ${project.id}: ${webhookUrl}`,
        );
      } catch (error) {
        console.error(
          `❌ Failed to update project ${project.id}: ${error.message}`,
        );
      }
    }

    console.log(`Migration complete. Updated ${updatedCount}/${projects.length} projects.`);
    console.log(
      '\n⚠️  IMPORTANT: After this migration, you must register these webhooks with Telegram API.',
    );
    console.log(
      'Use POST /v1/projects/:id/webhook/refresh endpoint for each project to complete the setup.',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Rolling back webhook backfill...');

    // This is a data migration - we don't remove the generated webhooks on rollback
    // as they might already be in use. Instead, we just log a warning.
    console.warn(
      'This migration does not support automatic rollback of webhook data.',
    );
    console.warn(
      'If you need to remove webhook configurations, do so manually or via API.',
    );
  }
}
