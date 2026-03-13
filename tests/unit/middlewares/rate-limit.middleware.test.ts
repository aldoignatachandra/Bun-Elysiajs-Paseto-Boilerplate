/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'bun:test';

describe('Rate Limit Middleware', () => {
  describe('rateLimit', () => {
    it('should export rateLimit function', async () => {
      const { rateLimit } = await import('../../../src/middlewares/rate-limit.middleware');
      expect(typeof rateLimit).toBe('function');
    });

    it('should create middleware with default options', async () => {
      const { rateLimit } = await import('../../../src/middlewares/rate-limit.middleware');
      const middleware = rateLimit();
      expect(middleware).toBeDefined();
    });

    it('should create middleware with custom options', async () => {
      const { rateLimit } = await import('../../../src/middlewares/rate-limit.middleware');
      const middleware = rateLimit({ maxRequests: 50, window: 120 });
      expect(middleware).toBeDefined();
    });

    it('should create middleware with ip strategy', async () => {
      const { rateLimit } = await import('../../../src/middlewares/rate-limit.middleware');
      const middleware = rateLimit({ strategy: 'ip' });
      expect(middleware).toBeDefined();
    });

    it('should create middleware with user_or_ip strategy', async () => {
      const { rateLimit } = await import('../../../src/middlewares/rate-limit.middleware');
      const middleware = rateLimit({ strategy: 'user_or_ip' });
      expect(middleware).toBeDefined();
    });
  });

  describe('rateLimitByUser', () => {
    it('should export rateLimitByUser function', async () => {
      const { rateLimitByUser } = await import('../../../src/middlewares/rate-limit.middleware');
      expect(typeof rateLimitByUser).toBe('function');
    });

    it('should create user-based rate limit middleware', async () => {
      const { rateLimitByUser } = await import('../../../src/middlewares/rate-limit.middleware');
      const middleware = rateLimitByUser();
      expect(middleware).toBeDefined();
    });
  });
});
