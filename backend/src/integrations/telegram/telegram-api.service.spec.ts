import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { TelegramApiService } from './telegram-api.service';
import { LoggerService } from '../../common/logger/logger.service';

describe('TelegramApiService', () => {
  let service: TelegramApiService;
  let cacheManager: jest.Mocked<Cache>;
  let loggerService: jest.Mocked<LoggerService>;

  const mockBotToken = 'test-bot-token-123456';
  const mockChatId = -1001234567890;

  beforeEach(async () => {
    // Mock cache manager
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    // Mock logger service
    loggerService = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      telegram: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramApiService,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
        {
          provide: LoggerService,
          useValue: loggerService,
        },
      ],
    }).compile();

    service = module.get<TelegramApiService>(TelegramApiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Management', () => {
    describe('invalidateChatCache', () => {
      it('should invalidate all chat-related cache keys', async () => {
        const chatId = mockChatId;

        // Call private method via service method that uses it
        await service['invalidateChatCache'](chatId);

        expect(cacheManager.del).toHaveBeenCalledTimes(3);
        expect(cacheManager.del).toHaveBeenCalledWith(`telegram:chat:info:${chatId}`);
        expect(cacheManager.del).toHaveBeenCalledWith(`telegram:channel:info:${chatId}`);
        expect(cacheManager.del).toHaveBeenCalledWith(`telegram:chat:members:count:${chatId}`);
      });

      it('should log error if cache invalidation fails', async () => {
        const chatId = mockChatId;
        const error = new Error('Cache error');
        cacheManager.del.mockRejectedValueOnce(error);

        await service['invalidateChatCache'](chatId);

        expect(loggerService.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to invalidate cache')
        );
      });
    });

    describe('generateCacheKey', () => {
      it('should generate correct cache key format', () => {
        const key = service['generateCacheKey']('test', 'arg1', 123);
        expect(key).toBe('telegram:test:arg1:123');
      });

      it('should handle multiple arguments', () => {
        const key = service['generateCacheKey']('prefix', 'a', 'b', 'c');
        expect(key).toBe('telegram:prefix:a:b:c');
      });
    });
  });

  describe('Rate Limiting', () => {
    describe('checkRateLimit', () => {
      it('should allow request when tokens are available', async () => {
        cacheManager.get.mockResolvedValueOnce(null); // No cached data

        const result = await service['checkRateLimit'](mockBotToken);

        expect(result).toBe(true);
        expect(cacheManager.set).toHaveBeenCalledWith(
          expect.stringContaining('ratelimit'),
          expect.objectContaining({ tokens: 29 }), // 30 - 1 consumed
          60000
        );
      });

      it('should refill tokens based on time elapsed', async () => {
        const now = Date.now();
        const oneSecondAgo = now - 1000;

        cacheManager.get.mockResolvedValueOnce({
          tokens: 0,
          lastRefill: oneSecondAgo,
        });

        const result = await service['checkRateLimit'](mockBotToken);

        expect(result).toBe(true);
        expect(cacheManager.set).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            tokens: expect.any(Number)
          }),
          60000
        );
      });

      it('should deny request when rate limit exceeded', async () => {
        cacheManager.get.mockResolvedValueOnce({
          tokens: 0,
          lastRefill: Date.now(),
        });

        const result = await service['checkRateLimit'](mockBotToken);

        expect(result).toBe(false);
        expect(loggerService.telegram).toHaveBeenCalledWith(
          'RateLimitExceeded',
          expect.any(Object),
          'warn'
        );
      });

      it('should fail open on error', async () => {
        cacheManager.get.mockRejectedValueOnce(new Error('Cache error'));

        const result = await service['checkRateLimit'](mockBotToken);

        expect(result).toBe(true);
        expect(loggerService.error).toHaveBeenCalled();
      });
    });

    describe('executeWithRateLimit', () => {
      it('should execute operation when rate limit allows', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        cacheManager.get.mockResolvedValueOnce(null);

        const result = await service['executeWithRateLimit'](mockBotToken, operation);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalled();
      });

      it('should throw error when rate limited', async () => {
        const operation = jest.fn();
        cacheManager.get.mockResolvedValueOnce({
          tokens: 0,
          lastRefill: Date.now(),
        });

        await expect(
          service['executeWithRateLimit'](mockBotToken, operation)
        ).rejects.toThrow('Rate limit exceeded');

        expect(operation).not.toHaveBeenCalled();
      });
    });
  });

  describe('verifyBotToken', () => {
    it('should return cached bot info if available', async () => {
      const cachedBot = {
        id: 123,
        first_name: 'Test Bot',
        username: 'test_bot',
        is_bot: true,
      };
      cacheManager.get.mockResolvedValueOnce(cachedBot);

      const result = await service.verifyBotToken(mockBotToken);

      expect(result).toEqual(cachedBot);
      expect(cacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining('bot:verify')
      );
      expect(loggerService.debug).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      cacheManager.get.mockResolvedValueOnce(null);
      // Mock Telegraf to throw error
      const mockBot = {
        telegram: {
          getMe: jest.fn().mockRejectedValue(new Error('Invalid token')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.verifyBotToken(mockBotToken);

      expect(result).toBeNull();
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to verify bot token')
      );
    });
  });

  describe('getChatInfo', () => {
    it('should return cached chat info if available', async () => {
      const cachedChat = {
        id: mockChatId,
        type: 'supergroup' as const,
        title: 'Test Group',
      };
      cacheManager.get.mockResolvedValueOnce(cachedChat);

      const result = await service.getChatInfo(mockBotToken, mockChatId);

      expect(result).toEqual(cachedChat);
      expect(loggerService.debug).toHaveBeenCalledWith(
        expect.stringContaining('Chat info cache hit')
      );
    });

    it('should return null on error', async () => {
      cacheManager.get.mockResolvedValueOnce(null);
      const mockBot = {
        telegram: {
          getChat: jest.fn().mockRejectedValue(new Error('Chat not found')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.getChatInfo(mockBotToken, mockChatId);

      expect(result).toBeNull();
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get chat info')
      );
    });
  });

  describe('getChatMemberCount', () => {
    it('should return cached member count if available', async () => {
      const cachedCount = 150;
      cacheManager.get.mockResolvedValueOnce(cachedCount);

      const result = await service.getChatMemberCount(mockBotToken, mockChatId);

      expect(result).toBe(cachedCount);
      expect(loggerService.debug).toHaveBeenCalledWith(
        expect.stringContaining('Chat member count cache hit')
      );
    });

    it('should return 0 on error', async () => {
      cacheManager.get.mockResolvedValueOnce(null);
      const mockBot = {
        telegram: {
          getChatMembersCount: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.getChatMemberCount(mockBotToken, mockChatId);

      expect(result).toBe(0);
      expect(loggerService.error).toHaveBeenCalled();
    });

    it('should cache member count with 5 minute TTL', async () => {
      cacheManager.get.mockResolvedValueOnce(null);
      const mockBot = {
        telegram: {
          getChatMembersCount: jest.fn().mockResolvedValue(100),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      await service.getChatMemberCount(mockBotToken, mockChatId);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        100,
        300000 // 5 minutes
      );
    });
  });

  describe('sendMessage', () => {
    beforeEach(() => {
      // Mock rate limit to allow requests
      cacheManager.get.mockResolvedValue(null);
    });

    it('should send message successfully', async () => {
      const mockBot = {
        telegram: {
          sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.sendMessage(
        mockBotToken,
        mockChatId,
        'Test message'
      );

      expect(result).toBe(true);
      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
        mockChatId,
        'Test message',
        undefined
      );
      expect(loggerService.telegram).toHaveBeenCalledWith(
        'SendMessage',
        expect.objectContaining({ success: true })
      );
    });

    it('should send message with options', async () => {
      const mockBot = {
        telegram: {
          sendMessage: jest.fn().mockResolvedValue({ message_id: 123 }),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const options = { parse_mode: 'HTML' as const };
      await service.sendMessage(mockBotToken, mockChatId, 'Test', options);

      expect(mockBot.telegram.sendMessage).toHaveBeenCalledWith(
        mockChatId,
        'Test',
        options
      );
    });

    it('should return false on error', async () => {
      const mockBot = {
        telegram: {
          sendMessage: jest.fn().mockRejectedValue(new Error('Send failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.sendMessage(
        mockBotToken,
        mockChatId,
        'Test'
      );

      expect(result).toBe(false);
      expect(loggerService.telegram).toHaveBeenCalledWith(
        'SendMessage',
        expect.objectContaining({ success: false }),
        'error'
      );
    });

    it('should respect rate limits', async () => {
      cacheManager.get.mockResolvedValue({
        tokens: 0,
        lastRefill: Date.now(),
      });

      const result = await service.sendMessage(
        mockBotToken,
        mockChatId,
        'Test'
      );

      expect(result).toBe(false);
    });
  });

  describe('kickChatMember', () => {
    it('should kick and unban member successfully', async () => {
      const mockBot = {
        telegram: {
          banChatMember: jest.fn().mockResolvedValue(true),
          unbanChatMember: jest.fn().mockResolvedValue(true),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.kickChatMember(mockBotToken, mockChatId, 12345);

      expect(result).toBe(true);
      expect(mockBot.telegram.banChatMember).toHaveBeenCalledWith(mockChatId, 12345);
      expect(mockBot.telegram.unbanChatMember).toHaveBeenCalledWith(mockChatId, 12345);
      expect(loggerService.log).toHaveBeenCalledWith(
        expect.stringContaining('removed from chat')
      );
    });

    it('should return false on error', async () => {
      const mockBot = {
        telegram: {
          banChatMember: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.kickChatMember(mockBotToken, mockChatId, 12345);

      expect(result).toBe(false);
      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('restrictChatMember', () => {
    it('should restrict member successfully', async () => {
      const permissions = { can_send_messages: false };
      const mockBot = {
        telegram: {
          restrictChatMember: jest.fn().mockResolvedValue(true),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.restrictChatMember(
        mockBotToken,
        mockChatId,
        12345,
        permissions
      );

      expect(result).toBe(true);
      expect(mockBot.telegram.restrictChatMember).toHaveBeenCalledWith(
        mockChatId,
        12345,
        { permissions }
      );
    });

    it('should return false on error', async () => {
      const mockBot = {
        telegram: {
          restrictChatMember: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.restrictChatMember(
        mockBotToken,
        mockChatId,
        12345,
        {}
      );

      expect(result).toBe(false);
    });
  });

  describe('getChatMember', () => {
    it('should get chat member successfully', async () => {
      const mockMember = { user: { id: 12345 }, status: 'member' };
      const mockBot = {
        telegram: {
          getChatMember: jest.fn().mockResolvedValue(mockMember),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.getChatMember(mockBotToken, mockChatId, 12345);

      expect(result).toEqual(mockMember);
    });

    it('should return null on error', async () => {
      const mockBot = {
        telegram: {
          getChatMember: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.getChatMember(mockBotToken, mockChatId, 12345);

      expect(result).toBeNull();
    });
  });

  describe('isBotAdminInChat', () => {
    it('should return true when bot is administrator', async () => {
      const mockBot = {
        telegram: {
          getMe: jest.fn().mockResolvedValue({ id: 999 }),
          getChatMember: jest.fn().mockResolvedValue({ status: 'administrator' }),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.isBotAdminInChat(mockBotToken, mockChatId);

      expect(result).toBe(true);
    });

    it('should return true when bot is creator', async () => {
      const mockBot = {
        telegram: {
          getMe: jest.fn().mockResolvedValue({ id: 999 }),
          getChatMember: jest.fn().mockResolvedValue({ status: 'creator' }),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.isBotAdminInChat(mockBotToken, mockChatId);

      expect(result).toBe(true);
    });

    it('should return false when bot is member', async () => {
      const mockBot = {
        telegram: {
          getMe: jest.fn().mockResolvedValue({ id: 999 }),
          getChatMember: jest.fn().mockResolvedValue({ status: 'member' }),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.isBotAdminInChat(mockBotToken, mockChatId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const mockBot = {
        telegram: {
          getMe: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.isBotAdminInChat(mockBotToken, mockChatId);

      expect(result).toBe(false);
    });
  });

  describe('generateInviteLink', () => {
    it('should generate invite link successfully', async () => {
      const mockLink = { invite_link: 'https://t.me/+abc123' };
      const mockBot = {
        telegram: {
          createChatInviteLink: jest.fn().mockResolvedValue(mockLink),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.generateInviteLink(mockBotToken, mockChatId);

      expect(result).toBe(mockLink.invite_link);
    });

    it('should generate link with expiry and member limit', async () => {
      const mockLink = { invite_link: 'https://t.me/+abc123' };
      const mockBot = {
        telegram: {
          createChatInviteLink: jest.fn().mockResolvedValue(mockLink),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const expireDate = new Date('2025-12-31');
      await service.generateInviteLink(mockBotToken, mockChatId, expireDate, 100);

      expect(mockBot.telegram.createChatInviteLink).toHaveBeenCalledWith(
        mockChatId,
        expect.objectContaining({
          expire_date: expect.any(Number),
          member_limit: 100,
        })
      );
    });

    it('should return null on error', async () => {
      const mockBot = {
        telegram: {
          createChatInviteLink: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.generateInviteLink(mockBotToken, mockChatId);

      expect(result).toBeNull();
    });
  });

  describe('setChatTitle', () => {
    beforeEach(() => {
      cacheManager.get.mockResolvedValue(null);
    });

    it('should set chat title successfully', async () => {
      const mockBot = {
        telegram: {
          setChatTitle: jest.fn().mockResolvedValue(true),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.setChatTitle(mockBotToken, mockChatId, 'New Title');

      expect(result).toBe(true);
      expect(mockBot.telegram.setChatTitle).toHaveBeenCalledWith(mockChatId, 'New Title');
      expect(cacheManager.del).toHaveBeenCalled(); // Cache invalidation
      expect(loggerService.telegram).toHaveBeenCalledWith(
        'SetChatTitle',
        expect.objectContaining({ success: true })
      );
    });

    it('should return false on error', async () => {
      const mockBot = {
        telegram: {
          setChatTitle: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.setChatTitle(mockBotToken, mockChatId, 'New Title');

      expect(result).toBe(false);
      expect(loggerService.telegram).toHaveBeenCalledWith(
        'SetChatTitle',
        expect.objectContaining({ success: false }),
        'error'
      );
    });

    it('should invalidate cache after title update', async () => {
      const mockBot = {
        telegram: {
          setChatTitle: jest.fn().mockResolvedValue(true),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      await service.setChatTitle(mockBotToken, mockChatId, 'New Title');

      expect(cacheManager.del).toHaveBeenCalledWith(
        expect.stringContaining(`chat:info:${mockChatId}`)
      );
    });
  });

  describe('setChatDescription', () => {
    beforeEach(() => {
      cacheManager.get.mockResolvedValue(null);
    });

    it('should set chat description successfully', async () => {
      const mockBot = {
        telegram: {
          setChatDescription: jest.fn().mockResolvedValue(true),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.setChatDescription(
        mockBotToken,
        mockChatId,
        'New description'
      );

      expect(result).toBe(true);
      expect(mockBot.telegram.setChatDescription).toHaveBeenCalledWith(
        mockChatId,
        'New description'
      );
    });

    it('should return false on error', async () => {
      const mockBot = {
        telegram: {
          setChatDescription: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.setChatDescription(
        mockBotToken,
        mockChatId,
        'New description'
      );

      expect(result).toBe(false);
    });
  });

  describe('getChannelInfo', () => {
    it('should return cached channel info if available', async () => {
      const cachedChannel = {
        id: mockChatId,
        type: 'channel' as const,
        title: 'Test Channel',
      };
      cacheManager.get.mockResolvedValueOnce(cachedChannel);

      const result = await service.getChannelInfo(mockBotToken, mockChatId);

      expect(result).toEqual(cachedChannel);
    });

    it('should return null if chat is not a channel', async () => {
      cacheManager.get.mockResolvedValueOnce(null);
      const mockBot = {
        telegram: {
          getChat: jest.fn().mockResolvedValue({
            id: mockChatId,
            type: 'group',
            title: 'Test Group',
          }),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.getChannelInfo(mockBotToken, mockChatId);

      expect(result).toBeNull();
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('not a channel')
      );
    });
  });

  describe('verifyBotPermissionsInChannel', () => {
    it('should verify creator has all permissions', async () => {
      const mockBot = {
        telegram: {
          getMe: jest.fn().mockResolvedValue({ id: 999 }),
          getChatMember: jest.fn().mockResolvedValue({ status: 'creator' }),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.verifyBotPermissionsInChannel(
        mockBotToken,
        mockChatId
      );

      expect(result).toEqual({
        isAdmin: true,
        canPostMessages: true,
        canEditMessages: true,
        canDeleteMessages: true,
      });
    });

    it('should verify administrator permissions', async () => {
      const mockBot = {
        telegram: {
          getMe: jest.fn().mockResolvedValue({ id: 999 }),
          getChatMember: jest.fn().mockResolvedValue({
            status: 'administrator',
            can_post_messages: true,
            can_edit_messages: false,
            can_delete_messages: true,
          }),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.verifyBotPermissionsInChannel(
        mockBotToken,
        mockChatId
      );

      expect(result).toEqual({
        isAdmin: true,
        canPostMessages: true,
        canEditMessages: false,
        canDeleteMessages: true,
      });
    });

    it('should return false for all permissions on error', async () => {
      const mockBot = {
        telegram: {
          getMe: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.verifyBotPermissionsInChannel(
        mockBotToken,
        mockChatId
      );

      expect(result).toEqual({
        isAdmin: false,
        canPostMessages: false,
        canEditMessages: false,
        canDeleteMessages: false,
      });
    });
  });

  describe('postToChannel', () => {
    beforeEach(() => {
      cacheManager.get.mockResolvedValue(null);
    });

    it('should post message to channel successfully', async () => {
      const mockBot = {
        telegram: {
          sendMessage: jest.fn().mockResolvedValue({ message_id: 456 }),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.postToChannel(
        mockBotToken,
        mockChatId,
        'Channel message'
      );

      expect(result).toEqual({
        success: true,
        messageId: 456,
      });
    });

    it('should return failure on error', async () => {
      const mockBot = {
        telegram: {
          sendMessage: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.postToChannel(
        mockBotToken,
        mockChatId,
        'Channel message'
      );

      expect(result).toEqual({
        success: false,
      });
    });
  });

  describe('Webhook Operations', () => {
    describe('setWebhook', () => {
      it('should set webhook successfully', async () => {
        const mockBot = {
          telegram: {
            setWebhook: jest.fn().mockResolvedValue(true),
          },
        };
        service['bots'].set(mockBotToken, mockBot as any);

        const result = await service.setWebhook(
          mockBotToken,
          'https://example.com/webhook'
        );

        expect(result).toBe(true);
        expect(mockBot.telegram.setWebhook).toHaveBeenCalledWith(
          'https://example.com/webhook'
        );
      });

      it('should return false on error', async () => {
        const mockBot = {
          telegram: {
            setWebhook: jest.fn().mockRejectedValue(new Error('Failed')),
          },
        };
        service['bots'].set(mockBotToken, mockBot as any);

        const result = await service.setWebhook(mockBotToken, 'https://example.com');

        expect(result).toBe(false);
      });
    });

    describe('deleteWebhook', () => {
      it('should delete webhook successfully', async () => {
        const mockBot = {
          telegram: {
            deleteWebhook: jest.fn().mockResolvedValue(true),
          },
        };
        service['bots'].set(mockBotToken, mockBot as any);

        const result = await service.deleteWebhook(mockBotToken);

        expect(result).toBe(true);
      });
    });

    describe('getWebhookInfo', () => {
      it('should get webhook info successfully', async () => {
        const mockInfo = { url: 'https://example.com', has_custom_certificate: false };
        const mockBot = {
          telegram: {
            getWebhookInfo: jest.fn().mockResolvedValue(mockInfo),
          },
        };
        service['bots'].set(mockBotToken, mockBot as any);

        const result = await service.getWebhookInfo(mockBotToken);

        expect(result).toEqual(mockInfo);
      });
    });
  });

  describe('answerCallbackQuery', () => {
    it('should answer callback query successfully', async () => {
      const mockBot = {
        telegram: {
          answerCbQuery: jest.fn().mockResolvedValue(true),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.answerCallbackQuery(
        mockBotToken,
        'callback-123',
        'Response text'
      );

      expect(result).toBe(true);
      expect(mockBot.telegram.answerCbQuery).toHaveBeenCalledWith(
        'callback-123',
        'Response text'
      );
    });

    it('should return false on error', async () => {
      const mockBot = {
        telegram: {
          answerCbQuery: jest.fn().mockRejectedValue(new Error('Failed')),
        },
      };
      service['bots'].set(mockBotToken, mockBot as any);

      const result = await service.answerCallbackQuery(mockBotToken, 'callback-123');

      expect(result).toBe(false);
    });
  });

  describe('cleanupBotInstance', () => {
    it('should cleanup bot instance and stop it', () => {
      const mockBot = {
        stop: jest.fn(),
      };
      service['bots'].set(mockBotToken, mockBot as any);

      service.cleanupBotInstance(mockBotToken);

      expect(mockBot.stop).toHaveBeenCalled();
      expect(service['bots'].has(mockBotToken)).toBe(false);
    });

    it('should handle cleanup when bot does not exist', () => {
      expect(() => service.cleanupBotInstance('non-existent-token')).not.toThrow();
    });
  });
});
