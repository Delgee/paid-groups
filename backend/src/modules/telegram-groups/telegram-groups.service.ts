import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { TelegramGroup, GroupType } from './telegram-groups.entity';
import { Project } from '../project/entities/project.entity';
import { TelegramApiService } from '../../integrations/telegram/telegram-api.service';
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
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly telegramApiService: TelegramApiService,
    private readonly telegramChannelService: TelegramChannelService,
    private readonly telegramSyncService: TelegramSyncService,
  ) {}

  /**
   * Creates a new Telegram group with validation and tenant isolation.
   * Validates project existence, ownership, and bot permissions before creating the group.
   *
   * If telegram_chat_id is provided, the bot's admin permissions in the specified channel
   * will be validated before creating the group. This ensures the bot can manage the channel
   * from the start.
   *
   * @param createDto - The data for creating the telegram group
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<TelegramGroup> - The created telegram group with project relation and channel info
   * @throws BadRequestException - When project_id is invalid, doesn't belong to tenant, or bot lacks permissions
   * @throws ConflictException - When group name already exists for the tenant
   */
  async create(
    createDto: CreateTelegramGroupDto,
    tenantId: string,
  ): Promise<TelegramGroup> {
    try {
      this.logger.log(
        `Creating new telegram group: ${createDto.group_name} for tenant ${tenantId}`,
      );

      // Validate that project exists and belongs to tenant
      const project = await this.projectRepository.findOne({
        where: {
          id: createDto.project_id,
          tenant_id: tenantId,
          is_active: true,
        },
      });

      if (!project) {
        throw new BadRequestException(
          'Project not found or not accessible for this tenant',
        );
      }

      // Validate bot token exists
      if (!project.bot_token) {
        throw new BadRequestException(
          'Project does not have a valid bot token configured',
        );
      }

      // Check for duplicate group name within tenant
      const existingGroup = await this.telegramGroupRepository.findOne({
        where: {
          group_name: createDto.group_name,
          tenant_id: tenantId,
          is_active: true,
        },
      });

      if (existingGroup) {
        throw new ConflictException(
          `Group with name "${createDto.group_name}" already exists`,
        );
      }

      // Parse telegram_chat_id to number for channel validation
      const chatId = parseInt(createDto.telegram_chat_id, 10);
      if (isNaN(chatId)) {
        throw new BadRequestException(
          'Invalid telegram_chat_id format. Must be a numeric string.',
        );
      }

      // Check if another group is already connected to this channel
      const existingConnection = await this.telegramGroupRepository.findOne({
        where: {
          telegram_chat_id: chatId,
          tenant_id: tenantId,
          is_active: true,
        },
      });

      if (existingConnection) {
        throw new ConflictException(
          `Channel ${createDto.telegram_chat_id} is already connected to group "${existingConnection.group_name}"`,
        );
      }

      // Validate bot permissions in the Telegram channel
      this.logger.log(
        `Validating bot permissions for channel ${createDto.telegram_chat_id} ${project.bot_token}`,
      );
      const connectionResult =
        await this.telegramChannelService.connectToChannel(
          project.bot_token,
          createDto.telegram_chat_id,
          true, // verify_permissions = true
        );

      if (!connectionResult.success) {
        throw new BadRequestException(
          connectionResult.error ||
            'Failed to validate bot permissions in the Telegram channel',
        );
      }

      // Extract channel info from connection result
      const channelInfo = connectionResult.channelInfo!;

      // Create the telegram group with channel information populated
      const telegramGroup = this.telegramGroupRepository.create({
        group_name: createDto.group_name,
        description: createDto.description || null,
        project_id: createDto.project_id,
        tenant_id: tenantId,
        settings: createDto.settings || {},
        is_active: true,
        telegram_chat_id: channelInfo.id,
        username: channelInfo.username || null,
        group_type: this.mapTelegramTypeToGroupType(channelInfo.type),
        member_count: channelInfo.member_count || 0,
      });

      const savedGroup = await this.telegramGroupRepository.save(telegramGroup);

      // Post welcome message to channel
      try {
        const welcomePosted =
          await this.telegramChannelService.postWelcomeMessage(
            project.bot_token,
            createDto.telegram_chat_id,
            createDto.group_name,
          );

        if (!welcomePosted) {
          this.logger.warn(
            `Failed to post welcome message to channel ${createDto.telegram_chat_id}`,
          );
        }
      } catch (welcomeError) {
        this.logger.warn(
          `Error posting welcome message: ${welcomeError.message}`,
        );
      }

      // Fetch with project relation for response
      const groupWithProject = await this.telegramGroupRepository.findOne({
        where: { id: savedGroup.id },
        relations: ['project'],
      });

      this.logger.log(
        `Telegram group created successfully with channel connection: ${savedGroup.id} - ${createDto.group_name} (channel: ${channelInfo.title})`,
      );

      return groupWithProject!;
    } catch (error) {
      this.logger.error(
        `Failed to create telegram group: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves all telegram groups for a tenant with optional filtering and pagination.
   *
   * @param tenantId - The tenant UUID for isolation
   * @param query - Optional query parameters for filtering and pagination
   * @returns Promise<TelegramGroupsListResponse> - Paginated list of groups with metadata
   */
  async findAll(
    tenantId: string,
    query?: GetTelegramGroupsDto,
  ): Promise<TelegramGroupsListResponse> {
    try {
      this.logger.log(
        `Fetching telegram groups for tenant ${tenantId} with query:`,
        query,
      );

      const page = query?.page || 1;
      const limit = Math.min(query?.limit || 20, 100); // Cap at 100 items per page
      const skip = (page - 1) * limit;

      // Build where conditions
      const whereConditions: any = {
        tenant_id: tenantId,
        is_active: true,
      };

      // Filter by project_id if provided
      if (query?.project_id) {
        whereConditions.project_id = query.project_id;
      }

      // Execute query with pagination
      const [groups, total] = await this.telegramGroupRepository.findAndCount({
        where: whereConditions,
        relations: ['project'],
        order: {
          updated_at: 'DESC',
          created_at: 'DESC',
        },
        skip,
        take: limit,
      });

      this.logger.log(
        `Found ${total} telegram groups for tenant ${tenantId} (page ${page}/${Math.ceil(total / limit)})`,
      );

      return {
        data: groups,
        pagination: calculatePagination(total, page, limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch telegram groups for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Retrieves a single telegram group by ID with tenant isolation.
   * Includes project relation for complete group information.
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
          is_active: true,
        },
        relations: ['project'],
      });

      if (!group) {
        this.logger.warn(
          `Telegram group not found: id=${id}, tenantId=${tenantId}`,
        );
        return null;
      }

      this.logger.log(
        `Found telegram group: ${group.id} - ${group.group_name}`,
      );
      return group;
    } catch (error) {
      this.logger.error(
        `Failed to fetch telegram group ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Updates an existing telegram group with validation and tenant isolation.
   *
   * @param id - The UUID of the telegram group to update
   * @param updateDto - The data for updating the telegram group
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<TelegramGroup> - The updated telegram group
   * @throws NotFoundException - When group is not found
   */
  async update(
    id: string,
    updateDto: UpdateTelegramGroupDto,
    tenantId: string,
  ): Promise<TelegramGroup> {
    try {
      this.logger.log(`Updating telegram group ${id} for tenant ${tenantId}`);

      const group = await this.findOne(id, tenantId);
      if (!group) {
        throw new NotFoundException(`Telegram group with ID ${id} not found`);
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
              id: Not(id), // Exclude current group from check
            },
          });

          if (existingGroup) {
            throw new ConflictException(
              `Group with name "${updateDto.group_name}" already exists`,
            );
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

      group.updated_at = new Date();

      const updatedGroup = await this.telegramGroupRepository.save(group);

      this.logger.log(
        `Telegram group updated successfully: ${id} - ${updatedGroup.group_name}`,
      );
      return updatedGroup;
    } catch (error) {
      this.logger.error(
        `Failed to update telegram group ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Soft deletes a telegram group by setting is_active to false.
   * Also disconnects from channel.
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

      // Disconnect from channel
      group.telegram_chat_id = null;
      group.username = null;

      // Soft delete
      group.is_active = false;
      group.updated_at = new Date();

      await this.telegramGroupRepository.save(group);

      this.logger.log(`Telegram group removed successfully: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to remove telegram group ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      return false;
    }
  }

  /**
   * Connects a telegram group to a Telegram channel with bot permission verification.
   * Updates channel information in the group record.
   *
   * @param id - The UUID of the telegram group to connect
   * @param connectDto - The channel connection data
   * @param tenantId - The tenant UUID for isolation
   * @returns Promise<ConnectChannelResponse> - Connection result with channel info or error
   * @throws NotFoundException - When group is not found
   */
  async connectChannel(
    id: string,
    connectDto: ConnectChannelDto,
    tenantId: string,
  ): Promise<ConnectChannelResponse> {
    try {
      this.logger.log(
        `Connecting channel for telegram group ${id}: ${connectDto.telegram_chat_id}`,
      );

      const group = await this.findOne(id, tenantId);
      if (!group) {
        throw new NotFoundException(`Telegram group with ID ${id} not found`);
      }

      // Verify project exists and has valid bot token
      if (!group.project || !group.project.bot_token) {
        return {
          success: false,
          message: 'Project configuration is missing or invalid bot token',
        };
      }

      // Check if another group is already connected to this channel
      const existingConnection = await this.telegramGroupRepository.findOne({
        where: {
          telegram_chat_id: parseInt(connectDto.telegram_chat_id),
          tenant_id: tenantId,
          is_active: true,
          id: Not(id), // Exclude current group
        },
      });

      if (existingConnection) {
        return {
          success: false,
          message: `Channel is already connected to group "${existingConnection.group_name}"`,
        };
      }

      // Connect to channel using channel service
      const connectionResult =
        await this.telegramChannelService.connectToChannel(
          group.project.bot_token,
          connectDto.telegram_chat_id,
          connectDto.verify_permissions ?? true,
        );

      if (!connectionResult.success) {
        return {
          success: false,
          message: connectionResult.error || 'Failed to connect to channel',
        };
      }

      // Update group with channel information
      const channelInfo = connectionResult.channelInfo!;

      group.telegram_chat_id = channelInfo.id;
      group.group_type = this.mapTelegramTypeToGroupType(channelInfo.type);
      group.username = channelInfo.username || null;
      group.member_count = channelInfo.member_count || 0;

      await this.telegramGroupRepository.save(group);

      // Post welcome message to channel
      try {
        const welcomePosted =
          await this.telegramChannelService.postWelcomeMessage(
            group.project.bot_token,
            connectDto.telegram_chat_id,
            group.group_name,
          );

        if (!welcomePosted) {
          this.logger.warn(
            `Failed to post welcome message to channel ${connectDto.telegram_chat_id}`,
          );
        }
      } catch (welcomeError) {
        this.logger.warn(
          `Error posting welcome message: ${welcomeError.message}`,
        );
      }

      this.logger.log(
        `Channel connected successfully for group ${id}: ${channelInfo.title}`,
      );

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
      };
    } catch (error) {
      this.logger.error(
        `Failed to connect channel for group ${id}: ${error.message}`,
        error.stack,
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
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
      if (!group.telegram_chat_id || !group.project?.bot_token) {
        return {
          success: false,
          error:
            'Group cannot be synced: not connected to a channel or bot token missing',
        };
      }

      // Trigger sync through sync service
      const syncResult = await this.telegramSyncService.syncGroupToChannel(
        id,
        tenantId,
      );

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
      this.logger.error(
        `Failed to sync telegram group ${id}: ${error.message}`,
        error.stack,
      );

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
