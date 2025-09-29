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
  HttpStatus,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TelegramGroupsService } from './telegram-groups.service';
import { CreateTelegramGroupDto } from './dto/create-telegram-group.dto';
import { UpdateTelegramGroupDto } from './dto/update-telegram-group.dto';
import { ConnectChannelDto } from './dto/connect-channel.dto';
import { GetTelegramGroupsDto } from './dto/get-telegram-groups.dto';

@Controller('telegram-groups')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@ApiTags('Telegram Groups')
@ApiBearerAuth()
export class TelegramGroupsController {
  constructor(private readonly telegramGroupsService: TelegramGroupsService) {}

  @Get()
  @ApiOperation({
    summary: 'List telegram groups',
    description: 'Retrieve a paginated list of telegram groups for the current tenant with optional filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (max 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'sync_enabled',
    required: false,
    type: Boolean,
    description: 'Filter by sync enabled status',
    example: true,
  })
  @ApiQuery({
    name: 'connection_status',
    required: false,
    enum: ['connected', 'disconnected', 'pending', 'error'],
    description: 'Filter by connection status',
    example: 'connected',
  })
  @ApiQuery({
    name: 'bot_assigned',
    required: false,
    type: Boolean,
    description: 'Filter by bot assignment status',
    example: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Telegram groups retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string' },
              channel_id: { type: 'string', nullable: true },
              channel_username: { type: 'string', nullable: true },
              connection_status: {
                type: 'string',
                enum: ['connected', 'disconnected', 'pending', 'error']
              },
              sync_enabled: { type: 'boolean' },
              last_sync_at: { type: 'string', format: 'date-time', nullable: true },
              bot_assigned: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            total_pages: { type: 'number' },
            has_next_page: { type: 'boolean' },
            has_prev_page: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  async findAll(
    @Request() req: any,
    @Query() query: GetTelegramGroupsDto,
  ) {
    try {
      const tenantId = req.user?.tenant_id;
      return await this.telegramGroupsService.findAll(tenantId, query);
    } catch (error) {
      throw error;
    }
  }

  @Post()
  @ApiOperation({
    summary: 'Create telegram group',
    description: 'Create a new telegram group for the current tenant',
  })
  @ApiBody({
    type: CreateTelegramGroupDto,
    description: 'Telegram group creation data',
    examples: {
      basic: {
        summary: 'Basic telegram group',
        value: {
          name: 'Premium Trading Signals',
          description: 'Exclusive trading signals for premium members',
          sync_enabled: true,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Telegram group created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        channel_id: { type: 'string', nullable: true },
        channel_username: { type: 'string', nullable: true },
        connection_status: {
          type: 'string',
          enum: ['connected', 'disconnected', 'pending', 'error']
        },
        sync_enabled: { type: 'boolean' },
        last_sync_at: { type: 'string', format: 'date-time', nullable: true },
        bot_assigned: { type: 'boolean' },
        tenant_id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or validation errors',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Telegram group with the same name already exists',
  })
  async create(
    @Request() req: any,
    @Body() createTelegramGroupDto: CreateTelegramGroupDto,
  ) {
    try {
      const tenantId = req.user?.tenant_id;
      return await this.telegramGroupsService.create(createTelegramGroupDto, tenantId);
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get telegram group by ID',
    description: 'Retrieve a specific telegram group by its ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Telegram group unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Telegram group retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        channel_id: { type: 'string', nullable: true },
        channel_username: { type: 'string', nullable: true },
        connection_status: {
          type: 'string',
          enum: ['connected', 'disconnected', 'pending', 'error']
        },
        sync_enabled: { type: 'boolean' },
        last_sync_at: { type: 'string', format: 'date-time', nullable: true },
        bot_assigned: { type: 'boolean' },
        tenant_id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Telegram group not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  async findOne(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    try {
      const tenantId = req.user?.tenant_id;
      return await this.telegramGroupsService.findOne(id, tenantId);
    } catch (error) {
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update telegram group',
    description: 'Update an existing telegram group by its ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Telegram group unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateTelegramGroupDto,
    description: 'Telegram group update data',
    examples: {
      basic: {
        summary: 'Update group details',
        value: {
          name: 'Premium Trading Signals - VIP',
          description: 'Updated description for VIP members',
          sync_enabled: false,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Telegram group updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        channel_id: { type: 'string', nullable: true },
        channel_username: { type: 'string', nullable: true },
        connection_status: {
          type: 'string',
          enum: ['connected', 'disconnected', 'pending', 'error']
        },
        sync_enabled: { type: 'boolean' },
        last_sync_at: { type: 'string', format: 'date-time', nullable: true },
        bot_assigned: { type: 'boolean' },
        tenant_id: { type: 'string', format: 'uuid' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Telegram group not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Telegram group with the same name already exists',
  })
  async update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTelegramGroupDto: UpdateTelegramGroupDto,
  ) {
    try {
      const tenantId = req.user?.tenant_id;
      return await this.telegramGroupsService.update(id, updateTelegramGroupDto, tenantId);
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete telegram group',
    description: 'Delete a telegram group by its ID',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Telegram group unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Telegram group deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Telegram group not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Cannot delete telegram group with active connections or members',
  })
  async remove(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    try {
      const tenantId = req.user?.tenant_id;
      await this.telegramGroupsService.remove(id, tenantId);
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/connect-channel')
  @ApiOperation({
    summary: 'Connect to Telegram channel',
    description: 'Connect the telegram group to a specific Telegram channel using bot credentials',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Telegram group unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: ConnectChannelDto,
    description: 'Channel connection data',
    examples: {
      by_username: {
        summary: 'Connect by channel username',
        value: {
          channel_username: '@premium_signals',
        },
      },
      by_id: {
        summary: 'Connect by channel ID',
        value: {
          channel_id: '-1001234567890',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Channel connected successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        channel_info: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string', nullable: true },
            title: { type: 'string' },
            type: { type: 'string' },
            member_count: { type: 'number', nullable: true },
          },
        },
        connection_status: {
          type: 'string',
          enum: ['connected', 'disconnected', 'pending', 'error']
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Telegram group not found or channel not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or channel connection failed',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Bot does not have permission to access the channel',
  })
  async connectChannel(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() connectChannelDto: ConnectChannelDto,
  ) {
    try {
      const tenantId = req.user?.tenant_id;
      return await this.telegramGroupsService.connectChannel(id, connectChannelDto, tenantId);
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/sync')
  @ApiOperation({
    summary: 'Manually sync group to channel',
    description: 'Trigger a manual synchronization of group members to the connected Telegram channel',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Telegram group unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sync operation initiated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        sync_id: { type: 'string', format: 'uuid' },
        started_at: { type: 'string', format: 'date-time' },
        estimated_duration: { type: 'string' },
        members_to_sync: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Telegram group not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Group is not connected to a channel or sync is disabled',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or missing authentication token',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Sync operation already in progress',
  })
  async syncToChannel(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    try {
      const tenantId = req.user?.tenant_id;
      return await this.telegramGroupsService.sync(id, tenantId);
    } catch (error) {
      throw error;
    }
  }
}