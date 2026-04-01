import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  initializeTracer,
  shutdownTracer,
  getTracer,
  isTracerInitialized,
  withSpan,
  createSpan,
  recordSpanError,
  setSpanOk,
  type TelemetryConfig,
} from '@/core/telemetry';

describe('Telemetry Tracer', () => {
  const originalEnv = process.env;
  const disabledConfig: TelemetryConfig = {
    enabled: false,
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    otlpEndpoint: 'http://localhost:4318',
    traceHTTP: false,
    traceDatabase: false,
    traceRedis: false,
    sampleRate: 1.0,
    logLevel: 'info',
  };

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
    // Ensure tracer is shut down before each test
    shutdownTracer();
  });

  afterEach(() => {
    // Clean up tracer after each test
    shutdownTracer();
    // Restore original environment
    process.env = originalEnv;
  });

  describe('initializeTracer', () => {
    it('should skip initialization when disabled', () => {
      initializeTracer(disabledConfig);

      expect(isTracerInitialized()).toBe(false);
    });

    it('should return null tracer when not initialized', () => {
      expect(getTracer()).toBeNull();
    });

    it('should return false for isTracerInitialized when not initialized', () => {
      expect(isTracerInitialized()).toBe(false);
    });
  });

  describe('shutdownTracer', () => {
    it('should handle shutdown when not initialized', () => {
      // Should not throw
      shutdownTracer();
    });

    it('should clear tracer after shutdown', () => {
      // Shutdown should clear the tracer
      shutdownTracer();

      expect(getTracer()).toBeNull();
      expect(isTracerInitialized()).toBe(false);
    });
  });

  describe('withSpan', () => {
    it('should execute function when tracer is not initialized', async () => {
      const result = await withSpan('test-span', async () => 'test-result');

      expect(result).toBe('test-result');
    });

    it('should pass empty span object when tracer is not initialized', async () => {
      let receivedSpan: unknown;

      await withSpan('test-span', async span => {
        receivedSpan = span;
        return 'done';
      });

      // When not initialized, span is an empty object
      expect(receivedSpan).toEqual({});
    });

    it('should propagate errors when tracer is not initialized', async () => {
      await expect(
        withSpan('test-span', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });

    it('should accept optional attributes', async () => {
      const result = await withSpan('test-span', async () => 'done', {
        'custom.attribute': 'value',
        'custom.number': 42,
        'custom.boolean': true,
      });

      expect(result).toBe('done');
    });
  });

  describe('createSpan', () => {
    it('should return null when tracer is not initialized', () => {
      const span = createSpan('test-span');

      expect(span).toBeNull();
    });
  });

  describe('recordSpanError', () => {
    it('should be a function', () => {
      expect(typeof recordSpanError).toBe('function');
    });
  });

  describe('setSpanOk', () => {
    it('should be a function', () => {
      expect(typeof setSpanOk).toBe('function');
    });
  });
});
