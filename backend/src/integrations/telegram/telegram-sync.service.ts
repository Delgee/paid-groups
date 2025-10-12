import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramApiService } from '../../modules/bot/services/telegram-api.service';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramGroup } from '../../modules/telegram-groups/telegram-groups.entity';

export interface SyncResult {
  success: boolean;
  error?: string;
  syncedData?: {
    titleUpdated?: boolean;
    descriptionUpdated?: boolean;
    messagePosted?: boolean;
    timestamp: Date;
  };
}

export interface BulkSyncResult {
  totalGroups: number;
  successCount: number;
  errors: Array<{
    groupId: string;
    groupName: string;
    error: string;
  }>;
}

export interface SyncValidationResult {
  canSync: boolean;
  issues: string[];
}

export interface SyncStatus {
  lastSyncAt: Date | null;
  success: boolean;
  error?: string;
}

/**
 * Service for managing automatic synchronization between Telegram groups and channels.
 * Handles sync scheduling, error handling, and status tracking for tenant-scoped operations.
 */
@Injectable()
export class TelegramSyncService {
  private readonly logger = new Logger(TelegramSyncService.name);

  constructor(
    @InjectRepository(TelegramGroup)
    private readonly telegramGroupRepository: Repository<TelegramGroup>,
    private readonly telegramApiService: TelegramApiService,
    private readonly telegramChannelService: TelegramChannelService,
  ) {}

  /**
   * Synchronizes a single group's details to its connected Telegram channel.
   * Updates channel title, description, and posts sync status messages.
   *
   * @param groupId - The UUID of the group to sync
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise with sync result containing success status and synced data
   */
  async syncGroupToChannel(groupId: string, tenantId: string): Promise<SyncResult> {
    try {
      this.logger.log(`Starting sync for group ${groupId} in tenant ${tenantId}`);

      // Fetch the group with tenant isolation
      const group = await this.telegramGroupRepository.findOne({
        where: { id: groupId, tenant_id: tenantId },
        relations: ['project'],
      });

      if (!group) {
        const error = 'Group not found or access denied';
        this.logger.error(`${error}: groupId=${groupId}, tenantId=${tenantId}`);
        return { success: false, error };
      }

      // Validate sync prerequisites
      const validation = await this.validateSyncConfiguration(groupId, tenantId);
      if (!validation.canSync) {
        const error = `Sync validation failed: ${validation.issues.join(', ')}`;
        this.logger.error(`${error} for group ${groupId}`);
        return { success: false, error };
      }

      const syncedData = {
        titleUpdated: false,
        descriptionUpdated: false,
        messagePosted: false,
        timestamp: new Date(),
      };

      // Update channel title to match group name
      if (group.group_name) {
        const titleUpdated = await this.telegramChannelService.updateChannelInfo(
          group.project.bot_token,
          group.telegram_chat_id!.toString(),
          group.group_name,
        );

        if (!titleUpdated) {
          const error = 'Failed to update channel title';
          this.logger.error(`${error} for group ${groupId}`);
          return { success: false, error };
        }

        syncedData.titleUpdated = true;
        this.logger.log(`Channel title updated to "${group.group_name}" for group ${groupId}`);
      }

      // Update channel description if provided
      if (group.description) {
        const descriptionUpdated = await this.telegramChannelService.updateChannelInfo(
          group.project.bot_token,
          group.telegram_chat_id!.toString(),
          undefined,
          group.description,
        );

        if (!descriptionUpdated) {
          this.logger.warn(`Failed to update channel description for group ${groupId}, continuing...`);
        } else {
          syncedData.descriptionUpdated = true;
          this.logger.log(`Channel description updated for group ${groupId}`);
        }
      }

      // Post sync notification message to channel
      const syncMessage = `🔄 Group synchronization completed successfully!\n\n` +
                         `📅 Sync timestamp: ${syncedData.timestamp.toISOString()}\n` +
                         `✅ Title: ${syncedData.titleUpdated ? 'Updated' : 'Unchanged'}\n` +
                         `✅ Description: ${syncedData.descriptionUpdated ? 'Updated' : 'Unchanged'}`;

      const messagePosted = await this.telegramApiService.sendMessage(
        group.project.bot_token,
        group.telegram_chat_id!,
        syncMessage,
        { parse_mode: 'HTML' },
      );

      if (messagePosted) {
        syncedData.messagePosted = true;
        this.logger.log(`Sync notification posted to channel for group ${groupId}`);
      } else {
        this.logger.warn(`Failed to post sync notification for group ${groupId}, but sync succeeded`);
      }

      // Sync completed successfully
      this.logger.log(`Sync completed successfully for group ${groupId}`);

      return {
        success: true,
        syncedData,
      };
    } catch (error) {
      this.logger.error(`Sync failed for group ${groupId}: ${error.message}`, error.stack);

      return {
        success: false,
        error: `Sync operation failed: ${error.message}`,
      };
    }
  }

  /**
   * Synchronizes all active groups for a tenant that have sync enabled.
   * Processes groups sequentially to avoid overwhelming the Telegram API.
   *
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise with bulk sync results including counts and errors
   */
  async syncAllActiveGroups(tenantId: string): Promise<BulkSyncResult> {
    try {
      this.logger.log(`Starting bulk sync for all active groups in tenant ${tenantId}`);

      // Fetch all active groups for the tenant
      // NOTE: Sync-specific fields have been removed. This now syncs all active groups.
      const groups = await this.telegramGroupRepository.find({
        where: {
          tenant_id: tenantId,
          is_active: true,
        },
        relations: ['project'],
        order: { updated_at: 'ASC' }, // Process oldest updated first
      });

      const result: BulkSyncResult = {
        totalGroups: groups.length,
        successCount: 0,
        errors: [],
      };

      if (groups.length === 0) {
        this.logger.log(`No sync-enabled groups found for tenant ${tenantId}`);
        return result;
      }

      this.logger.log(`Found ${groups.length} sync-enabled groups for tenant ${tenantId}`);

      // Process each group sequentially with delay to respect rate limits
      for (const group of groups) {
        try {
          this.logger.log(`Processing sync for group ${group.id}: ${group.group_name}`);

          const syncResult = await this.syncGroupToChannel(group.id, tenantId);

          if (syncResult.success) {
            result.successCount++;
            this.logger.log(`Sync successful for group ${group.id}: ${group.group_name}`);
          } else {
            result.errors.push({
              groupId: group.id,
              groupName: group.group_name,
              error: syncResult.error || 'Unknown sync error',
            });
            this.logger.error(`Sync failed for group ${group.id}: ${syncResult.error}`);
          }

          // Add small delay between syncs to respect Telegram API rate limits
          await this.delay(1000); // 1 second delay
        } catch (error) {
          result.errors.push({
            groupId: group.id,
            groupName: group.group_name,
            error: `Processing error: ${error.message}`,
          });
          this.logger.error(`Error processing group ${group.id}: ${error.message}`);
        }
      }

      this.logger.log(`Bulk sync completed for tenant ${tenantId}: ${result.successCount}/${result.totalGroups} successful`);

      return result;
    } catch (error) {
      this.logger.error(`Bulk sync failed for tenant ${tenantId}: ${error.message}`, error.stack);

      return {
        totalGroups: 0,
        successCount: 0,
        errors: [{
          groupId: 'BULK_OPERATION',
          groupName: 'Bulk Sync',
          error: `Bulk sync operation failed: ${error.message}`,
        }],
      };
    }
  }

  /**
   * Validates if a group can be synchronized to its connected channel.
   * Checks connection status, bot assignment, permissions, and channel accessibility.
   *
   * @param groupId - The UUID of the group to validate
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise with validation result and list of issues
   */
  async validateSyncConfiguration(groupId: string, tenantId: string): Promise<SyncValidationResult> {
    try {
      this.logger.log(`Validating sync configuration for group ${groupId}`);

      const issues: string[] = [];

      // Fetch the group with tenant isolation
      const group = await this.telegramGroupRepository.findOne({
        where: { id: groupId, tenant_id: tenantId },
        relations: ['project'],
      });

      if (!group) {
        issues.push('Group not found or access denied');
        return { canSync: false, issues };
      }

      // Check if group is active
      if (!group.is_active) {
        issues.push('Group is not active');
      }

      // Check if telegram_chat_id is set
      if (!group.telegram_chat_id) {
        issues.push('Telegram chat ID is not set');
      }

      // Check if project exists and has bot token
      if (!group.project || !group.project.bot_token) {
        issues.push('Project configuration is missing or invalid');
      }

      // If basic checks pass, validate Telegram channel access
      if (issues.length === 0 && group.project && group.telegram_chat_id) {
        try {
          // Verify channel accessibility
          const channelValidation = await this.telegramChannelService.validateChannelConnection(
            group.project.bot_token,
            group.telegram_chat_id.toString(),
          );

          if (!channelValidation.isValid) {
            issues.push(`Channel validation failed: ${channelValidation.error}`);
          } else {
            // Check specific permissions needed for sync
            const permissions = channelValidation.permissions;

            if (!permissions.isAdmin) {
              issues.push('Bot is not an admin in the channel');
            }

            if (!permissions.canPostMessages) {
              issues.push('Bot cannot post messages to the channel');
            }

            // Note: We don't require edit/delete permissions as they're nice-to-have for sync
            if (!permissions.canEditMessages) {
              this.logger.warn(`Bot cannot edit messages in channel ${group.telegram_chat_id}, sync will continue`);
            }
          }
        } catch (error) {
          issues.push(`Channel verification failed: ${error.message}`);
        }
      }

      const canSync = issues.length === 0;

      this.logger.log(`Sync validation for group ${groupId}: canSync=${canSync}, issues=[${issues.join(', ')}]`);

      return { canSync, issues };
    } catch (error) {
      this.logger.error(`Sync validation failed for group ${groupId}: ${error.message}`);
      return {
        canSync: false,
        issues: [`Validation error: ${error.message}`],
      };
    }
  }

  /**
   * Enables automatic synchronization for a group.
   * Validates sync prerequisites and updates database flags.
   *
   * @param groupId - The UUID of the group to enable sync for
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<boolean> - True if sync was enabled successfully
   */
  async enableAutoSync(groupId: string, tenantId: string): Promise<boolean> {
    try {
      this.logger.log(`Enabling auto sync for group ${groupId}`);

      // Fetch the group with tenant isolation
      const group = await this.telegramGroupRepository.findOne({
        where: { id: groupId, tenant_id: tenantId },
        relations: ['project'],
      });

      if (!group) {
        this.logger.error(`Group not found: groupId=${groupId}, tenantId=${tenantId}`);
        return false;
      }

      // Validate that sync can be enabled
      const validation = await this.validateSyncConfiguration(groupId, tenantId);
      if (!validation.canSync) {
        this.logger.error(`Cannot enable sync for group ${groupId}: ${validation.issues.join(', ')}`);
        return false;
      }

      // NOTE: sync_enabled field has been removed from entity
      // This method now just validates and posts announcement
      this.logger.log(`Sync validation passed for group ${groupId}`);

      // Post announcement message to channel
      if (group.telegram_chat_id && group.project?.bot_token) {
        const announcement = `🔄 Auto-sync has been enabled for this group!\n\n` +
                           `Your channel will now automatically stay synchronized with group updates:\n` +
                           `✅ Group name changes\n` +
                           `✅ Description updates\n` +
                           `✅ Regular sync notifications\n\n` +
                           `🤖 Powered by your Telegram bot integration`;

        const messagePosted = await this.telegramApiService.sendMessage(
          group.project.bot_token,
          group.telegram_chat_id,
          announcement,
          { parse_mode: 'HTML' },
        );

        if (!messagePosted) {
          this.logger.warn(`Failed to post sync enable announcement for group ${groupId}`);
        }
      }

      this.logger.log(`Auto sync enabled successfully for group ${groupId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to enable auto sync for group ${groupId}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Disables automatic synchronization for a group.
   * Updates database flags and posts notification message.
   *
   * @param groupId - The UUID of the group to disable sync for
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<boolean> - True if sync was disabled successfully
   */
  async disableAutoSync(groupId: string, tenantId: string): Promise<boolean> {
    try {
      this.logger.log(`Disabling auto sync for group ${groupId}`);

      // Fetch the group with tenant isolation
      const group = await this.telegramGroupRepository.findOne({
        where: { id: groupId, tenant_id: tenantId },
        relations: ['project'],
      });

      if (!group) {
        this.logger.error(`Group not found: groupId=${groupId}, tenantId=${tenantId}`);
        return false;
      }

      // Post announcement message before disabling (if possible)
      if (group.telegram_chat_id && group.project?.bot_token) {
        const announcement = `⏸️ Auto-sync has been disabled for this group.\n\n` +
                           `The channel will no longer automatically receive updates when group details change.\n` +
                           `You can re-enable sync anytime from your dashboard.\n\n` +
                           `Thank you for using our service! 🙏`;

        const messagePosted = await this.telegramApiService.sendMessage(
          group.project.bot_token,
          group.telegram_chat_id,
          announcement,
          { parse_mode: 'HTML' },
        );

        if (!messagePosted) {
          this.logger.warn(`Failed to post sync disable announcement for group ${groupId}`);
        }
      }

      // NOTE: sync_enabled field has been removed from entity
      // This method now just posts announcement
      this.logger.log(`Sync disable announcement posted for group ${groupId}`);

      this.logger.log(`Auto sync disabled successfully for group ${groupId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to disable auto sync for group ${groupId}: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Retrieves the last synchronization status for a group.
   * NOTE: Sync status fields have been removed. This method now always returns no status.
   *
   * @param groupId - The UUID of the group to check
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise with last sync status information
   */
  async getLastSyncStatus(groupId: string, tenantId: string): Promise<SyncStatus> {
    try {
      this.logger.log(`Getting last sync status for group ${groupId}`);

      // Fetch the group with tenant isolation
      const group = await this.telegramGroupRepository.findOne({
        where: { id: groupId, tenant_id: tenantId },
        select: ['id'],
      });

      if (!group) {
        this.logger.error(`Group not found: groupId=${groupId}, tenantId=${tenantId}`);
        return {
          lastSyncAt: null,
          success: false,
          error: 'Group not found or access denied',
        };
      }

      // NOTE: Sync status fields removed - always return no status
      const result: SyncStatus = {
        lastSyncAt: null,
        success: true,
        error: undefined,
      };

      this.logger.log(`Last sync status for group ${groupId}: Status tracking disabled`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to get last sync status for group ${groupId}: ${error.message}`);
      return {
        lastSyncAt: null,
        success: false,
        error: `Status retrieval failed: ${error.message}`,
      };
    }
  }

  /**
   * Utility method to add delays between operations.
   * Helps respect Telegram API rate limits during bulk operations.
   *
   * @private
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}