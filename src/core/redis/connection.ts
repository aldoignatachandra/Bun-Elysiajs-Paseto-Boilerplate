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
 * Get or create Redis connection instance
 *
 * Implements singleton initialization.
 * Multiple calls will return the same instance.
 *
 * @returns Redis connection instance
 */
export function getRedisConnection(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

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
    enableReadyCheck: true,
    enableOfflineQueue: true,
    lazyConnect: false,
    keepAlive: 30000,
    reconnectOnError: (err: Error) => {
      logger.error('Redis reconnection error', { error: err.message });
      return true;
    },
  } as RedisOptions);

  redis.on('connect', () => {
    logger.info('Redis connection established');
  });

  redis.on('ready', () => {
    logger.info('Redis connection ready');
    logger.info('Redis connected successfully');
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

  redisInstance = redis;
  return redis;
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
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', { error });
      // Force close if graceful shutdown fails
      if (redisInstance) {
        redisInstance.disconnect();
        redisInstance = null;
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
