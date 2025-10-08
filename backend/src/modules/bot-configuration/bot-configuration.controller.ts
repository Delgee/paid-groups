import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { BotConfigurationService } from './services/bot-configuration.service';
import { CreateBotConfigurationDto } from './dto/create-bot-configuration.dto';
import { UpdateBotConfigurationDto } from './dto/update-bot-configuration.dto';
import { BotConfiguration } from './entities/bot-configuration.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { CorrelationId } from '../../common/middleware/correlation-id.middleware';

@ApiTags('Bot Configuration')
@Controller('bot-configurations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BotConfigurationController {
  private readonly logger = new Logger(BotConfigurationController.name);

  constructor(private readonly botConfigurationService: BotConfigurationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bot configuration' })
  @ApiResponse({
    status: 201,
    description: 'Bot configuration created successfully',
    type: BotConfiguration,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Duplicate bot token' })
  async create(
    @TenantId() tenantId: string,
    @CorrelationId() correlationId: string,
    @Body() createDto: CreateBotConfigurationDto,
  ): Promise<BotConfiguration> {
    const startTime = Date.now();
    this.logger.log('Creating bot configuration', { correlationId, tenantId, botUsername: createDto.bot_username });

    try {
      const result = await this.botConfigurationService.create(tenantId, createDto);
      const duration = Date.now() - startTime;
      this.logger.log('Bot configuration created successfully', { correlationId, botId: result.id, duration });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Failed to create bot configuration', error.stack, { correlationId, duration });
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all bot configurations for tenant' })
  @ApiResponse({
    status: 200,
    description: 'List of bot configurations',
    type: [BotConfiguration],
  })
  async findAll(
    @TenantId() tenantId: string,
    @CorrelationId() correlationId: string,
  ): Promise<BotConfiguration[]> {
    this.logger.log('Fetching all bot configurations', { correlationId, tenantId });
    return this.botConfigurationService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bot configuration by ID' })
  @ApiParam({ name: 'id', description: 'Bot configuration UUID' })
  @ApiResponse({
    status: 200,
    description: 'Bot configuration details',
    type: BotConfiguration,
  })
  @ApiResponse({ status: 404, description: 'Bot configuration not found' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BotConfiguration> {
    return this.botConfigurationService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update bot configuration' })
  @ApiParam({ name: 'id', description: 'Bot configuration UUID' })
  @ApiResponse({
    status: 200,
    description: 'Bot configuration updated successfully',
    type: BotConfiguration,
  })
  @ApiResponse({ status: 404, description: 'Bot configuration not found' })
  @ApiResponse({ status: 409, description: 'Duplicate bot token' })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateBotConfigurationDto,
  ): Promise<BotConfiguration> {
    return this.botConfigurationService.update(tenantId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete bot configuration' })
  @ApiParam({ name: 'id', description: 'Bot configuration UUID' })
  @ApiResponse({ status: 204, description: 'Bot configuration deleted successfully' })
  @ApiResponse({ status: 404, description: 'Bot configuration not found' })
  async delete(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.botConfigurationService.delete(tenantId, id);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync bot info from Telegram API' })
  @ApiParam({ name: 'id', description: 'Bot configuration UUID' })
  @ApiResponse({
    status: 200,
    description: 'Bot info synced successfully',
    type: BotConfiguration,
  })
  @ApiResponse({ status: 404, description: 'Bot configuration not found' })
  async sync(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BotConfiguration> {
    return this.botConfigurationService.syncTelegramInfo(tenantId, id);
  }
}
