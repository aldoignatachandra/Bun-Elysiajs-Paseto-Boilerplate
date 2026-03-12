import pg from 'pg';
import { logger } from '../core/logging/logger';

const PROTECTED_DATABASES = new Set(['postgres', 'template0', 'template1']);

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  return url;
}

function getTargetDatabaseName(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  const dbName = parsed.pathname.replace(/^\//, '');

  if (!dbName) {
    throw new Error('Invalid DATABASE_URL: missing database name');
  }

  return dbName;
}

function getMaintenanceUrl(databaseUrl: string): string {
  const parsed = new URL(databaseUrl);
  parsed.pathname = '/postgres';
  return parsed.toString();
}

function getSslConfig(): pg.ClientConfig['ssl'] {
  return process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function main(): Promise<void> {
  let client: pg.Client | null = null;

  try {
    const databaseUrl = getDatabaseUrl();
    const databaseName = getTargetDatabaseName(databaseUrl);

    if (PROTECTED_DATABASES.has(databaseName)) {
      throw new Error(`Refusing to drop protected database name: ${databaseName}`);
    }

    client = new pg.Client({
      connectionString: getMaintenanceUrl(databaseUrl),
      ssl: getSslConfig(),
    });

    await client.connect();

    const existsResult = await client.query<{ exists: boolean }>('SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists', [
      databaseName,
    ]);

    if (!existsResult.rows[0]?.exists) {
      logger.info('Database does not exist, skipping drop', { database: databaseName });
      process.exit(0);
      return;
    }

    await client.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName]
    );

    await client.query(`DROP DATABASE ${quoteIdentifier(databaseName)}`);
    logger.info('Database dropped successfully', { database: databaseName });
    process.exit(0);
  } catch (error) {
    logger.error('Failed to drop database', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

void main();
