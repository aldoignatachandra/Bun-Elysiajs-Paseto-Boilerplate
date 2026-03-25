/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

/**
 * Redis Connection Singleton
 *
 * Manages a single Redis connection instance using IORedis.
 * Thread-safe singleton pattern ensures only one connection is created.
 *
 * Features:
 * - Lazy initialization with manual connection control
 * - Connection health checking
 * - Graceful shutdown
 * - Error handling with limited reconnection attempts
 * - Thread-safe singleton pattern
 * - Ability to stop reconnection attempts
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
 * Flag to control reconnection attempts
 * When true, reconnection is disabled (used when we give up connecting)
 */
let stopReconnecting = false;

/**
 * Flag to indicate if initial connection was successful
 * Events are only logged after successful initial connection
 */
let initialConnectionEstablished = false;

/**
 * Number of reconnection attempts made
 */
let reconnectAttempts = 0;

/**
 * Maximum reconnection attempts before giving up
 */
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * Get or create Redis connection instance
 *
 * Implements singleton initialization with lazy connection.
 * The connection is NOT established until connect() is called.
 *
 * @returns Redis connection instance
 */
export function getRedisConnection(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  logger.info('Creating Redis connection instance', {
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db,
  });

  const redis = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: 3,
    // Use lazy connect to control when connection attempt starts
    lazyConnect: true,
    // Custom retry strategy with limited attempts
    retryStrategy: (times: number) => {
      // Don't retry if we've given up or never connected initially
      if (stopReconnecting || !initialConnectionEstablished) {
        return null; // Stop retrying
      }
      if (times > MAX_RECONNECT_ATTEMPTS) {
        logger.info('Redis max reconnection attempts reached', { attempts: times });
        return null;
      }
      reconnectAttempts = times;
      // Exponential backoff: 100ms, 200ms, 400ms
      return Math.min(times * 100, 1000);
    },
    enableReadyCheck: true,
    enableOfflineQueue: true,
    keepAlive: 30000,
    reconnectOnError: (err: Error) => {
      // Only reconnect if we had a successful initial connection
      if (stopReconnecting || !initialConnectionEstablished) {
        return false;
      }
      logger.error('Redis error, will attempt reconnect', { error: err.message });
      return true;
    },
  } as RedisOptions);

  // Event handlers - only log after initial connection is established
  redis.on('connect', () => {
    if (initialConnectionEstablished && !stopReconnecting) {
      logger.info('Redis connection established');
    }
  });

  redis.on('ready', () => {
    if (initialConnectionEstablished && !stopReconnecting) {
      logger.info('Redis connection ready');
    }
  });

  redis.on('error', () => {
    // Suppress error logs during initial connection attempt
    // Errors will be handled by connectRedis()
  });

  redis.on('close', () => {
    if (initialConnectionEstablished && !stopReconnecting) {
      logger.warn('Redis connection closed');
    }
  });

  redis.on('reconnecting', () => {
    if (initialConnectionEstablished && !stopReconnecting) {
      logger.info(`Redis reconnecting (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
    }
  });

  redisInstance = redis;
  return redis;
}

/**
 * Attempt to connect to Redis with timeout
 *
 * @param timeoutMs - Maximum time to wait for connection (default: 2000ms)
 * @returns True if connected successfully
 */
export async function connectRedis(timeoutMs: number = 2000): Promise<boolean> {
  const redis = getRedisConnection();

  if (redis.status === 'ready') {
    initialConnectionEstablished = true;
    return true;
  }

  try {
    // Attempt to connect with timeout
    await Promise.race([redis.connect(), new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), timeoutMs))]);

    // Verify connection is healthy
    const result = await redis.ping();
    if (result === 'PONG') {
      initialConnectionEstablished = true;
      return true;
    }
    return false;
  } catch {
    // Stop reconnection immediately on any error
    stopRedisReconnection();
    return false;
  }
}

/**
 * Stop Redis reconnection attempts
 *
 * Call this when you've decided Redis is unavailable and want to
 * stop the automatic reconnection attempts. Useful during startup
 * when you have a timeout and want to proceed with fallback.
 */
export function stopRedisReconnection(): void {
  stopReconnecting = true;

  // If there's an existing instance, disconnect it immediately
  if (redisInstance) {
    try {
      redisInstance.disconnect(false);
    } catch {
      // Ignore errors during disconnect
    }
  }
}

/**
 * Check if Redis connection is healthy
 *
 * @returns True if connection is healthy
 */
export async function isRedisHealthy(): Promise<boolean> {
  // If reconnection is stopped, Redis is considered unavailable
  if (stopReconnecting) {
    return false;
  }

  try {
    const redis = getRedisConnection();

    // If not connected, try a quick ping anyway (will fail fast)
    if (redis.status !== 'ready') {
      return false;
    }

    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Close Redis connection gracefully
 *
 * Should be called on application shutdown to ensure clean connection close.
 */
export async function closeRedisConnection(): Promise<void> {
  // Stop any reconnection attempts
  stopReconnecting = true;

  if (redisInstance) {
    logger.info('Closing Redis connection...');
    try {
      await redisInstance.quit();
      redisInstance = null;
      logger.info('Redis connection closed');
    } catch {
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
    connected: redis?.status === 'ready' && !stopReconnecting,
    host: redisConfig.host,
    port: redisConfig.port,
    db: redisConfig.db,
  };
}
