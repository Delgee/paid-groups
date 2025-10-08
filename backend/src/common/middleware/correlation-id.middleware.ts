import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Correlation ID Middleware
 * Task: T084A - Add correlation ID middleware
 *
 * Generates or extracts correlation ID from request headers for request tracing
 * across the entire request lifecycle, including background jobs and external API calls.
 *
 * Constitutional Requirement: Principle VIII - Observability & Monitoring
 */

// Global AsyncLocalStorage for correlation ID context
export const correlationIdStorage = new AsyncLocalStorage<string>();

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Extract correlation ID from header or generate new one
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

    // Store correlation ID in request object for easy access
    req['correlationId'] = correlationId;

    // Set correlation ID in response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Run the rest of the request within the correlation ID context
    correlationIdStorage.run(correlationId, () => {
      next();
    });
  }
}

/**
 * Decorator to inject correlation ID into controller methods
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CorrelationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.correlationId || correlationIdStorage.getStore() || 'unknown';
  },
);

/**
 * Helper function to get current correlation ID from anywhere in the app
 */
export function getCurrentCorrelationId(): string {
  return correlationIdStorage.getStore() || 'unknown';
}
