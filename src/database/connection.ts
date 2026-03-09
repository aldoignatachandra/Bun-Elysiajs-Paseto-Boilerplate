/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';
import { metricsCollector } from '@/core/metrics/collector';
import { logger } from '@/core/logging/logger';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;
let isShuttingDown = false;

interface DatabaseConfig {
  url: string;
  pool: {
    min: number;
    max: number;
  };
  ssl?: { rejectUnauthorized: boolean } | undefined;
}

interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
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
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }
}

/**
 * Extract pool statistics from pg.Pool
 */
function getPoolStats(poolInstance: any): PoolStats {
  const totalCount = poolInstance.totalCount?._all || 0;
  const idleCount = poolInstance.idleCount?._all || 0;
  const waitingCount = poolInstance.waitingCount?._all || 0;

  return { totalCount, idleCount, waitingCount };
}

/**
 * Record pool metrics to metrics collector
 */
function recordPoolMetrics(stats: PoolStats): void {
  // Register metrics if not already registered (by setting a value)
  metricsCollector.gauge('db_pool_active_connections', stats.totalCount);
  metricsCollector.gauge('db_pool_idle_connections', stats.idleCount);
  metricsCollector.gauge('db_pool_waiting_connections', stats.waitingCount);

  // Calculate pool utilization
  const maxPool = getDatabaseConfig().pool.max;
  const utilization = maxPool > 0 ? stats.totalCount / maxPool : 0;
  metricsCollector.gauge('db_pool_utilization', utilization);

  // Register connection errors counter (initialize at 0)
  metricsCollector.counter('db_pool_connection_errors_total', 0);
}

/**
 * Setup pool event listeners
 */
function setupPoolEventListeners(poolInstance: pg.Pool): void {
  // Handle new client connections
  poolInstance.on('connect', () => {
    if (isShuttingDown) return;

    const stats = getPoolStats(poolInstance);
    recordPoolMetrics(stats);

    logger.debug('Database client connected', {
      activeConnections: stats.totalCount,
      idleConnections: stats.idleCount,
      waitingConnections: stats.waitingCount,
    });
  });

  // Handle client removal
  poolInstance.on('remove', () => {
    if (isShuttingDown) return;

    const stats = getPoolStats(poolInstance);
    recordPoolMetrics(stats);

    logger.debug('Database client removed', {
      activeConnections: stats.totalCount,
      idleConnections: stats.idleCount,
      waitingConnections: stats.waitingCount,
    });
  });

  // Handle pool errors
  poolInstance.on('error', err => {
    if (isShuttingDown) return;

    logger.error('Database pool error', err, {
      error: err instanceof Error ? err.message : String(err),
    });

    metricsCollector.counter('db_pool_connection_errors_total', 1);
  });

  // Log pool acquisition events for debugging
  poolInstance.on('acquire', () => {
    if (isShuttingDown) return;

    logger.debug('Database client acquired from pool');
  });

  // Log pool release events
  poolInstance.on('release', () => {
    if (isShuttingDown) return;

    logger.debug('Database client released to pool');
  });
}

/**
 * Get or create database connection with enhanced pooling
 */
export function getConnection() {
  if (db) {
    return db;
  }

  const config = getDatabaseConfig();

  // Validate pool configuration
  const minPool = Math.max(0, config.pool.min);
  const maxPool = Math.max(minPool, config.pool.max);

  pool = new Pool({
    connectionString: config.url,
    min: minPool,
    max: maxPool,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: config.ssl,
  });

  // Setup event listeners for monitoring
  setupPoolEventListeners(pool);

  logger.info('Database connection pool created', {
    minConnections: minPool,
    maxConnections: maxPool,
    idleTimeout: 30000,
    connectionTimeout: 10000,
    sslEnabled: !!config.ssl,
  });

  // Register initial pool metrics (with zeros since pool is just created)
  recordPoolMetrics({
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  });

  db = drizzle(pool, { schema });

  return db;
}

/**
 * Close database connection and cleanup resources
 */
export async function closeConnection(): Promise<void> {
  if (!pool) {
    return Promise.resolve();
  }

  isShuttingDown = true;

  try {
    logger.info('Closing database connection pool...');

    // Record final metrics
    const stats = getPoolStats(pool);
    recordPoolMetrics(stats);

    await pool.end();

    logger.info('Database connection pool closed', {
      finalActiveConnections: stats.totalCount,
      finalIdleConnections: stats.idleCount,
    });
  } catch (error) {
    logger.error('Error closing database connection pool', error, {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    pool = null;
    db = null;
    isShuttingDown = false;
  }

  return Promise.resolve();
}

/**
 * Get current pool statistics
 */
export function getPoolStatistics(): PoolStats | null {
  if (!pool) {
    return null;
  }

  return getPoolStats(pool);
}

/**
 * Check if pool is healthy
 */
export function isPoolHealthy(): boolean {
  if (!pool) {
    return false;
  }

  const stats = getPoolStats(pool);
  const config = getDatabaseConfig();

  // Pool is healthy if we have some connections and not exceeding max
  return stats.totalCount > 0 && stats.totalCount <= config.pool.max;
}

/**
 * Reset connection state (for testing purposes only)
 * @internal
 */
export function __resetConnectionState(): void {
  pool = null;
  db = null;
  isShuttingDown = false;
}

export type Database = typeof db;
