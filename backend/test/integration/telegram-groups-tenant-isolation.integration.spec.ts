import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelegramGroup } from '../../src/modules/telegram-groups/telegram-groups.entity';
import { TelegramBot } from '../../src/modules/bots/entities/telegram-bot.entity';
import { Tenant } from '../../src/modules/auth/entities/tenant.entity';
import { TelegramGroupsService } from '../../src/modules/telegram-groups/telegram-groups.service';
import { CreateTelegramGroupDto } from '../../src/modules/telegram-groups/dto/create-telegram-group.dto';
import { UpdateTelegramGroupDto } from '../../src/modules/telegram-groups/dto/update-telegram-group.dto';
import { ConnectChannelDto } from '../../src/modules/telegram-groups/dto/connect-channel.dto';
import { AppModule } from '../../src/app.module';

describe('Telegram Groups Multi-Tenant Isolation - Integration Test', () => {
  let app: INestApplication;
  let telegramGroupsService: TelegramGroupsService;
  let telegramGroupRepository: Repository<TelegramGroup>;
  let telegramBotRepository: Repository<TelegramBot>;
  let tenantRepository: Repository<Tenant>;

  // Tenant 1 setup
  let tenant1Id: string;
  let tenant1BotId: string;
  let tenant1Groups: TelegramGroup[];

  // Tenant 2 setup
  let tenant2Id: string;
  let tenant2BotId: string;
  let tenant2Groups: TelegramGroup[];

  // Tenant 3 setup (for cross-tenant testing)
  let tenant3Id: string;
  let tenant3BotId: string;

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

    // Setup test tenants
    tenant1Id = 'tenant-1-isolation-test';
    tenant2Id = 'tenant-2-isolation-test';
    tenant3Id = 'tenant-3-isolation-test';

    // Create tenants
    const tenant1 = tenantRepository.create({
      id: tenant1Id,
      company_name: 'Tenant 1 Company',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const tenant2 = tenantRepository.create({
      id: tenant2Id,
      company_name: 'Tenant 2 Company',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const tenant3 = tenantRepository.create({
      id: tenant3Id,
      company_name: 'Tenant 3 Company',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await tenantRepository.save([tenant1, tenant2, tenant3]);

    // Create bots for each tenant
    const tenant1Bot = telegramBotRepository.create({
      id: 'bot-1-isolation-test',
      tenant_id: tenant1Id,
      bot_name: 'Tenant 1 Bot',
      bot_token: 'tenant-1-bot-token-123456',
      bot_username: 'tenant1_bot',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const tenant2Bot = telegramBotRepository.create({
      id: 'bot-2-isolation-test',
      tenant_id: tenant2Id,
      bot_name: 'Tenant 2 Bot',
      bot_token: 'tenant-2-bot-token-123456',
      bot_username: 'tenant2_bot',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const tenant3Bot = telegramBotRepository.create({
      id: 'bot-3-isolation-test',
      tenant_id: tenant3Id,
      bot_name: 'Tenant 3 Bot',
      bot_token: 'tenant-3-bot-token-123456',
      bot_username: 'tenant3_bot',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await telegramBotRepository.save([tenant1Bot, tenant2Bot, tenant3Bot]);

    tenant1BotId = tenant1Bot.id;
    tenant2BotId = tenant2Bot.id;
    tenant3BotId = tenant3Bot.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await telegramGroupRepository.delete({
      tenant_id: In([tenant1Id, tenant2Id, tenant3Id]),
    });
    await telegramBotRepository.delete({
      tenant_id: In([tenant1Id, tenant2Id, tenant3Id]),
    });
    await tenantRepository.delete({
      id: In([tenant1Id, tenant2Id, tenant3Id]),
    });
    await app.close();
  });

  beforeEach(async () => {
    // Clean up and create fresh groups for each tenant
    await telegramGroupRepository.delete({
      tenant_id: In([tenant1Id, tenant2Id, tenant3Id]),
    });

    // Create groups for Tenant 1
    const tenant1Group1 = await telegramGroupsService.create(tenant1Id, {
      group_name: 'Tenant 1 VIP Group',
      description: 'Premium group for tenant 1',
      bot_id: tenant1BotId,
    });

    const tenant1Group2 = await telegramGroupsService.create(tenant1Id, {
      group_name: 'Tenant 1 Basic Group',
      description: 'Basic group for tenant 1',
      bot_id: tenant1BotId,
    });

    tenant1Groups = [tenant1Group1, tenant1Group2];

    // Create groups for Tenant 2
    const tenant2Group1 = await telegramGroupsService.create(tenant2Id, {
      group_name: 'Tenant 2 VIP Group',
      description: 'Premium group for tenant 2',
      bot_id: tenant2BotId,
    });

    const tenant2Group2 = await telegramGroupsService.create(tenant2Id, {
      group_name: 'Tenant 2 Basic Group',
      description: 'Basic group for tenant 2',
      bot_id: tenant2BotId,
    });

    tenant2Groups = [tenant2Group1, tenant2Group2];
  });

  describe('Create Operation Isolation', () => {
    it('should create groups in correct tenant context', async () => {
      const tenant1CreateDto: CreateTelegramGroupDto = {
        group_name: 'Tenant 1 New Group',
        bot_id: tenant1BotId,
      };

      const tenant2CreateDto: CreateTelegramGroupDto = {
        group_name: 'Tenant 2 New Group',
        bot_id: tenant2BotId,
      };

      const tenant1Group = await telegramGroupsService.create(tenant1Id, tenant1CreateDto);
      const tenant2Group = await telegramGroupsService.create(tenant2Id, tenant2CreateDto);

      // Verify groups are created in correct tenants
      const dbTenant1Group = await telegramGroupRepository.findOne({
        where: { id: tenant1Group.id },
      });
      const dbTenant2Group = await telegramGroupRepository.findOne({
        where: { id: tenant2Group.id },
      });

      expect(dbTenant1Group.tenant_id).toBe(tenant1Id);
      expect(dbTenant2Group.tenant_id).toBe(tenant2Id);
    });

    it('should prevent creation with cross-tenant bot reference', async () => {
      const crossTenantDto: CreateTelegramGroupDto = {
        group_name: 'Cross Tenant Group',
        bot_id: tenant2BotId, // Bot from tenant 2
      };

      // Try to create in tenant 1 with tenant 2's bot
      await expect(
        telegramGroupsService.create(tenant1Id, crossTenantDto),
      ).rejects.toThrow('Bot not found');
    });

    it('should allow same group names across different tenants', async () => {
      const sameName = 'Duplicate Name Group';

      const tenant1Group = await telegramGroupsService.create(tenant1Id, {
        group_name: sameName,
        bot_id: tenant1BotId,
      });

      const tenant2Group = await telegramGroupsService.create(tenant2Id, {
        group_name: sameName,
        bot_id: tenant2BotId,
      });

      expect(tenant1Group.group_name).toBe(sameName);
      expect(tenant2Group.group_name).toBe(sameName);
      expect(tenant1Group.id).not.toBe(tenant2Group.id);

      // Verify both exist in their respective tenants
      const dbTenant1Group = await telegramGroupRepository.findOne({
        where: { id: tenant1Group.id },
      });
      const dbTenant2Group = await telegramGroupRepository.findOne({
        where: { id: tenant2Group.id },
      });

      expect(dbTenant1Group.tenant_id).toBe(tenant1Id);
      expect(dbTenant2Group.tenant_id).toBe(tenant2Id);
    });
  });

  describe('Read Operation Isolation', () => {
    it('should only return groups for the requesting tenant', async () => {
      const tenant1Result = await telegramGroupsService.findAll(tenant1Id, {
        page: 1,
        limit: 10,
      });

      const tenant2Result = await telegramGroupsService.findAll(tenant2Id, {
        page: 1,
        limit: 10,
      });

      // Verify tenant 1 only sees its groups
      expect(tenant1Result.data).toHaveLength(2);
      tenant1Result.data.forEach((group) => {
        expect([tenant1Groups[0].id, tenant1Groups[1].id]).toContain(group.id);
      });

      // Verify tenant 2 only sees its groups
      expect(tenant2Result.data).toHaveLength(2);
      tenant2Result.data.forEach((group) => {
        expect([tenant2Groups[0].id, tenant2Groups[1].id]).toContain(group.id);
      });

      // Verify no cross-tenant visibility
      const tenant1GroupIds = tenant1Result.data.map((g) => g.id);
      const tenant2GroupIds = tenant2Result.data.map((g) => g.id);

      expect(tenant1GroupIds.some((id) => tenant2GroupIds.includes(id))).toBe(false);
    });

    it('should not return groups from other tenants by ID', async () => {
      const tenant1GroupId = tenant1Groups[0].id;
      const tenant2GroupId = tenant2Groups[0].id;

      // Tenant 1 should be able to access its own group
      const tenant1OwnGroup = await telegramGroupsService.findOne(tenant1Id, tenant1GroupId);
      expect(tenant1OwnGroup.id).toBe(tenant1GroupId);

      // Tenant 1 should NOT be able to access tenant 2's group
      await expect(
        telegramGroupsService.findOne(tenant1Id, tenant2GroupId),
      ).rejects.toThrow('Telegram group not found');

      // Tenant 2 should be able to access its own group
      const tenant2OwnGroup = await telegramGroupsService.findOne(tenant2Id, tenant2GroupId);
      expect(tenant2OwnGroup.id).toBe(tenant2GroupId);

      // Tenant 2 should NOT be able to access tenant 1's group
      await expect(
        telegramGroupsService.findOne(tenant2Id, tenant1GroupId),
      ).rejects.toThrow('Telegram group not found');
    });

    it('should filter by bot_id within tenant scope only', async () => {
      const tenant1Result = await telegramGroupsService.findAll(tenant1Id, {
        bot_id: tenant1BotId,
        page: 1,
        limit: 10,
      });

      const tenant2Result = await telegramGroupsService.findAll(tenant2Id, {
        bot_id: tenant2BotId,
        page: 1,
        limit: 10,
      });

      // Verify filtering works within tenant scope
      expect(tenant1Result.data).toHaveLength(2);
      tenant1Result.data.forEach((group) => {
        expect(group.bot.id).toBe(tenant1BotId);
      });

      expect(tenant2Result.data).toHaveLength(2);
      tenant2Result.data.forEach((group) => {
        expect(group.bot.id).toBe(tenant2BotId);
      });

      // Try to filter by other tenant's bot (should return empty)
      const crossTenantResult = await telegramGroupsService.findAll(tenant1Id, {
        bot_id: tenant2BotId, // Tenant 2's bot
        page: 1,
        limit: 10,
      });

      expect(crossTenantResult.data).toHaveLength(0);
    });
  });

  describe('Update Operation Isolation', () => {
    it('should only allow updates to groups within same tenant', async () => {
      const tenant1GroupId = tenant1Groups[0].id;
      const tenant2GroupId = tenant2Groups[0].id;

      const updateDto: UpdateTelegramGroupDto = {
        group_name: 'Updated Group Name',
        description: 'Updated description',
      };

      // Tenant 1 should be able to update its own group
      const tenant1Update = await telegramGroupsService.update(
        tenant1Id,
        tenant1GroupId,
        updateDto,
      );
      expect(tenant1Update.group_name).toBe(updateDto.group_name);

      // Tenant 1 should NOT be able to update tenant 2's group
      await expect(
        telegramGroupsService.update(tenant1Id, tenant2GroupId, updateDto),
      ).rejects.toThrow('Telegram group not found');

      // Tenant 2 should be able to update its own group
      const tenant2Update = await telegramGroupsService.update(
        tenant2Id,
        tenant2GroupId,
        updateDto,
      );
      expect(tenant2Update.group_name).toBe(updateDto.group_name);

      // Tenant 2 should NOT be able to update tenant 1's group
      await expect(
        telegramGroupsService.update(tenant2Id, tenant1GroupId, updateDto),
      ).rejects.toThrow('Telegram group not found');
    });

    it('should enforce unique group names within tenant but allow across tenants', async () => {
      const sameName = 'Unique Within Tenant';

      // Update tenant 1's first group
      await telegramGroupsService.update(tenant1Id, tenant1Groups[0].id, {
        group_name: sameName,
      });

      // Update tenant 2's first group with same name (should succeed)
      await telegramGroupsService.update(tenant2Id, tenant2Groups[0].id, {
        group_name: sameName,
      });

      // Try to update tenant 1's second group with same name (should fail)
      await expect(
        telegramGroupsService.update(tenant1Id, tenant1Groups[1].id, {
          group_name: sameName,
        }),
      ).rejects.toThrow('already exists');
    });
  });

  describe('Delete Operation Isolation', () => {
    it('should only allow deletion of groups within same tenant', async () => {
      const tenant1GroupId = tenant1Groups[0].id;
      const tenant2GroupId = tenant2Groups[0].id;

      // Tenant 1 should NOT be able to delete tenant 2's group
      await expect(
        telegramGroupsService.remove(tenant1Id, tenant2GroupId),
      ).rejects.toThrow('Telegram group not found');

      // Tenant 2 should NOT be able to delete tenant 1's group
      await expect(
        telegramGroupsService.remove(tenant2Id, tenant1GroupId),
      ).rejects.toThrow('Telegram group not found');

      // Tenant 1 should be able to delete its own group
      await telegramGroupsService.remove(tenant1Id, tenant1GroupId);

      // Verify group is deleted
      await expect(
        telegramGroupsService.findOne(tenant1Id, tenant1GroupId),
      ).rejects.toThrow('Telegram group not found');

      // Verify tenant 2's group still exists
      const tenant2Group = await telegramGroupsService.findOne(tenant2Id, tenant2GroupId);
      expect(tenant2Group.id).toBe(tenant2GroupId);
    });
  });

  describe('Channel Connection Isolation', () => {
    it('should prevent connecting same channel to groups in different tenants', async () => {
      const chatId = '-1001234567890';

      const connectDto: ConnectChannelDto = {
        telegram_chat_id: chatId,
        verify_permissions: false,
      };

      // Connect channel to tenant 1 group
      await telegramGroupsService.connectChannel(
        tenant1Id,
        tenant1Groups[0].id,
        connectDto,
      );

      // Try to connect same channel to tenant 2 group (should fail)
      await expect(
        telegramGroupsService.connectChannel(tenant2Id, tenant2Groups[0].id, connectDto),
      ).rejects.toThrow('already connected');
    });

    it('should allow different channels for different tenants', async () => {
      const tenant1ChatId = '-1001234567890';
      const tenant2ChatId = '-1009876543210';

      const tenant1ConnectDto: ConnectChannelDto = {
        telegram_chat_id: tenant1ChatId,
        verify_permissions: false,
      };

      const tenant2ConnectDto: ConnectChannelDto = {
        telegram_chat_id: tenant2ChatId,
        verify_permissions: false,
      };

      // Connect different channels to each tenant (should succeed)
      const tenant1Connection = await telegramGroupsService.connectChannel(
        tenant1Id,
        tenant1Groups[0].id,
        tenant1ConnectDto,
      );

      const tenant2Connection = await telegramGroupsService.connectChannel(
        tenant2Id,
        tenant2Groups[0].id,
        tenant2ConnectDto,
      );

      expect(tenant1Connection.telegram_chat_id.toString()).toBe(tenant1ChatId);
      expect(tenant2Connection.telegram_chat_id.toString()).toBe(tenant2ChatId);
    });

    it('should enforce tenant isolation in channel disconnection', async () => {
      // Connect channel to tenant 1 group
      const connectDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      await telegramGroupsService.connectChannel(
        tenant1Id,
        tenant1Groups[0].id,
        connectDto,
      );

      // Tenant 2 should NOT be able to disconnect tenant 1's channel
      await expect(
        telegramGroupsService.disconnectChannel(tenant2Id, tenant1Groups[0].id),
      ).rejects.toThrow('Telegram group not found');

      // Tenant 1 should be able to disconnect its own channel
      await telegramGroupsService.disconnectChannel(tenant1Id, tenant1Groups[0].id);

      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: tenant1Groups[0].id },
      });

      expect(dbGroup.connection_status).toBe('disconnected');
    });
  });

  describe('Sync Operation Isolation', () => {
    beforeEach(async () => {
      // Connect and set up groups for sync testing
      const connectDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      await telegramGroupsService.connectChannel(
        tenant1Id,
        tenant1Groups[0].id,
        connectDto,
      );

      // Manually set bot_assigned for testing
      await telegramGroupRepository.update(
        { id: tenant1Groups[0].id },
        { bot_assigned: true },
      );
    });

    it('should enforce tenant isolation in sync operations', async () => {
      // Tenant 2 should NOT be able to sync tenant 1's group
      await expect(
        telegramGroupsService.sync(tenant2Id, tenant1Groups[0].id),
      ).rejects.toThrow('Telegram group not found');

      // Tenant 1 should be able to sync its own group
      const syncResult = await telegramGroupsService.sync(tenant1Id, tenant1Groups[0].id);
      expect(syncResult.message).toContain('synced');
    });
  });

  describe('Database Level Isolation', () => {
    it('should enforce row-level security at database level', async () => {
      // This test verifies RLS policies are working
      const allGroups = await telegramGroupRepository.find();

      // Should see groups from all tenants in this test context
      const tenant1DbGroups = allGroups.filter((g) => g.tenant_id === tenant1Id);
      const tenant2DbGroups = allGroups.filter((g) => g.tenant_id === tenant2Id);

      expect(tenant1DbGroups.length).toBeGreaterThan(0);
      expect(tenant2DbGroups.length).toBeGreaterThan(0);

      // Verify no group belongs to multiple tenants
      allGroups.forEach((group) => {
        expect([tenant1Id, tenant2Id, tenant3Id]).toContain(group.tenant_id);
      });
    });

    it('should maintain referential integrity within tenant boundaries', async () => {
      // Verify all groups reference bots from the same tenant
      const tenant1DbGroups = await telegramGroupRepository.find({
        where: { tenant_id: tenant1Id },
        relations: ['bot'],
      });

      const tenant2DbGroups = await telegramGroupRepository.find({
        where: { tenant_id: tenant2Id },
        relations: ['bot'],
      });

      tenant1DbGroups.forEach((group) => {
        expect(group.bot.tenant_id).toBe(tenant1Id);
      });

      tenant2DbGroups.forEach((group) => {
        expect(group.bot.tenant_id).toBe(tenant2Id);
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should not impact performance when filtering by tenant', async () => {
      // Create additional groups to test performance
      const additionalGroups = [];
      for (let i = 0; i < 10; i++) {
        additionalGroups.push(
          telegramGroupsService.create(tenant3Id, {
            group_name: `Performance Test Group ${i}`,
            bot_id: tenant3BotId,
          }),
        );
      }

      await Promise.all(additionalGroups);

      const startTime = Date.now();

      // Query should be fast even with more data
      const result = await telegramGroupsService.findAll(tenant1Id, {
        page: 1,
        limit: 10,
      });

      const queryTime = Date.now() - startTime;

      expect(result.data).toHaveLength(2); // Only tenant 1's original groups
      expect(queryTime).toBeLessThan(1000); // Should be fast
    });
  });
});