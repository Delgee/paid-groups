import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  tenantId?: string;
  userId?: string;
  startTime: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    requestId: string;
    context: RequestContext;
  }
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate or use existing request ID
    const requestId = req.headers['x-request-id'] as string || uuidv4();
    
    // Set request context
    req.requestId = requestId;
    req.context = {
      requestId,
      startTime: Date.now(),
    };

    // Add request ID to response headers
    res.setHeader('x-request-id', requestId);

    // Set context from authenticated user if available
    if (req.user) {
      const user = req.user as any;
      req.context.tenantId = user.tenant_id;
      req.context.userId = user.sub || user.id;
    }

    next();
  }
}