/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';

// Mock Redis connection
const mockRedis = {
  ping: vi.fn(async () => 'PONG'),
};

vi.mock('@/core/redis/connection', () => ({
  getRedisConnection: () => mockRedis,
}));

// Mock database connection
const mockDb = {
  execute: vi.fn(async () => ({ rows: [] })),
};

vi.mock('@/database/connection', () => ({
  getConnection: () => mockDb,
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

describe('Health Plugin', () => {
  beforeEach(() => {
    // Reset mocks to default working state
    mockDb.execute = vi.fn(async () => ({ rows: [] }));
    mockRedis.ping = vi.fn(async () => 'PONG');
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset mocks to default working state
    mockDb.execute = vi.fn(async () => ({ rows: [] }));
    mockRedis.ping = vi.fn(async () => 'PONG');
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export healthPlugin function', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      expect(typeof healthPlugin).toBe('function');
    });
  });

  describe('Plugin registration', () => {
    it('should register health check plugin with Elysia', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());
      expect(app).toBeDefined();
    });

    it('should register all health endpoints', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      // The plugin should register the /health, /health/ready, and /health/live endpoints
      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('GET /health endpoint', () => {
    it('should return healthy status when all services up', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        status: string;
        timestamp: string;
        checks: { database: { status: string }; redis: { status: string } };
      };
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('checks');
      expect(body.checks).toHaveProperty('database');
      expect(body.checks).toHaveProperty('redis');
      expect(body.checks.database.status).toBe('ok');
      expect(body.checks.redis.status).toBe('ok');
    });

    it('should return unhealthy when database down', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Mock database error
      mockDb.execute = vi.fn(async () => {
        throw new Error('Database connection failed');
      });

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(503);

      const body = (await response.json()) as {
        status: string;
        checks: { database: { status: string; error?: string } };
      };
      expect(body).toHaveProperty('status', 'degraded');
      expect(body.checks.database.status).toBe('error');
      expect(body.checks.database).toHaveProperty('error');
    });

    it('should return unhealthy when redis down', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Mock Redis error
      mockRedis.ping = vi.fn(async () => {
        throw new Error('Redis connection failed');
      });

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(503);

      const body = (await response.json()) as any;
      expect(body).toHaveProperty('status', 'degraded');
      expect(body.checks.redis.status).toBe('error');
      expect(body.checks.redis).toHaveProperty('error');
    });

    it('should return unhealthy when both services down', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Mock both errors
      mockDb.execute = vi.fn(async () => {
        throw new Error('Database connection failed');
      });
      mockRedis.ping = vi.fn(async () => {
        throw new Error('Redis connection failed');
      });

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(503);

      const body = (await response.json()) as any;
      expect(body).toHaveProperty('status', 'degraded');
      expect(body.checks.database.status).toBe('error');
      expect(body.checks.redis.status).toBe('error');
    });

    it('should include latency in health check', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body.checks.database).toHaveProperty('latency');
      expect(body.checks.redis).toHaveProperty('latency');
      expect(typeof body.checks.database.latency).toBe('number');
      expect(typeof body.checks.redis.latency).toBe('number');
    });

    it('should include latency even when service fails', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Mock database error
      mockDb.execute = vi.fn(async () => {
        throw new Error('Database connection failed');
      });

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(503);

      const body = (await response.json()) as any;
      expect(body.checks.database).toHaveProperty('latency');
      expect(typeof body.checks.database.latency).toBe('number');
    });

    it('should return JSON content type', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('GET /health/ready endpoint', () => {
    it('should return ready status', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health/ready'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body).toHaveProperty('status', 'ready');
      expect(body).toHaveProperty('timestamp');
    });

    it('should return JSON content type', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health/ready'));
      expect(response.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('GET /health/live endpoint', () => {
    it('should return alive status', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health/live'));
      expect(response.status).toBe(200);

      const body = (await response.json()) as any;
      expect(body).toHaveProperty('status', 'alive');
      expect(body).toHaveProperty('timestamp');
    });

    it('should return JSON content type', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health/live'));
      expect(response.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('Health check functions', () => {
    it('should check database health with SQL query', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      await app.handle(new Request('http://localhost/health'));

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it('should check redis health with ping', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      await app.handle(new Request('http://localhost/health'));

      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should log errors when database check fails', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Mock database error
      mockDb.execute = vi.fn(async () => {
        throw new Error('Database connection failed');
      });

      const app = new Elysia().use(healthPlugin());

      await app.handle(new Request('http://localhost/health'));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Database health check failed',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it('should log errors when redis check fails', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Mock Redis error
      mockRedis.ping = vi.fn(async () => {
        throw new Error('Redis connection failed');
      });

      const app = new Elysia().use(healthPlugin());

      await app.handle(new Request('http://localhost/health'));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis health check failed',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });

    it('should log debug info on successful health check', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      await app.handle(new Request('http://localhost/health'));

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Health check performed',
        expect.objectContaining({
          overallStatus: 'ok',
          database: 'ok',
          redis: 'ok',
        })
      );
    });
  });

  describe('Overall health status calculation', () => {
    it('should return ok when all checks pass', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      const body = (await response.json()) as any;

      expect(body.status).toBe('ok');
      expect(response.status).toBe(200);
    });

    it('should return degraded when any check fails', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Mock database error
      mockDb.execute = vi.fn(async () => {
        throw new Error('Database connection failed');
      });

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      const body = (await response.json()) as any;

      expect(body.status).toBe('degraded');
      expect(response.status).toBe(503);
    });

    it('should return correct HTTP status code for ok health', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(200);
    });

    it('should return correct HTTP status code for degraded health', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Mock database error
      mockDb.execute = vi.fn(async () => {
        throw new Error('Database connection failed');
      });

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(503);
    });
  });

  describe('Timestamp in responses', () => {
    it('should include timestamp in health response', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      const body = (await response.json()) as any;

      expect(body).toHaveProperty('timestamp');
      expect(typeof body.timestamp).toBe('string');
      expect(new Date(body.timestamp)).toBeInstanceOf(Date);
    });

    it('should include timestamp in ready response', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health/ready'));
      const body = (await response.json()) as any;

      expect(body).toHaveProperty('timestamp');
      expect(typeof body.timestamp).toBe('string');
    });

    it('should include timestamp in live response', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health/live'));
      const body = (await response.json()) as any;

      expect(body).toHaveProperty('timestamp');
      expect(typeof body.timestamp).toBe('string');
    });
  });

  describe('Plugin behavior', () => {
    it('should handle concurrent health check requests', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      const app = new Elysia().use(healthPlugin());

      // Make multiple concurrent requests
      const requests = [
        app.handle(new Request('http://localhost/health')),
        app.handle(new Request('http://localhost/health')),
        app.handle(new Request('http://localhost/health')),
      ];

      const responses = await Promise.all(requests);

      for (const response of responses) {
        expect(response.status).toBe(200);
        const body = (await response.json()) as any;
        expect(body.status).toBe('ok');
      }
    });

    it('should reset database mock after test', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Reset to working state
      mockDb.execute = vi.fn(async () => ({ rows: [] }));

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(200);
    });

    it('should reset redis mock after test', async () => {
      const { healthPlugin } = await import('@/plugins/health.plugin');
      const { Elysia } = await import('elysia');

      // Reset to working state
      mockRedis.ping = vi.fn(async () => 'PONG');

      const app = new Elysia().use(healthPlugin());

      const response = await app.handle(new Request('http://localhost/health'));
      expect(response.status).toBe(200);
    });
  });
});
