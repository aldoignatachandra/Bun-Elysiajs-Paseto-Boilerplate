/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import Redis from 'ioredis';
import { cachingPlugin } from '@/plugins/caching.plugin';

describe('Caching Plugin', () => {
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
  });

  afterEach(async () => {
    // Clean up after tests
    await redis.flushdb();
    await redis.quit();
  });

  describe('caching behavior', () => {
    it('should cache GET request responses', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => {
          callCount++;
          return { data: 'test-response', callCount };
        });

      // First request - cache miss
      const response1 = await app.handle(new Request('http://localhost/api/test'));
      const data1 = await response1.json();

      expect(response1.headers.get('X-Cache')).toBe('MISS');
      expect(data1.callCount).toBe(1);
      expect(callCount).toBe(1);

      // Second request - cache hit
      const response2 = await app.handle(new Request('http://localhost/api/test'));
      const data2 = await response2.json();

      expect(response2.headers.get('X-Cache')).toBe('HIT');
      expect(data2.callCount).toBe(1);
      expect(callCount).toBe(1); // Handler not called again
    });

    it('should not cache POST requests by default', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .post('/api/test', () => {
          callCount++;
          return { data: 'test-response', callCount };
        });

      // First POST request
      const response1 = await app.handle(
        new Request('http://localhost/api/test', { method: 'POST' })
      );
      expect(response1.headers.get('X-Cache')).toBeNull();
      expect(callCount).toBe(1);

      // Second POST request - should not be cached
      const response2 = await app.handle(
        new Request('http://localhost/api/test', { method: 'POST' })
      );
      expect(response2.headers.get('X-Cache')).toBeNull();
      expect(callCount).toBe(2);
    });

    it('should not cache PUT requests by default', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .put('/api/test', () => {
          callCount++;
          return { data: 'test-response', callCount };
        });

      const response = await app.handle(
        new Request('http://localhost/api/test', { method: 'PUT' })
      );

      expect(response.headers.get('X-Cache')).toBeNull();
      expect(callCount).toBe(1);
    });

    it('should not cache DELETE requests by default', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .delete('/api/test', () => {
          callCount++;
          return { data: 'test-response', callCount };
        });

      const response = await app.handle(
        new Request('http://localhost/api/test', { method: 'DELETE' })
      );

      expect(response.headers.get('X-Cache')).toBeNull();
      expect(callCount).toBe(1);
    });

    it('should not cache PATCH requests by default', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .patch('/api/test', () => {
          callCount++;
          return { data: 'test-response', callCount };
        });

      const response = await app.handle(
        new Request('http://localhost/api/test', { method: 'PATCH' })
      );

      expect(response.headers.get('X-Cache')).toBeNull();
      expect(callCount).toBe(1);
    });

    it('should use correct cache key format', async () => {
      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/users/123', () => ({ id: 123, name: 'Test User' }));

      await app.handle(new Request('http://localhost/api/users/123'));

      // Check that the cache key exists in Redis with correct format
      const keys = await redis.keys('http:GET:/api/users/123');
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('X-Cache headers', () => {
    it('should set X-Cache: HIT on cache hit', async () => {
      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => ({ data: 'test' }));

      // First request to populate cache
      await app.handle(new Request('http://localhost/api/test'));

      // Second request should hit cache
      const response = await app.handle(new Request('http://localhost/api/test'));

      expect(response.headers.get('X-Cache')).toBe('HIT');
    });

    it('should set X-Cache: MISS on cache miss', async () => {
      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => ({ data: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/test'));

      expect(response.headers.get('X-Cache')).toBe('MISS');
    });

    it('should not set X-Cache header for non-cacheable requests', async () => {
      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .post('/api/test', () => ({ data: 'test' }));

      const response = await app.handle(
        new Request('http://localhost/api/test', { method: 'POST' })
      );

      expect(response.headers.get('X-Cache')).toBeNull();
    });

    it('should not set X-Cache header for non-cacheable paths', async () => {
      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
            cacheablePaths: ['/api/public/*'],
          })
        )
        .get('/api/private/data', () => ({ data: 'sensitive' }));

      const response = await app.handle(new Request('http://localhost/api/private/data'));

      expect(response.headers.get('X-Cache')).toBeNull();
    });
  });

  describe('cacheable paths configuration', () => {
    it('should only cache configured paths', async () => {
      let publicCallCount = 0;
      let privateCallCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
            cacheablePaths: ['/api/public/*'],
          })
        )
        .get('/api/public/data', () => {
          publicCallCount++;
          return { data: 'public', callCount: publicCallCount };
        })
        .get('/api/private/data', () => {
          privateCallCount++;
          return { data: 'private', callCount: privateCallCount };
        });

      // Public path should be cached
      await app.handle(new Request('http://localhost/api/public/data'));
      const publicResponse = await app.handle(new Request('http://localhost/api/public/data'));

      expect(publicResponse.headers.get('X-Cache')).toBe('HIT');
      expect(publicCallCount).toBe(1);

      // Private path should not be cached
      await app.handle(new Request('http://localhost/api/private/data'));
      const privateResponse = await app.handle(new Request('http://localhost/api/private/data'));

      expect(privateResponse.headers.get('X-Cache')).toBeNull();
      expect(privateCallCount).toBe(2);
    });

    it('should support multiple cacheable path patterns', async () => {
      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
            cacheablePaths: ['/api/public/*', '/api/cacheable/*'],
          })
        )
        .get('/api/public/data', () => ({ source: 'public' }))
        .get('/api/cacheable/data', () => ({ source: 'cacheable' }))
        .get('/api/other/data', () => ({ source: 'other' }));

      // Test public path
      const publicResponse1 = await app.handle(new Request('http://localhost/api/public/data'));
      const publicResponse2 = await app.handle(new Request('http://localhost/api/public/data'));
      expect(publicResponse2.headers.get('X-Cache')).toBe('HIT');

      // Test cacheable path
      const cacheableResponse1 = await app.handle(
        new Request('http://localhost/api/cacheable/data')
      );
      const cacheableResponse2 = await app.handle(
        new Request('http://localhost/api/cacheable/data')
      );
      expect(cacheableResponse2.headers.get('X-Cache')).toBe('HIT');

      // Test other path (should not be cached)
      const otherResponse = await app.handle(new Request('http://localhost/api/other/data'));
      expect(otherResponse.headers.get('X-Cache')).toBeNull();
    });

    it('should cache all GET requests when cacheablePaths is not configured', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/any-path', () => {
          callCount++;
          return { callCount };
        });

      await app.handle(new Request('http://localhost/api/any-path'));
      const response = await app.handle(new Request('http://localhost/api/any-path'));

      expect(response.headers.get('X-Cache')).toBe('HIT');
      expect(callCount).toBe(1);
    });
  });

  describe('cacheable methods configuration', () => {
    it('should cache configured methods', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
            cacheableMethods: ['GET', 'POST'],
          })
        )
        .get('/api/test', () => {
          callCount++;
          return { method: 'GET', callCount };
        })
        .post('/api/test', () => {
          callCount++;
          return { method: 'POST', callCount };
        })
        .put('/api/test', () => {
          callCount++;
          return { method: 'PUT', callCount };
        });

      // GET should be cached
      await app.handle(new Request('http://localhost/api/test', { method: 'GET' }));
      const getResponse = await app.handle(new Request('http://localhost/api/test', { method: 'GET' }));
      expect(getResponse.headers.get('X-Cache')).toBe('HIT');

      // POST should be cached
      callCount = 0;
      await app.handle(new Request('http://localhost/api/test', { method: 'POST' }));
      const postResponse = await app.handle(
        new Request('http://localhost/api/test', { method: 'POST' })
      );
      expect(postResponse.headers.get('X-Cache')).toBe('HIT');

      // PUT should not be cached
      const putResponse = await app.handle(new Request('http://localhost/api/test', { method: 'PUT' }));
      expect(putResponse.headers.get('X-Cache')).toBeNull();
    });
  });

  describe('cache bypass', () => {
    it('should bypass cache with Cache-Control: no-cache header', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => {
          callCount++;
          return { data: 'test', callCount };
        });

      // First request
      await app.handle(new Request('http://localhost/api/test'));

      // Second request with no-cache header should bypass cache
      const response = await app.handle(
        new Request('http://localhost/api/test', {
          headers: { 'Cache-Control': 'no-cache' },
        })
      );

      expect(response.headers.get('X-Cache')).toBe('MISS');
      expect(callCount).toBe(2);
    });

    it('should bypass cache with X-Cache-Bypass header', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => {
          callCount++;
          return { data: 'test', callCount };
        });

      // First request
      await app.handle(new Request('http://localhost/api/test'));

      // Second request with bypass header
      const response = await app.handle(
        new Request('http://localhost/api/test', {
          headers: { 'X-Cache-Bypass': 'true' },
        })
      );

      expect(response.headers.get('X-Cache')).toBe('MISS');
      expect(callCount).toBe(2);
    });
  });

  describe('cache TTL configuration', () => {
    it('should use configured default TTL', async () => {
      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
            defaultTTL: 100,
          })
        )
        .get('/api/test', () => ({ data: 'test' }));

      await app.handle(new Request('http://localhost/api/test'));

      const keys = await redis.keys('http:GET:/api/test');
      const ttl = await redis.ttl(keys[0]);

      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(100);
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => ({ data: 'test' }));

      // Disconnect Redis to simulate error
      await redis.disconnect();

      const response = await app.handle(new Request('http://localhost/api/test'));

      // Should still respond successfully without caching
      expect(response.status).toBe(200);
      expect(response.headers.get('X-Cache')).toBeNull();
    });

    it('should continue serving requests on cache failure', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => {
          callCount++;
          return { data: 'test', callCount };
        });

      // Prime cache
      await app.handle(new Request('localhost/api/test'));

      // Disconnect Redis
      await redis.disconnect();

      // Request should still work
      const response = await app.handle(new Request('http://localhost/api/test'));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.callCount).toBe(2);
    });
  });

  describe('query parameters', () => {
    it('should treat different query parameters as different cache keys', async () => {
      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => ({ data: 'test' }));

      const response1 = await app.handle(new Request('http://localhost/api/test?foo=bar'));
      const response2 = await app.handle(new Request('http://localhost/api/test?baz=qux'));

      expect(response1.headers.get('X-Cache')).toBe('MISS');
      expect(response2.headers.get('X-Cache')).toBe('MISS');
    });

    it('should cache same query parameters as same cache key', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => {
          callCount++;
          return { data: 'test', callCount };
        });

      await app.handle(new Request('http://localhost/api/test?foo=bar'));
      const response = await app.handle(new Request('http://localhost/api/test?foo=bar'));

      expect(response.headers.get('X-Cache')).toBe('HIT');
      expect(callCount).toBe(1);
    });

    it('should treat query parameters in different order as same cache key', async () => {
      let callCount = 0;

      const app = new Elysia()
        .use(
          cachingPlugin({
            redis,
          })
        )
        .get('/api/test', () => {
          callCount++;
          return { data: 'test', callCount };
        });

      await app.handle(new Request('http://localhost/api/test?foo=bar&baz=qux'));
      const response = await app.handle(
        new Request('http://localhost/api/test?baz=qux&foo=bar')
      );

      expect(response.headers.get('X-Cache')).toBe('HIT');
      expect(callCount).toBe(1);
    });
  });
});
