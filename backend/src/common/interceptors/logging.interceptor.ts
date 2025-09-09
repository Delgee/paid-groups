import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl: url, headers, body } = request;
    
    // Generate request ID
    const requestId = uuidv4();
    request['requestId'] = requestId;
    
    // Set request metadata
    const loggerWithMeta = new LoggerService('HTTP');
    loggerWithMeta.setRequestId(requestId);
    
    // Extract tenant and user info if available
    if (request.user) {
      const user = request.user as any;
      if (user.tenant_id) loggerWithMeta.setTenantId(user.tenant_id);
      if (user.sub || user.id) loggerWithMeta.setUserId(user.sub || user.id);
    }

    const startTime = Date.now();
    const userAgent = headers['user-agent'] || 'Unknown';
    const ip = this.getClientIp(request);

    // Log incoming request
    loggerWithMeta.http(`${method} ${url}`, {
      type: 'request',
      method,
      url,
      userAgent,
      ip,
      requestId,
      contentLength: headers['content-length'],
      // Only log body for non-sensitive endpoints and if it's not too large
      body: this.shouldLogBody(url, method) ? this.sanitizeBody(body) : undefined,
    });

    return next.handle().pipe(
      tap((responseData) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        loggerWithMeta.http(`${method} ${url} - ${statusCode}`, {
          type: 'response',
          method,
          url,
          statusCode,
          duration,
          requestId,
          responseSize: JSON.stringify(responseData || {}).length,
        });

        // Log performance if request is slow
        if (duration > 1000) {
          loggerWithMeta.performance(`${method} ${url}`, duration, {
            statusCode,
            slow: true,
          });
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        loggerWithMeta.error(`${method} ${url} - ERROR ${statusCode}`, error.stack, {
          type: 'error_response',
          method,
          url,
          statusCode,
          duration,
          requestId,
          errorMessage: error.message,
          errorName: error.name,
        });

        throw error;
      }),
    );
  }

  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    ) as string;
  }

  private shouldLogBody(url: string, method: string): boolean {
    // Don't log bodies for GET requests
    if (method === 'GET') return false;
    
    // Don't log sensitive endpoints
    const sensitiveEndpoints = ['/auth/login', '/auth/register', '/webhooks'];
    if (sensitiveEndpoints.some(endpoint => url.includes(endpoint))) return false;
    
    return process.env.LOG_REQUEST_BODIES === 'true';
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}