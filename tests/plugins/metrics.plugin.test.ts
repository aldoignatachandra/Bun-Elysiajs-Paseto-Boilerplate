import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { metricsPlugin } from '@/plugins/metrics.plugin';

describe('Metrics Plugin', () => {
  describe('Metrics Collection', () => {
    it('should record metrics for HTTP requests', async () => {
      const app = new Elysia().use(metricsPlugin());

      // Make some requests
      await app.handle(new Request('http://localhost/api/test'));
      await app.handle(new Request('http://localhost/api/test'));

      // Get metrics
      const response = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await response.text();

      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('http_request_duration_seconds');
    });

    it('should track different HTTP methods', async () => {
      const app = new Elysia()
        .use(metricsPlugin())
        .get('/api/test', () => ({ status: 'ok' }))
        .post('/api/test', () => ({ status: 'created' }))
        .put('/api/test', () => ({ status: 'updated' }))
        .delete('/api/test', () => ({ status: 'deleted' }));

      await app.handle(new Request('http://localhost/api/test', { method: 'GET' }));
      await app.handle(new Request('http://localhost/api/test', { method: 'POST' }));
      await app.handle(new Request('http://localhost/api/test', { method: 'PUT' }));
      await app.handle(new Request('http://localhost/api/test', { method: 'DELETE' }));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await response.text();

      expect(metrics).toContain('method="GET"');
      expect(metrics).toContain('method="POST"');
      expect(metrics).toContain('method="PUT"');
      expect(metrics).toContain('method="DELETE"');
    });

    it('should track HTTP status codes', async () => {
      const app = new Elysia()
        .use(metricsPlugin())
        .get('/ok', () => ({ status: 'ok' }))
        .get('/notfound', ({ set }) => {
          set.status = 404;
          return { error: 'not found' };
        });

      await app.handle(new Request('http://localhost/ok'));
      await app.handle(new Request('http://localhost/notfound'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await response.text();

      expect(metrics).toContain('status="200"');
      expect(metrics).toContain('status="404"');
    });

    it('should track request duration accurately', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/slow', async () => {
        // Simulate a slow request
        await new Promise(resolve => setTimeout(resolve, 10));
        return { status: 'ok' };
      });

      await app.handle(new Request('http://localhost/slow'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await response.text();

      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('http_request_duration_seconds_sum');
      expect(metrics).toContain('http_request_duration_seconds_count');
    });
  });

  describe('/metrics endpoint', () => {
    it('should expose metrics at /metrics endpoint', async () => {
      const app = new Elysia().use(metricsPlugin());

      const response = await app.handle(new Request('http://localhost/metrics'));

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/plain');
    });

    it('should return metrics in Prometheus text format', async () => {
      const app = new Elysia().use(metricsPlugin());

      // Make a request to generate metrics
      await app.handle(new Request('http://localhost/api/test'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await response.text();

      // Verify Prometheus format
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      expect(metrics).toContain('http_requests_total');
    });

    it('should include all standard metrics', async () => {
      const app = new Elysia().use(metricsPlugin());

      await app.handle(new Request('http://localhost/api/test'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await response.text();

      // Check for standard metrics
      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('http_request_duration_seconds');
      expect(metrics).toContain('active_connections');
    });
  });

  describe('Metrics accuracy', () => {
    it('should correctly count requests', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/api/test', () => ({ status: 'ok' }));

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        await app.handle(new Request('http://localhost/api/test'));
      }

      const response = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await response.text();

      // Extract the count from metrics
      const countMatch = metrics.match(/http_requests_total\{[^}]*\} (\d+)/);
      expect(countMatch).toBeDefined();
      const count = parseInt(countMatch?.[1] || '0');
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should handle multiple paths separately', async () => {
      const app = new Elysia()
        .use(metricsPlugin())
        .get('/api/users', () => ({ users: [] }))
        .get('/api/posts', () => ({ posts: [] }));

      await app.handle(new Request('http://localhost/api/users'));
      await app.handle(new Request('http://localhost/api/posts'));
      await app.handle(new Request('http://localhost/api/users'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await response.text();

      expect(metrics).toContain('path="/api/users"');
      expect(metrics).toContain('path="/api/posts"');
    });
  });

  describe('Plugin integration', () => {
    it('should work with other Elysia plugins', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/api/test', () => ({ status: 'ok' }));

      const response = await app.handle(new Request('http://localhost/api/test'));
      expect(response.status).toBe(200);

      const metricsResponse = await app.handle(new Request('http://localhost/metrics'));
      expect(metricsResponse.status).toBe(200);
    });

    it('should track active connections', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/api/test', () => ({ status: 'ok' }));

      await app.handle(new Request('http://localhost/api/test'));

      const response = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await response.text();

      expect(metrics).toContain('active_connections');
    });
  });

  describe('Error handling', () => {
    it('should continue tracking metrics even when requests fail', async () => {
      const app = new Elysia().use(metricsPlugin()).get('/error', () => {
        throw new Error('Test error');
      });

      const response = await app.handle(new Request('http://localhost/error'));
      expect(response.status).toBe(500);

      const metricsResponse = await app.handle(new Request('http://localhost/metrics'));
      const metrics = await metricsResponse.text();

      expect(metrics).toContain('http_requests_total');
      expect(metrics).toContain('status="500"');
    });
  });
});
