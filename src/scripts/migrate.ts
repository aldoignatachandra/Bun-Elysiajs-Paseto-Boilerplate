/* eslint-disable no-console */
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { logger } from '../core/logging/logger';
import { closeConnection, getConnection } from '../database/connection';

async function main(): Promise<void> {
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
