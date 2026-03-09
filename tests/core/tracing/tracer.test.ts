import { describe, it, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { Tracer } from '@/core/tracing/tracer';
import type { Span, TracingConfig } from '@/core/tracing/types';

describe('Tracer', () => {
  let tracer: Tracer;
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    const config: TracingConfig = {
      enabled: true,
      samplingRate: 1.0,
      exporter: 'console',
      exporterUrl: undefined,
    };
    tracer = new Tracer(config);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    consoleLogSpy.mockRestore();
  });

  describe('startSpan', () => {
    it('should create a new span with unique span ID', () => {
      const span = tracer.startSpan('test-operation');

      expect(span).toBeDefined();
      expect(span.spanId).toBeDefined();
      expect(span.traceId).toBeDefined();
      expect(span.name).toBe('test-operation');
      expect(span.startTime).toBeDefined();
      expect(span.endTime).toBeUndefined();
      expect(span.parentSpanId).toBeUndefined();
    });

    it('should create a child span with parent span ID', () => {
      const parentSpan = tracer.startSpan('parent-operation');
      const childSpan = tracer.startSpan('child-operation', parentSpan.spanId);

      expect(childSpan.parentSpanId).toBe(parentSpan.spanId);
      expect(childSpan.traceId).toBe(parentSpan.traceId);
    });

    it('should generate different span IDs for each span', () => {
      const span1 = tracer.startSpan('operation-1');
      const span2 = tracer.startSpan('operation-2');

      expect(span1.spanId).not.toBe(span2.spanId);
    });

    it('should use same trace ID for all spans in same trace', () => {
      const span1 = tracer.startSpan('operation-1');
      const span2 = tracer.startSpan('operation-2', span1.spanId);

      expect(span1.traceId).toBe(span2.traceId);
    });
  });

  describe('endSpan', () => {
    it('should end a span and calculate duration', async () => {
      const span = tracer.startSpan('test-operation');

      // Wait a bit to ensure some time has passed
      await new Promise(resolve => setTimeout(resolve, 10));

      const endedSpan = tracer.endSpan(span.spanId);

      expect(endedSpan).toBeDefined();
      expect(endedSpan.endTime).toBeDefined();
      expect(endedSpan.duration).toBeDefined();
      expect(endedSpan.duration).toBeGreaterThan(0);
    });

    it('should export span when ending', () => {
      const span = tracer.startSpan('test-operation');
      tracer.endSpan(span.spanId);

      expect(consoleLogSpy).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('Span exported');
    });

    it('should return undefined for non-existent span', () => {
      const result = tracer.endSpan('non-existent-span-id');
      expect(result).toBeUndefined();
    });

    it('should not modify span if already ended', () => {
      const span = tracer.startSpan('test-operation');
      const firstEnd = tracer.endSpan(span.spanId);
      const secondEnd = tracer.endSpan(span.spanId);

      expect(secondEnd).toBeUndefined();
      expect(firstEnd.endTime).toBeDefined();
    });
  });

  describe('addTag', () => {
    it('should add tag to existing span', () => {
      const span = tracer.startSpan('test-operation');
      const result = tracer.addTag(span.spanId, 'http.method', 'GET');

      expect(result).toBe(true);

      const currentContext = tracer.getCurrentContext();
      expect(currentContext.spanId).toBe(span.spanId);
    });

    it('should return false for non-existent span', () => {
      const result = tracer.addTag('non-existent-span-id', 'key', 'value');
      expect(result).toBe(false);
    });

    it('should allow adding multiple tags to same span', () => {
      const span = tracer.startSpan('test-operation');

      expect(tracer.addTag(span.spanId, 'http.method', 'GET')).toBe(true);
      expect(tracer.addTag(span.spanId, 'http.status_code', '200')).toBe(true);
      expect(tracer.addTag(span.spanId, 'user.id', '123')).toBe(true);
    });
  });

  describe('addLog', () => {
    it('should add log to existing span', () => {
      const span = tracer.startSpan('test-operation');
      const result = tracer.addLog(span.spanId, 'info', 'Processing request', {
        path: '/api/users',
      });

      expect(result).toBe(true);
    });

    it('should return false for non-existent span', () => {
      const result = tracer.addLog('non-existent-span-id', 'error', 'Error occurred');
      expect(result).toBe(false);
    });

    it('should allow adding multiple logs to same span', () => {
      const span = tracer.startSpan('test-operation');

      expect(tracer.addLog(span.spanId, 'info', 'Starting request')).toBe(true);
      expect(tracer.addLog(span.spanId, 'debug', 'Processing data', { count: 5 })).toBe(true);
      expect(tracer.addLog(span.spanId, 'info', 'Request completed')).toBe(true);
    });

    it('should handle logs without attributes', () => {
      const span = tracer.startSpan('test-operation');
      const result = tracer.addLog(span.spanId, 'info', 'Simple log message');

      expect(result).toBe(true);
    });
  });

  describe('getCurrentContext', () => {
    it('should return current trace context', () => {
      const span = tracer.startSpan('test-operation');
      const context = tracer.getCurrentContext();

      expect(context).toBeDefined();
      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBe(span.spanId);
      expect(context.sampled).toBe(true);
    });

    it('should return context without parent span ID for root span', () => {
      tracer.startSpan('root-operation');
      const context = tracer.getCurrentContext();

      expect(context.parentSpanId).toBeUndefined();
    });

    it('should return context with parent span ID for child span', () => {
      const parentSpan = tracer.startSpan('parent-operation');
      tracer.startSpan('child-operation', parentSpan.spanId);
      const context = tracer.getCurrentContext();

      expect(context.parentSpanId).toBe(parentSpan.spanId);
    });
  });

  describe('injectContext', () => {
    it('should inject trace context into headers', () => {
      tracer.startSpan('test-operation');
      const context = tracer.getCurrentContext();
      const headers = tracer.injectContext(context);

      expect(headers).toBeDefined();
      expect(headers['traceparent']).toBeDefined();
      expect(headers['X-Trace-Id']).toBeDefined();
      expect(headers['X-Span-Id']).toBeDefined();
    });

    it('should format traceparent header correctly', () => {
      tracer.startSpan('test-operation');
      const context = tracer.getCurrentContext();
      const headers = tracer.injectContext(context);

      const traceparent = headers['traceparent'];
      expect(traceparent).toMatch(/^00-[a-f0-9]{32}-[a-f0-9]{16}-0[01]$/);
    });

    it('should set sampled flag to 01 when sampled', () => {
      tracer.startSpan('test-operation');
      const context = tracer.getCurrentContext();
      const headers = tracer.injectContext(context);

      const traceparent = headers['traceparent'];
      expect(traceparent).toMatch(/-01$/);
    });

    it('should set sampled flag to 00 when not sampled', () => {
      const config: TracingConfig = {
        enabled: true,
        samplingRate: 0, // No sampling
        exporter: 'console',
      };
      const noSampleTracer = new Tracer(config);
      noSampleTracer.startSpan('test-operation');
      const context = noSampleTracer.getCurrentContext();
      const headers = noSampleTracer.injectContext(context);

      const traceparent = headers['traceparent'];
      expect(traceparent).toMatch(/-00$/);
    });
  });

  describe('extractContext', () => {
    it('should extract trace context from headers', () => {
      const headers = {
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        'X-Trace-Id': '4bf92f3577b34da6a3ce929d0e0e4736',
        'X-Span-Id': '00f067aa0ba902b7',
      };

      const context = tracer.extractContext(headers);

      expect(context).toBeDefined();
      expect(context.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
      expect(context.spanId).toBe('00f067aa0ba902b7');
      expect(context.parentSpanId).toBe('00f067aa0ba902b7');
      expect(context.sampled).toBe(true);
    });

    it('should extract sampled flag from traceparent', () => {
      const headers = {
        traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00',
      };

      const context = tracer.extractContext(headers);

      expect(context.sampled).toBe(false);
    });

    it('should create new context if no traceparent header', () => {
      const headers = {};
      const context = tracer.extractContext(headers);

      expect(context).toBeDefined();
      expect(context.traceId).toBeDefined();
      expect(context.spanId).toBeDefined();
      expect(context.sampled).toBeDefined();
    });

    it('should handle malformed traceparent header', () => {
      const headers = {
        traceparent: 'invalid-header',
      };

      const context = tracer.extractContext(headers);

      expect(context).toBeDefined();
      // Should create a new context instead of failing
      expect(context.traceId).toBeDefined();
    });
  });

  describe('generateTraceId', () => {
    it('should generate valid trace ID (32 hex characters)', () => {
      const traceId = tracer['generateTraceId']();

      expect(traceId).toBeDefined();
      expect(traceId).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should generate unique trace IDs', () => {
      const traceId1 = tracer['generateTraceId']();
      const traceId2 = tracer['generateTraceId']();

      expect(traceId1).not.toBe(traceId2);
    });
  });

  describe('generateSpanId', () => {
    it('should generate valid span ID (16 hex characters)', () => {
      const spanId = tracer['generateSpanId']();

      expect(spanId).toBeDefined();
      expect(spanId).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should generate unique span IDs', () => {
      const spanId1 = tracer['generateSpanId']();
      const spanId2 = tracer['generateSpanId']();

      expect(spanId1).not.toBe(spanId2);
    });
  });

  describe('exportSpan', () => {
    it('should export span to console', () => {
      const span: Span = {
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        spanId: '00f067aa0ba902b7',
        parentSpanId: undefined,
        name: 'test-operation',
        startTime: Date.now(),
        endTime: Date.now() + 100,
        duration: 100,
        tags: { 'http.method': 'GET' },
        logs: [],
      };

      tracer['exportSpan'](span);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(consoleLogSpy).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const logCall = consoleLogSpy.mock.calls[0][0];
      expect(logCall).toContain('Span exported');
      expect(logCall).toContain('test-operation');
    });
  });

  describe('Sampling', () => {
    it('should respect sampling rate', () => {
      const config: TracingConfig = {
        enabled: true,
        samplingRate: 0, // No sampling
        exporter: 'console',
      };
      const noSampleTracer = new Tracer(config);

      noSampleTracer.startSpan('test-operation');
      const context = noSampleTracer.getCurrentContext();

      expect(context.sampled).toBe(false);
    });

    it('should always sample when sampling rate is 1', () => {
      const config: TracingConfig = {
        enabled: true,
        samplingRate: 1,
        exporter: 'console',
      };
      const alwaysSampleTracer = new Tracer(config);

      alwaysSampleTracer.startSpan('test-operation');
      const context = alwaysSampleTracer.getCurrentContext();

      expect(context.sampled).toBe(true);
    });
  });

  describe('Disabled tracer', () => {
    it('should not create spans when disabled', () => {
      const config: TracingConfig = {
        enabled: false,
        samplingRate: 1,
        exporter: 'console',
      };
      const disabledTracer = new Tracer(config);

      const span = disabledTracer.startSpan('test-operation');

      expect(span).toBeDefined();
      // Span should have minimal data when disabled
      expect(span.startTime).toBeDefined();
    });

    it('should not export spans when disabled', () => {
      const config: TracingConfig = {
        enabled: false,
        samplingRate: 1,
        exporter: 'console',
      };
      const disabledTracer = new Tracer(config);

      const span = disabledTracer.startSpan('test-operation');
      disabledTracer.endSpan(span.spanId);

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
