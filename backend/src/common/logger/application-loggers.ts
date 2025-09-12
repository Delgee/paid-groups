import { LoggerService } from './logger.service';

/**
 * Pre-configured loggers for different application domains
 */

export class AuthLogger extends LoggerService {
  constructor() {
    super();
    this.setContext('Auth');
  }

  loginAttempt(userId: string, email: string, success: boolean, ip?: string) {
    const level = success ? 'info' : 'warn';
    this.logWithLevel(level, `Login attempt ${success ? 'successful' : 'failed'}`, {
      userId,
      email,
      success,
      ip,
      type: 'auth_event',
    });
  }

  tokenRefresh(userId: string, tokenType: 'access' | 'refresh') {
    this.info(`Token ${tokenType} refreshed`, {
      userId,
      tokenType,
      type: 'auth_event',
    });
  }

  passwordReset(email: string, success: boolean) {
    this.info(`Password reset ${success ? 'successful' : 'failed'}`, {
      email,
      success,
      type: 'auth_event',
    });
  }
}

export class PaymentLogger extends LoggerService {
  constructor() {
    super();
    this.setContext('Payment');
  }

  webhookReceived(source: string, eventType: string, paymentId: string, tenantId?: string) {
    this.webhook(source, eventType, {
      paymentId,
      tenantId,
    });
  }

  paymentProcessed(paymentId: string, status: string, amount: number, currency: string) {
    this.payment('processed', paymentId, {
      status,
      amount,
      currency,
    });
  }

  queueJobStarted(jobType: string, jobId: string, paymentId?: string) {
    this.info(`Queue job started: ${jobType}`, {
      jobType,
      jobId,
      paymentId,
      type: 'queue_event',
    });
  }

  queueJobCompleted(jobType: string, jobId: string, duration: number) {
    this.info(`Queue job completed: ${jobType}`, {
      jobType,
      jobId,
      duration,
      type: 'queue_event',
    });
  }

  queueJobFailed(jobType: string, jobId: string, error: string, attempts: number) {
    this.error(`Queue job failed: ${jobType}`, error, {
      jobType,
      jobId,
      attempts,
      type: 'queue_event',
    });
  }
}

export class BotLogger extends LoggerService {
  constructor() {
    super();
    this.setContext('Bot');
  }

  webhookProcessed(botToken: string, updateId: number, updateType: string, chatId?: number) {
    this.webhook('telegram', 'update_received', {
      botToken: botToken.substring(0, 10) + '...',
      updateId,
      updateType,
      chatId,
    });
  }

  commandExecuted(command: string, userId: number, chatId: number, success: boolean) {
    this.info(`Command executed: ${command}`, {
      command,
      userId: userId.toString(),
      chatId,
      success,
      type: 'bot_command',
    });
  }

  memberJoined(userId: number, chatId: number, hasValidMembership: boolean) {
    this.info('Member joined group', {
      userId: userId.toString(),
      chatId,
      hasValidMembership,
      type: 'member_event',
    });
  }

  memberLeft(userId: number, chatId: number) {
    this.info('Member left group', {
      userId: userId.toString(),
      chatId,
      type: 'member_event',
    });
  }

  messagesSent(botId: string, count: number, chatId: number) {
    this.info(`Messages sent by bot`, {
      botId,
      count,
      chatId,
      type: 'bot_activity',
    });
  }
}

export class MembershipLogger extends LoggerService {
  constructor() {
    super();
    this.setContext('Membership');
  }

  membershipCreated(membershipId: string, memberId: string, planId: string, expiresAt: Date) {
    this.info('Membership created', {
      membershipId,
      memberId,
      planId,
      expiresAt,
      type: 'membership_event',
    });
  }

  membershipExtended(membershipId: string, oldExpiry: Date, newExpiry: Date) {
    this.info('Membership extended', {
      membershipId,
      oldExpiry,
      newExpiry,
      type: 'membership_event',
    });
  }

  membershipExpired(membershipId: string, memberId: string) {
    this.warn('Membership expired', {
      membershipId,
      memberId,
      type: 'membership_event',
    });
  }

  membershipCancelled(membershipId: string, reason?: string) {
    this.info('Membership cancelled', {
      membershipId,
      reason,
      type: 'membership_event',
    });
  }
}

export class SecurityLogger extends LoggerService {
  constructor() {
    super();
    this.setContext('Security');
  }

  rateLimitExceeded(ip: string, endpoint: string, limit: number) {
    this.security('rate_limit_exceeded', {
      ip,
      endpoint,
      limit,
    });
  }

  suspiciousActivity(type: string, details: Record<string, any>) {
    this.security('suspicious_activity', {
      activityType: type,
      ...details,
    });
  }

  accessDenied(userId?: string, resource?: string, action?: string) {
    this.security('access_denied', {
      userId,
      resource,
      action,
    });
  }

  invalidToken(tokenType: string, reason: string, userId?: string) {
    this.security('invalid_token', {
      tokenType,
      reason,
      userId,
    });
  }
}