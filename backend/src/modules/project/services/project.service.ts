import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Project } from '../entities/project.entity';
import { CreateProjectDto } from '../dto/create-project.dto';
import { UpdateProjectDto } from '../dto/update-project.dto';
import { GetProjectsDto } from '../dto/get-projects.dto';
import {
  ProjectResponseDto,
  PaginatedProjectsResponseDto,
} from '../dto/project-response.dto';
import { TelegramApiService } from '../../bot/services/telegram-api.service';
import { ProjectWebhookService } from './project-webhook.service';
import { EncryptionService } from '../../../common/services/encryption.service';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
    private readonly telegramApiService: TelegramApiService,
    private readonly webhookService: ProjectWebhookService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Decrypt bot token for use with Telegram API
   * @private
   */
  private decryptBotToken(encryptedToken: string): string {
    try {
      return this.encryptionService.decrypt(encryptedToken);
    } catch (error) {
      this.logger.error(`Failed to decrypt bot token: ${error.message}`);
      throw new BadRequestException({
        error: {
          code: 'INVALID_BOT_TOKEN',
          message: 'Bot token is invalid or corrupted',
        },
      });
    }
  }

  /**
   * Create a new project
   */
  async create(
    tenantId: string,
    createDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Creating project for tenant ${tenantId}`);

    // Encrypt bot token before checking/saving
    const encryptedToken = this.encryptionService.encrypt(createDto.bot_token);

    // Check for duplicate bot_token (encrypted version)
    const existingProject = await this.projectRepository.findOne({
      where: { bot_token: encryptedToken },
    });

    if (existingProject) {
      this.logger.warn(`Duplicate bot_token attempted`);
      throw new ConflictException({
        error: {
          code: 'DUPLICATE_BOT_TOKEN',
          message: 'This bot token is already registered. Please use a different bot.',
          details: { field: 'bot_token' },
        },
      });
    }

    // Create project entity first to get the ID (with encrypted token)
    const project = this.projectRepository.create({
      ...createDto,
      bot_token: encryptedToken, // Store encrypted token
      tenant_id: tenantId,
    });

    const saved = await this.projectRepository.save(project);

    // Auto-generate webhook configuration (use original unencrypted token)
    try {
      const webhookResult = await this.webhookService.setupWebhook(
        createDto.bot_token, // Use original unencrypted token for API call
        tenantId,
        saved.id,
      );

      if (webhookResult.success) {
        // Update project with webhook details
        saved.webhook_url = webhookResult.webhookUrl;
        saved.webhook_secret = webhookResult.webhookSecret;
        await this.projectRepository.save(saved);

        this.logger.log(
          `Webhook configured for project ${saved.id}: ${webhookResult.webhookUrl}`,
        );
      } else {
        this.logger.warn(
          `Failed to setup webhook for project ${saved.id}: ${webhookResult.error}`,
        );
        // Don't fail project creation if webhook setup fails
      }
    } catch (webhookError) {
      this.logger.error(
        `Error setting up webhook for project ${saved.id}: ${webhookError.message}`,
      );
      // Continue - webhook can be set up later via refresh endpoint
    }

    this.logger.log(`Project created: ${saved.id}`);
    return ProjectResponseDto.fromEntity(saved);
  }

  /**
   * Find all projects for a tenant with pagination
   */
  async findAll(
    tenantId: string,
    query: GetProjectsDto,
  ): Promise<PaginatedProjectsResponseDto> {
    this.logger.log(`Fetching projects for tenant ${tenantId}`);

    const { page = 1, limit = 10, is_active } = query;
    const skip = (page - 1) * limit;

    const whereClause: any = { tenant_id: tenantId };
    if (is_active !== undefined) {
      whereClause.is_active = is_active;
    }

    const [projects, total] = await this.projectRepository.findAndCount({
      where: whereClause,
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: projects.map(project => ProjectResponseDto.fromEntity(project)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Find a project by ID
   */
  async findOne(tenantId: string, id: string): Promise<ProjectResponseDto> {
    this.logger.log(`Fetching project ${id} for tenant ${tenantId}`);

    const project = await this.projectRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!project) {
      throw new NotFoundException({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        },
      });
    }

    return ProjectResponseDto.fromEntity(project);
  }

  /**
   * Find a project by bot token (for webhook handling)
   */
  async findByBotToken(botToken: string): Promise<Project | null> {
    return this.projectRepository.findOne({
      where: { bot_token: botToken },
    });
  }

  /**
   * Get raw project entity (for internal use)
   */
  async findOneRaw(tenantId: string, id: string): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!project) {
      throw new NotFoundException({
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found',
        },
      });
    }

    return project;
  }

  /**
   * Update a project
   */
  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Updating project ${id} for tenant ${tenantId}`);

    const project = await this.findOneRaw(tenantId, id);

    // If updating bot_token, encrypt it and check for duplicates
    if (updateDto.bot_token) {
      const encryptedNewToken = this.encryptionService.encrypt(updateDto.bot_token);

      // Only check for duplicates if the token actually changed
      if (encryptedNewToken !== project.bot_token) {
        const existingProject = await this.projectRepository.findOne({
          where: { bot_token: encryptedNewToken },
        });

        if (existingProject) {
          throw new ConflictException({
            error: {
              code: 'DUPLICATE_BOT_TOKEN',
              message: 'This bot token is already registered',
              details: { field: 'bot_token' },
            },
          });
        }
      }

      // Replace the plain token with encrypted version
      updateDto.bot_token = encryptedNewToken;
    }

    Object.assign(project, updateDto);
    const updated = await this.projectRepository.save(project);

    // Automatically sync bot info from Telegram after update
    try {
      await this.syncBotInfoAfterUpdate(updated);
    } catch (syncError) {
      // Log but don't fail the update if sync fails
      this.logger.warn(`Failed to auto-sync bot info after update: ${syncError.message}`);
    }

    this.logger.log(`Project updated: ${id}`);
    return ProjectResponseDto.fromEntity(updated);
  }

  /**
   * Sync bot information from Telegram API after project update
   * This ensures the bot's settings are reflected in Telegram
   */
  private async syncBotInfoAfterUpdate(project: Project): Promise<void> {
    try {
      // Decrypt token before verifying
      const decryptedToken = this.decryptBotToken(project.bot_token);

      // Verify bot token is still valid
      const botInfo = await this.telegramApiService.verifyBotToken(decryptedToken);

      if (!botInfo) {
        this.logger.warn(`Bot token invalid for project ${project.id}, skipping sync`);
        return;
      }

      // Update bot commands based on current configuration
      // This ensures users see up-to-date commands in Telegram
      await this.updateBotCommands(project);

      this.logger.log(`Bot info synced successfully for project ${project.id}`);
    } catch (error) {
      this.logger.error(`Error syncing bot info: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update bot commands in Telegram
   */
  private async updateBotCommands(project: Project): Promise<void> {
    // Define standard commands for the bot
    const commands = [
      { command: 'start', description: 'Start the bot and see welcome message' },
      { command: 'help', description: 'Get help and support information' },
      { command: 'plans', description: 'View available membership plans' },
      { command: 'status', description: 'Check your membership status' },
    ];

    try {
      // Decrypt token before using with Telegram API
      const decryptedToken = this.decryptBotToken(project.bot_token);

      const success = await this.telegramApiService.setMyCommands(
        decryptedToken,
        commands
      );

      if (success) {
        this.logger.log(`Bot commands updated for project ${project.id}`);
      } else {
        this.logger.warn(`Failed to update bot commands for project ${project.id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update bot commands: ${error.message}`);
      // Don't throw - this is not critical
    }
  }

  /**
   * Delete a project
   */
  async delete(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting project ${id} for tenant ${tenantId}`);

    const project = await this.findOneRaw(tenantId, id);
    await this.projectRepository.remove(project);

    this.logger.log(`Project deleted: ${id}`);
  }

  /**
   * Sync project/bot info from Telegram API
   */
  async syncTelegramInfo(
    tenantId: string,
    id: string,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Syncing Telegram info for project ${id}`);

    const project = await this.findOneRaw(tenantId, id);

    // Decrypt token before calling Telegram API
    const decryptedToken = this.decryptBotToken(project.bot_token);

    // Call Telegram API to get bot info
    const botInfo = await this.telegramApiService.verifyBotToken(decryptedToken);

    if (botInfo) {
      project.bot_username = botInfo.username;
      project.display_name = botInfo.first_name;
    }

    // Fetch bot profile photo
    try {
      const profilePhoto = await this.telegramApiService.getBotProfilePhoto(decryptedToken);

      if (profilePhoto) {
        project.bot_avatar_file_id = profilePhoto.file_id;
        project.bot_avatar_url = profilePhoto.file_url;
        this.logger.log(`Bot avatar synced for project ${id}: ${profilePhoto.file_id}`);
      } else {
        // Clear avatar if bot has no profile photo
        project.bot_avatar_file_id = null;
        project.bot_avatar_url = null;
        this.logger.debug(`Bot has no profile photo for project ${id}`);
      }
    } catch (error) {
      // Don't fail sync if avatar fetch fails
      this.logger.warn(`Failed to sync bot avatar for project ${id}: ${error.message}`);
    }

    project.last_sync_at = new Date();
    const updated = await this.projectRepository.save(project);

    return ProjectResponseDto.fromEntity(updated);
  }

  /**
   * Verify bot token and return bot information
   */
  async verifyBotToken(
    botToken: string,
  ): Promise<{ username: string; first_name: string; id: number; is_bot: boolean }> {
    this.logger.log('Verifying bot token');

    if (!botToken || !botToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_BOT_TOKEN',
          message: 'Invalid bot token format',
          details: { field: 'bot_token' },
        },
      });
    }

    const botInfo = await this.telegramApiService.verifyBotToken(botToken);

    if (!botInfo) {
      throw new BadRequestException({
        error: {
          code: 'INVALID_BOT_TOKEN',
          message: 'Could not verify bot token. Please check that the token is correct and the bot is active.',
          details: { field: 'bot_token' },
        },
      });
    }

    return {
      username: botInfo.username,
      first_name: botInfo.first_name,
      id: botInfo.id,
      is_bot: botInfo.is_bot,
    };
  }

  /**
   * Refresh webhook configuration for a project
   * Generates new webhook secret and re-registers with Telegram
   */
  async refreshWebhook(
    tenantId: string,
    id: string,
  ): Promise<{ success: boolean; message: string; webhookUrl?: string }> {
    this.logger.log(`Refreshing webhook for project ${id}`);

    const project = await this.findOneRaw(tenantId, id);

    // Decrypt token before refreshing webhook
    const decryptedToken = this.decryptBotToken(project.bot_token);

    const webhookResult = await this.webhookService.refreshWebhook(
      decryptedToken,
      tenantId,
      id,
    );

    if (webhookResult.success) {
      // Update project with new webhook details
      project.webhook_url = webhookResult.webhookUrl;
      project.webhook_secret = webhookResult.webhookSecret;
      await this.projectRepository.save(project);

      this.logger.log(`Webhook refreshed for project ${id}`);

      return {
        success: true,
        message: 'Webhook refreshed successfully',
        webhookUrl: webhookResult.webhookUrl,
      };
    } else {
      this.logger.error(
        `Failed to refresh webhook for project ${id}: ${webhookResult.error}`,
      );

      return {
        success: false,
        message: `Failed to refresh webhook: ${webhookResult.error}`,
      };
    }
  }
}
