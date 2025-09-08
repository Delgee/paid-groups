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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';
import { TelegramBotService, CreateBotDto, UpdateBotDto } from './services/telegram-bot.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

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
  constructor(private readonly botService: TelegramBotService) {}

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
}