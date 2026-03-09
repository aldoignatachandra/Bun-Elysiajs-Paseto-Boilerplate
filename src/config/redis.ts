import { getConfig } from './index';

export const redisConfig = {
  host: getConfig().REDIS_HOST,
  port: getConfig().REDIS_PORT,
  password: getConfig().REDIS_PASSWORD || undefined,
  db: getConfig().REDIS_DB,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
} as const;
