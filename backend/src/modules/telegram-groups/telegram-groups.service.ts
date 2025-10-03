import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { TelegramGroup, GroupType, ConnectionStatus } from './telegram-groups.entity';
import { TelegramBot } from '../bot/entities/telegram-bot.entity';
import { TelegramApiService } from '../bot/services/telegram-api.service';
import { TelegramChannelService } from '../../integrations/telegram/telegram-channel.service';
import { TelegramSyncService } from '../../integrations/telegram/telegram-sync.service';
import { CreateTelegramGroupDto } from './dto/create-telegram-group.dto';
import { UpdateTelegramGroupDto } from './dto/update-telegram-group.dto';
import { ConnectChannelDto } from './dto/connect-channel.dto';
import { GetTelegramGroupsDto } from './dto/get-telegram-groups.dto';
import { PaginationDto, calculatePagination } from '../../common/dto';

export interface TelegramGroupsListResponse {
  data: TelegramGroup[];
  pagination: PaginationDto;
}

export interface ConnectChannelResponse {
  success: boolean;
  message: string;
  channel_info?: {
    id: string;
    type: string;
    title: string;
    username?: string | null;
    member_count?: number | null;
  };
  connection_status: ConnectionStatus;
}

export interface SyncResponse {
  success: boolean;
  error?: string;
  syncData?: {
    titleUpdated?: boolean;
    descriptionUpdated?: boolean;
    messagePosted?: boolean;
    timestamp: Date;
  };
}

/**
 * Service for managing Telegram Groups with comprehensive CRUD operations and business logic.
 * Handles tenant isolation, bot validation, channel connections, and synchronization operations.
 */
@Injectable()
export class TelegramGroupsService {
  private readonly logger = new Logger(TelegramGroupsService.name);

  constructor(
    @InjectRepository(TelegramGroup)
    private readonly telegramGroupRepository: Repository<TelegramGroup>,
    @InjectRepository(TelegramBot)
    private readonly telegramBotRepository: Repository<TelegramBot>,
    private readonly telegramApiService: TelegramApiService,
    private readonly telegramChannelService: TelegramChannelService,
    private readonly telegramSyncService: TelegramSyncService,
  ) {}

  /**
   * Creates a new Telegram group with validation and tenant isolation.
   * Validates bot existence and ownership before creating the group.
   *
   * @param createDto - The data for creating the telegram group
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<TelegramGroup> - The created telegram group with bot relation
   * @throws BadRequestException - When bot_id is invalid or doesn't belong to tenant
   * @throws ConflictException - When group name already exists for the tenant
   */
  async create(createDto: CreateTelegramGroupDto, tenantId: string): Promise<TelegramGroup> {
    try {
      this.logger.log(`Creating new telegram group: ${createDto.group_name} for tenant ${tenantId}`);

      // Validate that bot exists and belongs to tenant
      const bot = await this.telegramBotRepository.findOne({
        where: {
          id: createDto.bot_id,
          tenant_id: tenantId,
          is_active: true
        },
      });

      if (!bot) {
        throw new BadRequestException('Bot not found or not accessible for this tenant');
      }

      // Check for duplicate group name within tenant
      const existingGroup = await this.telegramGroupRepository.findOne({
        where: {
          group_name: createDto.group_name,
          tenant_id: tenantId,
          is_active: true
        },
      });

      if (existingGroup) {
        throw new ConflictException(`Group with name "${createDto.group_name}" already exists`);
      }

      // Create the telegram group
      const telegramGroup = this.telegramGroupRepository.create({
        group_name: createDto.group_name,
        description: createDto.description || null,
        bot_id: createDto.bot_id,
        tenant_id: tenantId,
        settings: createDto.settings || {},
        is_active: true,
        bot_assigned: false, // Will be set to true when channel is connected
        sync_enabled: false, // Disabled by default until channel connection
        connection_status: ConnectionStatus.PENDING,
        member_count: 0,
        group_type: GroupType.GROUP, // Default, will be updated on channel connection
      });

      const savedGroup = await this.telegramGroupRepository.save(telegramGroup);

      // Fetch with bot relation for response
      const groupWithBot = await this.telegramGroupRepository.findOne({
        where: { id: savedGroup.id },
        relations: ['bot'],
      });

      this.logger.log(`Telegram group created successfully: ${savedGroup.id} - ${createDto.group_name}`);

      return groupWithBot!;
    } catch (error) {
      this.logger.error(`Failed to create telegram group: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves all telegram groups for a tenant with optional filtering and pagination.
   * Supports filtering by sync status, connection status, and bot assignment.
   *
   * @param tenantId - The tenant UUID for isolation
   * @param query - Optional query parameters for filtering and pagination
   * @returns Promise<TelegramGroupsListResponse> - Paginated list of groups with metadata
   */
  async findAll(tenantId: string, query?: GetTelegramGroupsDto): Promise<TelegramGroupsListResponse> {
    try {
      this.logger.log(`Fetching telegram groups for tenant ${tenantId} with query:`, query);

      const page = query?.page || 1;
      const limit = Math.min(query?.limit || 20, 100); // Cap at 100 items per page
      const skip = (page - 1) * limit;

      // Build where conditions
      const whereConditions: any = {
        tenant_id: tenantId,
        is_active: true,
      };

      if (query?.sync_enabled !== undefined) {
        whereConditions.sync_enabled = query.sync_enabled;
      }

      if (query?.connection_status) {
        whereConditions.connection_status = query.connection_status;
      }

      if (query?.bot_assigned !== undefined) {
        whereConditions.bot_assigned = query.bot_assigned;
      }

      // Execute query with pagination
      const [groups, total] = await this.telegramGroupRepository.findAndCount({
        where: whereConditions,
        relations: ['bot'],
        order: {
          updated_at: 'DESC',
          created_at: 'DESC'
        },
        skip,
        take: limit,
      });

      this.logger.log(`Found ${total} telegram groups for tenant ${tenantId} (page ${page}/${Math.ceil(total / limit)})`);

      return {
        data: groups,
        pagination: calculatePagination(total, page, limit),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch telegram groups for tenant ${tenantId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Retrieves a single telegram group by ID with tenant isolation.
   * Includes bot relation for complete group information.
   *
   * @param id - The UUID of the telegram group
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<TelegramGroup | null> - The telegram group or null if not found
   */
  async findOne(id: string, tenantId: string): Promise<TelegramGroup | null> {
    try {
      this.logger.log(`Fetching telegram group ${id} for tenant ${tenantId}`);

      const group = await this.telegramGroupRepository.findOne({
        where: {
          id,
          tenant_id: tenantId,
          is_active: true
        },
        relations: ['bot'],
      });

      if (!group) {
        this.logger.warn(`Telegram group not found: id=${id}, tenantId=${tenantId}`);
        return null;
      }

      this.logger.log(`Found telegram group: ${group.id} - ${group.group_name}`);
      return group;
    } catch (error) {
      this.logger.error(`Failed to fetch telegram group ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Updates an existing telegram group with validation and tenant isolation.
   * Handles sync status changes and validates sync prerequisites when enabling sync.
   *
   * @param id - The UUID of the telegram group to update
   * @param updateDto - The data for updating the telegram group
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<TelegramGroup> - The updated telegram group
   * @throws NotFoundException - When group is not found
   * @throws BadRequestException - When sync cannot be enabled due to prerequisites
   */
  async update(id: string, updateDto: UpdateTelegramGroupDto, tenantId: string): Promise<TelegramGroup> {
    try {
      this.logger.log(`Updating telegram group ${id} for tenant ${tenantId}`);

      const group = await this.findOne(id, tenantId);
      if (!group) {
        throw new NotFoundException(`Telegram group with ID ${id} not found`);
      }

      // If sync_enabled is being changed, validate prerequisites
      if (updateDto.sync_enabled !== undefined && updateDto.sync_enabled !== group.sync_enabled) {
        if (updateDto.sync_enabled) {
          // Enabling sync - validate prerequisites
          const validation = await this.telegramSyncService.validateSyncConfiguration(id, tenantId);
          if (!validation.canSync) {
            throw new BadRequestException(
              `Cannot enable sync: ${validation.issues.join(', ')}`
            );
          }
        }
      }

      // Apply updates
      if (updateDto.group_name !== undefined) {
        // Check for duplicate name if changing
        if (updateDto.group_name !== group.group_name) {
          const existingGroup = await this.telegramGroupRepository.findOne({
            where: {
              group_name: updateDto.group_name,
              tenant_id: tenantId,
              is_active: true,
              id: Not(id) // Exclude current group from check
            },
          });

          if (existingGroup) {
            throw new ConflictException(`Group with name "${updateDto.group_name}" already exists`);
          }
        }
        group.group_name = updateDto.group_name;
      }

      if (updateDto.description !== undefined) {
        group.description = updateDto.description;
      }

      if (updateDto.settings !== undefined) {
        // Merge settings instead of replacing
        group.settings = { ...group.settings, ...updateDto.settings };
      }

      if (updateDto.sync_enabled !== undefined) {
        group.sync_enabled = updateDto.sync_enabled;
      }

      group.updated_at = new Date();

      const updatedGroup = await this.telegramGroupRepository.save(group);

      // If sync was enabled, trigger sync service enable
      if (updateDto.sync_enabled === true && !group.sync_enabled) {
        try {
          await this.telegramSyncService.enableAutoSync(id, tenantId);
          this.logger.log(`Auto-sync enabled for group ${id}`);
        } catch (syncError) {
          this.logger.error(`Failed to enable auto-sync for group ${id}: ${syncError.message}`);
          // Continue with update but log the error
        }
      }

      // If sync was disabled, trigger sync service disable
      if (updateDto.sync_enabled === false && group.sync_enabled) {
        try {
          await this.telegramSyncService.disableAutoSync(id, tenantId);
          this.logger.log(`Auto-sync disabled for group ${id}`);
        } catch (syncError) {
          this.logger.error(`Failed to disable auto-sync for group ${id}: ${syncError.message}`);
          // Continue with update but log the error
        }
      }

      this.logger.log(`Telegram group updated successfully: ${id} - ${updatedGroup.group_name}`);
      return updatedGroup;
    } catch (error) {
      this.logger.error(`Failed to update telegram group ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Soft deletes a telegram group by setting is_active to false.
   * Also disconnects from channel and disables sync operations.
   *
   * @param id - The UUID of the telegram group to remove
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<boolean> - True if successful, false otherwise
   * @throws NotFoundException - When group is not found
   */
  async remove(id: string, tenantId: string): Promise<boolean> {
    try {
      this.logger.log(`Removing telegram group ${id} for tenant ${tenantId}`);

      const group = await this.findOne(id, tenantId);
      if (!group) {
        throw new NotFoundException(`Telegram group with ID ${id} not found`);
      }

      // Disable sync first if enabled
      if (group.sync_enabled) {
        try {
          await this.telegramSyncService.disableAutoSync(id, tenantId);
          this.logger.log(`Sync disabled for group ${id} before removal`);
        } catch (syncError) {
          this.logger.warn(`Failed to disable sync before removal for group ${id}: ${syncError.message}`);
        }
      }

      // Disconnect from channel
      group.disconnectFromChannel();

      // Soft delete
      group.is_active = false;
      group.updated_at = new Date();

      await this.telegramGroupRepository.save(group);

      this.logger.log(`Telegram group removed successfully: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to remove telegram group ${id}: ${error.message}`, error.stack);
      if (error instanceof NotFoundException) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Connects a telegram group to a Telegram channel with bot permission verification.
   * Updates connection status, channel information, and bot assignment flags.
   *
   * @param id - The UUID of the telegram group to connect
   * @param connectDto - The channel connection data
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<ConnectChannelResponse> - Connection result with channel info or error
   * @throws NotFoundException - When group is not found
   */
  async connectChannel(id: string, connectDto: ConnectChannelDto, tenantId: string): Promise<ConnectChannelResponse> {
    try {
      this.logger.log(`Connecting channel for telegram group ${id}: ${connectDto.telegram_chat_id}`);

      const group = await this.findOne(id, tenantId);
      if (!group) {
        throw new NotFoundException(`Telegram group with ID ${id} not found`);
      }

      // Verify bot exists and has valid token
      if (!group.bot || !group.bot.bot_token) {
        return {
          success: false,
          message: 'Bot configuration is missing or invalid',
          connection_status: ConnectionStatus.FAILED,
        };
      }

      // Check if another group is already connected to this channel
      const existingConnection = await this.telegramGroupRepository.findOne({
        where: {
          telegram_chat_id: parseInt(connectDto.telegram_chat_id),
          tenant_id: tenantId,
          is_active: true,
          id: Not(id) // Exclude current group
        },
      });

      if (existingConnection) {
        return {
          success: false,
          message: `Channel is already connected to group "${existingConnection.group_name}"`,
          connection_status: ConnectionStatus.FAILED,
        };
      }

      // Connect to channel using channel service
      const connectionResult = await this.telegramChannelService.connectToChannel(
        group.bot.bot_token,
        connectDto.telegram_chat_id,
        connectDto.verify_permissions ?? true,
      );

      if (!connectionResult.success) {
        // Update group connection status to failed
        group.setConnectionFailed(connectionResult.error);
        await this.telegramGroupRepository.save(group);

        return {
          success: false,
          message: connectionResult.error || 'Failed to connect to channel',
          connection_status: ConnectionStatus.FAILED,
        };
      }

      // Update group with channel information
      const channelInfo = connectionResult.channelInfo!;

      group.connectToChannel(
        channelInfo.id,
        this.mapTelegramTypeToGroupType(channelInfo.type),
        channelInfo.username,
        connectDto.invite_link,
      );

      group.setBotAssigned(true);
      group.member_count = channelInfo.member_count || 0;

      const updatedGroup = await this.telegramGroupRepository.save(group);

      // Post welcome message to channel
      try {
        const welcomePosted = await this.telegramChannelService.postWelcomeMessage(
          group.bot.bot_token,
          connectDto.telegram_chat_id,
          group.group_name,
        );

        if (!welcomePosted) {
          this.logger.warn(`Failed to post welcome message to channel ${connectDto.telegram_chat_id}`);
        }
      } catch (welcomeError) {
        this.logger.warn(`Error posting welcome message: ${welcomeError.message}`);
      }

      this.logger.log(`Channel connected successfully for group ${id}: ${channelInfo.title}`);

      return {
        success: true,
        message: 'Channel connected successfully',
        channel_info: {
          id: channelInfo.id.toString(),
          type: channelInfo.type,
          title: channelInfo.title || '',
          username: channelInfo.username || null,
          member_count: channelInfo.member_count || null,
        },
        connection_status: ConnectionStatus.CONNECTED,
      };
    } catch (error) {
      this.logger.error(`Failed to connect channel for group ${id}: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        connection_status: ConnectionStatus.FAILED,
      };
    }
  }

  /**
   * Synchronizes a telegram group to its connected channel.
   * Triggers sync service to update channel title, description, and post notifications.
   *
   * @param id - The UUID of the telegram group to sync
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<SyncResponse> - Sync result with success status and sync data
   * @throws NotFoundException - When group is not found
   */
  async sync(id: string, tenantId: string): Promise<SyncResponse> {
    try {
      this.logger.log(`Starting sync for telegram group ${id}`);

      const group = await this.findOne(id, tenantId);
      if (!group) {
        throw new NotFoundException(`Telegram group with ID ${id} not found`);
      }

      // Validate sync prerequisites
      if (!group.canSync()) {
        return {
          success: false,
          error: 'Group cannot be synced: not connected or bot not assigned',
        };
      }

      // Trigger sync through sync service
      const syncResult = await this.telegramSyncService.syncGroupToChannel(id, tenantId);

      if (syncResult.success) {
        this.logger.log(`Sync completed successfully for group ${id}`);
        return {
          success: true,
          syncData: {
            titleUpdated: syncResult.syncedData?.titleUpdated,
            descriptionUpdated: syncResult.syncedData?.descriptionUpdated,
            messagePosted: syncResult.syncedData?.messagePosted,
            timestamp: syncResult.syncedData?.timestamp || new Date(),
          },
        };
      } else {
        this.logger.error(`Sync failed for group ${id}: ${syncResult.error}`);
        return {
          success: false,
          error: syncResult.error,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to sync telegram group ${id}: ${error.message}`, error.stack);

      if (error instanceof NotFoundException) {
        throw error;
      }

      return {
        success: false,
        error: `Sync operation failed: ${error.message}`,
      };
    }
  }

  /**
   * Maps Telegram chat type to internal GroupType enum.
   *
   * @private
   * @param telegramType - The Telegram chat type
   * @returns GroupType - The mapped internal group type
   */
  private mapTelegramTypeToGroupType(telegramType: string): GroupType {
    switch (telegramType) {
      case 'channel':
        return GroupType.CHANNEL;
      case 'supergroup':
        return GroupType.SUPERGROUP;
      case 'group':
      default:
        return GroupType.GROUP;
    }
  }
}