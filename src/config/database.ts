import { getConfig } from './index';

export const databaseConfig = {
  url: getConfig().DATABASE_URL,
  pool: {
    min: getConfig().DATABASE_POOL_MIN,
    max: getConfig().DATABASE_POOL_MAX,
  },
  ssl: getConfig().NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
} as const;
