/* eslint-disable no-console */
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { getConnection, closeConnection } from '../src/database/connection';

interface Logger {
  info: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

// Lazy-load logger to avoid circular dependencies
function getLogger(): Logger {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const { logger } = require('../src/core/logging/logger');
    return logger as Logger;
  } catch {
    // Fallback if logger isn't available
    return {
      info: console.log,
      error: console.error,
    };
  }
}

async function main(): Promise<void> {
  const logger = getLogger();

  try {
    const db = getConnection();
    logger.info('Running migrations...');

    await migrate(db, { migrationsFolder: './src/database/migrations' });

    logger.info('Migrations completed successfully');
    await closeConnection();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    await closeConnection();
    process.exit(1);
  }
}

void main();
