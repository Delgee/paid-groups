import * as winston from 'winston';
import * as path from 'path';

const { combine, timestamp, printf, errors, json, colorize } = winston.format;

// Custom log format for console output
const consoleFormat = printf(({ level, message, timestamp, context, trace, ...metadata }) => {
  let msg = `${timestamp} [${level}]`;
  
  if (context) {
    msg += ` [${context}]`;
  }
  
  msg += `: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  if (trace) {
    msg += `\n${trace}`;
  }
  
  return msg;
});

// Define log levels
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey',
  },
};

// Add colors to winston
winston.addColors(logLevels.colors);

// Create the logger configuration
export const createWinstonLogger = (appName: string = 'telegram-saas') => {
  const logDir = process.env.LOG_DIR || 'logs';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const logLevel = process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug');

  const transports: winston.transport[] = [];

  // Console transport
  transports.push(
    new winston.transports.Console({
      level: logLevel,
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        consoleFormat,
      ),
    })
  );

  // File transports for production
  if (nodeEnv === 'production') {
    // Error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          json(),
        ),
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      })
    );

    // Combined log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        level: 'info',
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          json(),
        ),
        maxsize: 10485760, // 10MB
        maxFiles: 10,
      })
    );

    // Application-specific log file
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, `${appName}.log`),
        level: logLevel,
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          json(),
        ),
        maxsize: 10485760, // 10MB
        maxFiles: 7,
      })
    );
  }

  // Debug log file for development
  if (nodeEnv === 'development') {
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'debug.log'),
        level: 'debug',
        format: combine(
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          json(),
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 3,
      })
    );
  }

  return winston.createLogger({
    levels: logLevels.levels,
    level: logLevel,
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
    ),
    transports,
    exitOnError: false,
  });
};

// Create default logger instance
export const logger = createWinstonLogger();

// Export Winston types for use in other modules
export { winston };