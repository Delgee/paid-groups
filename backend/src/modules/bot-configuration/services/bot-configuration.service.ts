import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BotConfiguration } from '../entities/bot-configuration.entity';
import { CreateBotConfigurationDto } from '../dto/create-bot-configuration.dto';
import { UpdateBotConfigurationDto } from '../dto/update-bot-configuration.dto';

@Injectable()
export class BotConfigurationService {
  private readonly logger = new Logger(BotConfigurationService.name);

  constructor(
    @InjectRepository(BotConfiguration)
    private readonly botConfigurationRepository: Repository<BotConfiguration>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateBotConfigurationDto,
  ): Promise<BotConfiguration> {
    this.logger.log(`Creating bot configuration for tenant ${tenantId}`);

    // Check for duplicate bot_token
    const existingBot = await this.botConfigurationRepository.findOne({
      where: { bot_token: createDto.bot_token },
    });

    if (existingBot) {
      this.logger.warn(`Duplicate bot_token attempted: ${createDto.bot_token}`);
      throw new ConflictException({
        error: {
          code: 'DUPLICATE_BOT_TOKEN',
          message: 'This bot token is already registered. Please use a different bot.',
          details: { field: 'bot_token' },
        },
      });
    }

    const botConfiguration = this.botConfigurationRepository.create({
      ...createDto,
      tenant_id: tenantId,
    });

    const saved = await this.botConfigurationRepository.save(botConfiguration);
    this.logger.log(`Bot configuration created: ${saved.id}`);

    return saved;
  }

  async findAll(tenantId: string): Promise<BotConfiguration[]> {
    this.logger.log(`Fetching all bot configurations for tenant ${tenantId}`);

    return this.botConfigurationRepository.find({
      where: { tenant_id: tenantId },
      order: { created_at: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string): Promise<BotConfiguration> {
    this.logger.log(`Fetching bot configuration ${id} for tenant ${tenantId}`);

    const botConfiguration = await this.botConfigurationRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!botConfiguration) {
      throw new NotFoundException({
        error: {
          code: 'BOT_CONFIGURATION_NOT_FOUND',
          message: 'Bot configuration not found',
        },
      });
    }

    return botConfiguration;
  }

  async findByBotToken(botToken: string): Promise<BotConfiguration | null> {
    return this.botConfigurationRepository.findOne({
      where: { bot_token: botToken },
    });
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateBotConfigurationDto,
  ): Promise<BotConfiguration> {
    this.logger.log(`Updating bot configuration ${id} for tenant ${tenantId}`);

    const botConfiguration = await this.findOne(tenantId, id);

    // If updating bot_token, check for duplicates
    if (updateDto.bot_token && updateDto.bot_token !== botConfiguration.bot_token) {
      const existingBot = await this.botConfigurationRepository.findOne({
        where: { bot_token: updateDto.bot_token },
      });

      if (existingBot) {
        throw new ConflictException({
          error: {
            code: 'DUPLICATE_BOT_TOKEN',
            message: 'This bot token is already registered',
            details: { field: 'bot_token' },
          },
        });
      }
    }

    Object.assign(botConfiguration, updateDto);
    const updated = await this.botConfigurationRepository.save(botConfiguration);

    this.logger.log(`Bot configuration updated: ${id}`);
    return updated;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting bot configuration ${id} for tenant ${tenantId}`);

    const botConfiguration = await this.findOne(tenantId, id);
    await this.botConfigurationRepository.remove(botConfiguration);

    this.logger.log(`Bot configuration deleted: ${id}`);
  }

  async syncTelegramInfo(
    tenantId: string,
    id: string,
  ): Promise<BotConfiguration> {
    this.logger.log(`Syncing Telegram info for bot ${id}`);

    const botConfiguration = await this.findOne(tenantId, id);

    // TODO: Call Telegram API to get bot info
    // const botInfo = await this.telegramService.getBotInfo(botConfiguration.bot_token);

    botConfiguration.last_sync_at = new Date();
    return this.botConfigurationRepository.save(botConfiguration);
  }
}
