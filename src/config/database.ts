import { getConfig } from './index';

export const databaseConfig = {
  url: getConfig().DATABASE_URL,
  pool: {
    min: getConfig().DATABASE_POOL_MIN,
    max: getConfig().DATABASE_POOL_MAX,
  },
  ssl: getConfig().DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
} as const;
