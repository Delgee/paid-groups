import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { Project } from '../entities/project.entity';
import * as crypto from 'crypto';

export interface SecurityAlert {
  type: 'WEBHOOK_TAMPERED' | 'SUSPICIOUS_ACTIVITY' | 'BOT_IDENTITY_CHANGED' | 'TOKEN_REVOKED';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
}

interface ActivityPattern {
  suspicious: boolean;
  reason?: string;
  score: number; // 0-100, higher is more suspicious
  indicators: string[];
}

/**
 * ProjectSecurityService
 *
 * Provides security monitoring and tampering detection for projects.
 * Features:
 * - Webhook tampering detection
 * - Bot identity change monitoring
 * - Suspicious activity analysis
 * - Webhook signature verification
 */
@Injectable()
export class ProjectSecurityService {
  private readonly logger = new Logger(ProjectSecurityService.name);
  private readonly activityCache = new Map<string, any>();

  constructor(
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    private configService: ConfigService,
  ) {}

  /**
   * Detect security issues for a project
   */
  async detectTampering(projectId: string): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];

    try {
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
        relations: ['tenant'],
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const telegrafBot = new Telegraf(project.bot_token);

      // Run all security checks
      const [webhookAlert, activityAlert, identityAlert] =
        await Promise.allSettled([
          this.checkWebhookTampering(telegrafBot, project),
          this.checkSuspiciousActivity(project),
          this.checkBotIdentityChanges(telegrafBot, project),
        ]);

      // Collect alerts from settled promises
      if (webhookAlert.status === 'fulfilled' && webhookAlert.value) {
        alerts.push(webhookAlert.value);
      }
      if (activityAlert.status === 'fulfilled' && activityAlert.value) {
        alerts.push(activityAlert.value);
      }
      if (identityAlert.status === 'fulfilled' && identityAlert.value) {
        alerts.push(identityAlert.value);
      }

      // Check for failed promises and create alerts
      if (webhookAlert.status === 'rejected') {
        alerts.push({
          type: 'WEBHOOK_TAMPERED',
          message: `Failed to check webhook: ${webhookAlert.reason}`,
          severity: 'MEDIUM',
          timestamp: new Date(),
        });
      }

      return alerts;
    } catch (error) {
      this.logger.error(`Security check failed for project ${projectId}:`, error);
      return [
        {
          type: 'TOKEN_REVOKED',
          message: `Security check failed: ${error.message}`,
          severity: 'HIGH',
          timestamp: new Date(),
        },
      ];
    }
  }

  /**
   * Check if webhook configuration has been tampered with externally
   */
  private async checkWebhookTampering(
    bot: Telegraf,
    project: Project,
  ): Promise<SecurityAlert | null> {
    try {
      const webhookInfo = await bot.telegram.getWebhookInfo();
      const baseUrl = this.configService.get<string>('BASE_URL');
      const expectedWebhook = `${baseUrl}/v1/projects/webhook/${project.tenant_id}/${project.id}`;

      // Check if webhook was changed externally
      if (webhookInfo.url && webhookInfo.url !== expectedWebhook) {
        // Also check if it's empty (webhook was deleted)
        if (webhookInfo.url === '') {
          return {
            type: 'WEBHOOK_TAMPERED',
            message:
              'Webhook was removed externally - bot will not receive updates',
            severity: 'HIGH',
            timestamp: new Date(),
          };
        }

        return {
          type: 'WEBHOOK_TAMPERED',
          message: `Webhook URL was changed externally. Expected: ${expectedWebhook}, Found: ${webhookInfo.url}`,
          severity: 'HIGH',
          timestamp: new Date(),
        };
      }

      // Check webhook secret if we have one stored
      if (project.webhook_secret && webhookInfo.has_custom_certificate) {
        // This is a basic check - Telegram doesn't expose the secret for comparison
        this.logger.debug(
          'Webhook has custom certificate, secret may have been changed',
        );
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to check webhook tampering:', error);
      throw error;
    }
  }

  /**
   * Analyze activity patterns for suspicious behavior
   */
  private async checkSuspiciousActivity(
    project: Project,
  ): Promise<SecurityAlert | null> {
    try {
      const activityPattern = await this.analyzeActivityPattern(project);

      if (activityPattern.suspicious && activityPattern.score > 70) {
        return {
          type: 'SUSPICIOUS_ACTIVITY',
          message: `Suspicious activity detected: ${activityPattern.reason}. Indicators: ${activityPattern.indicators.join(', ')}`,
          severity: activityPattern.score > 85 ? 'HIGH' : 'MEDIUM',
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to check suspicious activity:', error);
      return null;
    }
  }

  /**
   * Analyze project activity patterns for anomalies
   */
  private async analyzeActivityPattern(
    project: Project,
  ): Promise<ActivityPattern> {
    const indicators: string[] = [];
    let score = 0;

    // Check update frequency
    const now = new Date();
    const lastUpdate = project.updated_at;
    const timeSinceUpdate = now.getTime() - lastUpdate.getTime();

    // Very recent updates could indicate tampering
    if (timeSinceUpdate < 60000) {
      // Less than 1 minute ago
      indicators.push('Very recent configuration changes');
      score += 20;
    }

    // Check if project was updated outside business hours (potential compromise)
    const updateHour = lastUpdate.getHours();
    if (updateHour < 6 || updateHour > 22) {
      // Outside 6 AM - 10 PM
      indicators.push('Updates outside business hours');
      score += 15;
    }

    // Check settings changes
    const settings = project.settings || {};
    if (settings.last_manual_update) {
      const lastManualUpdate = new Date(settings.last_manual_update);
      const timeSinceManual = now.getTime() - lastManualUpdate.getTime();

      if (timeSinceUpdate < timeSinceManual && timeSinceUpdate < 300000) {
        // Updated after manual update within 5 mins
        indicators.push('Automatic updates after manual changes');
        score += 25;
      }
    }

    // Check for rapid successive updates
    const cached = this.activityCache.get(project.id);
    if (cached && cached.lastCheck) {
      const timeBetweenChecks = now.getTime() - cached.lastCheck.getTime();
      if (timeBetweenChecks < 300000 && cached.updateCount > 3) {
        // More than 3 updates in 5 minutes
        indicators.push('Rapid successive updates');
        score += 30;
      }
    }

    // Update activity cache
    this.activityCache.set(project.id, {
      lastCheck: now,
      updateCount: cached ? (cached.updateCount || 0) + 1 : 1,
      lastUpdateTime: lastUpdate,
    });

    return {
      suspicious: score > 50,
      reason:
        score > 50 ? 'Multiple suspicious indicators detected' : undefined,
      score,
      indicators,
    };
  }

  /**
   * Check for bot identity changes (username or name changes)
   */
  private async checkBotIdentityChanges(
    bot: Telegraf,
    project: Project,
  ): Promise<SecurityAlert | null> {
    try {
      const currentInfo = await bot.telegram.getMe();
      const storedUsername = project.bot_username;

      // Check if bot username changed
      if (storedUsername && currentInfo.username !== storedUsername) {
        // Update our records
        const updatedSettings = {
          ...project.settings,
          identity_change_detected: new Date().toISOString(),
          previous_username: storedUsername,
        };

        await this.projectRepository.update(project.id, {
          bot_username: currentInfo.username,
          settings: updatedSettings as Record<string, any>,
        });

        return {
          type: 'BOT_IDENTITY_CHANGED',
          message: `Bot username changed from @${storedUsername} to @${currentInfo.username}`,
          severity: 'HIGH',
          timestamp: new Date(),
        };
      }

      // Check if bot name changed significantly
      const storedName = project.display_name;
      if (storedName && currentInfo.first_name !== storedName) {
        const similarity = this.calculateStringSimilarity(
          storedName,
          currentInfo.first_name,
        );

        if (similarity < 0.7) {
          // Less than 70% similar
          const updatedSettings = {
            ...project.settings,
            name_change_detected: new Date().toISOString(),
            previous_name: storedName,
          };

          await this.projectRepository.update(project.id, {
            display_name: currentInfo.first_name,
            settings: updatedSettings as Record<string, any>,
          });

          return {
            type: 'BOT_IDENTITY_CHANGED',
            message: `Bot name changed from "${storedName}" to "${currentInfo.first_name}"`,
            severity: 'MEDIUM',
            timestamp: new Date(),
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to check bot identity changes:', error);
      throw error;
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1, // substitution
            matrix[j][i - 1] + 1, // insertion
            matrix[j - 1][i] + 1, // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Verify webhook signature using HMAC SHA-256
   */
  async verifyWebhookSignature(
    payload: any,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
      );
    } catch (error) {
      this.logger.error('Failed to verify webhook signature:', error);
      return false;
    }
  }

  /**
   * Audit project access for security logging
   */
  async auditProjectAccess(
    projectId: string,
    action: string,
    userId?: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Project audit: ${action} on project ${projectId} by user ${userId} from ${ipAddress}`,
      );

      // TODO: Store audit logs in database
      // This would integrate with your audit log system
    } catch (error) {
      this.logger.error(`Failed to audit project access for ${projectId}:`, error);
    }
  }

  /**
   * Check bot permissions
   */
  async checkBotPermissions(
    botToken: string,
    requiredPermissions: string[],
  ): Promise<{ granted: boolean; missing: string[] }> {
    try {
      const bot = new Telegraf(botToken);
      const botInfo = await bot.telegram.getMe();

      const missing: string[] = [];

      // Check basic permissions
      if (
        requiredPermissions.includes('can_join_groups') &&
        !botInfo.can_join_groups
      ) {
        missing.push('can_join_groups');
      }

      if (
        requiredPermissions.includes('can_read_all_group_messages') &&
        !botInfo.can_read_all_group_messages
      ) {
        missing.push('can_read_all_group_messages');
      }

      if (
        requiredPermissions.includes('supports_inline_queries') &&
        !botInfo.supports_inline_queries
      ) {
        missing.push('supports_inline_queries');
      }

      return {
        granted: missing.length === 0,
        missing,
      };
    } catch (error) {
      this.logger.error('Failed to check bot permissions:', error);
      return {
        granted: false,
        missing: requiredPermissions,
      };
    }
  }

  /**
   * Clean up activity cache periodically (call this from a scheduled job)
   */
  cleanupActivityCache(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [projectId, data] of this.activityCache.entries()) {
      if (data.lastCheck && now - data.lastCheck.getTime() > maxAge) {
        this.activityCache.delete(projectId);
      }
    }
  }
}
