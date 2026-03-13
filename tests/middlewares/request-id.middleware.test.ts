import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { requestId } from '@/middlewares/request-id.middleware';

type RequestIdResponse = {
  requestId: string;
  customData?: string;
};

describe('Request ID Middleware', () => {
  describe('Request ID Generation', () => {
    it('should generate a unique request ID when not present in headers', async () => {
      const app = new Elysia().use(requestId()).get('/test', ({ requestId }) => ({ requestId }));

      const response = await app.handle(new Request('http://localhost/test'));
      const data = (await response.json()) as { requestId: string };

      expect(response.status).toBe(200);
      expect(data.requestId).toBeDefined();
      expect(typeof data.requestId).toBe('string');
      expect(data.requestId.length).toBeGreaterThan(0);
    });

    it('should preserve existing X-Request-ID header', async () => {
      const existingRequestId = 'existing-request-id-123';

      const app = new Elysia().use(requestId()).get('/test', ({ requestId }) => ({ requestId }));

      const request = new Request('http://localhost/test', {
        headers: {
          'X-Request-ID': existingRequestId,
        },
      });

      const response = await app.handle(request);
      const data = (await response.json()) as RequestIdResponse;

      expect(response.status).toBe(200);
      expect(data.requestId).toBe(existingRequestId);
    });

    it('should add X-Request-ID header to all responses', async () => {
      const app = new Elysia().use(requestId()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const requestIdHeader = response.headers.get('X-Request-ID');

      expect(requestIdHeader).toBeDefined();
      expect(typeof requestIdHeader).toBe('string');
      expect(requestIdHeader?.length).toBeGreaterThan(0);
    });

    it('should return the same request ID in response header as in context', async () => {
      const app = new Elysia().use(requestId()).get('/test', ({ requestId }) => ({ requestId }));

      const response = await app.handle(new Request('http://localhost/test'));
      const data = (await response.json()) as RequestIdResponse;
      const requestIdHeader = response.headers.get('X-Request-ID');

      expect(requestIdHeader).toBeDefined();
      expect(data.requestId).toBe(requestIdHeader as string);
    });

    it('should handle custom header name option', async () => {
      const app = new Elysia().use(requestId({ headerName: 'X-Correlation-ID' })).get('/test', ({ requestId }) => ({ requestId }));

      const response = await app.handle(new Request('http://localhost/test'));

      const correlationIdHeader = response.headers.get('X-Correlation-ID');

      expect(correlationIdHeader).toBeDefined();
      expect(correlationIdHeader).toBeDefined();
      expect(correlationIdHeader?.length).toBeGreaterThan(0);
    });

    it('should generate different IDs for different requests', async () => {
      const app = new Elysia().use(requestId()).get('/test', ({ requestId }) => ({ requestId }));

      const response1 = await app.handle(new Request('http://localhost/test'));
      const response2 = await app.handle(new Request('http://localhost/test'));

      const data1 = (await response1.json()) as RequestIdResponse;
      const data2 = (await response2.json()) as RequestIdResponse;

      expect(data1.requestId).not.toBe(data2.requestId);
    });

    it('should work with POST requests', async () => {
      const app = new Elysia().use(requestId()).post('/test', ({ requestId }) => ({ requestId }));

      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });

      const response = await app.handle(request);
      const data = (await response.json()) as RequestIdResponse;

      expect(response.status).toBe(200);
      expect(data.requestId).toBeDefined();
    });

    it('should work with all HTTP methods', async () => {
      const app = new Elysia()
        .use(requestId())
        .get('/test', () => ({ method: 'GET' }))
        .post('/test', () => ({ method: 'POST' }))
        .put('/test', () => ({ method: 'PUT' }))
        .delete('/test', () => ({ method: 'DELETE' }))
        .patch('/test', () => ({ method: 'PATCH' }));

      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

      for (const method of methods) {
        const request = new Request('http://localhost/test', { method });
        const response = await app.handle(request);

        const requestIdHeader = response.headers.get('X-Request-ID');

        expect(requestIdHeader).toBeDefined();
        expect(requestIdHeader?.length).toBeGreaterThan(0);
      }
    });

    it('should handle requests with query parameters', async () => {
      const app = new Elysia().use(requestId()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test?foo=bar&baz=qux'));

      const requestIdHeader = response.headers.get('X-Request-ID');

      expect(requestIdHeader).toBeDefined();
      expect(requestIdHeader?.length).toBeGreaterThan(0);
    });

    it('should generate UUID v4 format IDs', async () => {
      const app = new Elysia().use(requestId()).get('/test', ({ requestId }) => ({ requestId }));

      const response = await app.handle(new Request('http://localhost/test'));
      const data = (await response.json()) as RequestIdResponse;

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(data.requestId).toMatch(uuidRegex);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string X-Request-ID header', async () => {
      const app = new Elysia().use(requestId()).get('/test', ({ requestId }) => ({ requestId }));

      const request = new Request('http://localhost/test', {
        headers: {
          'X-Request-ID': '',
        },
      });

      const response = await app.handle(request);
      const data = (await response.json()) as RequestIdResponse;

      // Empty string should be treated as missing and generate new ID
      expect(data.requestId).toBeDefined();
      expect(data.requestId).not.toBe('');
    });

    it('should handle whitespace-only X-Request-ID header', async () => {
      const app = new Elysia().use(requestId()).get('/test', ({ requestId }) => ({ requestId }));

      const request = new Request('http://localhost/test', {
        headers: {
          'X-Request-ID': '   ',
        },
      });

      const response = await app.handle(request);
      const data = (await response.json()) as { requestId: string };

      // Whitespace-only should be treated as missing and generate new ID
      expect(data.requestId).toBeDefined();
      expect(data.requestId.trim()).not.toBe('');
    });

    it('should preserve request ID case sensitivity', async () => {
      const mixedCaseId = 'ReQuEsT-I d-123';

      const app = new Elysia().use(requestId()).get('/test', ({ requestId }) => ({ requestId }));

      const request = new Request('http://localhost/test', {
        headers: {
          'X-Request-ID': mixedCaseId,
        },
      });

      const response = await app.handle(request);
      const data = (await response.json()) as RequestIdResponse;

      expect(data.requestId).toBe(mixedCaseId);
    });
  });

  describe('Integration', () => {
    it('should work with other middlewares', async () => {
      const app = new Elysia()
        .use(requestId())
        .derive(() => ({
          customData: 'test',
        }))
        .get('/test', ({ requestId, customData }) => ({ requestId, customData }));

      const response = await app.handle(new Request('http://localhost/test'));
      const data = (await response.json()) as RequestIdResponse;

      expect(response.status).toBe(200);
      expect(data.requestId).toBeDefined();
      expect(data.customData).toBe('test');
    });

    it('should maintain request ID through error responses', async () => {
      const app = new Elysia().use(requestId()).get('/error', () => {
        throw new Error('Test error');
      });

      const response = await app.handle(new Request('http://localhost/error'));

      const requestIdHeader = response.headers.get('X-Request-ID');

      expect(requestIdHeader).toBeDefined();
      expect(requestIdHeader?.length).toBeGreaterThan(0);
    });
  });
});
