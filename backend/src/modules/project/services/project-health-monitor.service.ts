import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Telegraf } from 'telegraf';
import { Project } from '../entities/project.entity';

export interface HealthCheck {
  healthy: boolean;
  message?: string;
  error?: string;
  timestamp: Date;
}

export interface ProjectHealthStatus {
  projectId: string;
  projectName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    responding: HealthCheck;
    webhook: HealthCheck;
    activity: HealthCheck;
  };
  lastCheck: Date;
}

/**
 * ProjectHealthMonitorService
 *
 * Monitors project health with scheduled checks:
 * - Bot responding (Telegram API connectivity)
 * - Webhook delivery
 * - Recent activity tracking
 *
 * Runs automatically every 5 minutes for all active projects.
 */
@Injectable()
export class ProjectHealthMonitorService {
  private readonly logger = new Logger(ProjectHealthMonitorService.name);
  private readonly healthCache = new Map<string, ProjectHealthStatus>();

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  /**
   * Scheduled health check for all active projects
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async monitorAllProjects(): Promise<void> {
    this.logger.log('Starting scheduled project health monitoring...');

    const activeProjects = await this.projectRepository.find({
      where: { is_active: true },
      relations: ['tenant'],
    });

    const monitoringPromises = activeProjects.map((project) =>
      this.monitorProjectHealth(project.id, project).catch((error) => {
        this.logger.error(`Failed to monitor project ${project.id}:`, error);
      }),
    );

    await Promise.allSettled(monitoringPromises);

    this.logger.log(
      `Completed health monitoring for ${activeProjects.length} projects`,
    );
  }

  /**
   * Monitor health status for a specific project
   */
  async monitorProjectHealth(
    projectId: string,
    project?: Project,
  ): Promise<ProjectHealthStatus> {
    try {
      if (!project) {
        project = await this.projectRepository.findOne({
          where: { id: projectId },
          relations: ['tenant'],
        });
      }

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const telegrafBot = new Telegraf(project.bot_token);

      // Run all health checks in parallel
      const [respondingCheck, webhookCheck, activityCheck] =
        await Promise.allSettled([
          this.checkBotResponding(telegrafBot),
          this.checkWebhookDelivery(telegrafBot, project),
          this.checkLastActivity(project),
        ]);

      const responding =
        respondingCheck.status === 'fulfilled'
          ? respondingCheck.value
          : { healthy: false, error: 'Health check failed', timestamp: new Date() };
      const webhook =
        webhookCheck.status === 'fulfilled'
          ? webhookCheck.value
          : { healthy: false, error: 'Webhook check failed', timestamp: new Date() };
      const activity =
        activityCheck.status === 'fulfilled'
          ? activityCheck.value
          : { healthy: false, error: 'Activity check failed', timestamp: new Date() };

      // Determine overall health status
      const overallHealthy =
        responding.healthy && webhook.healthy && activity.healthy;
      const degraded =
        (!responding.healthy || !webhook.healthy || !activity.healthy) &&
        (responding.healthy || webhook.healthy || activity.healthy);

      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (overallHealthy) {
        status = 'healthy';
      } else if (degraded) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      const healthStatus: ProjectHealthStatus = {
        projectId: project.id,
        projectName: project.display_name,
        status,
        checks: {
          responding,
          webhook,
          activity,
        },
        lastCheck: new Date(),
      };

      // Cache the health status
      this.healthCache.set(project.id, healthStatus);

      // If project is unhealthy, take action
      if (status === 'unhealthy') {
        await this.handleUnhealthyProject(project, healthStatus);
      }

      return healthStatus;
    } catch (error) {
      this.logger.error(`Error monitoring project ${projectId}:`, error);

      const errorStatus: ProjectHealthStatus = {
        projectId,
        projectName: 'Unknown',
        status: 'unhealthy',
        checks: {
          responding: { healthy: false, error: error.message, timestamp: new Date() },
          webhook: { healthy: false, error: 'Not checked', timestamp: new Date() },
          activity: { healthy: false, error: 'Not checked', timestamp: new Date() },
        },
        lastCheck: new Date(),
      };

      this.healthCache.set(projectId, errorStatus);
      return errorStatus;
    }
  }

  /**
   * Check if bot is responding to API calls
   */
  private async checkBotResponding(bot: Telegraf): Promise<HealthCheck> {
    try {
      const startTime = Date.now();
      const botInfo = await bot.telegram.getMe();
      const responseTime = Date.now() - startTime;

      if (responseTime > 5000) {
        // Slow response
        return {
          healthy: false,
          message: `Bot responding but slow (${responseTime}ms)`,
          timestamp: new Date(),
        };
      }

      return {
        healthy: true,
        message: `Bot @${botInfo.username} responding normally (${responseTime}ms)`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: `Bot not responding: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check webhook delivery status
   */
  private async checkWebhookDelivery(
    bot: Telegraf,
    project: Project,
  ): Promise<HealthCheck> {
    try {
      const webhookInfo = await bot.telegram.getWebhookInfo();

      if (!webhookInfo.url) {
        return {
          healthy: false,
          error: 'No webhook URL configured',
          timestamp: new Date(),
        };
      }

      // Check if webhook URL matches expected
      const expectedUrl = project.webhook_url;
      if (webhookInfo.url !== expectedUrl) {
        return {
          healthy: false,
          error: `Webhook URL mismatch. Expected: ${expectedUrl}, Got: ${webhookInfo.url}`,
          timestamp: new Date(),
        };
      }

      // Check if there are pending updates (indicates delivery issues)
      if (webhookInfo.pending_update_count && webhookInfo.pending_update_count > 100) {
        return {
          healthy: false,
          message: `High pending update count: ${webhookInfo.pending_update_count}`,
          timestamp: new Date(),
        };
      }

      // Check last error time
      if (webhookInfo.last_error_date) {
        const lastErrorDate = new Date(webhookInfo.last_error_date * 1000);
        const hoursSinceError = (Date.now() - lastErrorDate.getTime()) / (1000 * 60 * 60);

        if (hoursSinceError < 1) {
          return {
            healthy: false,
            error: `Recent webhook error: ${webhookInfo.last_error_message || 'Unknown'}`,
            timestamp: new Date(),
          };
        }
      }

      return {
        healthy: true,
        message: `Webhook operational. Pending updates: ${webhookInfo.pending_update_count || 0}`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: `Failed to check webhook: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check last activity timestamp
   */
  private async checkLastActivity(project: Project): Promise<HealthCheck> {
    try {
      const now = new Date();
      const lastUpdate = project.updated_at;
      const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      // If no activity in 7 days, consider stale
      if (hoursSinceUpdate > 24 * 7) {
        return {
          healthy: false,
          message: `No activity in ${Math.floor(hoursSinceUpdate / 24)} days`,
          timestamp: new Date(),
        };
      }

      // If no activity in 3 days, warn
      if (hoursSinceUpdate > 24 * 3) {
        return {
          healthy: false,
          message: `Low activity: last update ${Math.floor(hoursSinceUpdate / 24)} days ago`,
          timestamp: new Date(),
        };
      }

      return {
        healthy: true,
        message: `Active (last update ${Math.floor(hoursSinceUpdate)} hours ago)`,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: `Failed to check activity: ${error.message}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Handle unhealthy project (auto-disable if critical)
   */
  private async handleUnhealthyProject(
    project: Project,
    healthStatus: ProjectHealthStatus,
  ): Promise<void> {
    try {
      this.logger.warn(
        `Project ${project.id} (${project.display_name}) is unhealthy`,
        {
          status: healthStatus.status,
          checks: healthStatus.checks,
        },
      );

      // TODO: Implement auto-disable logic if project stays unhealthy for extended period
      // TODO: Send notifications to project owner
      // For now, just log the issue

      // You could update project settings with health status
      const updatedSettings = {
        ...project.settings,
        last_health_check: new Date().toISOString(),
        health_status: healthStatus.status,
        health_issues: Object.entries(healthStatus.checks)
          .filter(([_, check]) => !check.healthy)
          .map(([name, check]) => ({ name, error: check.error, message: check.message })),
      };

      await this.projectRepository.update(project.id, {
        settings: updatedSettings as Record<string, any>,
      });
    } catch (error) {
      this.logger.error(
        `Error handling unhealthy project ${project.id}:`,
        error,
      );
    }
  }

  /**
   * Get health status for a specific project
   */
  async getProjectHealthStatus(projectId: string): Promise<ProjectHealthStatus | null> {
    return this.healthCache.get(projectId) || null;
  }

  /**
   * Get health status for all monitored projects
   */
  async getAllProjectsHealthStatus(): Promise<ProjectHealthStatus[]> {
    return Array.from(this.healthCache.values());
  }

  /**
   * Force a health check for a specific project
   */
  async forceHealthCheck(projectId: string): Promise<ProjectHealthStatus> {
    this.logger.log(`Forcing health check for project ${projectId}`);
    return this.monitorProjectHealth(projectId);
  }

  /**
   * Get health summary statistics
   */
  async getHealthSummary(): Promise<{
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  }> {
    const all = Array.from(this.healthCache.values());

    return {
      total: all.length,
      healthy: all.filter((s) => s.status === 'healthy').length,
      degraded: all.filter((s) => s.status === 'degraded').length,
      unhealthy: all.filter((s) => s.status === 'unhealthy').length,
    };
  }
}
