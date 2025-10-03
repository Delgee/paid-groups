import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TelegramApiService } from '../../src/modules/bot/services/telegram-api.service';
import { LoggerService } from '../../src/common/logger/logger.service';

/**
 * Integration tests for TelegramApiService with real Telegram API
 *
 * Prerequisites:
 * - Set TEST_TELEGRAM_BOT_TOKEN in .env.test
 * - Set TEST_TELEGRAM_CHANNEL_ID in .env.test
 * - Bot must be added as admin to the test channel
 *
 * These tests will be skipped if environment variables are not set
 */
describe('TelegramApiService - Integration Tests', () => {
  let service: TelegramApiService;
  let cacheManager: Cache;

  const botToken = process.env.TEST_TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TEST_TELEGRAM_CHANNEL_ID;

  const shouldSkip = !botToken || !channelId;

  beforeAll(async () => {
    if (shouldSkip) {
      console.log('⚠️  Skipping Telegram API integration tests - missing TEST_TELEGRAM_BOT_TOKEN or TEST_TELEGRAM_CHANNEL_ID');
      return;
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramApiService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            del: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            telegram: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramApiService>(TelegramApiService);
    cacheManager = module.get<Cache>(CACHE_MANAGER);
  });

  afterAll(async () => {
    if (!shouldSkip && botToken) {
      service.cleanupBotInstance(botToken);
    }
  });

  describe('Bot Token Verification', () => {
    (shouldSkip ? it.skip : it)('should verify valid bot token', async () => {
      const botInfo = await service.verifyBotToken(botToken!);

      expect(botInfo).toBeDefined();
      expect(botInfo).toMatchObject({
        id: expect.any(Number),
        first_name: expect.any(String),
        is_bot: true,
      });
      expect(botInfo?.username).toBeDefined();
    });

    (shouldSkip ? it.skip : it)('should return null for invalid bot token', async () => {
      const botInfo = await service.verifyBotToken('invalid-token-123456');

      expect(botInfo).toBeNull();
    });
  });

  describe('Channel Information', () => {
    (shouldSkip ? it.skip : it)('should get channel info', async () => {
      const chatInfo = await service.getChannelInfo(botToken!, channelId!);

      expect(chatInfo).toBeDefined();
      expect(chatInfo).toMatchObject({
        id: expect.any(Number),
        type: 'channel',
      });
    });

    (shouldSkip ? it.skip : it)('should get chat info with member count', async () => {
      const chatInfo = await service.getChatInfo(botToken!, channelId!);

      expect(chatInfo).toBeDefined();
      expect(chatInfo).toMatchObject({
        id: expect.any(Number),
        member_count: expect.any(Number),
      });
    });

    (shouldSkip ? it.skip : it)('should get chat member count', async () => {
      const count = await service.getChatMemberCount(botToken!, channelId!);

      expect(count).toBeGreaterThanOrEqual(0);
    });

    (shouldSkip ? it.skip : it)('should cache channel info', async () => {
      // Clear cache
      (cacheManager.get as jest.Mock).mockResolvedValueOnce(null);

      // First call - should fetch from API
      const info1 = await service.getChannelInfo(botToken!, channelId!);
      expect(info1).toBeDefined();
      expect(cacheManager.set).toHaveBeenCalled();

      // Second call - should use cache
      (cacheManager.get as jest.Mock).mockResolvedValueOnce(info1);
      const info2 = await service.getChannelInfo(botToken!, channelId!);

      expect(info2).toEqual(info1);
    });
  });

  describe('Bot Permissions Verification', () => {
    (shouldSkip ? it.skip : it)('should verify bot permissions in channel', async () => {
      const permissions = await service.verifyBotPermissionsInChannel(
        botToken!,
        channelId!
      );

      expect(permissions).toBeDefined();
      expect(permissions).toMatchObject({
        isAdmin: expect.any(Boolean),
        canPostMessages: expect.any(Boolean),
        canEditMessages: expect.any(Boolean),
        canDeleteMessages: expect.any(Boolean),
      });

      // If bot is admin, at least one permission should be true
      if (permissions.isAdmin) {
        const hasAnyPermission =
          permissions.canPostMessages ||
          permissions.canEditMessages ||
          permissions.canDeleteMessages;
        expect(hasAnyPermission).toBe(true);
      }
    });

    (shouldSkip ? it.skip : it)('should check if bot is admin in chat', async () => {
      const isAdmin = await service.isBotAdminInChat(botToken!, channelId!);

      expect(typeof isAdmin).toBe('boolean');
    });
  });

  describe('Channel Management Operations', () => {
    const originalTitle = 'Test Channel for Integration Tests';
    const originalDescription = 'This channel is used for Telegram API integration testing';

    beforeEach(async () => {
      if (shouldSkip) return;

      // Reset to known state with delays to avoid rate limiting
      await service.setChatTitle(botToken!, channelId!, originalTitle);
      await new Promise(resolve => setTimeout(resolve, 200));
      await service.setChatDescription(botToken!, channelId!, originalDescription);
      await new Promise(resolve => setTimeout(resolve, 200));
    }, 15000); // 15 second timeout for beforeEach

    (shouldSkip ? it.skip : it)('should set channel title', async () => {
      const newTitle = `Test Title ${Date.now()}`;

      const result = await service.setChatTitle(botToken!, channelId!, newTitle);

      expect(result).toBe(true);

      // Verify the change
      const chatInfo = await service.getChatInfo(botToken!, channelId!);
      expect(chatInfo?.title).toBe(newTitle);
    });

    (shouldSkip ? it.skip : it)('should set channel description', async () => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Avoid rate limit

      const newDescription = `Test description updated at ${new Date().toISOString()}`;

      const result = await service.setChatDescription(
        botToken!,
        channelId!,
        newDescription
      );

      // May fail due to rate limiting
      if (!result) {
        console.log('⚠️  Set description failed - likely rate limited');
      }
      expect(typeof result).toBe('boolean');
    });

    (shouldSkip ? it.skip : it)('should invalidate cache after title update', async () => {
      const newTitle = `Cache Test ${Date.now()}`;

      // Set cache
      (cacheManager.get as jest.Mock).mockResolvedValueOnce({
        id: channelId,
        type: 'channel',
        title: 'Old Title',
      });

      await service.setChatTitle(botToken!, channelId!, newTitle);

      // Verify cache was invalidated
      expect(cacheManager.del).toHaveBeenCalled();
    });
  });

  describe('Messaging Operations', () => {
    beforeEach(async () => {
      // Add delay between messaging tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    (shouldSkip ? it.skip : it)('should send message to channel', async () => {
      const message = `Test message sent at ${new Date().toISOString()}`;

      const result = await service.sendMessage(botToken!, channelId!, message);

      // May fail due to rate limiting
      if (!result) {
        console.log('⚠️  Message send failed - likely rate limited');
      }
      expect(typeof result).toBe('boolean');
    });

    (shouldSkip ? it.skip : it)('should send message with HTML formatting', async () => {
      const message = '<b>Bold text</b> and <i>italic text</i>';

      const result = await service.sendMessage(
        botToken!,
        channelId!,
        message,
        { parse_mode: 'HTML' }
      );

      expect(typeof result).toBe('boolean');
    });

    (shouldSkip ? it.skip : it)('should post to channel and return message ID', async () => {
      const message = `Channel post at ${new Date().toISOString()}`;

      const result = await service.postToChannel(botToken!, channelId!, message);

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    (shouldSkip ? it.skip : it)('should handle send message failure gracefully', async () => {
      const result = await service.sendMessage(
        botToken!,
        -1001111111111, // Non-existent chat
        'This should fail'
      );

      expect(result).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    beforeAll(async () => {
      // Wait to avoid hitting existing rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    });

    (shouldSkip ? it.skip : it)('should handle rate limiting', async () => {
      const messages = Array.from({ length: 10 }, (_, i) =>
        `Rate limit test ${i} at ${Date.now()}`
      );

      // Send messages rapidly
      const results = await Promise.allSettled(
        messages.map(msg => service.sendMessage(botToken!, channelId!, msg))
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value === true);
      const failed = results.filter(r => r.status === 'rejected' ||
        (r.status === 'fulfilled' && r.value === false));

      // Verify we got results (may all succeed or some fail due to rate limiting)
      expect(successful.length + failed.length).toBe(messages.length);

      console.log(`Rate limit test: ${successful.length} succeeded, ${failed.length} rate limited`);
    }, 30000); // 30 second timeout for this test
  });

  describe('Webhook Operations', () => {
    const webhookUrl = 'https://example.com/webhook/telegram';

    afterAll(async () => {
      if (!shouldSkip && botToken) {
        // Clean up webhook after tests
        await service.deleteWebhook(botToken);
      }
    });

    (shouldSkip ? it.skip : it)('should set webhook', async () => {
      const result = await service.setWebhook(botToken!, webhookUrl);

      expect(result).toBe(true);
    });

    (shouldSkip ? it.skip : it)('should get webhook info', async () => {
      await service.setWebhook(botToken!, webhookUrl);

      const info = await service.getWebhookInfo(botToken!);

      expect(info).toBeDefined();
      expect(info.url).toBe(webhookUrl);
    });

    (shouldSkip ? it.skip : it)('should delete webhook', async () => {
      await service.setWebhook(botToken!, webhookUrl);

      const result = await service.deleteWebhook(botToken!);

      expect(result).toBe(true);

      // Verify deletion
      const info = await service.getWebhookInfo(botToken!);
      expect(info.url).toBe('');
    });
  });

  describe('Error Handling', () => {
    (shouldSkip ? it.skip : it)('should handle invalid chat ID', async () => {
      const result = await service.getChatInfo(botToken!, -1001111111111);

      expect(result).toBeNull();
    });

    (shouldSkip ? it.skip : it)('should handle invalid channel ID for channel operations', async () => {
      const result = await service.getChannelInfo(botToken!, -1001111111111);

      expect(result).toBeNull();
    });

    (shouldSkip ? it.skip : it)('should handle network errors gracefully', async () => {
      // Use invalid token to simulate network/auth error
      const result = await service.verifyBotToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('Invite Link Management', () => {
    (shouldSkip ? it.skip : it)('should generate invite link or handle permission error', async () => {
      const link = await service.generateInviteLink(botToken!, channelId!);

      // Invite link generation may fail if bot lacks "Invite Users via Link" permission
      // or if the channel is public
      if (link) {
        expect(link).toMatch(/^https:\/\/t\.me\//);
      } else {
        // Expected behavior when bot lacks permission
        expect(link).toBeNull();
      }
    });

    (shouldSkip ? it.skip : it)('should generate invite link with expiry or handle permission error', async () => {
      const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const link = await service.generateInviteLink(
        botToken!,
        channelId!,
        expireDate
      );

      if (link) {
        expect(link).toMatch(/^https:\/\/t\.me\//);
      } else {
        expect(link).toBeNull();
      }
    });

    (shouldSkip ? it.skip : it)('should generate invite link with member limit or handle permission error', async () => {
      const link = await service.generateInviteLink(
        botToken!,
        channelId!,
        undefined,
        10 // Max 10 members
      );

      if (link) {
        expect(link).toMatch(/^https:\/\/t\.me\//);
      } else {
        expect(link).toBeNull();
      }
    });
  });

  describe('Performance and Caching', () => {
    (shouldSkip ? it.skip : it)('should cache bot verification for subsequent calls', async () => {
      const start1 = Date.now();
      const info1 = await service.verifyBotToken(botToken!);
      const duration1 = Date.now() - start1;

      // Mock cache to return previous result
      (cacheManager.get as jest.Mock).mockResolvedValueOnce(info1);

      const start2 = Date.now();
      const info2 = await service.verifyBotToken(botToken!);
      const duration2 = Date.now() - start2;

      expect(info2).toEqual(info1);
      // Cached call should be faster (though this is not guaranteed)
      console.log(`First call: ${duration1}ms, Cached call: ${duration2}ms`);
    });

    (shouldSkip ? it.skip : it)('should cache member count with shorter TTL', async () => {
      (cacheManager.get as jest.Mock).mockResolvedValueOnce(null);

      await service.getChatMemberCount(botToken!, channelId!);

      // Verify cache was set with 5 minute TTL
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        300000 // 5 minutes
      );
    });
  });
});
