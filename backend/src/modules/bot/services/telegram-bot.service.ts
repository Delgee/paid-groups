import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramBot } from '../entities/telegram-bot.entity';
import { TelegramGroup } from '../../telegram-groups/telegram-groups.entity';
import { TelegramApiService } from './telegram-api.service';

export interface CreateBotDto {
  bot_token: string;
  bot_username?: string;
  bot_name: string;
  webhook_url?: string;
  webhook_secret?: string;
  welcome_message?: string;
  payment_instructions?: string;
  settings?: Record<string, any>;
}

export interface UpdateBotDto {
  bot_name?: string;
  webhook_url?: string;
  webhook_secret?: string;
  welcome_message?: string;
  payment_instructions?: string;
  is_active?: boolean;
  settings?: Record<string, any>;
}

@Injectable()
export class TelegramBotService {
  constructor(
    @InjectRepository(TelegramBot)
    private botRepository: Repository<TelegramBot>,
    @InjectRepository(TelegramGroup)
    private groupRepository: Repository<TelegramGroup>,
    private telegramApiService: TelegramApiService,
  ) {}

  async create(tenantId: string, createBotDto: CreateBotDto): Promise<TelegramBot> {
    // Check if bot with same token already exists
    const existing = await this.botRepository.findOne({
      where: { bot_token: createBotDto.bot_token },
    });

    if (existing) {
      throw new ConflictException('Bot with this token already exists');
    }

    // Verify bot token with Telegram API
    const botInfo = await this.telegramApiService.verifyBotToken(createBotDto.bot_token);
    if (!botInfo) {
      throw new ConflictException('Invalid bot token');
    }

    const bot = this.botRepository.create({
      ...createBotDto,
      bot_username: createBotDto.bot_username || botInfo.username,
      tenant_id: tenantId,
      is_active: true,
      settings: createBotDto.settings || {},
    });

    return this.botRepository.save(bot);
  }

  async findAllByTenant(tenantId: string): Promise<TelegramBot[]> {
    return this.botRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findById(tenantId: string, botId: string): Promise<TelegramBot> {
    const bot = await this.botRepository.findOne({
      where: { id: botId, tenant_id: tenantId },
      relations: ['groups'],
    });

    if (!bot) {
      throw new NotFoundException(`Bot with ID ${botId} not found`);
    }

    return bot;
  }

  async update(
    tenantId: string, 
    botId: string, 
    updateBotDto: UpdateBotDto
  ): Promise<TelegramBot> {
    const bot = await this.findById(tenantId, botId);
    Object.assign(bot, updateBotDto);
    return this.botRepository.save(bot);
  }

  async delete(tenantId: string, botId: string): Promise<void> {
    const bot = await this.findById(tenantId, botId);
    await this.botRepository.remove(bot);
  }

  async connectGroup(
    tenantId: string,
    botId: string,
    groupData: {
      group_id: string;
      group_name: string;
      group_type: string;
      member_count?: number;
      settings?: Record<string, any>;
    }
  ): Promise<TelegramGroup> {
    const bot = await this.findById(tenantId, botId);

    // Check if group already connected
    const existing = await this.groupRepository.findOne({
      where: { telegram_chat_id: parseInt(groupData.group_id) },
    });

    if (existing) {
      throw new ConflictException('Group already connected');
    }

    // Verify group exists and bot has access
    const chatInfo = await this.telegramApiService.getChatInfo(
      bot.bot_token,
      parseInt(groupData.group_id)
    );
    
    if (!chatInfo) {
      throw new ConflictException('Cannot access group with this bot token');
    }

    // Check if bot is admin in the group
    const isAdmin = await this.telegramApiService.isBotAdminInChat(
      bot.bot_token,
      parseInt(groupData.group_id)
    );

    if (!isAdmin) {
      throw new ConflictException('Bot must be an administrator in the group');
    }

    const group = this.groupRepository.create({
      telegram_chat_id: parseInt(groupData.group_id),
      group_name: chatInfo.title || groupData.group_name,
      group_type: chatInfo.type as any,
      member_count: chatInfo.member_count || 0,
      project_id: bot.id, // Using bot.id as project_id for legacy compatibility
      tenant_id: tenantId,
      is_active: true,
      settings: groupData.settings || {},
    });

    return this.groupRepository.save(group);
  }

  async disconnectGroup(tenantId: string, botId: string, groupId: string): Promise<void> {
    const bot = await this.findById(tenantId, botId);
    
    const group = await this.groupRepository.findOne({
      where: { 
        id: groupId, 
        project_id: bot.id, // Using bot.id as project_id for legacy compatibility
        tenant_id: tenantId 
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    await this.groupRepository.remove(group);
  }

  async getGroups(tenantId: string, botId: string): Promise<TelegramGroup[]> {
    const bot = await this.findById(tenantId, botId);
    
    return this.groupRepository.find({
      where: { 
        project_id: bot.id, // Using bot.id as project_id for legacy compatibility
        tenant_id: tenantId 
      },
      order: { created_at: 'DESC' },
    });
  }

  async sendMessage(
    tenantId: string,
    botId: string,
    groupId: string,
    message: string,
    options?: { parse_mode?: 'HTML' | 'Markdown' }
  ): Promise<boolean> {
    const bot = await this.findById(tenantId, botId);
    
    const group = await this.groupRepository.findOne({
      where: { 
        id: groupId, 
        project_id: bot.id, // Using bot.id as project_id for legacy compatibility
        tenant_id: tenantId 
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    return this.telegramApiService.sendMessage(
      bot.bot_token,
      group.telegram_chat_id,
      message,
      options
    );
  }

  async kickMember(
    tenantId: string,
    botId: string,
    groupId: string,
    userId: number
  ): Promise<boolean> {
    const bot = await this.findById(tenantId, botId);
    
    const group = await this.groupRepository.findOne({
      where: { 
        id: groupId, 
        project_id: bot.id, // Using bot.id as project_id for legacy compatibility
        tenant_id: tenantId 
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    return this.telegramApiService.kickChatMember(
      bot.bot_token,
      group.telegram_chat_id,
      userId
    );
  }

  async generateInviteLink(
    tenantId: string,
    botId: string,
    groupId: string,
    expireDate?: Date,
    memberLimit?: number
  ): Promise<string | null> {
    const bot = await this.findById(tenantId, botId);
    
    const group = await this.groupRepository.findOne({
      where: { 
        id: groupId, 
        project_id: bot.id, // Using bot.id as project_id for legacy compatibility
        tenant_id: tenantId 
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    return this.telegramApiService.generateInviteLink(
      bot.bot_token,
      group.telegram_chat_id,
      expireDate,
      memberLimit
    );
  }
}