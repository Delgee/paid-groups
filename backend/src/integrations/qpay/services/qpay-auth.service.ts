import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import axios, { AxiosInstance } from 'axios';
import { LoggerService } from '../../../common/logger/logger.service';
import {
  QPayTokenResponse,
  QPayAuthCredentials,
  QPayErrorResponse,
} from '../interfaces/qpay.interface';

/**
 * QPay Authentication Service
 *
 * Handles authentication with QPay API using Basic Auth to obtain JWT tokens.
 * Implements token caching and automatic refresh to minimize API calls.
 *
 * @see /qpay-doc.md for QPay API documentation
 */
@Injectable()
export class QPayAuthService {
  private readonly baseUrl: string;
  private readonly credentials: QPayAuthCredentials;
  private readonly httpClient: AxiosInstance;
  private readonly TOKEN_CACHE_KEY = 'qpay:access_token';
  private readonly REFRESH_TOKEN_CACHE_KEY = 'qpay:refresh_token';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.baseUrl = this.configService.getOrThrow<string>('QPAY_BASE_URL');
    this.credentials = {
      username: this.configService.getOrThrow<string>('QPAY_USERNAME'),
      password: this.configService.getOrThrow<string>('QPAY_PASSWORD'),
      terminal_id: this.configService.getOrThrow<string>('QPAY_TERMINAL_ID'),
    };

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.setContext(QPayAuthService.name);
  }

  /**
   * Get a valid access token
   * Returns cached token if available, otherwise requests a new one
   */
  async getAccessToken(): Promise<string> {
    const startTime = Date.now();

    try {
      // Check cache for existing token
      const cachedToken = await this.cacheManager.get<string>(
        this.TOKEN_CACHE_KEY,
      );

      if (cachedToken) {
        this.logger.debug('QPay access token retrieved from cache', {
          duration: Date.now() - startTime,
        });
        return cachedToken;
      }

      // No cached token, request a new one
      this.logger.info('QPay access token not in cache, requesting new token');
      const tokenResponse = await this.requestNewToken();

      // Cache the new token (with 5 minute buffer before expiration)
      const cacheExpiry = (tokenResponse.expires_in - 300) * 1000; // Convert to ms
      await this.cacheManager.set(
        this.TOKEN_CACHE_KEY,
        tokenResponse.token,
        cacheExpiry,
      );
      await this.cacheManager.set(
        this.REFRESH_TOKEN_CACHE_KEY,
        tokenResponse.refresh_token,
        cacheExpiry,
      );

      this.logger.info('QPay access token cached successfully', {
        expiresIn: tokenResponse.expires_in,
        duration: Date.now() - startTime,
      });

      return tokenResponse.token;
    } catch (error) {
      this.logger.error('Failed to get QPay access token', '', {
        error: error.message,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Request a new access token from QPay API using Basic Auth
   */
  private async requestNewToken(): Promise<QPayTokenResponse> {
    const startTime = Date.now();

    try {
      this.logger.debug('Requesting new QPay access token', {
        username: this.credentials.username,
        terminalId: this.credentials.terminal_id,
      });

      const response = await this.httpClient.post<QPayTokenResponse>(
        '/v2/auth/token',
        {
          terminal_id: this.credentials.terminal_id,
        },
        {
          auth: {
            username: this.credentials.username,
            password: this.credentials.password,
          },
        },
      );

      this.logger.info('QPay access token obtained successfully', {
        expiresIn: response.data.expires_in,
        duration: Date.now() - startTime,
      });

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (axios.isAxiosError(error)) {
        const qpayError = error.response?.data as QPayErrorResponse;

        this.logger.error('QPay token request failed', '', {
          status: error.response?.status,
          errorCode: qpayError?.error?.code,
          errorMessage: qpayError?.error?.message,
          duration,
        });

        throw new UnauthorizedException({
          error: {
            code: 'QPAY_AUTH_FAILED',
            message: 'Failed to authenticate with QPay. Please check credentials.',
            details: {
              qpayError: qpayError?.error?.message,
            },
          },
        });
      }

      this.logger.error('Unexpected error during QPay token request', '', {
        error: error.message,
        duration,
      });

      throw new UnauthorizedException({
        error: {
          code: 'QPAY_AUTH_ERROR',
          message: 'An unexpected error occurred during QPay authentication.',
        },
      });
    }
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refreshAccessToken(): Promise<string> {
    const startTime = Date.now();

    try {
      const refreshToken = await this.cacheManager.get<string>(
        this.REFRESH_TOKEN_CACHE_KEY,
      );

      if (!refreshToken) {
        this.logger.warn(
          'No refresh token available, requesting new token instead',
        );
        return this.getAccessToken();
      }

      this.logger.debug('Refreshing QPay access token');

      const response = await this.httpClient.post<QPayTokenResponse>(
        '/v2/auth/refresh',
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        },
      );

      // Cache the refreshed token
      const cacheExpiry = (response.data.expires_in - 300) * 1000; // Convert to ms
      await this.cacheManager.set(
        this.TOKEN_CACHE_KEY,
        response.data.token,
        cacheExpiry,
      );
      await this.cacheManager.set(
        this.REFRESH_TOKEN_CACHE_KEY,
        response.data.refresh_token,
        cacheExpiry,
      );

      this.logger.info('QPay access token refreshed successfully', {
        expiresIn: response.data.expires_in,
        duration: Date.now() - startTime,
      });

      return response.data.token;
    } catch (error) {
      this.logger.error('Failed to refresh QPay access token', '', {
        error: error.message,
        duration: Date.now() - startTime,
      });

      // If refresh fails, clear cache and request new token
      await this.clearTokenCache();
      return this.getAccessToken();
    }
  }

  /**
   * Clear cached tokens (useful for logout or token invalidation)
   */
  async clearTokenCache(): Promise<void> {
    await this.cacheManager.del(this.TOKEN_CACHE_KEY);
    await this.cacheManager.del(this.REFRESH_TOKEN_CACHE_KEY);
    this.logger.debug('QPay token cache cleared');
  }

  /**
   * Get authenticated HTTP client with auto-injected bearer token
   */
  async getAuthenticatedClient(): Promise<AxiosInstance> {
    const token = await this.getAccessToken();

    return axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }

  /**
   * Health check: Verify QPay credentials are valid
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      this.logger.error('QPay health check failed', '', {
        error: error.message,
      });
      return false;
    }
  }
}
