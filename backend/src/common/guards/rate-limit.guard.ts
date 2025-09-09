import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, number[]>();
  private readonly windowMs = 60 * 1000; // 1 minute
  private readonly maxRequests = 100; // Max requests per window

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientId = this.getClientId(request);
    
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this client
    const clientRequests = this.requests.get(clientId) || [];
    
    // Filter out requests outside the current window
    const recentRequests = clientRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if rate limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }
    
    // Add current request timestamp
    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanupOldEntries();
    }
    
    return true;
  }

  private getClientId(request: Request): string {
    // Use IP address and user agent as client identifier
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const userAgent = request.get('user-agent') || 'unknown';
    return `${ip}-${userAgent}`;
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [clientId, timestamps] of this.requests.entries()) {
      const recentRequests = timestamps.filter(timestamp => timestamp > windowStart);
      
      if (recentRequests.length === 0) {
        this.requests.delete(clientId);
      } else {
        this.requests.set(clientId, recentRequests);
      }
    }
  }
}