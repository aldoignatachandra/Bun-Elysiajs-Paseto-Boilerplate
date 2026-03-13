/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect } from 'bun:test';
import {
  extractRequestMetadata,
  createInitialMetrics,
  calculateDuration,
  addPerformanceMarker,
  getTimeSince,
  finalizeMetrics,
  createContext,
} from '@core/context/request-context';
import type { PerformanceMetrics } from '@core/context/types';

describe('RequestContext', () => {
  describe('extractRequestMetadata', () => {
    it('should extract basic request information', () => {
      const request = new Request('https://example.com/api/test?foo=bar', {
        method: 'POST',
        headers: {
          'user-agent': 'Test-Agent/1.0',
          'content-type': 'application/json',
        },
      });

      const metadata = extractRequestMetadata(request);

      expect(metadata.method).toBe('POST');
      expect(metadata.path).toBe('/api/test');
      expect(metadata.query).toEqual({ foo: 'bar' });
      expect(metadata.userAgent).toBe('Test-Agent/1.0');
      expect(metadata.contentType).toBe('application/json');
    });

    it('should use existing X-Request-ID header', () => {
      const requestId = 'existing-request-id-123';
      const request = new Request('https://example.com/test', {
        headers: {
          'X-Request-ID': requestId,
        },
      });

      const metadata = extractRequestMetadata(request);

      expect(metadata.requestId).toBe(requestId);
    });

    it('should generate UUID for missing request ID', () => {
      const request = new Request('https://example.com/test');
      const metadata = extractRequestMetadata(request);

      expect(metadata.requestId).toBeDefined();
      expect(typeof metadata.requestId).toBe('string');
      expect(metadata.requestId.length).toBeGreaterThan(0);
      // UUID v4 format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(metadata.requestId)).toBe(true);
    });

    it('should extract client IP from X-Forwarded-For', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'X-Forwarded-For': '203.0.113.1, 198.51.100.1',
        },
      });

      const metadata = extractRequestMetadata(request);

      expect(metadata.clientIp).toBe('203.0.113.1');
      expect(metadata.originalIp).toBe('203.0.113.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'X-Real-IP': '192.168.1.100',
        },
      });

      const metadata = extractRequestMetadata(request);

      expect(metadata.clientIp).toBe('192.168.1.100');
      expect(metadata.originalIp).toBe('192.168.1.100');
    });

    it('should handle missing IP headers', () => {
      const request = new Request('https://example.com/test');

      const metadata = extractRequestMetadata(request);

      expect(metadata.clientIp).toBe('unknown');
    });

    it('should detect authorization header presence', () => {
      const requestWithAuth = new Request('https://example.com/test', {
        headers: {
          Authorization: 'Bearer token123',
        },
      });

      const requestWithoutAuth = new Request('https://example.com/test');

      const metadataWithAuth = extractRequestMetadata(requestWithAuth);
      const metadataWithoutAuth = extractRequestMetadata(requestWithoutAuth);

      expect(metadataWithAuth.hasAuthorization).toBe(true);
      expect(metadataWithoutAuth.hasAuthorization).toBe(false);
    });

    it('should extract origin correctly', () => {
      const request = new Request('https://api.example.com/v1/test');

      const metadata = extractRequestMetadata(request);

      expect(metadata.origin).toBe('https://api.example.com');
    });

    it('should extract accept headers when present', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en-US',
        },
      });

      const metadata = extractRequestMetadata(request);

      expect(metadata.accept).toBe('application/json');
      expect(metadata.acceptLanguage).toBe('en-US');
    });

    it('should handle custom request ID header name', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'X-Correlation-ID': 'custom-id-456',
        },
      });

      const metadata = extractRequestMetadata(request, {
        requestIdHeader: 'X-Correlation-ID',
      });

      expect(metadata.requestId).toBe('custom-id-456');
    });

    it('should respect trustProxy option', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'X-Forwarded-For': '203.0.113.1',
        },
      });

      const metadataTrusted = extractRequestMetadata(request, { trustProxy: true });
      const metadataUntrusted = extractRequestMetadata(request, { trustProxy: false });

      expect(metadataTrusted.clientIp).toBe('203.0.113.1');
      expect(metadataUntrusted.clientIp).toBe('unknown');
    });
  });

  describe('createInitialMetrics', () => {
    it('should create initial metrics with start time', () => {
      const before = performance.now();
      const metrics = createInitialMetrics();
      const after = performance.now();

      expect(metrics.startTime).toBeGreaterThanOrEqual(before);
      expect(metrics.startTime).toBeLessThanOrEqual(after);
      expect(metrics.endTime).toBeUndefined();
      expect(metrics.duration).toBeUndefined();
      expect(metrics.markers).toBeInstanceOf(Map);
      expect(metrics.markers.size).toBe(0);
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration with end time', () => {
      const metrics: PerformanceMetrics = {
        startTime: 1000,
        endTime: 1500,
        markers: new Map(),
      };

      const duration = calculateDuration(metrics);

      expect(duration).toBe(500);
    });

    it('should calculate current duration without end time', () => {
      const startTime = performance.now();
      const metrics: PerformanceMetrics = {
        startTime,
        markers: new Map(),
      };

      const duration = calculateDuration(metrics);

      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('addPerformanceMarker', () => {
    it('should add marker to metrics', () => {
      const metrics: PerformanceMetrics = {
        startTime: performance.now(),
        markers: new Map(),
      };

      expect(metrics.markers.has('test_marker')).toBe(false);

      addPerformanceMarker(metrics, 'test_marker');

      expect(metrics.markers.has('test_marker')).toBe(true);
      expect(typeof metrics.markers.get('test_marker')).toBe('number');
    });
  });

  describe('getTimeSince', () => {
    it('should get time since start when no marker', () => {
      const startTime = performance.now();
      const metrics: PerformanceMetrics = {
        startTime,
        markers: new Map(),
      };

      const timeSince = getTimeSince(metrics);

      expect(timeSince).toBeGreaterThanOrEqual(0);
    });

    it('should get time since marker', () => {
      const startTime = performance.now();
      const metrics: PerformanceMetrics = {
        startTime,
        markers: new Map(),
      };

      addPerformanceMarker(metrics, 'marker1');

      const timeSince = getTimeSince(metrics, 'marker1');

      expect(timeSince).toBeGreaterThanOrEqual(0);
    });

    it('should return time since start for non-existent marker', () => {
      const startTime = performance.now();
      const metrics: PerformanceMetrics = {
        startTime,
        markers: new Map(),
      };

      const timeSince = getTimeSince(metrics, 'non_existent');

      expect(timeSince).toBeGreaterThanOrEqual(0);
    });
  });

  describe('finalizeMetrics', () => {
    it('should finalize metrics with end time and duration', () => {
      const startTime = performance.now();
      const metrics: PerformanceMetrics = {
        startTime,
        markers: new Map(),
      };

      expect(metrics.endTime).toBeUndefined();
      expect(metrics.duration).toBeUndefined();

      const finalized = finalizeMetrics(metrics);

      expect(finalized.endTime).toBeDefined();
      expect(finalized.duration).toBeDefined();
      expect(finalized.duration).toBeGreaterThanOrEqual(0);
    });

    it('should not modify already finalized metrics', () => {
      const originalMetrics: PerformanceMetrics = {
        startTime: 1000,
        endTime: 1500,
        duration: 500,
        markers: new Map(),
      };

      const finalized = finalizeMetrics(originalMetrics);

      expect(finalized).toBe(originalMetrics);
      expect(finalized.endTime).toBe(1500);
      expect(finalized.duration).toBe(500);
    });
  });

  describe('createContext', () => {
    it('should create complete request context', () => {
      const request = new Request('https://example.com/api/test', {
        method: 'GET',
        headers: {
          'X-Request-ID': 'test-123',
          'User-Agent': 'TestAgent/1.0',
        },
      });

      const context = createContext(request);

      expect(context.metadata).toBeDefined();
      expect(context.metadata.requestId).toBe('test-123');
      expect(context.metadata.method).toBe('GET');
      expect(context.metadata.path).toBe('/api/test');
      expect(context.performance).toBeDefined();
      expect(context.performance.startTime).toBeDefined();
      expect(context.user).toBeUndefined();
    });

    it('should create context with custom options', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'X-Correlation-ID': 'custom-456',
        },
      });

      const context = createContext(request, {
        requestIdHeader: 'X-Correlation-ID',
        trustProxy: false,
      });

      expect(context.metadata.requestId).toBe('custom-456');
    });
  });
});
