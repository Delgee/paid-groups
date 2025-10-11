import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
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

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new project
   */
  async create(
    tenantId: string,
    createDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Creating project for tenant ${tenantId}`);

    // Check for duplicate bot_token
    const existingProject = await this.projectRepository.findOne({
      where: { bot_token: createDto.bot_token },
    });

    if (existingProject) {
      this.logger.warn(`Duplicate bot_token attempted: ${createDto.bot_token}`);
      throw new ConflictException({
        error: {
          code: 'DUPLICATE_BOT_TOKEN',
          message: 'This bot token is already registered. Please use a different bot.',
          details: { field: 'bot_token' },
        },
      });
    }

    const project = this.projectRepository.create({
      ...createDto,
      tenant_id: tenantId,
    });

    const saved = await this.projectRepository.save(project);
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

    // If updating bot_token, check for duplicates
    if (updateDto.bot_token && updateDto.bot_token !== project.bot_token) {
      const existingProject = await this.projectRepository.findOne({
        where: { bot_token: updateDto.bot_token },
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

    Object.assign(project, updateDto);
    const updated = await this.projectRepository.save(project);

    this.logger.log(`Project updated: ${id}`);
    return ProjectResponseDto.fromEntity(updated);
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
   * TODO: Implement actual Telegram API integration
   */
  async syncTelegramInfo(
    tenantId: string,
    id: string,
  ): Promise<ProjectResponseDto> {
    this.logger.log(`Syncing Telegram info for project ${id}`);

    const project = await this.findOneRaw(tenantId, id);

    // TODO: Call Telegram API to get bot info
    // const botInfo = await this.telegramService.getBotInfo(project.bot_token);
    // project.bot_username = botInfo.username;
    // project.display_name = botInfo.first_name;

    project.last_sync_at = new Date();
    const updated = await this.projectRepository.save(project);

    return ProjectResponseDto.fromEntity(updated);
  }
}
