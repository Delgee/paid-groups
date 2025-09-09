import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { logger as winstonLogger } from './winston.config';

interface LogContext {
  context?: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private metadata: LogContext = {};

  constructor(context?: string) {
    this.context = context;
  }

  setContext(context: string): void {
    this.context = context;
  }

  setMetadata(metadata: LogContext): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  setTenantId(tenantId: string): void {
    this.metadata.tenantId = tenantId;
  }

  setUserId(userId: string): void {
    this.metadata.userId = userId;
  }

  setRequestId(requestId: string): void {
    this.metadata.requestId = requestId;
  }

  log(message: any, context?: string): void {
    this.info(message, context);
  }

  info(message: any, contextOrMeta?: string | LogContext): void {
    if (typeof contextOrMeta === 'string') {
      winstonLogger.info(this.formatMessage(message), this.getLogMeta(contextOrMeta));
    } else {
      winstonLogger.info(this.formatMessage(message), { ...this.getLogMeta(), ...contextOrMeta });
    }
  }

  error(message: any, trace?: string, contextOrMeta?: string | LogContext): void {
    let meta: LogContext;
    
    if (typeof contextOrMeta === 'string') {
      meta = this.getLogMeta(contextOrMeta);
    } else {
      meta = { ...this.getLogMeta(), ...contextOrMeta };
    }
    
    if (trace) {
      meta.trace = trace;
    }
    
    winstonLogger.error(this.formatMessage(message), meta);
  }

  warn(message: any, contextOrMeta?: string | LogContext): void {
    if (typeof contextOrMeta === 'string') {
      winstonLogger.warn(this.formatMessage(message), this.getLogMeta(contextOrMeta));
    } else {
      winstonLogger.warn(this.formatMessage(message), { ...this.getLogMeta(), ...contextOrMeta });
    }
  }

  debug(message: any, contextOrMeta?: string | LogContext): void {
    if (typeof contextOrMeta === 'string') {
      winstonLogger.debug(this.formatMessage(message), this.getLogMeta(contextOrMeta));
    } else {
      winstonLogger.debug(this.formatMessage(message), { ...this.getLogMeta(), ...contextOrMeta });
    }
  }

  verbose(message: any, contextOrMeta?: string | LogContext): void {
    if (typeof contextOrMeta === 'string') {
      winstonLogger.verbose(this.formatMessage(message), this.getLogMeta(contextOrMeta));
    } else {
      winstonLogger.verbose(this.formatMessage(message), { ...this.getLogMeta(), ...contextOrMeta });
    }
  }

  http(message: any, contextOrMeta?: string | LogContext): void {
    if (typeof contextOrMeta === 'string') {
      winstonLogger.http(this.formatMessage(message), this.getLogMeta(contextOrMeta));
    } else {
      winstonLogger.http(this.formatMessage(message), { ...this.getLogMeta(), ...contextOrMeta });
    }
  }

  /**
   * Log with custom level
   */
  logWithLevel(level: string, message: any, contextOrMeta?: string | LogContext): void {
    if (typeof contextOrMeta === 'string') {
      winstonLogger.log(level, this.formatMessage(message), this.getLogMeta(contextOrMeta));
    } else {
      winstonLogger.log(level, this.formatMessage(message), { ...this.getLogMeta(), ...contextOrMeta });
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, metadata?: Record<string, any>): void {
    winstonLogger.info(`Performance: ${operation}`, {
      ...this.getLogMeta(),
      type: 'performance',
      operation,
      duration,
      ...metadata,
    });
  }

  /**
   * Log audit events
   */
  audit(action: string, details: Record<string, any>): void {
    winstonLogger.info(`Audit: ${action}`, {
      ...this.getLogMeta(),
      type: 'audit',
      action,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * Log security events
   */
  security(event: string, details: Record<string, any>): void {
    winstonLogger.warn(`Security: ${event}`, {
      ...this.getLogMeta(),
      type: 'security',
      event,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * Log payment events
   */
  payment(event: string, paymentId: string, details: Record<string, any>): void {
    winstonLogger.info(`Payment: ${event}`, {
      ...this.getLogMeta(),
      type: 'payment',
      event,
      paymentId,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * Log webhook events
   */
  webhook(source: string, event: string, details: Record<string, any>): void {
    winstonLogger.info(`Webhook: ${source} - ${event}`, {
      ...this.getLogMeta(),
      type: 'webhook',
      source,
      event,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * Log database queries (for debugging)
   */
  query(sql: string, parameters?: any[], duration?: number): void {
    if (process.env.LOG_DB_QUERIES === 'true') {
      winstonLogger.debug('Database Query', {
        ...this.getLogMeta(),
        type: 'database',
        sql,
        parameters,
        duration,
      });
    }
  }

  private formatMessage(message: any): string {
    if (typeof message === 'object') {
      try {
        return JSON.stringify(message);
      } catch {
        return String(message);
      }
    }
    return String(message);
  }

  private getLogMeta(context?: string): LogContext {
    return {
      ...this.metadata,
      context: context || this.context,
    };
  }
}

/**
 * Factory function to create a logger with context
 */
export function createLogger(context: string): LoggerService {
  const logger = new LoggerService(context);
  return logger;
}