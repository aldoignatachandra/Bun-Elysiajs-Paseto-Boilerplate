/**
 * Cache Type Definitions
 *
 * Defines the types and interfaces for the Redis caching layer.
 * Supports TTL-based caching, tag-based invalidation, and cache statistics.
 */

/**
 * Cache options for setting values in the cache
 */
export interface CacheOptions {
  /**
   * Time to live in seconds (default: 3600)
   */
  ttl?: number;

  /**
   * Key prefix for namespacing (default: 'cache:')
   */
  prefix?: string;

  /**
   * Tags for cache invalidation
   * Multiple tags can be associated with a single cache entry
   */
  tags?: string[];
}

/**
 * Result of a cache get operation
 */
export interface CacheResult<T> {
  /**
   * Whether the cache was hit
   */
  hit: boolean;

  /**
   * The cached value (null if cache miss)
   */
  value: T | null;

  /**
   * The actual key used in Redis (including prefix)
   */
  key: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /**
   * Total number of keys in the cache
   */
  keys: number;

  /**
   * Total number of cache hits
   */
  hits: number;

  /**
   * Total number of cache misses
   */
  misses: number;

  /**
   * Cache hit rate (0-1)
   */
  hitRate: number;
}

/**
 * Factory function for getOrSet pattern
 */
export type CacheFactory<T> = () => Promise<T> | T;
