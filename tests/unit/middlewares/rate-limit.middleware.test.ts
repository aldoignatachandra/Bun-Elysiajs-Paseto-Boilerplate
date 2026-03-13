/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { TooManyRequestsError } from '@/core/errors/app-error';
import { createMockRedis } from '../mocks/redis.mocks';

// Mock Redis connection
const mockRedis = createMockRedis();

// Mock only getRedisConnection, preserve other exports
const originalGetRedisConnection = () => mockRedis;
const mockIsRedisHealthy = async () => true;
const mockCloseRedisConnection = async () => {};
const mockGetRedisConnectionInfo = () => ({
  connected: true,
  host: 'localhost',
  port: 6379,
  db: 0,
});

vi.mock('@/core/redis/connection', () => ({
  getRedisConnection: originalGetRedisConnection,
  isRedisHealthy: mockIsRedisHealthy,
  closeRedisConnection: mockCloseRedisConnection,
  getRedisConnectionInfo: mockGetRedisConnectionInfo,
}));

// Mock logger
const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};

vi.mock('@/core/logging/logger', () => ({
  logger: mockLogger,
}));

describe('Rate Limit Middleware', () => {
  beforeEach(() => {
    mockRedis._clear();
    mockRedis._resetImplementations();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockRedis._clear();
    mockRedis._resetImplementations();
  });

  describe('Exports', () => {
    it('should export rateLimit function', async () => {
      const { rateLimit } = await import('@/middlewares/rate-limit.middleware');
      expect(typeof rateLimit).toBe('function');
    });

    it('should export rateLimitByUser function', async () => {
      const { rateLimitByUser } = await import('@/middlewares/rate-limit.middleware');
      expect(typeof rateLimitByUser).toBe('function');
    });

    it('should export enforceRateLimit function', async () => {
      const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');
      expect(typeof enforceRateLimit).toBe('function');
    });

    it('should export resetRateLimit function', async () => {
      const { resetRateLimit } = await import('@/middlewares/rate-limit.middleware');
      expect(typeof resetRateLimit).toBe('function');
    });

    it('should export getRateLimitStatus function', async () => {
      const { getRateLimitStatus } = await import('@/middlewares/rate-limit.middleware');
      expect(typeof getRateLimitStatus).toBe('function');
    });
  });

  describe('rateLimit middleware configuration', () => {
    it('should create middleware with default options', async () => {
      const { rateLimit } = await import('@/middlewares/rate-limit.middleware');
      const middleware = rateLimit();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create middleware with custom options', async () => {
      const { rateLimit } = await import('@/middlewares/rate-limit.middleware');
      const middleware = rateLimit({ maxRequests: 50, window: 120 });
      expect(middleware).toBeDefined();
    });

    it('should create middleware with ip strategy', async () => {
      const { rateLimit } = await import('@/middlewares/rate-limit.middleware');
      const middleware = rateLimit({ strategy: 'ip' });
      expect(middleware).toBeDefined();
    });

    it('should create middleware with user_or_ip strategy', async () => {
      const { rateLimit } = await import('@/middlewares/rate-limit.middleware');
      const middleware = rateLimit({ strategy: 'user_or_ip' });
      expect(middleware).toBeDefined();
    });

    it('should create middleware with custom key generator', async () => {
      const { rateLimit } = await import('@/middlewares/rate-limit.middleware');
      const keyGenerator = vi.fn(() => 'custom-key');
      const middleware = rateLimit({ keyGenerator });
      expect(middleware).toBeDefined();
    });

    it('should create middleware with custom error message', async () => {
      const { rateLimit } = await import('@/middlewares/rate-limit.middleware');
      const middleware = rateLimit({ errorMessage: 'Custom error' });
      expect(middleware).toBeDefined();
    });

    it('should create middleware with custom prefix', async () => {
      const { rateLimit } = await import('@/middlewares/rate-limit.middleware');
      const middleware = rateLimit({ prefix: 'custom-prefix' });
      expect(middleware).toBeDefined();
    });
  });

  describe('rateLimitByUser', () => {
    it('should create user-based rate limit middleware', async () => {
      const { rateLimitByUser } = await import('@/middlewares/rate-limit.middleware');
      const middleware = rateLimitByUser();
      expect(middleware).toBeDefined();
    });

    it('should create user-based middleware with custom options', async () => {
      const { rateLimitByUser } = await import('@/middlewares/rate-limit.middleware');
      const middleware = rateLimitByUser({ maxRequests: 25, window: 30 });
      expect(middleware).toBeDefined();
    });
  });

  describe('enforceRateLimit', () => {
    it('should return rate limit status with correct properties', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();
      const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

      const beforeHandle = enforceRateLimit({ maxRequests: 10, window: 60 });

      const ctx = {
        request: new Request('http://localhost/test'),
        user: null,
      };

      const result = await beforeHandle(ctx);

      expect(result).toHaveProperty('rateLimit');
      expect(result.rateLimit).toHaveProperty('limit');
      expect(result.rateLimit).toHaveProperty('remaining');
      expect(result.rateLimit).toHaveProperty('reset');
      expect(result.rateLimit.limit).toBe(10);
      expect(typeof result.rateLimit.remaining).toBe('number');
      expect(typeof result.rateLimit.reset).toBe('number');
    });

    it('should use default options when none provided', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();
      const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

      const beforeHandle = enforceRateLimit();

      const ctx = {
        request: new Request('http://localhost/test'),
        user: null,
      };

      const result = await beforeHandle(ctx);

      expect(result.rateLimit.limit).toBe(100); // default maxRequests
    });

    it('should include user context when available', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();
      const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

      const beforeHandle = enforceRateLimit({ maxRequests: 10, window: 60, strategy: 'user_or_ip' });

      const ctx = {
        request: new Request('http://localhost/test'),
        user: { id: 'user-123' },
      };

      const result = await beforeHandle(ctx);

      expect(result.rateLimit.limit).toBe(10);
    });

    it('should call Redis multi transaction', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();
      const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

      const beforeHandle = enforceRateLimit({ maxRequests: 10, window: 60 });

      const ctx = {
        request: new Request('http://localhost/test'),
        user: null,
      };

      await beforeHandle(ctx);

      expect(mockRedis.multi).toHaveBeenCalled();
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for a key', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();

      const { resetRateLimit } = await import('@/middlewares/rate-limit.middleware');

      // Add some data
      await mockRedis.set('ratelimit:test-key', 'some-data');

      // Reset should delete the key
      await resetRateLimit('test-key');
      expect(mockRedis.del).toHaveBeenCalledWith('ratelimit:test-key');
    });

    it('should use custom prefix', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();

      const { resetRateLimit } = await import('@/middlewares/rate-limit.middleware');

      await resetRateLimit('test-key', 'custom-prefix');
      expect(mockRedis.del).toHaveBeenCalledWith('custom-prefix:test-key');
    });

    it('should log success message', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();

      const { resetRateLimit } = await import('@/middlewares/rate-limit.middleware');

      await resetRateLimit('test-key');
      expect(mockLogger.info).toHaveBeenCalledWith('Rate limit reset', { key: 'test-key', prefix: 'ratelimit' });
    });

    it('should throw error when Redis fails', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();

      const { resetRateLimit } = await import('@/middlewares/rate-limit.middleware');

      mockRedis.del = vi.fn(() => {
        throw new Error('Redis error');
      });

      await expect(resetRateLimit('test-key')).rejects.toThrow('Failed to reset rate limit');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status with correct structure', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();

      const { getRateLimitStatus } = await import('@/middlewares/rate-limit.middleware');

      const status = await getRateLimitStatus('test-key', 10, 60);

      expect(status).toHaveProperty('limit', 10);
      expect(status).toHaveProperty('remaining');
      expect(status).toHaveProperty('reset');
      expect(status).toHaveProperty('current');
      expect(typeof status.remaining).toBe('number');
      expect(typeof status.reset).toBe('number');
      expect(typeof status.current).toBe('number');
    });

    it('should use custom prefix', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();

      const { getRateLimitStatus } = await import('@/middlewares/rate-limit.middleware');

      const status = await getRateLimitStatus('test-key', 10, 60, 'custom-prefix');
      expect(status.limit).toBe(10);
    });

    it('should calculate remaining requests correctly', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();

      const { getRateLimitStatus } = await import('@/middlewares/rate-limit.middleware');

      const status = await getRateLimitStatus('test-key', 100, 60);

      expect(status.remaining).toBeGreaterThanOrEqual(0);
      expect(status.remaining).toBeLessThanOrEqual(status.limit);
    });

    it('should throw error when Redis transaction fails', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();

      const { getRateLimitStatus } = await import('@/middlewares/rate-limit.middleware');

      mockRedis.multi = vi.fn(() => {
        throw new Error('Redis error');
      });

      await expect(getRateLimitStatus('test-key', 10, 60)).rejects.toThrow('Failed to get rate limit status');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw error when multi.exec returns null', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();

      const { getRateLimitStatus } = await import('@/middlewares/rate-limit.middleware');

      mockRedis.multi = vi.fn(() => ({
        zremrangebyscore: () => ({ exec: vi.fn() }),
        zcard: () => ({ exec: vi.fn() }),
        ttl: () => ({ exec: vi.fn() }),
        exec: vi.fn(async () => null),
      }));

      await expect(getRateLimitStatus('test-key', 10, 60)).rejects.toThrow('Failed to get rate limit status');
    });
  });

  describe('Redis error handling', () => {
    it('should handle Redis errors gracefully when skipFailedRequests is true', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();
      const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

      // Make Redis operations fail
      mockRedis.multi = vi.fn(() => {
        throw new Error('Redis connection error');
      });

      const beforeHandle = enforceRateLimit({ maxRequests: 5, window: 60, skipFailedRequests: true });

      const ctx = {
        request: new Request('http://localhost/test'),
        user: null,
      };

      // Request should still succeed despite Redis error
      const result = await beforeHandle(ctx);
      expect(result.rateLimit.remaining).toBe(5);
    });

    it('should return error when Redis fails and skipFailedRequests is false', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();
      const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

      // Make Redis operations fail
      mockRedis.multi = vi.fn(() => {
        throw new Error('Redis connection error');
      });

      const beforeHandle = enforceRateLimit({ maxRequests: 5, window: 60, skipFailedRequests: false });

      const ctx = {
        request: new Request('http://localhost/test'),
        user: null,
      };

      // Request should throw
      await expect(beforeHandle(ctx)).rejects.toThrow(TooManyRequestsError);
    });

    it('should log error when Redis operation fails', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();
      const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

      // Make Redis operations fail
      mockRedis.multi = vi.fn(() => {
        throw new Error('Redis connection error');
      });

      const beforeHandle = enforceRateLimit({ maxRequests: 5, window: 60, skipFailedRequests: false });

      const ctx = {
        request: new Request('http://localhost/test'),
        user: null,
      };

      try {
        await beforeHandle(ctx);
      } catch (error) {
        // Expected to throw
      }

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('RateLimitOptions interface', () => {
    it('should accept all valid option combinations', async () => {
      mockRedis._clear();
      mockRedis._resetImplementations();
      const { rateLimit } = await import('@/middlewares/rate-limit.middleware');

      // All options
      const middleware1 = rateLimit({
        maxRequests: 100,
        window: 60,
        keyGenerator: vi.fn(),
        skipFailedRequests: true,
        errorMessage: 'Custom message',
        prefix: 'custom',
        strategy: 'ip',
      });
      expect(middleware1).toBeDefined();

      // Minimal options
      const middleware2 = rateLimit({});
      expect(middleware2).toBeDefined();

      // Partial options
      const middleware3 = rateLimit({ maxRequests: 50 });
      expect(middleware3).toBeDefined();
    });
  });
});
