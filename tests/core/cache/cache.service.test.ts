/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import Redis from 'ioredis';
import { CacheService } from '@/core/cache/cache.service';

describe('Cache Service', () => {
  let cacheService: CacheService;
  let redis: Redis;

  beforeEach(async () => {
    // Create a test Redis instance
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 15, // Use separate DB for tests
      maxRetriesPerRequest: 3,
    });

    // Clear the test database
    await redis.flushdb();

    // Create cache service with test Redis instance
    cacheService = new CacheService(redis);
  });

  afterEach(async () => {
    // Clean up after tests
    await redis.flushdb();
    await redis.quit();
  });

  describe('get', () => {
    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result.hit).toBe(false);
      expect(result.value).toBeNull();
      expect(result.key).toBe('cache:non-existent-key');
    });

    it('should return cached value for existing key', async () => {
      await cacheService.set('test-key', { data: 'test-value' });

      const result = await cacheService.get('test-key');
      expect(result.hit).toBe(true);
      expect(result.value).toEqual({ data: 'test-value' });
      expect(result.key).toBe('cache:test-key');
    });

    it('should handle different data types', async () => {
      await cacheService.set('string-key', 'string-value');
      await cacheService.set('number-key', 42);
      await cacheService.set('boolean-key', true);
      await cacheService.set('array-key', [1, 2, 3]);
      await cacheService.set('object-key', { nested: { value: 'test' } });

      expect((await cacheService.get('string-key')).value).toBe('string-value');
      expect((await cacheService.get('number-key')).value).toBe(42);
      expect((await cacheService.get('boolean-key')).value).toBe(true);
      expect((await cacheService.get('array-key')).value).toEqual([1, 2, 3]);
      expect((await cacheService.get('object-key')).value).toEqual({ nested: { value: 'test' } });
    });

    it('should use custom prefix', async () => {
      await cacheService.set('test-key', 'value', { prefix: 'custom:' });

      const result = await cacheService.get('test-key', 'custom:');
      expect(result.hit).toBe(true);
      expect(result.value).toBe('value');
      expect(result.key).toBe('custom:test-key');
    });

    it('should record cache hit to metrics', async () => {
      await cacheService.set('test-key', 'value');
      await cacheService.get('test-key');

      const stats = await cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it('should record cache miss to metrics', async () => {
      await cacheService.get('non-existent-key');

      const stats = await cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      await cacheService.set('test-key', 'test-value');

      const result = await cacheService.get('test-key');
      expect(result.hit).toBe(true);
      expect(result.value).toBe('test-value');

      // Check TTL is set (default 3600 seconds)
      const ttl = await redis.ttl('cache:test-key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('should set value with custom TTL', async () => {
      const customTTL = 7200;
      await cacheService.set('test-key', 'test-value', { ttl: customTTL });

      const ttl = await redis.ttl('cache:test-key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(customTTL);
    });

    it('should set value with custom prefix', async () => {
      await cacheService.set('test-key', 'test-value', { prefix: 'custom:' });

      const exists = await redis.exists('custom:test-key');
      expect(exists).toBe(1);
    });

    it('should store tags for cache invalidation', async () => {
      const tags = ['user:123', 'posts'];
      await cacheService.set('test-key', 'test-value', { tags });

      // Check that tag sets are created
      const userTagMembers = await redis.smembers('cache:tag:user:123');
      const postsTagMembers = await redis.smembers('cache:tag:posts');

      expect(userTagMembers).toContain('cache:test-key');
      expect(postsTagMembers).toContain('cache:test-key');
    });

    it('should handle empty tags array', async () => {
      await cacheService.set('test-key', 'test-value', { tags: [] });

      const result = await cacheService.get('test-key');
      expect(result.hit).toBe(true);
      expect(result.value).toBe('test-value');
    });

    it('should overwrite existing key', async () => {
      await cacheService.set('test-key', 'old-value');
      await cacheService.set('test-key', 'new-value');

      const result = await cacheService.get('test-key');
      expect(result.value).toBe('new-value');
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      await cacheService.set('test-key', 'test-value');
      await cacheService.delete('test-key');

      const result = await cacheService.get('test-key');
      expect(result.hit).toBe(false);
      expect(result.value).toBeNull();
    });

    it('should delete tags when key is deleted', async () => {
      const tags = ['user:123', 'posts'];
      await cacheService.set('test-key', 'test-value', { tags });

      // Verify tags exist
      let userTagMembers = await redis.smembers('cache:tag:user:123');
      expect(userTagMembers).toContain('cache:test-key');

      // Delete the key
      await cacheService.delete('test-key');

      // Verify tags are removed
      userTagMembers = await redis.smembers('cache:tag:user:123');
      expect(userTagMembers).not.toContain('cache:test-key');
    });

    it('should handle deleting non-existent key', async () => {
      // Should not throw
      await cacheService.delete('non-existent-key');
      expect(true).toBe(true); // Test passes if no exception thrown
    });

    it('should use custom prefix', async () => {
      await cacheService.set('test-key', 'value', { prefix: 'custom:' });
      await cacheService.delete('test-key', 'custom:');

      const exists = await redis.exists('custom:test-key');
      expect(exists).toBe(0);
    });
  });

  describe('invalidatePattern', () => {
    it('should delete keys matching pattern', async () => {
      await cacheService.set('user:1:data', 'value1');
      await cacheService.set('user:2:data', 'value2');
      await cacheService.set('user:3:data', 'value3');
      await cacheService.set('other:key', 'keep-this');

      await cacheService.invalidatePattern('user:*:data');

      expect((await cacheService.get('user:1:data')).hit).toBe(false);
      expect((await cacheService.get('user:2:data')).hit).toBe(false);
      expect((await cacheService.get('user:3:data')).hit).toBe(false);
      expect((await cacheService.get('other:key')).hit).toBe(true);
    });

    it('should remove tags for deleted keys', async () => {
      await cacheService.set('key1', 'value1', { tags: ['tag1'] });
      await cacheService.set('key2', 'value2', { tags: ['tag1', 'tag2'] });
      await cacheService.set('key3', 'value3', { tags: ['tag2'] });

      await cacheService.invalidatePattern('key*');

      const tag1Members = await redis.smembers('cache:tag:tag1');
      const tag2Members = await redis.smembers('cache:tag:tag2');

      expect(tag1Members).toHaveLength(0);
      expect(tag2Members).toHaveLength(0);
    });

    it('should handle pattern with no matches', async () => {
      // Should not throw
      await cacheService.invalidatePattern('non-existent:*');
      expect(true).toBe(true); // Test passes if no exception thrown
    });

    it('should use custom prefix', async () => {
      await cacheService.set('key1', 'value1', { prefix: 'custom:' });
      await cacheService.set('key2', 'value2', { prefix: 'custom:' });

      await cacheService.invalidatePattern('key*', 'custom:');

      const keys = await redis.keys('custom:*');
      expect(keys).toHaveLength(0);
    });
  });

  describe('invalidateTag', () => {
    it('should delete all keys with specified tag', async () => {
      await cacheService.set('key1', 'value1', { tags: ['user:123'] });
      await cacheService.set('key2', 'value2', { tags: ['user:123'] });
      await cacheService.set('key3', 'value3', { tags: ['user:456'] });

      await cacheService.invalidateTag('user:123');

      expect((await cacheService.get('key1')).hit).toBe(false);
      expect((await cacheService.get('key2')).hit).toBe(false);
      expect((await cacheService.get('key3')).hit).toBe(true);
    });

    it('should handle multiple tags per key', async () => {
      await cacheService.set('key1', 'value1', { tags: ['tag1', 'tag2'] });
      await cacheService.set('key2', 'value2', { tags: ['tag2', 'tag3'] });
      await cacheService.set('key3', 'value3', { tags: ['tag3'] });

      await cacheService.invalidateTag('tag2');

      expect((await cacheService.get('key1')).hit).toBe(false);
      expect((await cacheService.get('key2')).hit).toBe(false);
      expect((await cacheService.get('key3')).hit).toBe(true);
    });

    it('should clean up tag set after invalidation', async () => {
      await cacheService.set('key1', 'value1', { tags: ['test-tag'] });

      await cacheService.invalidateTag('test-tag');

      const tagMembers = await redis.smembers('cache:tag:test-tag');
      expect(tagMembers).toHaveLength(0);
    });

    it('should handle non-existent tag', async () => {
      // Should not throw
      await cacheService.invalidateTag('non-existent-tag');
      expect(true).toBe(true); // Test passes if no exception thrown
    });

    it('should use custom prefix', async () => {
      await cacheService.set('key1', 'value1', { tags: ['test-tag'], prefix: 'custom:' });

      await cacheService.invalidateTag('test-tag', 'custom:');

      const exists = await redis.exists('custom:key1');
      expect(exists).toBe(0);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      await cacheService.set('test-key', 'cached-value');

      let factoryCallCount = 0;
      const factory = () => {
        factoryCallCount++;
        return Promise.resolve('factory-value');
      };

      const result = await cacheService.getOrSet('test-key', factory);

      expect(result.value).toBe('cached-value');
      expect(factoryCallCount).toBe(0);
    });

    it('should call factory and cache result on cache miss', async () => {
      let factoryCallCount = 0;
      const factory = async () => {
        factoryCallCount++;
        return 'factory-value';
      };

      const result = await cacheService.getOrSet('test-key', factory);

      expect(result.value).toBe('factory-value');
      expect(factoryCallCount).toBe(1);
      expect(result.hit).toBe(false);

      // Verify value was cached
      const cachedResult = await cacheService.get('test-key');
      expect(cachedResult.value).toBe('factory-value');
    });

    it('should use custom TTL from options', async () => {
      const factory = async () => 'factory-value';

      await cacheService.getOrSet('test-key', factory, { ttl: 100 });

      const ttl = await redis.ttl('cache:test-key');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(100);
    });

    it('should use custom prefix from options', async () => {
      const factory = async () => 'factory-value';

      await cacheService.getOrSet('test-key', factory, { prefix: 'custom:' });

      const exists = await redis.exists('custom:test-key');
      expect(exists).toBe(1);
    });

    it('should support tags', async () => {
      const factory = async () => 'factory-value';

      await cacheService.getOrSet('test-key', factory, { tags: ['test-tag'] });

      const tagMembers = await redis.smembers('cache:tag:test-tag');
      expect(tagMembers).toContain('cache:test-key');
    });

    it('should handle factory throwing error', async () => {
      const factory = async () => {
        throw new Error('Factory error');
      };

      await expect(cacheService.getOrSet('test-key', factory)).rejects.toThrow('Factory error');
    });
  });

  describe('getStats', () => {
    it('should return initial stats', async () => {
      const stats = await cacheService.getStats();

      expect(stats.keys).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should track hits and misses', async () => {
      await cacheService.set('test-key', 'value');
      await cacheService.get('test-key'); // hit
      await cacheService.get('non-existent'); // miss
      await cacheService.get('test-key'); // hit

      const stats = await cacheService.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should track number of keys', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      const stats = await cacheService.getStats();

      expect(stats.keys).toBe(3);
    });

    it('should handle division by zero for hit rate', async () => {
      const stats = await cacheService.getStats();

      expect(stats.hitRate).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      // Create a disconnected Redis instance
      const badRedis = new Redis({
        host: 'localhost',
        port: 9999, // Non-existent port
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        lazyConnect: true,
      });

      // Force disconnect to simulate error
      badRedis.disconnect();

      const badCacheService = new CacheService(badRedis);

      // Should not throw, return miss result
      const result = await badCacheService.get('test-key');
      expect(result.hit).toBe(false);
      expect(result.value).toBeNull();
    });

    it('should handle set errors gracefully', async () => {
      const badRedis = new Redis({
        host: 'localhost',
        port: 9999,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      badRedis.disconnect();

      const badCacheService = new CacheService(badRedis);

      // Should not throw
      await badCacheService.set('test-key', 'value');
      expect(true).toBe(true); // Test passes if no exception thrown
    });

    it('should handle delete errors gracefully', async () => {
      const badRedis = new Redis({
        host: 'localhost',
        port: 9999,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      badRedis.disconnect();

      const badCacheService = new CacheService(badRedis);

      // Should not throw
      await badCacheService.delete('test-key');
      expect(true).toBe(true);
    });

    it('should handle invalidatePattern errors gracefully', async () => {
      const badRedis = new Redis({
        host: 'localhost',
        port: 9999,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      badRedis.disconnect();

      const badCacheService = new CacheService(badRedis);

      // Should not throw
      await badCacheService.invalidatePattern('test*');
      expect(true).toBe(true);
    });

    it('should handle invalidateTag errors gracefully', async () => {
      const badRedis = new Redis({
        host: 'localhost',
        port: 9999,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      badRedis.disconnect();

      const badCacheService = new CacheService(badRedis);

      // Should not throw
      await badCacheService.invalidateTag('test-tag');
      expect(true).toBe(true);
    });
  });

  describe('cache stampede protection', () => {
    it('should prevent multiple simultaneous factory calls', async () => {
      let factoryCallCount = 0;
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const factory = async () => {
        factoryCallCount++;
        await delay(100);
        return 'factory-value';
      };

      // Simultaneous requests
      const [result1, result2, result3] = await Promise.all([
        cacheService.getOrSet('test-key', factory),
        cacheService.getOrSet('test-key', factory),
        cacheService.getOrSet('test-key', factory),
      ]);

      // Factory should only be called once
      expect(factoryCallCount).toBe(1);

      // All results should have the same value
      expect(result1.value).toBe('factory-value');
      expect(result2.value).toBe('factory-value');
      expect(result3.value).toBe('factory-value');
    });
  });
});
