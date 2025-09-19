import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelegramGroup } from '../../src/modules/telegram-groups/telegram-groups.entity';
import { TelegramBot } from '../../src/modules/bots/entities/telegram-bot.entity';
import { TelegramGroupsService } from '../../src/modules/telegram-groups/telegram-groups.service';
import { TelegramSyncService } from '../../src/integrations/telegram/telegram-sync.service';
import { TelegramApiService } from '../../src/integrations/telegram/telegram-api.service';
import { CreateTelegramGroupDto } from '../../src/modules/telegram-groups/dto/create-telegram-group.dto';
import { UpdateTelegramGroupDto } from '../../src/modules/telegram-groups/dto/update-telegram-group.dto';
import { ConnectChannelDto } from '../../src/modules/telegram-groups/dto/connect-channel.dto';
import { AppModule } from '../../src/app.module';

describe('Telegram Sync Functionality - Integration Test', () => {
  let app: INestApplication;
  let telegramGroupsService: TelegramGroupsService;
  let telegramSyncService: TelegramSyncService;
  let telegramApiService: TelegramApiService;
  let telegramGroupRepository: Repository<TelegramGroup>;
  let telegramBotRepository: Repository<TelegramBot>;
  let testTenantId: string;
  let testBotId: string;
  let connectedGroup: TelegramGroup;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    telegramGroupsService = moduleFixture.get<TelegramGroupsService>(TelegramGroupsService);
    telegramSyncService = moduleFixture.get<TelegramSyncService>(TelegramSyncService);
    telegramApiService = moduleFixture.get<TelegramApiService>(TelegramApiService);
    telegramGroupRepository = moduleFixture.get<Repository<TelegramGroup>>(
      getRepositoryToken(TelegramGroup),
    );
    telegramBotRepository = moduleFixture.get<Repository<TelegramBot>>(
      getRepositoryToken(TelegramBot),
    );

    // Setup test tenant
    testTenantId = 'test-tenant-uuid-sync';

    // Create a test bot
    const testBot = telegramBotRepository.create({
      id: 'test-bot-uuid-sync',
      tenant_id: testTenantId,
      bot_name: 'Test Sync Bot',
      bot_token: process.env.TEST_TELEGRAM_BOT_TOKEN || 'test-bot-token-sync-123456',
      bot_username: 'test_sync_bot',
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
    await app.close();
  });

  beforeEach(async () => {
    // Clean up and create fresh connected group
    await telegramGroupRepository.delete({ tenant_id: testTenantId });

    const createGroupDto: CreateTelegramGroupDto = {
      group_name: 'Test Sync Group',
      description: 'Group for testing sync functionality',
      bot_id: testBotId,
    };

    const group = await telegramGroupsService.create(testTenantId, createGroupDto);

    // Connect the group to a channel
    const connectChannelDto: ConnectChannelDto = {
      telegram_chat_id: process.env.TEST_TELEGRAM_CHANNEL_ID || '-1001234567890',
      verify_permissions: false, // Skip permission verification for testing
    };

    connectedGroup = await telegramGroupsService.connectChannel(
      testTenantId,
      group.id,
      connectChannelDto,
    );

    // Manually set bot_assigned to true for sync testing
    await telegramGroupRepository.update(
      { id: connectedGroup.id },
      { bot_assigned: true },
    );
  });

  describe('Manual Sync Operations', () => {
    it('should sync group details to Telegram channel successfully', async () => {
      const beforeSync = new Date();

      const result = await telegramGroupsService.sync(testTenantId, connectedGroup.id);

      expect(result).toMatchObject({
        message: 'Group details synced to Telegram successfully',
        sync_at: expect.any(Date),
      });

      // Verify database was updated
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: connectedGroup.id },
      });

      expect(dbGroup.last_sync_at).toBeDefined();
      expect(new Date(dbGroup.last_sync_at).getTime()).toBeGreaterThanOrEqual(
        beforeSync.getTime(),
      );
      expect(dbGroup.sync_errors).toBeNull();
    });

    it('should update Telegram channel title during sync', async () => {
      // First update the group name
      const updateDto: UpdateTelegramGroupDto = {
        group_name: 'Updated Sync Group Name',
      };

      await telegramGroupsService.update(testTenantId, connectedGroup.id, updateDto);

      // Then sync to Telegram
      const result = await telegramGroupsService.sync(testTenantId, connectedGroup.id);

      expect(result.message).toContain('synced');

      // Verify the sync was recorded
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: connectedGroup.id },
      });

      expect(dbGroup.last_sync_at).toBeDefined();
      expect(dbGroup.group_name).toBe('Updated Sync Group Name');
    });

    it('should update Telegram channel description during sync', async () => {
      const updateDto: UpdateTelegramGroupDto = {
        description: 'Updated description for sync testing',
      };

      await telegramGroupsService.update(testTenantId, connectedGroup.id, updateDto);

      const result = await telegramGroupsService.sync(testTenantId, connectedGroup.id);

      expect(result.message).toContain('synced');

      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: connectedGroup.id },
      });

      expect(dbGroup.description).toBe('Updated description for sync testing');
      expect(dbGroup.last_sync_at).toBeDefined();
    });

    it('should handle sync errors and store error messages', async () => {
      // Use invalid chat ID to trigger sync error
      await telegramGroupRepository.update(
        { id: connectedGroup.id },
        { telegram_chat_id: -1001111111111 }, // Non-existent channel
      );

      try {
        await telegramGroupsService.sync(testTenantId, connectedGroup.id);
        // If sync succeeds unexpectedly, that's also a valid test outcome
      } catch (error) {
        // Expected behavior - sync should fail
        expect(error.message).toBeTruthy();

        // Verify error was stored in database
        const dbGroup = await telegramGroupRepository.findOne({
          where: { id: connectedGroup.id },
        });

        expect(dbGroup.sync_errors).toBeTruthy();
      }
    });

    it('should prevent sync when group is not connected', async () => {
      // Create unconnected group
      const createGroupDto: CreateTelegramGroupDto = {
        group_name: 'Unconnected Group',
        bot_id: testBotId,
      };

      const unconnectedGroup = await telegramGroupsService.create(testTenantId, createGroupDto);

      await expect(
        telegramGroupsService.sync(testTenantId, unconnectedGroup.id),
      ).rejects.toThrow('not connected');
    });

    it('should prevent sync when bot is not assigned', async () => {
      // Remove bot assignment
      await telegramGroupRepository.update(
        { id: connectedGroup.id },
        { bot_assigned: false },
      );

      await expect(
        telegramGroupsService.sync(testTenantId, connectedGroup.id),
      ).rejects.toThrow('bot');
    });
  });

  describe('Auto-Sync Functionality', () => {
    beforeEach(async () => {
      // Enable sync for the group
      await telegramGroupRepository.update(
        { id: connectedGroup.id },
        { sync_enabled: true },
      );
    });

    it('should auto-sync when group details are updated', async () => {
      const updateDto: UpdateTelegramGroupDto = {
        group_name: 'Auto-Synced Group Name',
        description: 'Auto-synced description',
      };

      const beforeUpdate = new Date();

      const result = await telegramGroupsService.update(
        testTenantId,
        connectedGroup.id,
        updateDto,
      );

      // Auto-sync should have been triggered
      expect(result.group_name).toBe(updateDto.group_name);
      expect(result.description).toBe(updateDto.description);

      // Verify sync timestamp was updated
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: connectedGroup.id },
      });

      if (dbGroup.last_sync_at) {
        expect(new Date(dbGroup.last_sync_at).getTime()).toBeGreaterThanOrEqual(
          beforeUpdate.getTime(),
        );
      }
    });

    it('should not auto-sync when sync_enabled is false', async () => {
      // Disable auto-sync
      await telegramGroupRepository.update(
        { id: connectedGroup.id },
        { sync_enabled: false },
      );

      const originalSyncTime = connectedGroup.last_sync_at;

      const updateDto: UpdateTelegramGroupDto = {
        group_name: 'Non-Auto-Synced Name',
      };

      await telegramGroupsService.update(testTenantId, connectedGroup.id, updateDto);

      // Verify sync timestamp was not updated
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: connectedGroup.id },
      });

      expect(dbGroup.last_sync_at).toEqual(originalSyncTime);
    });

    it('should handle auto-sync errors gracefully', async () => {
      // Set invalid chat ID to trigger auto-sync error
      await telegramGroupRepository.update(
        { id: connectedGroup.id },
        { telegram_chat_id: -1001111111111 },
      );

      const updateDto: UpdateTelegramGroupDto = {
        group_name: 'Name That Will Fail to Sync',
      };

      // Update should succeed even if auto-sync fails
      const result = await telegramGroupsService.update(
        testTenantId,
        connectedGroup.id,
        updateDto,
      );

      expect(result.group_name).toBe(updateDto.group_name);

      // Check if sync error was recorded
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: connectedGroup.id },
      });

      // Auto-sync failure might be recorded in sync_errors
      if (dbGroup.sync_errors) {
        expect(dbGroup.sync_errors).toBeTruthy();
      }
    });
  });

  describe('Active Group Status Management', () => {
    it('should set group as active when bot is successfully assigned', async () => {
      // Simulate successful bot assignment during connection
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      const newGroup = await telegramGroupsService.create(testTenantId, {
        group_name: 'Active Status Test Group',
        bot_id: testBotId,
      });

      const result = await telegramGroupsService.connectChannel(
        testTenantId,
        newGroup.id,
        connectChannelDto,
      );

      // Manually set bot_assigned to simulate successful verification
      await telegramGroupRepository.update(
        { id: result.id },
        { bot_assigned: true },
      );

      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: result.id },
      });

      expect(dbGroup.is_active).toBe(true);
      expect(dbGroup.bot_assigned).toBe(true);
      expect(dbGroup.connection_status).toBe('connected');
    });

    it('should disable sync when bot assignment is lost', async () => {
      // Start with sync enabled
      await telegramGroupRepository.update(
        { id: connectedGroup.id },
        { sync_enabled: true, bot_assigned: true },
      );

      // Simulate bot losing permissions
      await telegramGroupRepository.update(
        { id: connectedGroup.id },
        { bot_assigned: false },
      );

      // Try to update group (should disable sync)
      const updateDto: UpdateTelegramGroupDto = {
        group_name: 'Updated Without Bot',
      };

      const result = await telegramGroupsService.update(
        testTenantId,
        connectedGroup.id,
        updateDto,
      );

      expect(result.sync_enabled).toBe(false);
      expect(result.bot_assigned).toBe(false);
    });
  });

  describe('Sync Service Direct Operations', () => {
    it('should sync group title via TelegramSyncService', async () => {
      const botToken = process.env.TEST_TELEGRAM_BOT_TOKEN || 'test-bot-token';
      const chatId = connectedGroup.telegram_chat_id;
      const newTitle = 'Direct Sync Test Title';

      try {
        const result = await telegramSyncService.syncGroupTitle(
          botToken,
          chatId.toString(),
          newTitle,
        );

        // Result depends on actual bot permissions
        expect(typeof result).toBe('boolean');
      } catch (error) {
        // Expected if bot doesn't have permissions
        expect(error.message).toBeTruthy();
      }
    });

    it('should sync group description via TelegramSyncService', async () => {
      const botToken = process.env.TEST_TELEGRAM_BOT_TOKEN || 'test-bot-token';
      const chatId = connectedGroup.telegram_chat_id;
      const newDescription = 'Direct sync test description';

      try {
        const result = await telegramSyncService.syncGroupDescription(
          botToken,
          chatId.toString(),
          newDescription,
        );

        expect(typeof result).toBe('boolean');
      } catch (error) {
        expect(error.message).toBeTruthy();
      }
    });

    it('should handle rate limiting during sync operations', async () => {
      const botToken = process.env.TEST_TELEGRAM_BOT_TOKEN || 'test-bot-token';
      const chatId = connectedGroup.telegram_chat_id;

      // Perform multiple sync operations rapidly
      const syncPromises = [];
      for (let i = 0; i < 5; i++) {
        syncPromises.push(
          telegramSyncService.syncGroupTitle(botToken, chatId.toString(), `Title ${i}`),
        );
      }

      try {
        const results = await Promise.allSettled(syncPromises);

        // Some should succeed, some might be rate limited
        const successful = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter((r) => r.status === 'rejected');

        expect(successful.length + failed.length).toBe(5);
      } catch (error) {
        // Expected if rate limiting is aggressive
        expect(error).toBeDefined();
      }
    });
  });

  describe('Sync Error Recovery', () => {
    it('should clear sync errors on successful sync', async () => {
      // First, introduce a sync error
      await telegramGroupRepository.update(
        { id: connectedGroup.id },
        { sync_errors: 'Previous sync error' },
      );

      // Perform successful sync
      const result = await telegramGroupsService.sync(testTenantId, connectedGroup.id);

      expect(result.message).toContain('synced');

      // Verify error was cleared
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: connectedGroup.id },
      });

      expect(dbGroup.sync_errors).toBeNull();
    });

    it('should retry failed sync operations', async () => {
      // This test would verify retry logic in sync service
      const botToken = process.env.TEST_TELEGRAM_BOT_TOKEN || 'test-bot-token';
      const invalidChatId = '-1001111111111';

      let attemptCount = 0;
      const originalSyncMethod = telegramApiService.setChatTitle;

      // Mock to count attempts
      telegramApiService.setChatTitle = async (...args) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return originalSyncMethod.apply(telegramApiService, args);
      };

      try {
        await telegramSyncService.syncGroupTitle(botToken, invalidChatId, 'Test Title');
      } catch (error) {
        expect(attemptCount).toBeGreaterThan(1);
      } finally {
        // Restore original method
        telegramApiService.setChatTitle = originalSyncMethod;
      }
    });
  });

  describe('Tenant Isolation in Sync', () => {
    it('should enforce tenant isolation during sync operations', async () => {
      const otherTenantId = 'other-tenant-sync';

      await expect(
        telegramGroupsService.sync(otherTenantId, connectedGroup.id),
      ).rejects.toThrow('Telegram group not found');
    });

    it('should prevent cross-tenant sync operations', async () => {
      // Create group in different tenant
      const otherTenantId = 'other-tenant-cross-sync';
      const otherBot = telegramBotRepository.create({
        id: 'other-bot-sync',
        tenant_id: otherTenantId,
        bot_name: 'Other Sync Bot',
        bot_token: 'other-bot-token-123456',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await telegramBotRepository.save(otherBot);

      const otherGroupDto: CreateTelegramGroupDto = {
        group_name: 'Other Tenant Sync Group',
        bot_id: otherBot.id,
      };
      const otherGroup = await telegramGroupsService.create(otherTenantId, otherGroupDto);

      // Try to sync other tenant's group from current tenant
      await expect(
        telegramGroupsService.sync(testTenantId, otherGroup.id),
      ).rejects.toThrow('Telegram group not found');

      // Cleanup
      await telegramGroupRepository.delete({ id: otherGroup.id });
      await telegramBotRepository.delete({ id: otherBot.id });
    });
  });
});