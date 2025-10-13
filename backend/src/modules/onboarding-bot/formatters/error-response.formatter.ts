export enum ErrorCode {
  INVALID_BOT_TOKEN = 'INVALID_BOT_TOKEN',
  DUPLICATE_EMAIL = 'DUPLICATE_EMAIL',
  DUPLICATE_TELEGRAM_ACCOUNT = 'DUPLICATE_TELEGRAM_ACCOUNT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_EMAIL_FORMAT = 'INVALID_EMAIL_FORMAT',
  INVALID_VERIFICATION_CODE = 'INVALID_VERIFICATION_CODE',
  VERIFICATION_CODE_EXPIRED = 'VERIFICATION_CODE_EXPIRED',
  SESSION_TIMEOUT = 'SESSION_TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BOT_PERMISSION_ERROR = 'BOT_PERMISSION_ERROR',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  NOT_REGISTERED = 'NOT_REGISTERED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ErrorResponse {
  error: {
    code: ErrorCode | string;
    message: string;
    details?: Record<string, any>;
  };
}

export class ErrorResponseFormatter {
  static format(
    code: ErrorCode | string,
    message: string,
    details?: Record<string, any>,
  ): ErrorResponse {
    return {
      error: {
        code,
        message,
        details: details || undefined,
      },
    };
  }

  static invalidEmail(): ErrorResponse {
    return this.format(
      ErrorCode.INVALID_EMAIL_FORMAT,
      '❌ Invalid email format.\n\nPlease provide a valid email address (e.g., john@example.com)',
      { field: 'email' },
    );
  }

  static duplicateEmail(): ErrorResponse {
    return this.format(
      ErrorCode.DUPLICATE_EMAIL,
      '⚠️ This email is already registered.\n\nWould you like to:\n• Link this Telegram account to existing account\n• Use a different email',
      { field: 'email' },
    );
  }

  static invalidBotToken(): ErrorResponse {
    return this.format(
      ErrorCode.INVALID_BOT_TOKEN,
      '❌ Invalid bot token.\n\nPlease check your token and try again. Make sure you:\n1. Copied the entire token from @BotFather\n2. Didn\'t add extra spaces\n3. Used a token from @BotFather, not another bot\n\nNeed help? Visit @BotFather and send /mybots to see your tokens.',
    );
  }

  static botPermissionError(groupName: string): ErrorResponse {
    return this.format(
      ErrorCode.BOT_PERMISSION_ERROR,
      `❌ I don't have admin permissions in "${groupName}".\n\nTo fix this:\n1. Open the group settings in Telegram\n2. Go to Administrators\n3. Add me as admin\n4. Enable "Manage Chat" permission\n5. Try again by forwarding a message from the group\n\nOnce you've done this, forward any message from the group to me.`,
    );
  }

  static rateLimitExceeded(retryAfter: number): ErrorResponse {
    return this.format(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `⏸ Slow down! You've sent too many commands.\n\nPlease wait ${retryAfter} seconds and try again.\n\nRate limit: 20 commands per minute`,
      { retryAfter },
    );
  }

  static sessionTimeout(): ErrorResponse {
    return this.format(
      ErrorCode.SESSION_TIMEOUT,
      '⏰ Your session expired after 1 hour of inactivity.\n\nWould you like to:\n• Start over\n• Continue where you left off (if I have your details)',
    );
  }

  static validationError(message: string, field?: string): ErrorResponse {
    return this.format(ErrorCode.VALIDATION_ERROR, message, field ? { field } : undefined);
  }

  static internalError(correlationId?: string): ErrorResponse {
    return this.format(
      ErrorCode.INTERNAL_ERROR,
      '❌ Something went wrong on our end. Please try again later.\n\nIf the problem persists, contact support with this reference: ' +
        (correlationId || 'unknown'),
      correlationId ? { correlationId } : undefined,
    );
  }
}
