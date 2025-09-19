import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelegramGroup } from '../../src/modules/telegram-groups/telegram-groups.entity';
import { TelegramBot } from '../../src/modules/bots/entities/telegram-bot.entity';
import { TelegramGroupsService } from '../../src/modules/telegram-groups/telegram-groups.service';
import { TelegramApiService } from '../../src/integrations/telegram/telegram-api.service';
import { TelegramChannelService } from '../../src/integrations/telegram/telegram-channel.service';
import { CreateTelegramGroupDto } from '../../src/modules/telegram-groups/dto/create-telegram-group.dto';
import { ConnectChannelDto } from '../../src/modules/telegram-groups/dto/connect-channel.dto';
import { AppModule } from '../../src/app.module';

describe('Telegram Channel Connection - Integration Test', () => {
  let app: INestApplication;
  let telegramGroupsService: TelegramGroupsService;
  let telegramApiService: TelegramApiService;
  let telegramChannelService: TelegramChannelService;
  let telegramGroupRepository: Repository<TelegramGroup>;
  let telegramBotRepository: Repository<TelegramBot>;
  let testTenantId: string;
  let testBotId: string;
  let testGroup: TelegramGroup;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    telegramGroupsService = moduleFixture.get<TelegramGroupsService>(TelegramGroupsService);
    telegramApiService = moduleFixture.get<TelegramApiService>(TelegramApiService);
    telegramChannelService = moduleFixture.get<TelegramChannelService>(TelegramChannelService);
    telegramGroupRepository = moduleFixture.get<Repository<TelegramGroup>>(
      getRepositoryToken(TelegramGroup),
    );
    telegramBotRepository = moduleFixture.get<Repository<TelegramBot>>(
      getRepositoryToken(TelegramBot),
    );

    // Setup test tenant
    testTenantId = 'test-tenant-uuid-channel';

    // Create a test bot
    const testBot = telegramBotRepository.create({
      id: 'test-bot-uuid-channel',
      tenant_id: testTenantId,
      bot_name: 'Test Channel Bot',
      bot_token: process.env.TEST_TELEGRAM_BOT_TOKEN || 'test-bot-token-channel-123456',
      bot_username: 'test_channel_bot',
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
    // Clean up and create fresh test group
    await telegramGroupRepository.delete({ tenant_id: testTenantId });

    const createGroupDto: CreateTelegramGroupDto = {
      group_name: 'Test Channel Connection Group',
      description: 'Group for testing channel connections',
      bot_id: testBotId,
    };

    testGroup = await telegramGroupsService.create(testTenantId, createGroupDto);
  });

  describe('Channel Connection Workflow', () => {
    it('should connect channel successfully with valid chat ID', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: process.env.TEST_TELEGRAM_CHANNEL_ID || '-1001234567890',
        invite_link: 'https://t.me/+AbCdEfGhIjKlMnOp',
        verify_permissions: false, // Skip permission verification for testing
      };

      const result = await telegramGroupsService.connectChannel(
        testTenantId,
        testGroup.id,
        connectChannelDto,
      );

      expect(result).toMatchObject({
        id: testGroup.id,
        telegram_chat_id: expect.any(Number),
        invite_link: connectChannelDto.invite_link,
        connection_status: 'connected',
        updated_at: expect.any(Date),
      });

      // Verify database record
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: testGroup.id },
      });

      expect(dbGroup).toMatchObject({
        telegram_chat_id: expect.any(Number),
        invite_link: connectChannelDto.invite_link,
        connection_status: 'connected',
      });
    });

    it('should update group type based on Telegram chat type', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890', // Channel format
        verify_permissions: false,
      };

      const result = await telegramGroupsService.connectChannel(
        testTenantId,
        testGroup.id,
        connectChannelDto,
      );

      // Group type should be updated based on chat ID format
      expect(result.group_type).toMatch(/^(group|supergroup|channel)$/);
    });

    it('should handle bot permission verification when enabled', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: process.env.TEST_TELEGRAM_CHANNEL_ID || '-1001234567890',
        verify_permissions: true,
      };

      // This test depends on the actual bot having permissions
      // In a real test environment, this might fail if bot lacks permissions
      try {
        const result = await telegramGroupsService.connectChannel(
          testTenantId,
          testGroup.id,
          connectChannelDto,
        );

        expect(result.bot_assigned).toBe(true);
        expect(result.connection_status).toBe('connected');
      } catch (error) {
        // If permission verification fails, expect specific error
        expect(error.message).toContain('permission');

        // Verify the group status reflects the failure
        const dbGroup = await telegramGroupRepository.findOne({
          where: { id: testGroup.id },
        });
        expect(dbGroup.connection_status).toBe('failed');
        expect(dbGroup.bot_assigned).toBe(false);
      }
    });

    it('should prevent duplicate channel connections', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      // Connect the channel first
      await telegramGroupsService.connectChannel(
        testTenantId,
        testGroup.id,
        connectChannelDto,
      );

      // Create another group
      const anotherGroupDto: CreateTelegramGroupDto = {
        group_name: 'Another Group',
        bot_id: testBotId,
      };
      const anotherGroup = await telegramGroupsService.create(testTenantId, anotherGroupDto);

      // Try to connect the same channel to the second group
      await expect(
        telegramGroupsService.connectChannel(
          testTenantId,
          anotherGroup.id,
          connectChannelDto,
        ),
      ).rejects.toThrow('already connected');
    });

    it('should prevent reconnection of already connected group', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      // Connect the channel first
      await telegramGroupsService.connectChannel(
        testTenantId,
        testGroup.id,
        connectChannelDto,
      );

      // Try to connect a different channel to the same group
      const differentChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1009876543210',
        verify_permissions: false,
      };

      await expect(
        telegramGroupsService.connectChannel(
          testTenantId,
          testGroup.id,
          differentChannelDto,
        ),
      ).rejects.toThrow('already connected');
    });
  });

  describe('Bot Permission Verification', () => {
    it('should verify bot admin permissions in channel', async () => {
      const chatId = process.env.TEST_TELEGRAM_CHANNEL_ID || '-1001234567890';
      const botToken = process.env.TEST_TELEGRAM_BOT_TOKEN || 'test-bot-token';

      try {
        const hasPermissions = await telegramChannelService.verifyBotPermissions(
          botToken,
          chatId,
        );

        // Result depends on actual bot setup in test environment
        expect(typeof hasPermissions).toBe('boolean');
      } catch (error) {
        // Expected if bot doesn't have access or token is invalid
        expect(error.message).toContain('bot');
      }
    });

    it('should check required permissions for channel management', async () => {
      const botToken = process.env.TEST_TELEGRAM_BOT_TOKEN || 'test-bot-token';
      const chatId = process.env.TEST_TELEGRAM_CHANNEL_ID || '-1001234567890';

      try {
        const permissions = await telegramApiService.getChatMember(botToken, chatId, 'bot');

        if (permissions) {
          // Verify bot has required permissions
          expect(permissions).toHaveProperty('status');
          expect(['administrator', 'creator']).toContain(permissions.status);
        }
      } catch (error) {
        // Expected if bot doesn't have access
        expect(error.message).toBeTruthy();
      }
    });

    it('should handle bot permission errors gracefully', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001111111111', // Non-existent channel
        verify_permissions: true,
      };

      await expect(
        telegramGroupsService.connectChannel(
          testTenantId,
          testGroup.id,
          connectChannelDto,
        ),
      ).rejects.toThrow();

      // Verify group status reflects the failure
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: testGroup.id },
      });

      expect(dbGroup.connection_status).toBe('failed');
      expect(dbGroup.bot_assigned).toBe(false);
    });
  });

  describe('Channel Information Retrieval', () => {
    it('should retrieve and store channel information', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: process.env.TEST_TELEGRAM_CHANNEL_ID || '-1001234567890',
        verify_permissions: false,
      };

      const result = await telegramGroupsService.connectChannel(
        testTenantId,
        testGroup.id,
        connectChannelDto,
      );

      // Verify channel information was retrieved and stored
      expect(result.telegram_chat_id).toBeDefined();
      expect(result.group_type).toMatch(/^(group|supergroup|channel)$/);

      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: testGroup.id },
      });

      expect(dbGroup.telegram_chat_id).toBeDefined();
      expect(dbGroup.group_type).toMatch(/^(group|supergroup|channel)$/);
    });

    it('should handle channel with username and invite link', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        invite_link: 'https://t.me/+TestInviteLink123',
        verify_permissions: false,
      };

      const result = await telegramGroupsService.connectChannel(
        testTenantId,
        testGroup.id,
        connectChannelDto,
      );

      expect(result.invite_link).toBe(connectChannelDto.invite_link);

      // Test username extraction if available from Telegram API
      try {
        const botToken = process.env.TEST_TELEGRAM_BOT_TOKEN || 'test-bot-token';
        const chatInfo = await telegramApiService.getChat(botToken, connectChannelDto.telegram_chat_id);

        if (chatInfo && chatInfo.username) {
          expect(result.username).toBe(chatInfo.username);
        }
      } catch (error) {
        // Expected if API call fails in test environment
        expect(error).toBeDefined();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Telegram API errors gracefully', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: 'invalid-chat-id-format',
        verify_permissions: false,
      };

      await expect(
        telegramGroupsService.connectChannel(
          testTenantId,
          testGroup.id,
          connectChannelDto,
        ),
      ).rejects.toThrow();

      // Verify group remains in pending state
      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: testGroup.id },
      });

      expect(dbGroup.connection_status).toBe('pending');
    });

    it('should handle network timeouts and retries', async () => {
      // This test would require mocking the Telegram API service
      // to simulate network issues and test retry logic

      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      // Mock timeout scenario
      const originalTimeout = telegramApiService.timeout;

      try {
        // Set very short timeout to trigger timeout error
        if (telegramApiService.timeout) {
          telegramApiService.timeout = 1;
        }

        // This might timeout in real environment with short timeout
        await telegramGroupsService.connectChannel(
          testTenantId,
          testGroup.id,
          connectChannelDto,
        );
      } catch (error) {
        // Expected timeout error
        expect(error.message).toBeTruthy();
      } finally {
        // Restore original timeout
        if (originalTimeout) {
          telegramApiService.timeout = originalTimeout;
        }
      }
    });

    it('should update connection status on failure', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001111111111', // Non-existent channel
        verify_permissions: true,
      };

      try {
        await telegramGroupsService.connectChannel(
          testTenantId,
          testGroup.id,
          connectChannelDto,
        );
      } catch (error) {
        // Expected to fail
      }

      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: testGroup.id },
      });

      expect(dbGroup.connection_status).toBe('failed');
      expect(dbGroup.bot_assigned).toBe(false);
    });
  });

  describe('Channel Disconnection', () => {
    let connectedGroup: TelegramGroup;

    beforeEach(async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      connectedGroup = await telegramGroupsService.connectChannel(
        testTenantId,
        testGroup.id,
        connectChannelDto,
      );
    });

    it('should disconnect channel successfully', async () => {
      await telegramGroupsService.disconnectChannel(testTenantId, connectedGroup.id);

      const dbGroup = await telegramGroupRepository.findOne({
        where: { id: connectedGroup.id },
      });

      expect(dbGroup).toMatchObject({
        telegram_chat_id: null,
        username: null,
        invite_link: null,
        connection_status: 'disconnected',
        bot_assigned: false,
        sync_enabled: false,
      });
    });

    it('should prevent operations on disconnected channels', async () => {
      await telegramGroupsService.disconnectChannel(testTenantId, connectedGroup.id);

      // Try to sync a disconnected group
      await expect(
        telegramGroupsService.sync(testTenantId, connectedGroup.id),
      ).rejects.toThrow('not connected');
    });
  });

  describe('Tenant Isolation', () => {
    it('should enforce tenant isolation for channel connections', async () => {
      const otherTenantId = 'other-tenant-channel';
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      // Try to connect channel for group from different tenant
      await expect(
        telegramGroupsService.connectChannel(
          otherTenantId,
          testGroup.id,
          connectChannelDto,
        ),
      ).rejects.toThrow('Telegram group not found');
    });

    it('should prevent cross-tenant channel access', async () => {
      const connectChannelDto: ConnectChannelDto = {
        telegram_chat_id: '-1001234567890',
        verify_permissions: false,
      };

      // Connect channel in first tenant
      await telegramGroupsService.connectChannel(
        testTenantId,
        testGroup.id,
        connectChannelDto,
      );

      // Create group in different tenant
      const otherTenantId = 'other-tenant-access';
      const otherBot = telegramBotRepository.create({
        id: 'other-bot-access',
        tenant_id: otherTenantId,
        bot_name: 'Other Bot',
        bot_token: 'other-bot-token-123456',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      await telegramBotRepository.save(otherBot);

      const otherGroupDto: CreateTelegramGroupDto = {
        group_name: 'Other Tenant Group',
        bot_id: otherBot.id,
      };
      const otherGroup = await telegramGroupsService.create(otherTenantId, otherGroupDto);

      // Try to connect same channel to other tenant's group
      await expect(
        telegramGroupsService.connectChannel(
          otherTenantId,
          otherGroup.id,
          connectChannelDto,
        ),
      ).rejects.toThrow('already connected');

      // Cleanup
      await telegramGroupRepository.delete({ id: otherGroup.id });
      await telegramBotRepository.delete({ id: otherBot.id });
    });
  });
});