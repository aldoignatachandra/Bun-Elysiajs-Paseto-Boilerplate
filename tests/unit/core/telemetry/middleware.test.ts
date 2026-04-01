import { describe, it, expect } from 'bun:test';
import {
  telemetryMiddleware,
  traceDatabaseOperation,
  traceRedisOperation,
  getActiveSpan,
  addSpanAttribute,
  addSpanEvent,
} from '@/core/telemetry/middleware';

describe('Telemetry Middleware', () => {
  describe('telemetryMiddleware', () => {
    it('should create middleware function', () => {
      const middleware = telemetryMiddleware();

      expect(typeof middleware).toBe('function');
    });
  });

  describe('traceDatabaseOperation', () => {
    it('should execute function when telemetry is disabled', async () => {
      const result = await traceDatabaseOperation('select', 'users', async () => 'db-result');

      expect(result).toBe('db-result');
    });

    it('should propagate errors', async () => {
      await expect(
        traceDatabaseOperation('insert', 'users', async () => {
          throw new Error('DB error');
        })
      ).rejects.toThrow('DB error');
    });
  });

  describe('traceRedisOperation', () => {
    it('should execute function when telemetry is disabled', async () => {
      const result = await traceRedisOperation('get', 'cache-key', async () => 'redis-result');

      expect(result).toBe('redis-result');
    });

    it('should propagate errors', async () => {
      await expect(
        traceRedisOperation('set', 'cache-key', async () => {
          throw new Error('Redis error');
        })
      ).rejects.toThrow('Redis error');
    });
  });

  describe('getActiveSpan', () => {
    it('should return null when no active span', () => {
      const span = getActiveSpan();

      expect(span).toBeNull();
    });
  });

  describe('addSpanAttribute', () => {
    it('should not throw when no active span', () => {
      expect(() => addSpanAttribute('key', 'value')).not.toThrow();
    });
  });

  describe('addSpanEvent', () => {
    it('should not throw when no active span', () => {
      expect(() => addSpanEvent('event-name')).not.toThrow();
    });

    it('should accept optional attributes', () => {
      expect(() =>
        addSpanEvent('event-name', {
          key1: 'value',
          key2: 42,
          key3: true,
        })
      ).not.toThrow();
    });
  });
});
