import { Injectable, NestMiddleware, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly MAX_REQUESTS = 20; // 20 requests per minute
  private readonly WINDOW_MS = 60000; // 1 minute in milliseconds
  private readonly RATE_LIMIT_PREFIX = 'rate:limit:onboarding:';

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const telegramUserId = req.body?.message?.from?.id;

      if (!telegramUserId) {
        return next();
      }

      const key = `${this.RATE_LIMIT_PREFIX}${telegramUserId}`;
      const currentCount = (await this.cacheManager.get<number>(key)) || 0;

      if (currentCount >= this.MAX_REQUESTS) {
        const ttl = await this.getTTL(key);
        throw new HttpException(
          {
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Too many commands. Please wait ${Math.ceil(ttl / 1000)} seconds and try again.`,
              details: {
                retryAfter: Math.ceil(ttl / 1000),
              },
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Increment counter
      await this.cacheManager.set(key, currentCount + 1, this.WINDOW_MS);

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      next();
    }
  }

  private async getTTL(key: string): Promise<number> {
    // Return remaining time or default window
    return this.WINDOW_MS;
  }
}
