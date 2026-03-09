import { validateEnv, type Env } from './env.schema';
import { databaseConfig } from './database';
import { redisConfig } from './redis';
import { pasetoConfig } from './paseto';
import { loggerConfig } from './logger';

let cachedEnv: Env | null = null;

export function getConfig() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = validateEnv();
  return cachedEnv;
}

export const config = {
  env: getConfig(),
  database: databaseConfig,
  redis: redisConfig,
  paseto: pasetoConfig,
  logger: loggerConfig,
} as const;

export type Config = typeof config;
