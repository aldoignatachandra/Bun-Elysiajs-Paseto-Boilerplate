import type { Config } from 'drizzle-kit';
import { getConfig as getAppConfig } from './src/config';

interface AppConfig {
  DATABASE_URL: string;
}

// Lazy-load config to avoid environment validation during module load
function getConfig(): AppConfig {
  try {
    return getAppConfig() as AppConfig;
  } catch {
    // Fallback to process.env if config module isn't available yet
    return {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
    };
  }
}

const config = getConfig();

export default {
  schema: './src/database/schema',
  out: './src/database/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: config.DATABASE_URL,
  },
} satisfies Config;
