import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { TelegramBotService, CreateBotDto, UpdateBotDto } from './services/telegram-bot.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { BotValidationService } from './services/bot-validation.service';
import { BotHealthMonitorService } from './services/bot-health-monitor.service';
import { BotSecurityService } from './services/bot-security.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { ValidateBotTokenDto, RegisterBotDto } from './dto/bot-validation.dto';

class CreateBotRequestDto implements CreateBotDto {
  @IsString()
  bot_token: string;

  @IsOptional()
  @IsString()
  bot_username?: string;

  @IsString()
  bot_name: string;

  @IsOptional()
  @IsUrl()
  webhook_url?: string;

  @IsOptional()
  @IsString()
  welcome_message?: string;

  @IsOptional()
  @IsString()
  payment_instructions?: string;

  @IsOptional()
  settings?: Record<string, any>;
}

class UpdateBotRequestDto implements UpdateBotDto {
  @IsOptional()
  @IsString()
  bot_name?: string;

  @IsOptional()
  @IsUrl()
  webhook_url?: string;

  @IsOptional()
  @IsString()
  welcome_message?: string;

  @IsOptional()
  @IsString()
  payment_instructions?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  settings?: Record<string, any>;
}

class ConnectGroupRequestDto {
  @IsString()
  group_id: string;

  @IsString()
  group_name: string;

  @IsString()
  group_type: string;

  @IsOptional()
  member_count?: number;

  @IsOptional()
  settings?: Record<string, any>;
}

class SendMessageRequestDto {
  @IsString()
  message: string;
}

@ApiTags('Bots')
@Controller('bots')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class BotController {
  constructor(
    private readonly botService: TelegramBotService,
    private readonly validationService: BotValidationService,
    private readonly healthMonitor: BotHealthMonitorService,
    private readonly securityService: BotSecurityService,
    private readonly encryptionService: EncryptionService,
  ) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a Telegram bot token' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  @ApiResponse({ status: 400, description: 'Invalid token format' })
  async validateToken(
    @Body(ValidationPipe) validateDto: ValidateBotTokenDto,
  ) {
    const validation = await this.validationService.validateBotToken(validateDto.token);
    return {
      valid: validation.valid,
      error: validation.error,
      bot_info: validation.botInfo,
      webhook_capable: validation.webhookCapable,
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register and validate a new Telegram bot' })
  @ApiResponse({ status: 201, description: 'Bot registered successfully' })
  @ApiResponse({ status: 400, description: 'Bot validation failed' })
  @ApiResponse({ status: 409, description: 'Bot already registered' })
  async registerBot(
    @Request() req,
    @Body(ValidationPipe) registerDto: RegisterBotDto,
  ) {
    // 1. Validate token
    const validation = await this.validationService.validateBotToken(registerDto.token);

    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // 2. Set up webhook with signature
    const webhookSecret = this.encryptionService.generateRandomSecret();

    const webhookSetup = await this.validationService.setupBotWebhook(
      registerDto.token,
      req.tenant_id,
      validation.botInfo!.id.toString(),
      webhookSecret
    );

    if (!webhookSetup) {
      throw new BadRequestException('Failed to set up bot webhook');
    }

    // 3. Store encrypted token
    const encryptedToken = this.encryptionService.encrypt(registerDto.token);

    // 4. Create bot in database
    const botData: CreateBotDto = {
      bot_token: encryptedToken,
      bot_username: validation.botInfo!.username,
      bot_name: registerDto.custom_name || validation.botInfo!.first_name,
      webhook_url: '', // Will be set by validation service
      webhook_secret: webhookSecret,
      settings: {
        bot_id: validation.botInfo!.id,
        can_join_groups: validation.botInfo!.can_join_groups,
        can_read_all_group_messages: validation.botInfo!.can_read_all_group_messages,
        supports_inline_queries: validation.botInfo!.supports_inline_queries,
        registered_at: new Date(),
      }
    };

    const bot = await this.botService.create(req.tenant_id, botData);

    // 5. Start monitoring
    await this.healthMonitor.monitorBotHealth(bot.id);

    return {
      success: true,
      bot: {
        id: bot.id,
        username: validation.botInfo!.username,
        name: bot.bot_name,
        status: 'active'
      }
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new Telegram bot' })
  @ApiResponse({ status: 201, description: 'Bot created successfully' })
  @ApiResponse({ status: 409, description: 'Bot already exists' })
  async create(
    @Request() req,
    @Body(ValidationPipe) createBotDto: CreateBotRequestDto,
  ) {
    return this.botService.create(req.tenant_id, createBotDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all bots for tenant' })
  @ApiResponse({ status: 200, description: 'List of bots' })
  async findAll(@Request() req) {
    const bots = await this.botService.findAllByTenant(req.tenant_id);
    return { bots };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bot by ID' })
  @ApiResponse({ status: 200, description: 'Bot found' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async findOne(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.botService.findById(req.tenant_id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update bot' })
  @ApiResponse({ status: 200, description: 'Bot updated successfully' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateBotDto: UpdateBotRequestDto,
  ) {
    return this.botService.update(req.tenant_id, id, updateBotDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete bot' })
  @ApiResponse({ status: 200, description: 'Bot deleted successfully' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async remove(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.botService.delete(req.tenant_id, id);
    return { success: true };
  }

  @Post(':id/groups')
  @ApiOperation({ summary: 'Connect a Telegram group to bot' })
  @ApiResponse({ status: 201, description: 'Group connected successfully' })
  @ApiResponse({ status: 409, description: 'Group already connected' })
  async connectGroup(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) connectGroupDto: ConnectGroupRequestDto,
  ) {
    return this.botService.connectGroup(req.tenant_id, id, connectGroupDto);
  }

  @Get(':id/groups')
  @ApiOperation({ summary: 'List all groups connected to bot' })
  @ApiResponse({ status: 200, description: 'List of groups' })
  async getGroups(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const groups = await this.botService.getGroups(req.tenant_id, id);
    return { groups };
  }

  @Delete(':id/groups/:groupId')
  @ApiOperation({ summary: 'Disconnect a group from bot' })
  @ApiResponse({ status: 200, description: 'Group disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async disconnectGroup(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    await this.botService.disconnectGroup(req.tenant_id, id, groupId);
    return { success: true };
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send message to a group' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 404, description: 'Bot or group not found' })
  async sendMessage(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) sendMessageDto: SendMessageRequestDto & { group_id: string },
  ) {
    await this.botService.sendMessage(
      req.tenant_id,
      id,
      sendMessageDto.group_id,
      sendMessageDto.message,
    );
    return { success: true };
  }

  // Health Monitoring Endpoints
  @Get(':id/health')
  @ApiOperation({ summary: 'Get bot health status' })
  @ApiResponse({ status: 200, description: 'Bot health status' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async getBotHealth(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Verify bot belongs to tenant
    await this.botService.findById(req.tenant_id, id);

    const health = await this.healthMonitor.forceHealthCheck(id);
    return health;
  }

  @Post(':id/health/check')
  @ApiOperation({ summary: 'Force a health check on bot' })
  @ApiResponse({ status: 200, description: 'Health check completed' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async forceHealthCheck(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Verify bot belongs to tenant
    await this.botService.findById(req.tenant_id, id);

    const health = await this.healthMonitor.forceHealthCheck(id);
    return {
      message: 'Health check completed',
      status: health.status,
      timestamp: health.lastCheck,
    };
  }

  @Get('health/summary')
  @ApiOperation({ summary: 'Get health summary for all tenant bots' })
  @ApiResponse({ status: 200, description: 'Health summary' })
  async getHealthSummary(
    @Request() req,
  ) {
    const summary = this.healthMonitor.getHealthSummary(req.tenant_id);
    const statuses = await this.healthMonitor.getAllBotsHealthStatus(req.tenant_id);

    return {
      summary,
      bots: statuses,
    };
  }

  // Security Endpoints
  @Get(':id/security/alerts')
  @ApiOperation({ summary: 'Get security alerts for bot' })
  @ApiResponse({ status: 200, description: 'Security alerts' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async getSecurityAlerts(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Verify bot belongs to tenant
    await this.botService.findById(req.tenant_id, id);

    const alerts = await this.securityService.detectTampering(id);
    return {
      bot_id: id,
      alerts,
      checked_at: new Date(),
    };
  }

  @Post(':id/security/scan')
  @ApiOperation({ summary: 'Run security scan on bot' })
  @ApiResponse({ status: 200, description: 'Security scan completed' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async runSecurityScan(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Verify bot belongs to tenant
    await this.botService.findById(req.tenant_id, id);

    const alerts = await this.securityService.detectTampering(id);
    const hasHighSeverityAlerts = alerts.some(alert =>
      alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
    );

    return {
      scan_completed: true,
      timestamp: new Date(),
      alerts_found: alerts.length,
      high_severity_alerts: alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length,
      status: hasHighSeverityAlerts ? 'warning' : alerts.length > 0 ? 'info' : 'clean',
      alerts: alerts,
    };
  }

  // Validation Endpoints
  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate existing bot token' })
  @ApiResponse({ status: 200, description: 'Bot validation result' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async validateExistingBot(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Verify bot belongs to tenant
    await this.botService.findById(req.tenant_id, id);

    const validation = await this.validationService.validateExistingBot(id);
    return {
      bot_id: id,
      valid: validation.valid,
      error: validation.error,
      checked_at: new Date(),
    };
  }

  @Post(':id/webhook/refresh')
  @ApiOperation({ summary: 'Refresh bot webhook configuration' })
  @ApiResponse({ status: 200, description: 'Webhook refreshed successfully' })
  @ApiResponse({ status: 404, description: 'Bot not found' })
  async refreshWebhook(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Verify bot belongs to tenant and get bot data
    const bot = await this.botService.findById(req.tenant_id, id);

    // Decrypt token and setup new webhook
    const decryptedToken = this.encryptionService.decrypt(bot.bot_token);
    const newWebhookSecret = this.encryptionService.generateRandomSecret();

    const success = await this.validationService.setupBotWebhook(
      decryptedToken,
      req.tenant_id,
      id,
      newWebhookSecret
    );

    if (success) {
      // Update webhook secret in database
      await this.botService.update(req.tenant_id, id, {
        webhook_secret: newWebhookSecret,
        settings: {
          ...bot.settings,
          webhook_refreshed_at: new Date(),
        }
      });
    }

    return {
      success,
      message: success ? 'Webhook refreshed successfully' : 'Failed to refresh webhook',
      timestamp: new Date(),
    };
  }
}