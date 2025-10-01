import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelegramGroup, ConnectionStatus } from '../../src/modules/telegram-groups/telegram-groups.entity';
import { TelegramBot } from '../../src/modules/bot/entities/telegram-bot.entity';
import { Tenant } from '../../src/modules/tenant/entities/tenant.entity';
import { TelegramGroupsService } from '../../src/modules/telegram-groups/telegram-groups.service';
import { CreateTelegramGroupDto } from '../../src/modules/telegram-groups/dto/create-telegram-group.dto';
import { UpdateTelegramGroupDto } from '../../src/modules/telegram-groups/dto/update-telegram-group.dto';
import { AppModule } from '../../src/app.module';
import { randomUUID } from 'crypto';

describe('Telegram Groups CRUD Workflow - Integration Test', () => {
  let app: INestApplication;
  let telegramGroupsService: TelegramGroupsService;
  let telegramGroupRepository: Repository<TelegramGroup>;
  let telegramBotRepository: Repository<TelegramBot>;
  let tenantRepository: Repository<Tenant>;
  let testTenantId: string;
  let ownerUserId: string;
  let testBotId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    telegramGroupsService = moduleFixture.get<TelegramGroupsService>(TelegramGroupsService);
    telegramGroupRepository = moduleFixture.get<Repository<TelegramGroup>>(
      getRepositoryToken(TelegramGroup),
    );
    telegramBotRepository = moduleFixture.get<Repository<TelegramBot>>(
      getRepositoryToken(TelegramBot),
    );
    tenantRepository = moduleFixture.get<Repository<Tenant>>(getRepositoryToken(Tenant));

    // Setup test tenant and owner user
    ownerUserId = randomUUID();

    // Create test tenant
    const testTenant = tenantRepository.create({
      name: 'Test Tenant CRUD',
      company_name: 'Test Company CRUD',
    });
    await tenantRepository.save(testTenant);
    testTenantId = testTenant.id;

    // Create a test bot for the groups
    const testBot = telegramBotRepository.create({
      id: randomUUID(),
      tenant_id: testTenantId,
      bot_name: 'Test Bot CRUD',
      bot_token: 'test-bot-token-crud-123456',
      bot_username: 'test_crud_bot',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await telegramBotRepository.save(testBot);
    testBotId = testBot.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await telegramGroupRepository.delete({ tenant_id: testTenantId });
    await telegramBotRepository.delete({ tenant_id: testTenantId });
    await tenantRepository.delete({ id: testTenantId });
    await app.close();
  });

  beforeEach(async () => {
    // Clean up telegram groups before each test
    await telegramGroupRepository.delete({ tenant_id: testTenantId });
  });

  describe('Create Telegram Group', () => {
    it('should create telegram group with correct database record', async () => {
      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'VIP Premium Group',
        description: 'Premium content for VIP members',
        bot_id: testBotId,
        settings: {
          welcome_message: 'Welcome to our VIP group!',
          auto_approve: false,
        },
      };

      const result = await telegramGroupsService.create(createGroupDto, testTenantId);

      // Verify service response
      expect(result).toMatchObject({
        id: expect.any(String),
        group_name: createGroupDto.group_name,
        description: createGroupDto.description,
        bot_id: testBotId,
        group_type: 'group', // Default value
        telegram_chat_id: null,
        is_active: true,
        bot_assigned: false,
        connection_status: 'pending',
        sync_enabled: false,
        last_sync_at: null,
        sync_errors: null,
        settings: createGroupDto.settings,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });

      // Verify database record
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: result.id },
        relations: ['bot'],
      });

      expect(dbGroup).toMatchObject({
        id: result.id,
        tenant_id: testTenantId,
        group_name: createGroupDto.group_name,
        description: createGroupDto.description,
        bot_id: testBotId,
        group_type: 'group',
        is_active: true,
        bot_assigned: false,
        connection_status: 'pending',
        sync_enabled: false,
        member_count: 0,
      });

      expect(dbGroup.bot).toMatchObject({
        id: testBotId,
        bot_name: 'Test Bot CRUD',
      });
    });

    it('should create telegram group with minimum required fields', async () => {
      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'Basic Group',
        bot_id: testBotId,
      };

      const result = await telegramGroupsService.create(createGroupDto, testTenantId);

      expect(result).toMatchObject({
        group_name: createGroupDto.group_name,
        description: null,
        bot_id: testBotId,
        settings: {},
      });

      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: result.id },
      });

      expect(dbGroup.description).toBeNull();
      expect(dbGroup.settings).toEqual({});
    });

    it('should enforce tenant isolation on creation', async () => {
      // Create other tenant
      const otherTenant = tenantRepository.create({
        name: 'Other Tenant',
        company_name: 'Other Company',
      });
      await tenantRepository.save(otherTenant);
      const otherTenantId = otherTenant.id;

      // Create bot for other tenant
      const otherBot = telegramBotRepository.create({
        id: randomUUID(),
        tenant_id: otherTenantId,
        bot_name: 'Other Tenant Bot',
        bot_token: 'other-bot-token-123456',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await telegramBotRepository.save(otherBot);

      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'Other Tenant Group',
        bot_id: otherBot.id,
      };

      const result = await telegramGroupsService.create(createGroupDto, otherTenantId);

      // Verify group is created in other tenant
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: result.id },
      });

      expect(dbGroup.tenant_id).toBe(otherTenantId);

      // Verify tenant isolation
      const currentTenantGroups = await telegramGroupRepository.find({
        where: { tenant_id: testTenantId },
      });

      expect(currentTenantGroups.find((g) => g.id === result.id)).toBeUndefined();

      // Cleanup
      await telegramGroupRepository.delete({ id: result.id });
      await telegramBotRepository.delete({ id: otherBot.id });
      await tenantRepository.delete({ id: otherTenantId });
    });
  });

  describe('Read Telegram Groups', () => {
    let testGroups: TelegramGroup[];

    beforeEach(async () => {
      // Create test groups
      const group1Dto: CreateTelegramGroupDto = {
        group_name: 'VIP Group 1',
        description: 'First VIP group',
        bot_id: testBotId,
      };

      const group2Dto: CreateTelegramGroupDto = {
        group_name: 'VIP Group 2',
        description: 'Second VIP group',
        bot_id: testBotId,
      };

      testGroups = [];
      testGroups.push(await telegramGroupsService.create(group1Dto, testTenantId));
      testGroups.push(await telegramGroupsService.create(group2Dto, testTenantId));
    });

    it('should list telegram groups with pagination', async () => {
      const result = await telegramGroupsService.findAll(testTenantId, {
        page: 1,
        limit: 10,
      });

      expect(result).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: testGroups[0].id,
            group_name: 'VIP Group 1',
          }),
          expect.objectContaining({
            id: testGroups[1].id,
            group_name: 'VIP Group 2',
          }),
        ]),
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should filter groups by connectionStatus', async () => {
      const result = await telegramGroupsService.findAll(testTenantId, {
        connectionStatus: 'pending' as ConnectionStatus,
        page: 1,
        limit: 10,
      });

      expect(result.groups).toHaveLength(2);
      result.groups.forEach((group) => {
        expect(group.connection_status).toBe('pending');
      });
    });

    it('should get telegram group by ID', async () => {
      const result = await telegramGroupsService.findOne(testGroups[0].id, testTenantId);

      expect(result).toMatchObject({
        id: testGroups[0].id,
        group_name: 'VIP Group 1',
        description: 'First VIP group',
        bot: expect.objectContaining({
          id: testBotId,
        }),
      });
    });

    it('should throw error for non-existent group ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const result = await telegramGroupsService.findOne(nonExistentId, testTenantId);
      expect(result).toBeNull();
    });

    it('should enforce tenant isolation on read', async () => {
      const otherTenantId = randomUUID();

      const result = await telegramGroupsService.findOne(testGroups[0].id, otherTenantId);
      expect(result).toBeNull();
    });
  });

  describe('Update Telegram Group', () => {
    let testGroup: TelegramGroup;

    beforeEach(async () => {
      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'Original Group Name',
        description: 'Original description',
        bot_id: testBotId,
        settings: { welcome_message: 'Original welcome' },
      };

      testGroup = await telegramGroupsService.create(createGroupDto, testTenantId);
    });

    it('should update telegram group with all fields', async () => {
      const updateGroupDto: UpdateTelegramGroupDto = {
        group_name: 'Updated Group Name',
        description: 'Updated description for testing',
        sync_enabled: true,
        settings: {
          welcome_message: 'Updated welcome message!',
          auto_approve: true,
        },
      };

      const result = await telegramGroupsService.update(
        testGroup.id,
        updateGroupDto,
        testTenantId,
      );

      expect(result).toMatchObject({
        id: testGroup.id,
        group_name: updateGroupDto.group_name,
        description: updateGroupDto.description,
        sync_enabled: updateGroupDto.sync_enabled,
        settings: updateGroupDto.settings,
        updated_at: expect.any(Date),
      });

      // Verify database record
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: testGroup.id },
      });

      expect(dbGroup).toMatchObject({
        group_name: updateGroupDto.group_name,
        description: updateGroupDto.description,
        sync_enabled: updateGroupDto.sync_enabled,
        settings: updateGroupDto.settings,
      });
    });

    it('should update telegram group with partial fields', async () => {
      const updateGroupDto: UpdateTelegramGroupDto = {
        group_name: 'Partially Updated Name',
      };

      const result = await telegramGroupsService.update(
        testGroup.id,
        updateGroupDto,
        testTenantId,
      );

      expect(result).toMatchObject({
        group_name: updateGroupDto.group_name,
        description: 'Original description', // Should remain unchanged
      });
    });

    it('should prevent duplicate group names within tenant', async () => {
      // Create another group
      const anotherGroupDto: CreateTelegramGroupDto = {
        group_name: 'Another Group',
        bot_id: testBotId,
      };
      await telegramGroupsService.create(anotherGroupDto, testTenantId);

      // Try to update first group to have same name as second
      const updateGroupDto: UpdateTelegramGroupDto = {
        group_name: 'Another Group',
      };

      await expect(
        telegramGroupsService.update(testGroup.id, updateGroupDto, testTenantId),
      ).rejects.toThrow('already exists');
    });

    it('should enforce tenant isolation on update', async () => {
      const otherTenantId = randomUUID();
      const updateGroupDto: UpdateTelegramGroupDto = {
        group_name: 'Cross Tenant Update',
      };

      await expect(
        telegramGroupsService.update(testGroup.id, updateGroupDto, otherTenantId),
      ).rejects.toThrow('Telegram group not found');
    });
  });

  describe('Delete Telegram Group', () => {
    let testGroup: TelegramGroup;

    beforeEach(async () => {
      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'Group to Delete',
        description: 'This group will be deleted',
        bot_id: testBotId,
      };

      testGroup = await telegramGroupsService.create(createGroupDto, testTenantId);
    });

    it('should delete telegram group successfully', async () => {
      await telegramGroupsService.remove(testGroup.id, testTenantId);

      // Verify group is deleted from database
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: testGroup.id },
      });

      expect(dbGroup).toBeNull();
    });

    it('should soft delete telegram group', async () => {
      const result = await telegramGroupsService.remove(testGroup.id, testTenantId);
      expect(result).toBe(true);

      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: testGroup.id },
      });

      expect(dbGroup).toBeNull();
    });

    it('should throw error for non-existent group', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      await expect(
        telegramGroupsService.remove(testTenantId, nonExistentId),
      ).rejects.toThrow('Telegram group not found');
    });

    it('should enforce tenant isolation on delete', async () => {
      const otherTenantId = randomUUID();

      await expect(
        telegramGroupsService.remove(otherTenantId, testGroup.id),
      ).rejects.toThrow('Telegram group not found');

      // Verify group still exists in original tenant
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: testGroup.id },
      });

      expect(dbGroup).toBeDefined();
    });
  });

  describe('Business Logic Validation', () => {
    it('should prevent creation with non-existent bot', async () => {
      const nonExistentBotId = '123e4567-e89b-12d3-a456-426614174000';
      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'Invalid Bot Group',
        bot_id: nonExistentBotId,
      };

      await expect(
        telegramGroupsService.create(createGroupDto, testTenantId),
      ).rejects.toThrow('Bot not found');
    });

    it('should prevent creation with bot from different tenant', async () => {
      // Create other tenant
      const otherTenant = tenantRepository.create({
        name: 'Other Tenant Bot',
        company_name: 'Other Company Bot',
      });
      await tenantRepository.save(otherTenant);
      const otherTenantId = otherTenant.id;

      // Create bot for other tenant
      const otherBot = telegramBotRepository.create({
        id: randomUUID(),
        tenant_id: otherTenantId,
        bot_name: 'Other Tenant Bot',
        bot_token: 'other-bot-token-123456',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await telegramBotRepository.save(otherBot);

      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'Cross Tenant Bot Group',
        bot_id: otherBot.id,
      };

      await expect(
        telegramGroupsService.create(createGroupDto, testTenantId),
      ).rejects.toThrow('Bot not found');

      // Cleanup
      await telegramBotRepository.delete({ id: otherBot.id });
      await tenantRepository.delete({ id: otherTenantId });
    });

    it('should prevent sync_enabled when bot_assigned is false', async () => {
      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'Test Sync Group',
        bot_id: testBotId,
      };

      const group = await telegramGroupsService.create(createGroupDto, testTenantId);

      const updateGroupDto: UpdateTelegramGroupDto = {
        sync_enabled: true, // Should fail since bot_assigned is false
      };

      await expect(
        telegramGroupsService.update(group.id, updateGroupDto, testTenantId),
      ).rejects.toThrow('Cannot enable sync');
    });
  });

  describe('Default Values and Constraints', () => {
    it('should set correct default values for new groups', async () => {
      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'Default Values Group',
        bot_id: testBotId,
      };

      const result = await telegramGroupsService.create(createGroupDto, testTenantId);

      expect(result).toMatchObject({
        group_type: 'group',
        telegram_chat_id: null,
        username: null,
        invite_link: null,
        member_count: 0,
        is_active: true,
        bot_assigned: false,
        connection_status: 'pending',
        sync_enabled: false,
        last_sync_at: null,
        sync_errors: null,
        settings: {},
      });
    });
  });
});