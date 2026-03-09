import pino from 'pino';
import { loggerConfig } from '@config/logger';
import type { LogContext, LogMetadata, Logger } from './types';

const baseOptions: pino.LoggerOptions = {
  level: loggerConfig.level,
  formatters: {
    level: label => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: [...loggerConfig.redact],
};

const options: pino.LoggerOptions =
  loggerConfig.pretty || process.env.NODE_ENV !== 'production'
    ? {
        ...baseOptions,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : baseOptions;

const pinoLogger = pino(options);

class PinoLogger implements Logger {
  constructor(private metadata: LogMetadata = {}) {}

  debug(message: string, context: LogContext = {}): void {
    pinoLogger.debug({ ...this.metadata, ...context }, message);
  }

  info(message: string, context: LogContext = {}): void {
    pinoLogger.info({ ...this.metadata, ...context }, message);
  }

  warn(message: string, context: LogContext = {}): void {
    pinoLogger.warn({ ...this.metadata, ...context }, message);
  }

  error(message: string, error?: unknown, context: LogContext = {}): void {
    const errorContext =
      error instanceof Error ? { error: this.serializeError(error), ...context } : context;
    pinoLogger.error({ ...this.metadata, ...errorContext }, message);
  }

  child(metadata: LogMetadata): Logger {
    return new PinoLogger({ ...this.metadata, ...metadata });
  }

  private serializeError(error: Error): Record<string, unknown> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }
}

export const logger = new PinoLogger();

export function createLogger(metadata: LogMetadata): Logger {
  return new PinoLogger(metadata);
}
