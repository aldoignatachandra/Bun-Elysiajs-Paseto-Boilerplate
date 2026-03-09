import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  getConnection,
  closeConnection,
  getPoolStatistics,
  isPoolHealthy,
  __resetConnectionState,
} from '@/database/connection';
import { metricsCollector } from '@/core/metrics/collector';

describe('Database Connection - Pooling', () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalEnv = { ...process.env };

    // Set required environment variables
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
    process.env.DATABASE_POOL_MIN = '2';
    process.env.DATABASE_POOL_MAX = '10';
    process.env.DATABASE_SSL = 'false';
    process.env.NODE_ENV = 'test';

    // Clear any cached connections
    __resetConnectionState();

    // Reset metrics
    metricsCollector.reset();
  });

  afterEach(async () => {
    await closeConnection();

    // Restore environment
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key as keyof typeof process.env];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  describe('Connection Functions', () => {
    it('should return same connection instance on subsequent calls', () => {
      const conn1 = getConnection();
      const conn2 = getConnection();

      expect(conn1).toBe(conn2);
    });

    it('should create drizzle db instance', () => {
      const conn = getConnection();

      expect(conn).toBeDefined();
      expect(conn).toHaveProperty('select');
    });

    it('should handle closing when no connection exists', async () => {
      // First close any existing connection
      await closeConnection();

      // Should handle gracefully without throwing
      const result = closeConnection();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should allow recreation after shutdown', async () => {
      const conn1 = getConnection();
      await closeConnection();
      const conn2 = getConnection();

      expect(conn1).not.toBe(conn2);
      expect(conn2).toBeDefined();
    });

    it('should provide pool statistics', () => {
      getConnection();

      const stats = getPoolStatistics();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalCount');
      expect(stats).toHaveProperty('idleCount');
      expect(stats).toHaveProperty('waitingCount');
    });

    it('should return null for pool statistics when no pool exists', async () => {
      await closeConnection();

      const stats = getPoolStatistics();

      expect(stats).toBeNull();
    });

    it('should check pool health', () => {
      getConnection();

      const isHealthy = isPoolHealthy();

      expect(typeof isHealthy).toBe('boolean');
    });

    it('should return false for pool health when no pool exists', async () => {
      await closeConnection();

      const isHealthy = isPoolHealthy();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Configuration Validation', () => {
    it('should handle SSL when enabled', () => {
      process.env.DATABASE_SSL = 'true';

      // Clear cached connection
      __resetConnectionState();

      expect(() => getConnection()).not.toThrow();
    });

    it('should handle SSL when disabled', () => {
      process.env.DATABASE_SSL = 'false';

      // Clear cached connection
      __resetConnectionState();

      expect(() => getConnection()).not.toThrow();
    });

    it('should use default pool values when env vars are not set', () => {
      delete process.env.DATABASE_POOL_MIN;
      delete process.env.DATABASE_POOL_MAX;

      // Clear cached connection
      __resetConnectionState();

      expect(() => getConnection()).not.toThrow();
    });

    it('should handle large pool sizes', () => {
      process.env.DATABASE_POOL_MIN = '10';
      process.env.DATABASE_POOL_MAX = '100';

      // Clear cached connection
      __resetConnectionState();

      expect(() => getConnection()).not.toThrow();
    });

    it('should handle zero pool size gracefully', () => {
      process.env.DATABASE_POOL_MIN = '0';
      process.env.DATABASE_POOL_MAX = '0';

      // Clear cached connection
      __resetConnectionState();

      expect(() => getConnection()).not.toThrow();
    });
  });

  describe('Metrics Integration', () => {
    it('should register database pool metrics', () => {
      getConnection();

      const metrics = metricsCollector.getMetrics();

      expect(metrics).toContain('db_pool_active_connections');
      expect(metrics).toContain('db_pool_idle_connections');
      expect(metrics).toContain('db_pool_waiting_connections');
      expect(metrics).toContain('db_pool_utilization');
    });

    it('should record pool metrics on connection', () => {
      getConnection();

      const metrics = metricsCollector.getMetrics();

      // Check that metrics are recorded (values may be 0 in test env)
      expect(metrics).toContain('db_pool_active_connections');
      expect(metrics).toContain('db_pool_idle_connections');
    });

    it('should include connection errors metric in collector', () => {
      getConnection();

      const metrics = metricsCollector.getMetrics();

      // The metric should be registered even if no errors occurred
      expect(metrics).toContain('db_pool_connection_errors_total');
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle shutdown gracefully', async () => {
      getConnection();

      const result = closeConnection();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should clear references after shutdown', async () => {
      getConnection();
      await closeConnection();

      const stats = getPoolStatistics();
      expect(stats).toBeNull();
    });

    it('should allow multiple shutdown calls', async () => {
      getConnection();

      await closeConnection();
      const result = closeConnection();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid DATABASE_URL gracefully', () => {
      process.env.DATABASE_URL = 'invalid-url';

      // Clear cached connection
      __resetConnectionState();

      // Should not throw immediately, but may throw when trying to use the connection
      expect(() => getConnection()).not.toThrow();
    });

    it('should handle missing DATABASE_URL', () => {
      delete process.env.DATABASE_URL;

      // Clear cached connection
      __resetConnectionState();

      expect(() => getConnection()).not.toThrow();
    });
  });

  describe('Module Exports', () => {
    it('should export getConnection function', () => {
      expect(typeof getConnection).toBe('function');
    });

    it('should export closeConnection function', () => {
      expect(typeof closeConnection).toBe('function');
    });

    it('should export getPoolStatistics function', () => {
      expect(typeof getPoolStatistics).toBe('function');
    });

    it('should export isPoolHealthy function', () => {
      expect(typeof isPoolHealthy).toBe('function');
    });

    it('should export Database type', () => {
      // Database is exported as a type, so it won't be in runtime exports
      // But we can check that the module has the expected exports
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
      const connectionModule = require('@/database/connection');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(typeof connectionModule.getConnection).toBe('function');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(typeof connectionModule.closeConnection).toBe('function');
    });
  });
});
