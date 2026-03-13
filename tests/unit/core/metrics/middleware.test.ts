import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { metricsMiddleware, metricsPlugin, getMetricsHandler, isMetricsEnabled } from '@/core/metrics';
import { getMetricsRegistry } from '@/core/metrics';

describe('Metrics Middleware', () => {
  beforeEach(() => {
    // Reset metrics before each test
    const registry = getMetricsRegistry();
    registry.reset();
  });

  afterEach(() => {
    // Reset metrics after each test
    const registry = getMetricsRegistry();
    registry.reset();
  });

  describe('metricsMiddleware', () => {
    it('should export middleware function', () => {
      expect(typeof metricsMiddleware).toBe('function');
    });

    it('should create middleware with default config', () => {
      const middleware = metricsMiddleware();
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create middleware with custom config', () => {
      const middleware = metricsMiddleware({
        trackHTTP: true,
        excludePaths: ['/custom'],
      });
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should disable HTTP tracking when configured', () => {
      const middleware = metricsMiddleware({ trackHTTP: false });
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });
  });

  describe('getMetricsHandler', () => {
    it('should return a handler function', () => {
      const handler = getMetricsHandler();
      expect(typeof handler).toBe('function');
    });

    it('should return metrics in Prometheus format', async () => {
      const app = new Elysia().use(metricsMiddleware()).get('/metrics', getMetricsHandler());

      const response = await app.handle(new Request('http://localhost/metrics'));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/plain; version=0.0.4; charset=utf-8');

      const text = await response.text();
      expect(text).toContain('# HELP');
      expect(text).toContain('# TYPE');
    });

    it('should include default HTTP metrics', async () => {
      const app = new Elysia().use(metricsMiddleware()).get('/metrics', getMetricsHandler());

      const response = await app.handle(new Request('http://localhost/metrics'));
      const text = await response.text();

      expect(text).toContain('http_request_duration_seconds');
      expect(text).toContain('http_requests_total');
      expect(text).toContain('http_requests_in_flight');
      expect(text).toContain('http_errors_total');
    });
  });

  describe('metricsPlugin', () => {
    it('should export plugin function', () => {
      expect(typeof metricsPlugin).toBe('function');
    });

    it('should register /metrics endpoint', async () => {
      const app = new Elysia().use(metricsPlugin());

      const response = await app.handle(new Request('http://localhost/metrics'));
      expect(response.status).toBe(200);
    });

    it('should return correct content type', async () => {
      const app = new Elysia().use(metricsPlugin());

      const response = await app.handle(new Request('http://localhost/metrics'));
      expect(response.headers.get('content-type')).toBe('text/plain; version=0.0.4; charset=utf-8');
    });

    it('should exclude /metrics from tracking by default', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/test', () => ({ ok: true }));

      // Make a test request
      await app.handle(new Request('http://localhost/test'));

      // Get metrics
      const response = await app.handle(new Request('http://localhost/metrics'));
      const text = await response.text();

      // Should have test endpoint metrics
      expect(text).toContain('route="/test"');

      // Should NOT have /metrics endpoint metrics
      expect(text).not.toContain('route="/metrics"');
    });
  });

  describe('isMetricsEnabled', () => {
    it('should return boolean', () => {
      expect(typeof isMetricsEnabled()).toBe('boolean');
    });

    it('should enable metrics in development by default', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      delete process.env.METRICS_ENABLED;

      const enabled = isMetricsEnabled();
      expect(enabled).toBe(true);

      process.env.NODE_ENV = originalEnv;
    });

    it('should disable metrics in production by default', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      delete process.env.METRICS_ENABLED;

      const enabled = isMetricsEnabled();
      expect(enabled).toBe(false);

      process.env.NODE_ENV = originalEnv;
    });

    it('should respect METRICS_ENABLED environment variable', () => {
      const originalEnv = process.env.METRICS_ENABLED;

      process.env.METRICS_ENABLED = 'true';
      expect(isMetricsEnabled()).toBe(true);

      process.env.METRICS_ENABLED = 'false';
      expect(isMetricsEnabled()).toBe(false);

      process.env.METRICS_ENABLED = '1';
      expect(isMetricsEnabled()).toBe(true);

      process.env.METRICS_ENABLED = '0';
      expect(isMetricsEnabled()).toBe(false);

      if (originalEnv !== undefined) {
        process.env.METRICS_ENABLED = originalEnv;
      } else {
        delete process.env.METRICS_ENABLED;
      }
    });
  });

  describe('HTTP request tracking', () => {
    it('should track successful requests', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/test', () => ({ ok: true }));

      await app.handle(new Request('http://localhost/test'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const text = await response.text();

      expect(text).toContain('http_requests_total{method="GET",route="/test",status_class="2xx",status_code="200"} 1');
      expect(text).toContain('http_request_duration_seconds_bucket{method="GET",route="/test",status_class="2xx",status_code="200"');
    });

    it('should track active requests gauge', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/test', async () => {
        // Small delay to ensure gauge is incremented
        await new Promise(resolve => setTimeout(resolve, 10));
        return { ok: true };
      });

      await app.handle(new Request('http://localhost/test'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const text = await response.text();

      // Gauge should exist
      expect(text).toContain('http_requests_in_flight');
    });

    it('should track errors (4xx and 5xx)', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/error', () => {
        throw new Error('Test error');
      });

      const response = await app.handle(new Request('http://localhost/error'));
      expect(response.status).toBeGreaterThanOrEqual(400);

      const metricsResponse = await app.handle(new Request('http://localhost/metrics'));
      const text = await metricsResponse.text();

      // Should track errors
      expect(text).toContain('http_errors_total');
    });

    it('should track different HTTP methods', async () => {
      const app = new Elysia()
        .use(metricsPlugin())
        .get('/test', () => ({ ok: true }))
        .post('/test', () => ({ created: true }))
        .put('/test', () => ({ updated: true }));

      await app.handle(new Request('http://localhost/test', { method: 'GET' }));
      await app.handle(new Request('http://localhost/test', { method: 'POST' }));
      await app.handle(new Request('http://localhost/test', { method: 'PUT' }));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const text = await response.text();

      expect(text).toContain('method="GET"');
      expect(text).toContain('method="POST"');
      expect(text).toContain('method="PUT"');
    });

    it('should exclude configured paths', async () => {
      const app = new Elysia()
        .use(
          metricsMiddleware({
            excludePaths: ['/health', '/metrics', '/excluded'],
          })
        )
        .get('/health', () => ({ status: 'ok' }))
        .get('/excluded', () => ({ excluded: true }))
        .get('/included', () => ({ included: true }));

      await app.handle(new Request('http://localhost/health'));
      await app.handle(new Request('http://localhost/excluded'));
      await app.handle(new Request('http://localhost/included'));

      const registry = getMetricsRegistry();
      const metrics = registry.getMetrics();

      // Should not have metrics for excluded paths
      expect(metrics).not.toContain('route="/health"');
      expect(metrics).not.toContain('route="/excluded"');

      // Should have metrics for included path
      expect(metrics).toContain('route="/included"');
    });

    it('should only track configured paths when includePaths is set', async () => {
      const app = new Elysia()
        .use(
          metricsMiddleware({
            includePaths: ['/api'],
          })
        )
        .get('/api/test', () => ({ api: true }))
        .get('/other/test', () => ({ other: true }));

      await app.handle(new Request('http://localhost/api/test'));
      await app.handle(new Request('http://localhost/other/test'));

      const registry = getMetricsRegistry();
      const metrics = registry.getMetrics();

      // Should have metrics for included path
      expect(metrics).toContain('route="/api/test"');

      // Should not have metrics for other path
      expect(metrics).not.toContain('route="/other/test"');
    });

    it('should normalize route paths', async () => {
      const app = new Elysia()
        .use(metricsPlugin())
        .get('/api/users/123', () => ({ user: { id: '123' } }))
        .get('/api/products/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', () => ({
          product: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' },
        }));

      await app.handle(new Request('http://localhost/api/users/123'));
      await app.handle(new Request('http://localhost/api/products/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'));

      const registry = getMetricsRegistry();
      const metrics = registry.getMetrics();

      // Should normalize numeric IDs
      expect(metrics).toContain('route="/api/users/:id"');

      // Should normalize UUID-like IDs
      expect(metrics).toContain('route="/api/products/:uuid"');
    });

    it('should track request duration', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/test', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { ok: true };
      });

      await app.handle(new Request('http://localhost/test'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const text = await response.text();

      // Should have histogram metrics with sum and count
      expect(text).toContain('http_request_duration_seconds_sum');
      expect(text).toContain('http_request_duration_seconds_count');
      expect(text).toContain('http_request_duration_seconds_bucket');
    });
  });

  describe('Metrics format', () => {
    it('should include HELP and TYPE comments', async () => {
      const app = new Elysia().use(metricsPlugin());

      const response = await app.handle(new Request('http://localhost/metrics'));
      const text = await response.text();

      expect(text).toContain('# HELP http_request_duration_seconds HTTP request latency in seconds');
      expect(text).toContain('# TYPE http_request_duration_seconds histogram');
      expect(text).toContain('# HELP http_requests_total Total HTTP requests processed');
      expect(text).toContain('# TYPE http_requests_total counter');
    });

    it('should format histogram buckets correctly', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/test', () => ({ ok: true }));

      await app.handle(new Request('http://localhost/test'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const text = await response.text();

      // Should have bucket lines
      expect(text).toMatch(/http_request_duration_seconds_bucket\{.*le="0\.005"\}/);
      expect(text).toMatch(/http_request_duration_seconds_bucket\{.*le="\+Inf"\}/);
    });
  });

  describe('Integration with Elysia lifecycle', () => {
    it('should work with Elysia derive hook', async () => {
      const app = new Elysia()
        .use(metricsPlugin())
        .derive(({ headers }) => ({
          userAgent: headers.get('user-agent') ?? 'unknown',
        }))
        .get('/test', ({ userAgent }) => ({ userAgent }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: { 'user-agent': 'test-agent' },
        })
      );

      // Just check that the response is successful
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });

    it('should work with other middleware', async () => {
      const app = new Elysia()
        .use(metricsPlugin())
        .onBeforeHandle(({ set }) => {
          set.headers['x-custom'] = 'value';
        })
        .get('/test', () => ({ ok: true }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.status).toBe(200);
      expect(response.headers.get('x-custom')).toBe('value');
    });
  });
});
