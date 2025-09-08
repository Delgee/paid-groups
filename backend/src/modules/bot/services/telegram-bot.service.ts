import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramBot } from '../entities/telegram-bot.entity';
import { TelegramGroup } from '../entities/telegram-group.entity';

export interface CreateBotDto {
  bot_token: string;
  bot_username?: string;
  bot_name: string;
  webhook_url?: string;
  welcome_message?: string;
  payment_instructions?: string;
  settings?: Record<string, any>;
}

export interface UpdateBotDto {
  bot_name?: string;
  webhook_url?: string;
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
  ) {}

  async create(tenantId: string, createBotDto: CreateBotDto): Promise<TelegramBot> {
    // Check if bot with same token already exists
    const existing = await this.botRepository.findOne({
      where: { bot_token: createBotDto.bot_token },
    });

    if (existing) {
      throw new ConflictException('Bot with this token already exists');
    }

    const bot = this.botRepository.create({
      ...createBotDto,
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
      relations: ['telegram_groups'],
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

    const group = this.groupRepository.create({
      telegram_chat_id: parseInt(groupData.group_id),
      group_name: groupData.group_name,
      group_type: groupData.group_type as any,
      member_count: groupData.member_count || 0,
      bot_id: bot.id,
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
        bot_id: bot.id,
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
        bot_id: bot.id,
        tenant_id: tenantId 
      },
      order: { created_at: 'DESC' },
    });
  }

  async sendMessage(
    tenantId: string,
    botId: string,
    groupId: string,
    message: string
  ): Promise<void> {
    const bot = await this.findById(tenantId, botId);
    
    const group = await this.groupRepository.findOne({
      where: { 
        id: groupId, 
        bot_id: bot.id,
        tenant_id: tenantId 
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    // TODO: Implement actual Telegram API call using Telegraph
    console.log(`Sending message to group ${group.telegram_chat_id}: ${message}`);
  }
}