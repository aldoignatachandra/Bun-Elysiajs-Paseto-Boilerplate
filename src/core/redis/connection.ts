/**
 * Redis Connection Singleton
 *
 * Manages a single Redis connection instance using IORedis.
 * Thread-safe singleton pattern ensures only one connection is created.
 *
 * Features:
 * - Lazy initialization
 * - Connection health checking
 * - Graceful shutdown
 * - Error handling and reconnection
 * - Thread-safe singleton pattern
 *
 * @example
 * ```typescript
 * const redis = getRedisConnection();
 * await redis.set('key', 'value');
 * const value = await redis.get('key');
 * ```
 */

import Redis from 'ioredis';
import type { RedisOptions } from 'ioredis';
import { redisConfig } from '../../config/redis';
import { logger } from '../logging/logger';

/**
 * Redis connection instance
 */
let redisInstance: Redis | null = null;

/**
 * Connection lock for thread-safe initialization
 */
let isConnecting = false;

/**
 * Connection promise for handling concurrent initialization attempts
 */
let connectionPromise: Promise<Redis> | null = null;

/**
 * Get or create Redis connection instance
 *
 * Implements thread-safe lazy initialization using a connection lock.
 * Multiple calls will return the same instance.
 *
 * @returns Redis connection instance
 * @throws Error if connection fails
 */
export function getRedisConnection(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return connectionPromise as unknown as Redis;
  }

  // Start new connection
  connectionPromise = createConnection();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return connectionPromise as unknown as Redis;
}

/**
 * Create new Redis connection
 *
 * @returns Promise that resolves to Redis instance
 */
async function createConnection(): Promise<Redis> {
  // Prevent multiple concurrent connections
  if (isConnecting) {
    if (redisInstance) {
      return redisInstance;
    }
    // Wait for existing connection to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    return getRedisConnection();
  }

  isConnecting = true;

  try {
    logger.info('Connecting to Redis', {
      host: redisConfig.host,
      port: redisConfig.port,
      db: redisConfig.db,
    });

    const redis = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      retryStrategy: redisConfig.retryStrategy,
      // Connection settings
      enableReadyCheck: true,
      enableOfflineQueue: true,
      lazyConnect: false,
      // Performance settings
      keepAlive: 30000,
      // Event handlers
      reconnectOnError: (err: Error) => {
        logger.error('Redis reconnection error', { error: err.message });
        // Return true to reconnect
        return true;
      },
    } as RedisOptions);

    // Set up event handlers
    redis.on('connect', () => {
      logger.info('Redis connection established');
    });

    redis.on('ready', () => {
      logger.info('Redis connection ready');
    });

    redis.on('error', (err: Error) => {
      logger.error('Redis connection error', { error: err.message });
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Wait for connection to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 10000); // 10 second timeout

      redis.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      redis.once('error', (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    redisInstance = redis;
    connectionPromise = null;
    isConnecting = false;

    logger.info('Redis connected successfully');

    return redis;
  } catch (error) {
    isConnecting = false;
    connectionPromise = null;
    logger.error('Failed to connect to Redis', { error });
    throw new Error(
      `Failed to connect to Redis: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if Redis connection is healthy
 *
 * @returns True if connection is healthy
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
}

/**
 * Close Redis connection gracefully
 *
 * Should be called on application shutdown to ensure clean connection close.
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisInstance) {
    logger.info('Closing Redis connection...');
    try {
      await redisInstance.quit();
      redisInstance = null;
      connectionPromise = null;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', { error });
      // Force close if graceful shutdown fails
      if (redisInstance) {
        redisInstance.disconnect();
        redisInstance = null;
        connectionPromise = null;
      }
    }
  }
}

/**
 * Get Redis connection info for debugging
 *
 * @returns Connection information
 */
export function getRedisConnectionInfo(): {
  connected: boolean;
  host: string;
  port: number;
  db: number;
} {
  const redis = redisInstance;
  return {
    connected: redis?.status === 'ready',
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db,
  };
}
