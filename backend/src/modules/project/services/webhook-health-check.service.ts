import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Project } from '../entities/project.entity';
import { ProjectWebhookService } from './project-webhook.service';

export interface WebhookHealthCheckResult {
  totalProjects: number;
  checkedProjects: number;
  healthyWebhooks: number;
  mismatchedWebhooks: number;
  missingWebhooks: number;
  failedChecks: number;
  details: Array<{
    projectId: string;
    tenantId: string;
    status: 'healthy' | 'mismatched' | 'missing' | 'failed';
    message: string;
  }>;
}

/**
 * WebhookHealthCheckService
 *
 * Validates webhook configurations for all projects on startup.
 * Ensures webhook URLs match the current BASE_URL configuration.
 */
@Injectable()
export class WebhookHealthCheckService implements OnModuleInit {
  private readonly logger = new Logger(WebhookHealthCheckService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly webhookService: ProjectWebhookService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Run health check on module initialization
   */
  async onModuleInit() {
    const runOnStartup = this.configService.get<boolean>(
      'WEBHOOK_HEALTH_CHECK_ON_STARTUP',
      true,
    );

    if (runOnStartup) {
      this.logger.log('Running webhook health check on startup...');
      try {
        // Check onboarding bot webhook first
        await this.checkOnboardingBotWebhook();

        // Check project webhooks
        const result = await this.checkAllWebhooks();
        this.logHealthCheckSummary(result);

        // Auto-fix mismatched webhooks if enabled (default: true)
        const autoFix = this.configService.get<boolean>(
          'WEBHOOK_AUTO_FIX_ON_STARTUP',
          true,
        );

        if (autoFix && result.mismatchedWebhooks > 0) {
          this.logger.log(
            `Auto-fixing ${result.mismatchedWebhooks} mismatched webhooks...`,
          );
          const fixedCount = await this.fixMismatchedWebhooks();
          this.logger.log(
            `✅ Successfully fixed ${fixedCount} out of ${result.mismatchedWebhooks} mismatched webhooks`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Webhook health check failed: ${error.message}`,
          error.stack,
        );
      }
    } else {
      this.logger.debug('Webhook health check on startup is disabled');
    }
  }

  /**
   * Check all project webhooks
   */
  async checkAllWebhooks(): Promise<WebhookHealthCheckResult> {
    const projects = await this.projectRepository.find({
      where: { is_active: true },
      select: ['id', 'tenant_id', 'webhook_url', 'webhook_secret', 'bot_token'],
    });

    const result: WebhookHealthCheckResult = {
      totalProjects: projects.length,
      checkedProjects: 0,
      healthyWebhooks: 0,
      mismatchedWebhooks: 0,
      missingWebhooks: 0,
      failedChecks: 0,
      details: [],
    };

    const baseUrl = this.configService.get<string>('BASE_URL');

    if (!baseUrl) {
      this.logger.error('BASE_URL is not configured, skipping health check');
      return result;
    }

    for (const project of projects) {
      result.checkedProjects++;

      try {
        // Check if webhook URL is missing
        if (!project.webhook_url || !project.webhook_secret) {
          result.missingWebhooks++;
          result.details.push({
            projectId: project.id,
            tenantId: project.tenant_id,
            status: 'missing',
            message: 'Webhook URL or secret is not configured',
          });
          continue;
        }

        // Check if webhook URL matches current BASE_URL
        const expectedWebhookUrl = this.webhookService.generateWebhookUrl(
          project.tenant_id,
          project.id,
        );

        if (project.webhook_url !== expectedWebhookUrl) {
          result.mismatchedWebhooks++;
          result.details.push({
            projectId: project.id,
            tenantId: project.tenant_id,
            status: 'mismatched',
            message: `Webhook URL mismatch. Expected: ${expectedWebhookUrl}, Got: ${project.webhook_url}`,
          });
          continue;
        }

        // Optionally verify with Telegram API (disabled by default to avoid rate limits)
        const verifyWithTelegram = this.configService.get<boolean>(
          'WEBHOOK_VERIFY_WITH_TELEGRAM',
          false,
        );

        if (verifyWithTelegram && project.bot_token) {
          const verification = await this.webhookService.verifyWebhook(
            project.bot_token,
            expectedWebhookUrl,
          );

          if (!verification.isValid) {
            result.mismatchedWebhooks++;
            result.details.push({
              projectId: project.id,
              tenantId: project.tenant_id,
              status: 'mismatched',
              message: `Telegram webhook verification failed. Current: ${verification.currentUrl || '(not set)'}, Expected: ${expectedWebhookUrl}`,
            });
            continue;
          }
        }

        // Webhook is healthy
        result.healthyWebhooks++;
        result.details.push({
          projectId: project.id,
          tenantId: project.tenant_id,
          status: 'healthy',
          message: 'Webhook configuration is valid',
        });
      } catch (error) {
        result.failedChecks++;
        result.details.push({
          projectId: project.id,
          tenantId: project.tenant_id,
          status: 'failed',
          message: `Health check failed: ${error.message}`,
        });
        this.logger.error(
          `Failed to check webhook for project ${project.id}: ${error.message}`,
        );
      }
    }

    return result;
  }

  /**
   * Fix mismatched webhooks by regenerating and updating them
   */
  async fixMismatchedWebhooks(): Promise<number> {
    const projects = await this.projectRepository.find({
      where: { is_active: true },
      select: ['id', 'tenant_id', 'webhook_url', 'bot_token'],
    });

    let fixedCount = 0;

    for (const project of projects) {
      try {
        if (!project.webhook_url || !project.bot_token) {
          continue;
        }

        const expectedWebhookUrl = this.webhookService.generateWebhookUrl(
          project.tenant_id,
          project.id,
        );

        if (project.webhook_url !== expectedWebhookUrl) {
          // Refresh webhook
          const result = await this.webhookService.refreshWebhook(
            project.bot_token,
            project.tenant_id,
            project.id,
          );

          if (result.success) {
            // Update project
            await this.projectRepository.update(project.id, {
              webhook_url: result.webhookUrl,
              webhook_secret: result.webhookSecret,
            });

            fixedCount++;
            this.logger.log(
              `Fixed webhook for project ${project.id}: ${result.webhookUrl}`,
            );
          } else {
            this.logger.warn(
              `Failed to fix webhook for project ${project.id}: ${result.error}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error fixing webhook for project ${project.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Fixed ${fixedCount} mismatched webhooks`);
    return fixedCount;
  }

  /**
   * Log health check summary
   */
  private logHealthCheckSummary(result: WebhookHealthCheckResult): void {
    this.logger.log('=== Webhook Health Check Summary ===');
    this.logger.log(`Total Projects: ${result.totalProjects}`);
    this.logger.log(`Checked Projects: ${result.checkedProjects}`);
    this.logger.log(`✅ Healthy Webhooks: ${result.healthyWebhooks}`);
    this.logger.log(`⚠️  Mismatched Webhooks: ${result.mismatchedWebhooks}`);
    this.logger.log(`❌ Missing Webhooks: ${result.missingWebhooks}`);
    this.logger.log(`💥 Failed Checks: ${result.failedChecks}`);
    this.logger.log('===================================');

    // Log detailed issues if any
    const issues = result.details.filter(
      (d) => d.status !== 'healthy',
    );

    if (issues.length > 0) {
      this.logger.warn(`Found ${issues.length} webhook issues:`);
      issues.forEach((issue) => {
        this.logger.warn(
          `  - Project ${issue.projectId} (${issue.status}): ${issue.message}`,
        );
      });
    }
  }

  /**
   * Manual trigger for health check (can be called via admin endpoint)
   */
  async runManualCheck(): Promise<WebhookHealthCheckResult> {
    this.logger.log('Running manual webhook health check...');
    const result = await this.checkAllWebhooks();
    this.logHealthCheckSummary(result);
    return result;
  }

  /**
   * Check and fix onboarding bot webhook
   */
  async checkOnboardingBotWebhook(): Promise<void> {
    const botToken = this.configService.get<string>(
      'TELEGRAM_ONBOARDING_BOT_TOKEN',
    );

    if (!botToken) {
      this.logger.warn(
        '⚠️  TELEGRAM_ONBOARDING_BOT_TOKEN not configured, skipping onboarding bot webhook check',
      );
      return;
    }

    const baseUrl = this.configService.get<string>('BASE_URL');

    if (!baseUrl) {
      this.logger.error(
        '❌ BASE_URL not configured, cannot check onboarding bot webhook',
      );
      return;
    }

    // Generate expected webhook URL
    const expectedWebhookUrl = `${baseUrl}/v1/onboarding-bot/webhook/${botToken}`;

    try {
      this.logger.log('🔍 Checking onboarding bot webhook...');

      // Check if Telegram verification is enabled (disabled by default to avoid rate limits and ngrok issues)
      const verifyWithTelegram = this.configService.get<boolean>(
        'WEBHOOK_VERIFY_WITH_TELEGRAM',
        false,
      );

      if (!verifyWithTelegram) {
        this.logger.debug(
          `⏭️  Telegram webhook verification is disabled. Expected webhook URL: ${expectedWebhookUrl}`,
        );
        return;
      }

      // Verify current webhook with Telegram API
      const verification = await this.webhookService.verifyWebhook(
        botToken,
        expectedWebhookUrl,
      );

      if (verification.isValid) {
        this.logger.log(
          `✅ Onboarding bot webhook is healthy: ${verification.currentUrl}`,
        );
        return;
      }

      // Webhook mismatch detected
      this.logger.warn(
        `⚠️  Onboarding bot webhook mismatch detected. Expected: ${expectedWebhookUrl}, Current: ${verification.currentUrl || '(not set)'}`,
      );

      // Auto-fix if enabled
      const autoFix = this.configService.get<boolean>(
        'WEBHOOK_AUTO_FIX_ON_STARTUP',
        true,
      );

      if (autoFix) {
        this.logger.log('🔧 Auto-fixing onboarding bot webhook...');

        // Set the correct webhook
        const result = await this.webhookService.setWebhook(
          botToken,
          expectedWebhookUrl,
        );

        if (result.success) {
          this.logger.log(
            `✅ Successfully fixed onboarding bot webhook: ${expectedWebhookUrl}`,
          );
        } else {
          this.logger.error(
            `❌ Failed to fix onboarding bot webhook: ${result.error}`,
          );
        }
      } else {
        this.logger.warn(
          '⚠️  Auto-fix is disabled. Please manually update the onboarding bot webhook.',
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to check onboarding bot webhook: ${error.message}`,
        error.stack,
      );
    }
  }
}
