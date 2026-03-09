import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { requestSize } from '@/middlewares/request-size.middleware';

describe('Request Size Middleware', () => {
  describe('Size Limits', () => {
    it('should allow small requests within size limit', async () => {
      const app = new Elysia()
        .use(requestSize({ maxSize: 1024 * 1024 })) // 1MB
        .post('/test', () => ({ message: 'success' }));

      const smallPayload = JSON.stringify({ test: 'data' });
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': smallPayload.length.toString(),
        },
        body: smallPayload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(200);
    });

    it('should reject requests exceeding size limit with 413 status', async () => {
      const maxSize = 1024; // 1KB
      const app = new Elysia()
        .use(requestSize({ maxSize }))
        .post('/test', () => ({ message: 'success' }));

      const largePayload = 'x'.repeat(maxSize + 1);
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': largePayload.length.toString(),
        },
        body: largePayload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(413);
    });

    it('should include error message in response for oversized requests', async () => {
      const maxSize = 1024;
      const app = new Elysia()
        .use(requestSize({ maxSize }))
        .post('/test', () => ({ message: 'success' }));

      const largePayload = 'x'.repeat(maxSize + 1);
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': largePayload.length.toString(),
        },
        body: largePayload,
      });

      const response = await app.handle(request);
      const text = await response.text();

      expect(text).toBeDefined();
      expect(text.toLowerCase()).toContain('exceeds');
    });

    it('should use default max size of 1MB when not specified', async () => {
      const app = new Elysia().use(requestSize()).post('/test', () => ({ message: 'success' }));

      const smallPayload = JSON.stringify({ test: 'data' });
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': smallPayload.length.toString(),
        },
        body: smallPayload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(200);
    });
  });

  describe('HTTP Method Exemptions', () => {
    it('should skip size check for GET requests', async () => {
      const app = new Elysia()
        .use(requestSize({ maxSize: 1 })) // Very small limit
        .get('/test', () => ({ message: 'success' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.status).toBe(200);
    });

    it('should skip size check for HEAD requests', async () => {
      const app = new Elysia()
        .use(requestSize({ maxSize: 1 }))
        .head('/test', () => new Response(null, { status: 200 }));

      const response = await app.handle(new Request('http://localhost/test', { method: 'HEAD' }));

      expect(response.status).toBe(200);
    });

    it('should skip size check for OPTIONS requests', async () => {
      const app = new Elysia()
        .use(requestSize({ maxSize: 1 }))
        .options('/test', () => new Response(null, { status: 200 }));

      const response = await app.handle(
        new Request('http://localhost/test', { method: 'OPTIONS' })
      );

      expect(response.status).toBe(200);
    });

    it('should enforce size check for POST requests', async () => {
      const maxSize = 100;
      const app = new Elysia()
        .use(requestSize({ maxSize }))
        .post('/test', () => ({ message: 'success' }));

      const largePayload = 'x'.repeat(maxSize + 1);
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': largePayload.length.toString(),
        },
        body: largePayload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(413);
    });

    it('should enforce size check for PUT requests', async () => {
      const maxSize = 100;
      const app = new Elysia()
        .use(requestSize({ maxSize }))
        .put('/test', () => ({ message: 'success' }));

      const largePayload = 'x'.repeat(maxSize + 1);
      const request = new Request('http://localhost/test', {
        method: 'PUT',
        headers: {
          'Content-Length': largePayload.length.toString(),
        },
        body: largePayload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(413);
    });

    it('should enforce size check for PATCH requests', async () => {
      const maxSize = 100;
      const app = new Elysia()
        .use(requestSize({ maxSize }))
        .patch('/test', () => ({ message: 'success' }));

      const largePayload = 'x'.repeat(maxSize + 1);
      const request = new Request('http://localhost/test', {
        method: 'PATCH',
        headers: {
          'Content-Length': largePayload.length.toString(),
        },
        body: largePayload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(413);
    });

    it('should enforce size check for DELETE requests with body', async () => {
      const maxSize = 100;
      const app = new Elysia()
        .use(requestSize({ maxSize }))
        .delete('/test', () => ({ message: 'success' }));

      const largePayload = 'x'.repeat(maxSize + 1);
      const request = new Request('http://localhost/test', {
        method: 'DELETE',
        headers: {
          'Content-Length': largePayload.length.toString(),
        },
        body: largePayload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(413);
    });
  });

  describe('Edge Cases', () => {
    it('should handle requests without Content-Length header', async () => {
      const app = new Elysia()
        .use(requestSize({ maxSize: 100 }))
        .post('/test', () => ({ message: 'success' }));

      // Create a request without Content-Length header
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });
      // Remove Content-Length header
      request.headers.delete('Content-Length');

      const response = await app.handle(request);

      // Should allow the request if Content-Length is not present
      expect(response.status).toBe(200);
    });

    it('should handle invalid Content-Length header', async () => {
      const app = new Elysia()
        .use(requestSize({ maxSize: 100 }))
        .post('/test', () => ({ message: 'success' }));

      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': 'invalid',
        },
        body: 'test',
      });

      const response = await app.handle(request);

      // Should handle gracefully - either allow or reject with proper error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle zero Content-Length', async () => {
      const app = new Elysia()
        .use(requestSize({ maxSize: 100 }))
        .post('/test', () => ({ message: 'success' }));

      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': '0',
        },
        body: '',
      });

      const response = await app.handle(request);

      expect(response.status).toBe(200);
    });

    it('should handle negative Content-Length as invalid', async () => {
      const app = new Elysia()
        .use(requestSize({ maxSize: 100 }))
        .post('/test', () => ({ message: 'success' }));

      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': '-1',
        },
        body: '',
      });

      const response = await app.handle(request);

      // Should reject invalid Content-Length
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should allow request exactly at the size limit', async () => {
      const maxSize = 100;
      const app = new Elysia()
        .use(requestSize({ maxSize }))
        .post('/test', () => ({ message: 'success' }));

      const exactPayload = 'x'.repeat(maxSize);
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': exactPayload.length.toString(),
        },
        body: exactPayload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Custom Configuration', () => {
    it('should support custom size limit in bytes', async () => {
      const customSize = 512; // 512 bytes
      const app = new Elysia()
        .use(requestSize({ maxSize: customSize }))
        .post('/test', () => ({ message: 'success' }));

      const smallPayload = 'x'.repeat(customSize);
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': smallPayload.length.toString(),
        },
        body: smallPayload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(200);
    });

    it('should support custom size limit in KB', async () => {
      const customSize = 2 * 1024; // 2KB
      const app = new Elysia()
        .use(requestSize({ maxSize: customSize }))
        .post('/test', () => ({ message: 'success' }));

      const payload = 'x'.repeat(1024); // 1KB
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': payload.length.toString(),
        },
        body: payload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(200);
    });

    it('should support custom size limit in MB', async () => {
      const customSize = 5 * 1024 * 1024; // 5MB
      const app = new Elysia()
        .use(requestSize({ maxSize: customSize }))
        .post('/test', () => ({ message: 'success' }));

      const payload = 'x'.repeat(1024 * 1024); // 1MB
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': payload.length.toString(),
        },
        body: payload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Integration', () => {
    it('should work with other middlewares', async () => {
      const app = new Elysia()
        .use(requestSize({ maxSize: 1024 }))
        .derive(() => ({
          customData: 'test',
        }))
        .post('/test', ({ customData }) => {
          return { customData };
        });

      const payload = JSON.stringify({ test: 'data' });
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': payload.length.toString(),
        },
        body: payload,
      });

      const response = await app.handle(request);

      expect(response.status).toBe(200);
    });

    it('should maintain size check through request lifecycle', async () => {
      let requestChecked = false;
      const maxSize = 100;
      const app = new Elysia()
        .use(requestSize({ maxSize }))
        .onBeforeHandle(() => {
          requestChecked = true;
        })
        .post('/test', () => ({ message: 'success' }));

      const largePayload = 'x'.repeat(maxSize + 1);
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': largePayload.length.toString(),
        },
        body: largePayload,
      });

      const response = await app.handle(request);

      // Size check should happen before handler is executed
      expect(response.status).toBe(413);
      expect(requestChecked).toBe(false);
    });
  });
});
