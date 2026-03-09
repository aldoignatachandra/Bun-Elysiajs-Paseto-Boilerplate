/**
 * Redis Cache Service
 *
 * Provides a high-level caching layer on top of Redis with support for:
 * - TTL-based caching
 * - Tag-based cache invalidation
 * - Cache statistics
 * - Cache stampede protection
 * - Automatic serialization/deserialization
 */

import Redis from 'ioredis';
import type { CacheOptions, CacheResult, CacheStats, CacheFactory } from './cache.types';
import { metricsCollector } from '../metrics/collector';
import { logger } from '../logging/logger';

/**
 * Default cache TTL in seconds (1 hour)
 */
const DEFAULT_TTL = 3600;

/**
 * Default cache key prefix
 */
const DEFAULT_PREFIX = 'cache:';

/**
 * In-flight cache operations for stampede protection
 */
const inFlightOperations = new Map<string, Promise<unknown>>();

/**
 * Cache service class
 */
export class CacheService {
  private redis: Redis;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Get a value from the cache
   *
   * @param key - Cache key (without prefix)
   * @param prefix - Optional custom prefix (default: 'cache:')
   * @returns Cache result with hit status and value
   */
  async get<T>(key: string, prefix: string = DEFAULT_PREFIX): Promise<CacheResult<T>> {
    const fullKey = `${prefix}${key}`;

    try {
      const serialized = await this.redis.get(fullKey);

      if (serialized === null) {
        this.missCount++;
        metricsCollector.recordCacheHit('redis', false);

        return {
          hit: false,
          value: null,
          key: fullKey,
        };
      }

      this.hitCount++;
      metricsCollector.recordCacheHit('redis', true);

      const value = JSON.parse(serialized) as T;

      return {
        hit: true,
        value,
        key: fullKey,
      };
    } catch (error) {
      logger.error('Cache get error', { key: fullKey, error });

      // Return miss on error to fail gracefully
      this.missCount++;
      return {
        hit: false,
        value: null,
        key: fullKey,
      };
    }
  }

  /**
   * Set a value in the cache
   *
   * @param key - Cache key (without prefix)
   * @param value - Value to cache
   * @param options - Cache options (TTL, prefix, tags)
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = DEFAULT_TTL, prefix = DEFAULT_PREFIX, tags = [] } = options;
    const fullKey = `${prefix}${key}`;

    try {
      const serialized = JSON.stringify(value);

      // Set the value with TTL
      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serialized);
      } else {
        await this.redis.set(fullKey, serialized);
      }

      // Add tags if provided
      if (tags.length > 0) {
        await this.addTags(fullKey, tags, prefix);
      }
    } catch (error) {
      logger.error('Cache set error', { key: fullKey, error });
      // Don't throw - fail gracefully
    }
  }

  /**
   * Delete a key from the cache
   *
   * @param key - Cache key (without prefix)
   * @param prefix - Optional custom prefix (default: 'cache:')
   */
  async delete(key: string, prefix: string = DEFAULT_PREFIX): Promise<void> {
    const fullKey = `${prefix}${key}`;

    try {
      // Remove tags first
      await this.removeTags(fullKey, prefix);

      // Delete the key
      await this.redis.del(fullKey);
    } catch (error) {
      logger.error('Cache delete error', { key: fullKey, error });
      // Don't throw - fail gracefully
    }
  }

  /**
   * Invalidate all cache keys matching a pattern
   *
   * @param pattern - Redis key pattern (e.g., 'user:*')
   * @param prefix - Optional custom prefix (default: 'cache:')
   */
  async invalidatePattern(pattern: string, prefix: string = DEFAULT_PREFIX): Promise<void> {
    const fullPattern = `${prefix}${pattern}`;

    try {
      // Find all matching keys
      const keys = await this.redis.keys(fullPattern);

      if (keys.length === 0) {
        return;
      }

      // Remove tags for all keys
      for (const key of keys) {
        await this.removeTags(key, prefix);
      }

      // Delete all matching keys
      await Promise.all(keys.map(key => this.redis.unlink(key)));

      logger.info('Invalidated cache pattern', { pattern: fullPattern, count: keys.length });
    } catch (error) {
      logger.error('Cache pattern invalidation error', { pattern: fullPattern, error });
      // Don't throw - fail gracefully
    }
  }

  /**
   * Invalidate all cache entries with a specific tag
   *
   * @param tag - Tag to invalidate
   * @param prefix - Optional custom prefix (default: 'cache:')
   */
  async invalidateTag(tag: string, prefix: string = DEFAULT_PREFIX): Promise<void> {
    const tagKey = `${prefix}tag:${tag}`;

    try {
      // Get all keys with this tag
      const keys = await this.redis.smembers(tagKey);

      if (keys.length === 0) {
        return;
      }

      // Delete all tagged keys
      if (keys.length > 0) {
        await this.redis.unlink(...keys);
      }

      // Delete the tag set
      await this.redis.del(tagKey);

      logger.info('Invalidated cache tag', { tag, count: keys.length });
    } catch (error) {
      logger.error('Cache tag invalidation error', { tag, error });
      // Don't throw - fail gracefully
    }
  }

  /**
   * Get value from cache or set using factory function
   *
   * Implements cache stampede protection to prevent multiple
   * simultaneous factory calls for the same key.
   *
   * @param key - Cache key (without prefix)
   * @param factory - Factory function to generate value on cache miss
   * @param options - Cache options (TTL, prefix, tags)
   * @returns Cache result with hit status and value
   */
  async getOrSet<T>(
    key: string,
    factory: CacheFactory<T>,
    options: CacheOptions = {}
  ): Promise<CacheResult<T>> {
    const { prefix = DEFAULT_PREFIX } = options;
    const fullKey = `${prefix}${key}`;

    try {
      // Check cache first
      const cached = await this.get<T>(key, prefix);
      if (cached.hit) {
        return cached;
      }

      // Check for in-flight operation (stampede protection)
      const existingOperation = inFlightOperations.get(fullKey);
      if (existingOperation) {
        const value = (await existingOperation) as T;
        return {
          hit: false,
          value,
          key: fullKey,
        };
      }

      // Create new factory operation
      const operation = this.executeFactory(key, factory, options);
      inFlightOperations.set(fullKey, operation);

      try {
        const value = await operation;
        return {
          hit: false,
          value,
          key: fullKey,
        };
      } finally {
        // Clean up in-flight operation
        inFlightOperations.delete(fullKey);
      }
    } catch (error) {
      logger.error('Cache getOrSet error', { key: fullKey, error });
      throw error;
    }
  }

  /**
   * Execute factory function and cache the result
   *
   * @param key - Cache key (without prefix)
   * @param factory - Factory function
   * @param options - Cache options
   * @returns Factory result
   */
  private async executeFactory<T>(
    key: string,
    factory: CacheFactory<T>,
    options: CacheOptions
  ): Promise<T> {
    const value = await factory();

    // Cache the result
    await this.set(key, value, options);

    return value;
  }

  /**
   * Get cache statistics
   *
   * @returns Cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      // Count keys with default prefix
      const keys = await this.redis.keys(`${DEFAULT_PREFIX}*`);

      // Calculate hit rate
      const totalRequests = this.hitCount + this.missCount;
      const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;

      return {
        keys: keys.length,
        hits: this.hitCount,
        misses: this.missCount,
        hitRate,
      };
    } catch (error) {
      logger.error('Cache stats error', { error });

      return {
        keys: 0,
        hits: this.hitCount,
        misses: this.missCount,
        hitRate: 0,
      };
    }
  }

  /**
   * Add tags to a cache key
   *
   * @param fullKey - Full cache key (with prefix)
   * @param tags - Tags to add
   * @param prefix - Key prefix
   */
  private async addTags(fullKey: string, tags: string[], prefix: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const tag of tags) {
        const tagKey = `${prefix}tag:${tag}`;
        pipeline.sadd(tagKey, fullKey);
      }

      await pipeline.exec();
    } catch (error) {
      logger.error('Cache add tags error', { key: fullKey, tags, error });
      // Don't throw - fail gracefully
    }
  }

  /**
   * Remove tags from a cache key
   *
   * @param fullKey - Full cache key (with prefix)
   * @param prefix - Key prefix
   */
  private async removeTags(fullKey: string, prefix: string): Promise<void> {
    try {
      // Get all tag sets
      const tagKeys = await this.redis.keys(`${prefix}tag:*`);

      if (tagKeys.length === 0) {
        return;
      }

      // Remove key from all tag sets
      const pipeline = this.redis.pipeline();

      for (const tagKey of tagKeys) {
        pipeline.srem(tagKey, fullKey);
      }

      await pipeline.exec();
    } catch (error) {
      logger.error('Cache remove tags error', { key: fullKey, error });
      // Don't throw - fail gracefully
    }
  }

  /**
   * Reset cache statistics (useful for testing)
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }
}
