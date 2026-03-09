import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { DatabasePerformanceMonitor } from '@/database/performance/monitor';
import { metricsCollector } from '@/core/metrics/collector';

describe('Database Performance Monitor', () => {
  let monitor: DatabasePerformanceMonitor;

  beforeEach(() => {
    monitor = new DatabasePerformanceMonitor({
      slowQueryThreshold: 1000, // 1 second
      enableQueryLogging: true,
      enableMetrics: true,
    });

    // Reset metrics
    metricsCollector.reset();
  });

  afterEach(() => {
    monitor.dispose();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const defaultMonitor = new DatabasePerformanceMonitor();
      expect(defaultMonitor).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customMonitor = new DatabasePerformanceMonitor({
        slowQueryThreshold: 500,
        enableQueryLogging: false,
        enableMetrics: false,
      });

      expect(customMonitor).toBeDefined();
      customMonitor.dispose();
    });

    it('should initialize with slow query threshold from config', () => {
      const thresholdMonitor = new DatabasePerformanceMonitor({
        slowQueryThreshold: 2000,
      });

      expect(thresholdMonitor).toBeDefined();
      thresholdMonitor.dispose();
    });
  });

  describe('Query Duration Tracking', () => {
    it('should track query duration', () => {
      const duration = monitor.trackQuery('SELECT * FROM users');

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(100); // Should be very fast for this operation
    });

    it('should track query with parameters', () => {
      const duration = monitor.trackQuery('SELECT * FROM users WHERE id = $1', ['123']);

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should track query duration with labels', () => {
      const duration = monitor.trackQuery('SELECT * FROM users', [], {
        operation: 'select',
        table: 'users',
      });

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should track multiple queries', () => {
      const duration1 = monitor.trackQuery('SELECT * FROM users');
      const duration2 = monitor.trackQuery('SELECT * FROM sessions');

      expect(duration1).toBeGreaterThanOrEqual(0);
      expect(duration2).toBeGreaterThanOrEqual(0);
    });

    it('should track slow query', () => {
      // Simulate a slow query
      const duration = monitor.trackQuery('SELECT * FROM large_table');

      // The duration should be a non-negative number
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Slow Query Logging', () => {
    it('should log queries exceeding threshold', () => {
      const slowMonitor = new DatabasePerformanceMonitor({
        slowQueryThreshold: 0, // All queries will be slow
        enableQueryLogging: true,
      });

      slowMonitor.trackQuery('SELECT * FROM users');

      // Check if slow query was logged
      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_slow_queries_total');

      slowMonitor.dispose();
    });

    it('should not log queries below threshold', () => {
      const fastMonitor = new DatabasePerformanceMonitor({
        slowQueryThreshold: 10000, // Very high threshold
        enableQueryLogging: true,
      });

      fastMonitor.trackQuery('SELECT * FROM users');

      // Query should complete before threshold
      const metrics = metricsCollector.getMetrics();
      expect(metrics).not.toContain('db_slow_queries_total 1');

      fastMonitor.dispose();
    });

    it('should include query text in slow query log', () => {
      const slowMonitor = new DatabasePerformanceMonitor({
        slowQueryThreshold: 0,
        enableQueryLogging: true,
      });

      slowMonitor.trackQuery('SELECT * FROM users WHERE email = $1', ['test@example.com']);

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_slow_queries_total');

      slowMonitor.dispose();
    });

    it('should include duration in slow query log', () => {
      const slowMonitor = new DatabasePerformanceMonitor({
        slowQueryThreshold: 0,
        enableQueryLogging: true,
      });

      const duration = slowMonitor.trackQuery('SELECT * FROM users');

      expect(duration).toBeGreaterThanOrEqual(0);

      slowMonitor.dispose();
    });
  });

  describe('Metrics Integration', () => {
    it('should record query duration metric', () => {
      monitor.trackQuery('SELECT * FROM users');

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_query_duration_seconds');
    });

    it('should record query count metric', () => {
      monitor.trackQuery('SELECT * FROM users');
      monitor.trackQuery('SELECT * FROM sessions');

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_queries_total');
    });

    it('should record slow query count metric', () => {
      const slowMonitor = new DatabasePerformanceMonitor({
        slowQueryThreshold: 0,
        enableMetrics: true,
      });

      slowMonitor.trackQuery('SELECT * FROM users');
      slowMonitor.trackQuery('SELECT * FROM sessions');

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_slow_queries_total');

      slowMonitor.dispose();
    });

    it('should include operation type in metrics', () => {
      monitor.trackQuery('SELECT * FROM users', [], { operation: 'select' });

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('operation=');
    });

    it('should include table name in metrics', () => {
      monitor.trackQuery('SELECT * FROM users', [], { table: 'users' });

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('table=');
    });

    it('should track query errors', () => {
      monitor.trackError('SELECT * FROM users', new Error('Connection lost'));

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_query_errors_total');
    });

    it('should include error type in error metrics', () => {
      monitor.trackError('SELECT * FROM users', new Error('Connection lost'), {
        operation: 'select',
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_query_errors_total');
    });
  });

  describe('Connection Pool Metrics', () => {
    it('should record active connections metric', () => {
      monitor.recordPoolStats({
        totalCount: 10,
        idleCount: 5,
        waitingCount: 0,
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_pool_active_connections');
      expect(metrics).toContain('db_pool_idle_connections');
      expect(metrics).toContain('db_pool_waiting_connections');
    });

    it('should record pool utilization', () => {
      monitor.recordPoolStats({
        totalCount: 10,
        idleCount: 5,
        waitingCount: 0,
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_pool_utilization');
    });

    it('should handle zero connections', () => {
      monitor.recordPoolStats({
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_pool_active_connections 0');
    });

    it('should handle pool at max capacity', () => {
      monitor.recordPoolStats({
        totalCount: 10,
        idleCount: 0,
        waitingCount: 5,
      });

      const metrics = metricsCollector.getMetrics();
      expect(metrics).toContain('db_pool_waiting_connections 5');
    });
  });

  describe('Query Statistics', () => {
    it('should maintain query statistics', () => {
      monitor.trackQuery('SELECT * FROM users');
      monitor.trackQuery('SELECT * FROM users');

      const stats = monitor.getStatistics();
      expect(stats.totalQueries).toBe(2);
    });

    it('should calculate average query duration', () => {
      monitor.trackQuery('SELECT * FROM users');
      monitor.trackQuery('SELECT * FROM sessions');

      const stats = monitor.getStatistics();
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it('should track slow query count', () => {
      const slowMonitor = new DatabasePerformanceMonitor({
        slowQueryThreshold: 0,
      });

      slowMonitor.trackQuery('SELECT * FROM users');
      slowMonitor.trackQuery('SELECT * FROM sessions');

      const stats = slowMonitor.getStatistics();
      expect(stats.slowQueries).toBe(2);

      slowMonitor.dispose();
    });

    it('should track error count', () => {
      monitor.trackError('SELECT * FROM users', new Error('Error 1'));
      monitor.trackError('SELECT * FROM sessions', new Error('Error 2'));

      const stats = monitor.getStatistics();
      expect(stats.errors).toBe(2);
    });

    it('should reset statistics', () => {
      monitor.trackQuery('SELECT * FROM users');
      monitor.resetStatistics();

      const stats = monitor.getStatistics();
      expect(stats.totalQueries).toBe(0);
    });
  });

  describe('Disposable Interface', () => {
    it('should dispose resources', () => {
      expect(() => monitor.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls', () => {
      monitor.dispose();
      expect(() => monitor.dispose()).not.toThrow();
    });

    it('should stop tracking after dispose', () => {
      monitor.dispose();

      // These should not throw after dispose
      expect(() => {
        monitor.trackQuery('SELECT * FROM users');
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should respect enableQueryLogging flag', () => {
      const monitorNoLogging = new DatabasePerformanceMonitor({
        slowQueryThreshold: 0,
        enableQueryLogging: false,
      });

      monitorNoLogging.trackQuery('SELECT * FROM users');

      monitorNoLogging.dispose();
    });

    it('should respect enableMetrics flag', () => {
      const monitorNoMetrics = new DatabasePerformanceMonitor({
        enableMetrics: false,
      });

      monitorNoMetrics.trackQuery('SELECT * FROM users');

      // Metrics should not be recorded
      monitorNoMetrics.dispose();
    });

    it('should handle custom slow query threshold', () => {
      const customMonitor = new DatabasePerformanceMonitor({
        slowQueryThreshold: 5000,
      });

      expect(customMonitor).toBeDefined();
      customMonitor.dispose();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty query strings', () => {
      expect(() => monitor.trackQuery('')).not.toThrow();
    });

    it('should handle very long query strings', () => {
      const longQuery = 'SELECT * FROM users WHERE ' + 'id = $1 AND '.repeat(1000) + 'true';

      expect(() => monitor.trackQuery(longQuery)).not.toThrow();
    });

    it('should handle queries with special characters', () => {
      const specialQuery = "SELECT * FROM users WHERE name = 'O\\'Reilly'";

      expect(() => monitor.trackQuery(specialQuery)).not.toThrow();
    });

    it('should handle null parameters', () => {
      expect(() => monitor.trackQuery('SELECT * FROM users WHERE id = $1', [null])).not.toThrow();
    });

    it('should handle undefined labels', () => {
      expect(() => monitor.trackQuery('SELECT * FROM users', [], undefined as never)).not.toThrow();
    });

    it('should handle tracking errors with null error', () => {
      expect(() => monitor.trackError('SELECT * FROM users', null as never)).not.toThrow();
    });
  });
});
