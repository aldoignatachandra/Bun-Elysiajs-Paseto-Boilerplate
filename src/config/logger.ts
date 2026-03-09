import { getConfig } from './index';

export const loggerConfig = {
  level: getConfig().LOG_LEVEL,
  pretty: getConfig().LOG_PRETTY && getConfig().NODE_ENV !== 'production',
  format: getConfig().LOG_FORMAT,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
} as const;
