import pino from 'pino';
import { getConfig } from '@config/index';
import type { LogContext, LogMetadata, Logger } from './types';

interface LoggerConfig {
  level: pino.LevelWithSilent;
  pretty: boolean;
  format: string;
  redact: string[];
}

let pinoLoggerInstance: pino.Logger | null = null;

function getLoggerConfig(): LoggerConfig {
  // Resolve config at runtime so logger can still work in limited test/bootstrap contexts.
  try {
    const config = getConfig();
    return {
      level: config.LOG_LEVEL as pino.LevelWithSilent,
      pretty: config.LOG_PRETTY && config.NODE_ENV !== 'production',
      format: config.LOG_FORMAT,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    };
  } catch {
    // Fallback config if config module isn't available yet
    return {
      level: (process.env.LOG_LEVEL as pino.LevelWithSilent) || 'info',
      pretty: process.env.LOG_PRETTY === 'true' || process.env.NODE_ENV !== 'production',
      format: process.env.LOG_FORMAT || 'json',
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    };
  }
}

function getPinoLoggerInstance(): pino.Logger {
  if (!pinoLoggerInstance) {
    const config = getLoggerConfig();

    const baseOptions: pino.LoggerOptions = {
      level: config.level,
      formatters: {
        level: label => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: [...config.redact],
    };

    const options: pino.LoggerOptions =
      config.pretty || process.env.NODE_ENV !== 'production'
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

    pinoLoggerInstance = pino(options);
  }
  return pinoLoggerInstance;
}

class PinoLogger implements Logger {
  constructor(private metadata: LogMetadata = {}) {}

  debug(message: string, context: LogContext = {}): void {
    getPinoLoggerInstance().debug({ ...this.metadata, ...context }, message);
  }

  info(message: string, context: LogContext = {}): void {
    getPinoLoggerInstance().info({ ...this.metadata, ...context }, message);
  }

  warn(message: string, context: LogContext = {}): void {
    getPinoLoggerInstance().warn({ ...this.metadata, ...context }, message);
  }

  error(message: string, error?: unknown, context: LogContext = {}): void {
    const errorContext = error instanceof Error ? { error: this.serializeError(error), ...context } : context;
    getPinoLoggerInstance().error({ ...this.metadata, ...errorContext }, message);
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
