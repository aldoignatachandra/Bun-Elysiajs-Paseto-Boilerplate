/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { requestContextPlugin, getRequestDuration, addMarker, getTimeSinceMarker, exceedsThreshold } from '@core/context/middleware';
import type { RequestContext } from '@core/context/types';

describe('Request Context Middleware', () => {
  describe('requestContextPlugin', () => {
    it('should enhance request context with metadata and timing', async () => {
      const app = new Elysia().use(requestContextPlugin()).get('/test', ({ requestContext, requestId }) => ({
        hasContext: !!requestContext,
        hasMetadata: !!requestContext?.metadata,
        hasPerformance: !!requestContext?.performance,
        requestId,
      }));

      const response = await app.handle(new Request('http://localhost/test'));
      const data = (await response.json()) as {
        hasContext: boolean;
        hasMetadata: boolean;
        hasPerformance: boolean;
        requestId: string;
      };

      expect(data.hasContext).toBe(true);
      expect(data.hasMetadata).toBe(true);
      expect(data.hasPerformance).toBe(true);
      expect(data.requestId).toBeDefined();
      expect(data.requestId.length).toBeGreaterThan(0);
    });

    it('should add request metadata to context', async () => {
      const app = new Elysia().use(requestContextPlugin()).get('/test', ({ requestContext, clientIp, userAgent }) => ({
        clientIp,
        userAgent,
        requestId: requestContext?.metadata.requestId,
        method: requestContext?.metadata.method,
        path: requestContext?.metadata.path,
      }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: {
            'User-Agent': 'TestAgent/1.0',
          },
        })
      );

      const data = (await response.json()) as {
        clientIp?: string;
        userAgent?: string;
        requestId?: string;
        method?: string;
        path?: string;
      };

      expect(data.userAgent).toBe('TestAgent/1.0');
      expect(data.requestId).toBeDefined();
      expect(data.method).toBe('GET');
      expect(data.path).toBe('/test');
    });

    it('should extract client IP from headers', async () => {
      const app = new Elysia().use(requestContextPlugin()).get('/test', ({ clientIp, requestContext }) => ({
        clientIp,
        originalIp: requestContext?.metadata.originalIp,
      }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: {
            'X-Forwarded-For': '203.0.113.1, 198.51.100.1',
          },
        })
      );

      const data = (await response.json()) as {
        clientIp?: string;
        originalIp?: string;
      };

      expect(data.clientIp).toBe('203.0.113.1');
      expect(data.originalIp).toBe('203.0.113.1');
    });

    it('should set X-Request-ID and X-Response-Time headers', async () => {
      const app = new Elysia().use(requestContextPlugin()).get('/test', () => ({ ok: true }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('X-Request-ID')).toBeDefined();
      expect(response.headers.get('X-Response-Time')).toBeDefined();
      expect(response.headers.get('X-Response-Time')?.match(/^\d+\.\d{2}ms$/)).toBeTruthy();
    });

    it('should preserve existing X-Request-ID header', async () => {
      const customRequestId = 'my-custom-request-id';
      const app = new Elysia().use(requestContextPlugin()).get('/test', ({ requestId }) => ({ requestId }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: {
            'X-Request-ID': customRequestId,
          },
        })
      );

      expect(response.headers.get('X-Request-ID')).toBe(customRequestId);

      const data = (await response.json()) as { requestId: string };
      expect(data.requestId).toBe(customRequestId);
    });

    it('should include request start time', async () => {
      const app = new Elysia().use(requestContextPlugin()).get('/test', ({ requestStart }) => ({
        requestStart,
        isNumber: typeof requestStart === 'number',
      }));

      const response = await app.handle(new Request('http://localhost/test'));
      const data = (await response.json()) as {
        requestStart: number;
        isNumber: boolean;
      };

      expect(data.isNumber).toBe(true);
      expect(data.requestStart).toBeGreaterThan(0);
    });

    it('should handle custom request ID header name', async () => {
      const app = new Elysia()
        .use(
          requestContextPlugin({
            requestIdHeader: 'X-Correlation-ID',
          })
        )
        .get('/test', ({ requestId }) => ({ requestId }));

      const customId = 'correlation-123';
      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: {
            'X-Correlation-ID': customId,
          },
        })
      );

      expect(response.headers.get('X-Correlation-ID')).toBe(customId);

      const data = (await response.json()) as { requestId: string };
      expect(data.requestId).toBe(customId);
    });

    it('should set X-Request-ID header on error responses', async () => {
      const app = new Elysia().use(requestContextPlugin()).get('/error', () => {
        throw new Error('Test error');
      });

      const response = await app.handle(new Request('http://localhost/error'));

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should extract query parameters', async () => {
      const app = new Elysia().use(requestContextPlugin()).get('/test', ({ requestContext }) => ({
        query: requestContext?.metadata.query,
      }));

      const response = await app.handle(new Request('http://localhost/test?foo=bar&baz=qux'));
      const data = (await response.json()) as {
        query: Record<string, string> | undefined;
      };

      expect(data.query).toEqual({ foo: 'bar', baz: 'qux' });
    });

    it('should detect authorization header presence', async () => {
      const app = new Elysia().use(requestContextPlugin()).get('/test', ({ requestContext }) => ({
        hasAuth: requestContext?.metadata.hasAuthorization,
      }));

      const responseWithAuth = await app.handle(
        new Request('http://localhost/test', {
          headers: {
            Authorization: 'Bearer token123',
          },
        })
      );

      const responseWithoutAuth = await app.handle(new Request('http://localhost/test'));

      const dataWithAuth = (await responseWithAuth.json()) as { hasAuth?: boolean };
      const dataWithoutAuth = (await responseWithoutAuth.json()) as { hasAuth?: boolean };

      expect(dataWithAuth.hasAuth).toBe(true);
      expect(dataWithoutAuth.hasAuth).toBe(false);
    });
  });

  describe('getRequestDuration', () => {
    it('should calculate duration from start time', () => {
      const start = performance.now();
      const duration = getRequestDuration(start);

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(typeof duration).toBe('number');
    });
  });

  describe('addMarker', () => {
    it('should add performance marker to context', () => {
      const context: RequestContext = {
        metadata: {
          requestId: 'test',
          clientIp: '127.0.0.1',
          userAgent: 'test',
          method: 'GET',
          path: '/',
          url: 'http://localhost',
          query: {},
          origin: 'http://localhost',
          hasAuthorization: false,
          timestamp: new Date().toISOString(),
        },
        performance: {
          startTime: performance.now(),
          markers: new Map(),
        },
      };

      expect(context.performance.markers.has('test_marker')).toBe(false);

      addMarker(context, 'test_marker');

      expect(context.performance.markers.has('test_marker')).toBe(true);
    });
  });

  describe('getTimeSinceMarker', () => {
    it('should get time since marker', () => {
      const startTime = performance.now();
      const context: RequestContext = {
        metadata: {
          requestId: 'test',
          clientIp: '127.0.0.1',
          userAgent: 'test',
          method: 'GET',
          path: '/',
          url: 'http://localhost',
          query: {},
          origin: 'http://localhost',
          hasAuthorization: false,
          timestamp: new Date().toISOString(),
        },
        performance: {
          startTime,
          markers: new Map(),
        },
      };

      addMarker(context, 'marker1');

      const timeSince = getTimeSinceMarker(context, 'marker1');

      expect(timeSince).toBeGreaterThanOrEqual(0);
    });

    it('should get time since start when no marker', () => {
      const startTime = performance.now();
      const context: RequestContext = {
        metadata: {
          requestId: 'test',
          clientIp: '127.0.0.1',
          userAgent: 'test',
          method: 'GET',
          path: '/',
          url: 'http://localhost',
          query: {},
          origin: 'http://localhost',
          hasAuthorization: false,
          timestamp: new Date().toISOString(),
        },
        performance: {
          startTime,
          markers: new Map(),
        },
      };

      const timeSince = getTimeSinceMarker(context);

      expect(timeSince).toBeGreaterThanOrEqual(0);
    });
  });

  describe('exceedsThreshold', () => {
    it('should check if duration exceeds threshold', () => {
      const context: RequestContext = {
        metadata: {
          requestId: 'test',
          clientIp: '127.0.0.1',
          userAgent: 'test',
          method: 'GET',
          path: '/',
          url: 'http://localhost',
          query: {},
          origin: 'http://localhost',
          hasAuthorization: false,
          timestamp: new Date().toISOString(),
        },
        performance: {
          startTime: performance.now() - 2000, // 2 seconds ago
          markers: new Map(),
        },
      };

      expect(exceedsThreshold(context, 1000)).toBe(true);
      expect(exceedsThreshold(context, 3000)).toBe(false);
    });
  });
});
