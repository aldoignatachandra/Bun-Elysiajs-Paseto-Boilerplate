/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import type { RateLimitStatus } from '@/middlewares/rate-limit.middleware';

// Mock Redis
const mockRedis = {
  multi: vi.fn(() => mockRedis),
  zremrangebyscore: vi.fn(() => mockRedis),
  zadd: vi.fn(() => mockRedis),
  zcard: vi.fn(() => mockRedis),
  expire: vi.fn(() => mockRedis),
  exec: vi.fn(() => [
    [null, 1],
    [null, 1],
    [null, 5],
    [null, 60],
  ]),
  del: vi.fn(() => Promise.resolve(1)),
  ttl: vi.fn(() => Promise.resolve(60)),
  set: vi.fn(() => Promise.resolve('OK')),
  _clear: () => {
    mockRedis.multi.mockClear();
    mockRedis.zremrangebyscore.mockClear();
    mockRedis.zadd.mockClear();
    mockRedis.zcard.mockClear();
    mockRedis.expire.mockClear();
    mockRedis.exec.mockClear();
    mockRedis.del.mockClear();
    mockRedis.ttl.mockClear();
    mockRedis.set.mockClear();
  },
  _resetImplementations: () => {
    mockRedis.multi.mockImplementation(() => mockRedis);
    mockRedis.zremrangebyscore.mockImplementation(() => mockRedis);
    mockRedis.zadd.mockImplementation(() => mockRedis);
    mockRedis.zcard.mockImplementation(() => mockRedis);
    mockRedis.expire.mockImplementation(() => mockRedis);
    mockRedis.exec.mockImplementation(() => [
      [null, 1],
      [null, 1],
      [null, 5],
      [null, 60],
    ]);
    mockRedis.del.mockImplementation(() => Promise.resolve(1));
    mockRedis.ttl.mockImplementation(() => Promise.resolve(60));
    mockRedis.set.mockImplementation(() => Promise.resolve('OK'));
  },
};

// Mock logger
vi.mock('@/core/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock Redis connection
vi.mock('@/core/redis/connection', () => ({
  getRedisConnection: () => mockRedis,
  isRedisHealthy: () => Promise.resolve(true),
}));

// Helper to create mock request with proper headers
function createMockRequest(url: string = 'http://localhost/test'): Request {
  const headers = new Map<string, string>();
  return {
    url,
    method: 'GET',
    headers: {
      get: (key: string) => headers.get(key),
      set: (key: string, value: string) => headers.set(key, value),
    },
  } as unknown as Request;
}

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    mockRedis._clear();
    mockRedis._resetImplementations();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should store rate limit status in context', async () => {
    const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');
    const beforeHandle = enforceRateLimit();

    const ctx = {
      request: createMockRequest(),
      user: null,
      rateLimit: undefined as RateLimitStatus | undefined,
    };

    await beforeHandle(ctx);
    expect(ctx.rateLimit).toBeDefined();
    expect(ctx.rateLimit!.limit).toBe(100);
    expect(typeof ctx.rateLimit!.remaining).toBe('number');
    expect(typeof ctx.rateLimit!.reset).toBe('number');
  });

  test('should use custom options', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();
    const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');
    const beforeHandle = enforceRateLimit({ maxRequests: 10, window: 60 });

    const ctx = {
      request: createMockRequest(),
      user: null,
      rateLimit: undefined as RateLimitStatus | undefined,
    };

    await beforeHandle(ctx);
    expect(ctx.rateLimit!.limit).toBe(10);
  });

  test('should call Redis multi transaction', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();
    const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');
    const beforeHandle = enforceRateLimit();

    const ctx = {
      request: createMockRequest(),
      user: null,
      rateLimit: undefined as RateLimitStatus | undefined,
    };

    await beforeHandle(ctx);
    expect(mockRedis.multi).toHaveBeenCalled();
  });
});

describe('resetRateLimit', () => {
  test('should reset rate limit for a key', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();

    const { resetRateLimit } = await import('@/middlewares/rate-limit.middleware');

    await resetRateLimit('test-key');
    expect(mockRedis.del).toHaveBeenCalledWith('ratelimit:test-key');
  });

  test('should use custom prefix', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();

    const { resetRateLimit } = await import('@/middlewares/rate-limit.middleware');

    await resetRateLimit('test-key', 'custom-prefix');
    expect(mockRedis.del).toHaveBeenCalledWith('custom-prefix:test-key');
  });
});

describe('getRateLimitStatus', () => {
  test('should return rate limit status with correct structure', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();

    const { getRateLimitStatus } = await import('@/middlewares/rate-limit.middleware');

    const status = await getRateLimitStatus('test-key', 10, 60);

    expect(status).toHaveProperty('limit');
    expect(status).toHaveProperty('remaining');
    expect(status).toHaveProperty('reset');
    expect(status).toHaveProperty('current');
    expect(typeof status.remaining).toBe('number');
    expect(typeof status.reset).toBe('number');
    expect(typeof status.current).toBe('number');
  });

  test('should calculate remaining requests correctly', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();

    const { getRateLimitStatus } = await import('@/middlewares/rate-limit.middleware');

    const status = await getRateLimitStatus('test-key', 100, 60);

    expect(status.remaining).toBeGreaterThanOrEqual(0);
    expect(status.remaining).toBeLessThanOrEqual(status.limit);
  });
});

describe('Redis error handling', () => {
  test('should fall back to in-memory rate limiter when Redis operations fail', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();
    const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

    const beforeHandle = enforceRateLimit({ maxRequests: 5, window: 60 });

    const ctx = {
      request: createMockRequest(),
      user: null,
      rateLimit: undefined as RateLimitStatus | undefined,
    };

    // Force Redis to throw error
    mockRedis.multi = vi.fn(() => {
      throw new Error('Redis error');
    });

    // Request should succeed using in-memory fallback
    // First request consumes 1 token, so remaining = 4
    await beforeHandle(ctx);
    expect(ctx.rateLimit!.remaining).toBe(4);
  });
});
