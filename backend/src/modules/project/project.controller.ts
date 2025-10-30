import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectService } from './services/project.service';
import { ProjectSecurityService } from './services/project-security.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { GetProjectsDto } from './dto/get-projects.dto';
import {
  ProjectResponseDto,
  PaginatedProjectsResponseDto,
} from './dto/project-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OwnerRoleGuard } from '../../common/guards/owner-role.guard';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { CorrelationId } from '../../common/middleware/correlation-id.middleware';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, OwnerRoleGuard)
@ApiBearerAuth()
export class ProjectController {
  private readonly logger = new Logger(ProjectController.name);

  constructor(
    private readonly projectService: ProjectService,
    private readonly securityService: ProjectSecurityService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Duplicate bot token' })
  async create(
    @TenantId() tenantId: string,
    @CorrelationId() correlationId: string,
    @Body() createDto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    const startTime = Date.now();
    this.logger.log('Creating project', {
      correlationId,
      tenantId,
      botUsername: createDto.bot_username,
    });

    try {
      const result = await this.projectService.create(tenantId, createDto);
      const duration = Date.now() - startTime;
      this.logger.log('Project created successfully', {
        correlationId,
        projectId: result.id,
        duration,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to create project', error.stack, {
        correlationId,
        duration,
      });
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects for tenant' })
  @ApiResponse({
    status: 200,
    description: 'List of projects with pagination',
    type: PaginatedProjectsResponseDto,
  })
  async findAll(
    @TenantId() tenantId: string,
    @CorrelationId() correlationId: string,
    @Query() query: GetProjectsDto,
  ): Promise<PaginatedProjectsResponseDto> {
    this.logger.log('Fetching projects', { correlationId, tenantId, query });
    return this.projectService.findAll(tenantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project details',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projectService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 409, description: 'Duplicate bot token' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.projectService.update(tenantId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 204, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.projectService.delete(tenantId, id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync project/bot info from Telegram API' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Project info synced successfully',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async sync(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectResponseDto> {
    return this.projectService.syncTelegramInfo(tenantId, id);
  }

  @Post('verify-token')
  @ApiOperation({ summary: 'Verify bot token and get bot info' })
  @ApiResponse({
    status: 200,
    description: 'Bot token verified successfully',
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        first_name: { type: 'string' },
        id: { type: 'number' },
        is_bot: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid bot token' })
  async verifyToken(
    @Body() body: { bot_token: string },
  ): Promise<{ username: string; first_name: string; id: number; is_bot: boolean }> {
    return this.projectService.verifyBotToken(body.bot_token);
  }

  @Post(':id/webhook/refresh')
  @ApiOperation({
    summary: 'Refresh webhook configuration',
    description:
      'Generates a new webhook secret and re-registers the webhook with Telegram API',
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({
    status: 200,
    description: 'Webhook refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        webhookUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async refreshWebhook(
    @TenantId() tenantId: string,
    @CorrelationId() correlationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string; webhookUrl?: string }> {
    this.logger.log('Refreshing webhook', { correlationId, tenantId, projectId: id });
    return this.projectService.refreshWebhook(tenantId, id);
  }

  @Post(':id/security/scan')
  @ApiOperation({ summary: 'Run security scan on a project' })
  @ApiParam({ name: 'id', description: 'Project ID', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Security scan completed',
    schema: {
      type: 'object',
      properties: {
        alerts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              message: { type: 'string' },
              severity: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async runSecurityScan(
    @TenantId() tenantId: string,
    @CorrelationId() correlationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ alerts: any[] }> {
    this.logger.log('Running security scan', { correlationId, tenantId, projectId: id });

    // Verify project belongs to tenant
    await this.projectService.findOne(tenantId, id);

    const alerts = await this.securityService.detectTampering(id);
    return { alerts };
  }
}
