import type { Config } from 'drizzle-kit';

interface AppConfig {
  DATABASE_URL: string;
}

// Lazy-load config to avoid environment validation during module load
function getConfig(): AppConfig {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const { getConfig } = require('./src/config');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return getConfig() as AppConfig;
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
