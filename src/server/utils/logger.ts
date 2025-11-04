import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;

  // Add metadata if present
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  // Add stack trace if error
  if (stack) {
    msg += `\n${stack}`;
  }

  return msg;
});

// Create logs directory at project root
const logsDir = path.join(process.cwd(), 'logs');

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }), // Log full stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),
  defaultMeta: { service: 'ollama-ui' },
  transports: [
    // Error logs - only errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: combine(
        timestamp(),
        winston.format.json()
      ),
    }),
    // Combined logs - everything
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: combine(
        timestamp(),
        winston.format.json()
      ),
    }),
  ],
});

// Console output in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    })
  );
}

// Helper functions for common logging patterns
export const logRequest = (method: string, path: string, metadata?: Record<string, unknown>) => {
  logger.info(`${method} ${path}`, metadata);
};

export const logError = (message: string, error: Error | unknown, metadata?: Record<string, unknown>) => {
  if (error instanceof Error) {
    logger.error(message, { ...metadata, error: error.message, stack: error.stack });
  } else {
    logger.error(message, { ...metadata, error: String(error) });
  }
};

export const logDebug = (message: string, metadata?: Record<string, unknown>) => {
  logger.debug(message, metadata);
};

export const logInfo = (message: string, metadata?: Record<string, unknown>) => {
  logger.info(message, metadata);
};

export const logWarning = (message: string, metadata?: Record<string, unknown>) => {
  logger.warn(message, metadata);
};
