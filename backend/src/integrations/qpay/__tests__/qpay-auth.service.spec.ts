import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { QPayAuthService } from '../services/qpay-auth.service';
import { LoggerService } from '../../../common/logger/logger.service';

describe('QPayAuthService', () => {
  let service: QPayAuthService;
  let configService: ConfigService;
  let cacheManager: any;
  let logger: LoggerService;
  let mockHttpClient: any;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        QPAY_BASE_URL: 'https://dev-vendor.qpay.mn',
        QPAY_USERNAME: 'test_user',
        QPAY_PASSWORD: 'test_pass',
        QPAY_TERMINAL_ID: '12345678',
      };
      return config[key];
    }),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QPayAuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<QPayAuthService>(QPayAuthService);
    configService = module.get<ConfigService>(ConfigService);
    cacheManager = module.get(CACHE_MANAGER);
    logger = module.get<LoggerService>(LoggerService);

    // Mock httpClient
    mockHttpClient = {
      post: jest.fn(),
    };
    (service as any).httpClient = mockHttpClient;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('should return cached token if available', async () => {
      const cachedToken = 'cached_token_123';
      mockCacheManager.get.mockResolvedValue(cachedToken);

      const result = await service.getAccessToken();

      expect(result).toBe(cachedToken);
      expect(mockCacheManager.get).toHaveBeenCalledWith('qpay:access_token');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'QPay access token retrieved from cache',
        expect.any(Object),
      );
    });

    it('should request new token when cache is empty', async () => {
      const mockTokenResponse = {
        token: 'new_token_456',
        refresh_token: 'refresh_token_789',
        expires_in: 3600,
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockHttpClient.post.mockResolvedValue({ data: mockTokenResponse });

      const result = await service.getAccessToken();

      expect(result).toBe(mockTokenResponse.token);
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'qpay:access_token',
        mockTokenResponse.token,
        expect.any(Number),
      );
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'qpay:refresh_token',
        mockTokenResponse.refresh_token,
        expect.any(Number),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'QPay access token cached successfully',
        expect.any(Object),
      );
    });

    it('should cache token with 5 minute buffer before expiration', async () => {
      const mockTokenResponse = {
        token: 'new_token_456',
        refresh_token: 'refresh_token_789',
        expires_in: 3600, // 1 hour
      };

      mockCacheManager.get.mockResolvedValue(null);
      mockHttpClient.post.mockResolvedValue({ data: mockTokenResponse });

      await service.getAccessToken();

      // Cache expiry should be (3600 - 300) * 1000 = 3,300,000 ms
      const expectedCacheExpiry = (3600 - 300) * 1000;

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'qpay:access_token',
        mockTokenResponse.token,
        expectedCacheExpiry,
      );
    });

    it('should throw UnauthorizedException on API error', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockHttpClient.post.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 401,
          data: {
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid username or password',
            },
          },
        },
      });

      await expect(service.getAccessToken()).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'QPay token request failed',
        '',
        expect.objectContaining({
          status: 401,
          errorCode: 'INVALID_CREDENTIALS',
        }),
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token using cached refresh token', async () => {
      const mockRefreshToken = 'refresh_token_123';
      const mockNewTokenResponse = {
        token: 'refreshed_token_456',
        refresh_token: 'new_refresh_token_789',
        expires_in: 3600,
      };

      mockCacheManager.get.mockResolvedValue(mockRefreshToken);
      mockHttpClient.post.mockResolvedValue({ data: mockNewTokenResponse });

      const result = await service.refreshAccessToken();

      expect(result).toBe(mockNewTokenResponse.token);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'QPay access token refreshed successfully',
        expect.any(Object),
      );
    });

    it('should request new token if no refresh token available', async () => {
      const mockNewTokenResponse = {
        token: 'new_token_456',
        refresh_token: 'refresh_token_789',
        expires_in: 3600,
      };

      // First call for refresh token (returns null)
      // Second call for access token (returns null)
      mockCacheManager.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      mockHttpClient.post.mockResolvedValue({ data: mockNewTokenResponse });

      const result = await service.refreshAccessToken();

      expect(result).toBe(mockNewTokenResponse.token);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No refresh token available, requesting new token instead',
      );
    });

    it('should fall back to new token on refresh failure', async () => {
      const mockRefreshToken = 'expired_refresh_token';
      const mockNewTokenResponse = {
        token: 'new_token_456',
        refresh_token: 'refresh_token_789',
        expires_in: 3600,
      };

      // First get for refresh token
      // Second get for access token in fallback
      mockCacheManager.get
        .mockResolvedValueOnce(mockRefreshToken)
        .mockResolvedValueOnce(null);

      // First post for refresh (fails), second post for new token
      mockHttpClient.post
        .mockRejectedValueOnce(new Error('Refresh token expired'))
        .mockResolvedValueOnce({ data: mockNewTokenResponse });

      const result = await service.refreshAccessToken();

      expect(result).toBe(mockNewTokenResponse.token);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2); // Clear both tokens
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to refresh QPay access token',
        '',
        expect.any(Object),
      );
    });
  });

  describe('clearTokenCache', () => {
    it('should clear both access and refresh tokens from cache', async () => {
      await service.clearTokenCache();

      expect(mockCacheManager.del).toHaveBeenCalledWith('qpay:access_token');
      expect(mockCacheManager.del).toHaveBeenCalledWith('qpay:refresh_token');
      expect(mockLogger.debug).toHaveBeenCalledWith('QPay token cache cleared');
    });
  });

  describe('getAuthenticatedClient', () => {
    it('should return HTTP client with bearer token', async () => {
      const mockToken = 'test_token_123';
      mockCacheManager.get.mockResolvedValue(mockToken);

      const client = await service.getAuthenticatedClient();

      expect(client).toBeDefined();
      expect(client.defaults.baseURL).toBe('https://dev-vendor.qpay.mn');
      expect(client.defaults.headers['Authorization']).toBe(
        `Bearer ${mockToken}`,
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when authentication succeeds', async () => {
      mockCacheManager.get.mockResolvedValue('valid_token');

      const result = await service.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when authentication fails', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockHttpClient.post.mockRejectedValue(new Error('Auth failed'));

      const result = await service.healthCheck();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'QPay health check failed',
        '',
        expect.any(Object),
      );
    });
  });
});
