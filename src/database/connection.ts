import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

interface DatabaseConfig {
  url: string;
  pool: {
    min: number;
    max: number;
  };
  ssl?: { rejectUnauthorized: boolean } | undefined;
}

function getDatabaseConfig(): DatabaseConfig {
  // Lazy-load config to avoid circular dependencies
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const { databaseConfig } = require('@config/database');
    return databaseConfig as DatabaseConfig;
  } catch {
    // Fallback config if config module isn't available yet
    return {
      url: process.env.DATABASE_URL || '',
      pool: {
        min: Number(process.env.DATABASE_POOL_MIN) || 2,
        max: Number(process.env.DATABASE_POOL_MAX) || 10,
      },
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    };
  }
}

export function getConnection() {
  if (db) {
    return db;
  }

  const config = getDatabaseConfig();

  pool = new Pool({
    connectionString: config.url,
    min: config.pool.min,
    max: config.pool.max,
    ssl: config.ssl,
  });

  pool.on('error', err => {
    console.error('Unexpected database pool error:', err);
  });

  db = drizzle(pool, { schema });

  return db;
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export type Database = typeof db;
