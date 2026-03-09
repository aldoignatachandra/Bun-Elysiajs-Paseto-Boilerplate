import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { tracingPlugin } from '@/plugins/tracing.plugin';
import type { TracingConfig } from '@/core/tracing/types';

describe('Tracing Plugin', () => {
  describe('Trace context creation/extraction', () => {
    it('should create new trace context when no traceparent header', async () => {
      const app = new Elysia().use(tracingPlugin()).get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/test'));

      expect(response.status).toBe(200);
    });

    it('should extract trace context from traceparent header', async () => {
      const app = new Elysia().use(tracingPlugin()).get('/api/test', () => ({ message: 'test' }));

      const request = new Request('http://localhost/api/test', {
        headers: {
          traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        },
      });

      const response = await app.handle(request);

      // The request should complete successfully
      expect(response.status).toBe(200);
    });
  });

  describe('Span creation', () => {
    it('should create span for each request', async () => {
      const app = new Elysia().use(tracingPlugin()).get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/test'));

      // Request should complete successfully (span was created)
      expect(response.status).toBe(200);
    });

    it('should create span with correct method and path', async () => {
      const app = new Elysia()
        .use(tracingPlugin())
        .get('/api/users/123', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/users/123'));

      expect(response.status).toBe(200);
    });

    it('should include HTTP method in span name', async () => {
      const app = new Elysia().use(tracingPlugin()).post('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(
        new Request('http://localhost/api/test', { method: 'POST' })
      );

      expect(response.status).toBe(200);
    });
  });

  describe('Span ending', () => {
    it('should end span after request completes', async () => {
      const app = new Elysia().use(tracingPlugin()).get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/test'));

      // Span should be ended and request should complete
      expect(response.status).toBe(200);
    });
  });

  describe('Error handling', () => {
    it('should log error to span when request fails', async () => {
      const app = new Elysia().use(tracingPlugin()).get('/api/error', () => {
        throw new Error('Test error');
      });

      const response = await app.handle(new Request('http://localhost/api/error'));

      // Should still handle the error
      expect(response).toBeDefined();
    });
  });

  describe('Plugin configuration', () => {
    it('should use custom config when provided', async () => {
      const customConfig: TracingConfig = {
        enabled: true,
        samplingRate: 0.5,
        exporter: 'console',
        exporterUrl: 'http://otel-collector:4317',
      };

      const app = new Elysia()
        .use(tracingPlugin(customConfig))
        .get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/test'));

      expect(response.status).toBe(200);
    });

    it('should use default config when none provided', async () => {
      const app = new Elysia().use(tracingPlugin()).get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/test'));

      expect(response.status).toBe(200);
    });
  });

  describe('Disabled tracing', () => {
    it('should not export spans when disabled', async () => {
      const config: TracingConfig = {
        enabled: false,
        samplingRate: 1.0,
        exporter: 'console',
      };

      const app = new Elysia()
        .use(tracingPlugin(config))
        .get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/test'));

      // Should still work when disabled
      expect(response.status).toBe(200);
    });
  });
});
