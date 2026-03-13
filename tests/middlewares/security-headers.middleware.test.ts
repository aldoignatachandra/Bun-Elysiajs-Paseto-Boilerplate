import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { securityHeaders, SecurityLevel } from '@/core/security';

describe('Security Headers Middleware - Integration', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('Basic Integration', () => {
    it('should integrate with Elysia app', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should work with existing routes', async () => {
      const app = new Elysia()
        .use(securityHeaders())
        .get('/users', () => ({ users: [] }))
        .post('/users', () => ({ created: true }))
        .get('/users/:id', ({ params }) => ({ userId: params.id }));

      const getUsersResponse = await app.handle(new Request('http://localhost/users'));
      const createUserResponse = await app.handle(new Request('http://localhost/users', { method: 'POST' }));
      const getUserResponse = await app.handle(new Request('http://localhost/users/123'));

      expect(getUsersResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(createUserResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(getUserResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Middleware Composition', () => {
    it('should work with other Elysia middleware', async () => {
      const customMiddleware = (app: Elysia) =>
        app.derive(() => ({
          customData: 'test',
        }));

      const app = new Elysia()
        .use(customMiddleware)
        .use(securityHeaders())
        .get('/test', ({ customData }) => ({ customData }));

      const response = await app.handle(new Request('http://localhost/test'));
      const data = await response.json();

      expect(data).toEqual({ customData: 'test' });
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should work when applied before other middleware', async () => {
      const app = new Elysia()
        .use(securityHeaders())
        .derive(({ request }) => ({
          requestMethod: request.method,
        }))
        .get('/test', ({ requestMethod }) => ({ method: requestMethod }));

      const response = await app.handle(new Request('http://localhost/test'));
      const data = await response.json();

      expect(data).toEqual({ method: 'GET' });
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should work when applied after other middleware', async () => {
      const app = new Elysia()
        .derive(({ request }) => ({
          requestMethod: request.method,
        }))
        .use(securityHeaders())
        .get('/test', ({ requestMethod }) => ({ method: requestMethod }));

      const response = await app.handle(new Request('http://localhost/test'));
      const data = await response.json();

      expect(data).toEqual({ method: 'GET' });
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Environment Integration', () => {
    it('should use production config in production', async () => {
      process.env.NODE_ENV = 'production';

      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      // Production should have strict settings
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
    });

    it('should use development config in development', async () => {
      process.env.NODE_ENV = 'development';

      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      // Development should have more permissive settings
      expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
      expect(response.headers.get('Strict-Transport-Security')).toBeNull();
    });

    it('should allow environment override', async () => {
      process.env.NODE_ENV = 'development';

      const app = new Elysia().use(securityHeaders({ overrideEnvironment: SecurityLevel.PRODUCTION })).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      // Should use production config despite NODE_ENV
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('Custom Configuration Integration', () => {
    it('should merge custom config with defaults', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              customHeaders: {
                'X-Custom-Header': 'custom-value',
              },
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should allow complete CSP override', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              contentSecurityPolicy: {
                directives: [
                  {
                    name: 'default-src',
                    sources: ["'none'"],
                  },
                ],
              },
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));
      const csp = response.headers.get('Content-Security-Policy');

      expect(csp).toContain("default-src 'none'");
    });

    it('should allow disabling specific headers', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              xFrameOptions: false,
              xXssProtection: false,
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('X-Frame-Options')).toBeNull();
      expect(response.headers.get('X-XSS-Protection')).toBeNull();
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Request Handling', () => {
    it('should handle GET requests', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ method: 'GET' }));

      const response = await app.handle(new Request('http://localhost/test', { method: 'GET' }));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle POST requests', async () => {
      const app = new Elysia().use(securityHeaders()).post('/test', () => ({ method: 'POST' }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          method: 'POST',
          body: JSON.stringify({ test: 'data' }),
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle PUT requests', async () => {
      const app = new Elysia().use(securityHeaders()).put('/test', () => ({ method: 'PUT' }));

      const response = await app.handle(new Request('http://localhost/test', { method: 'PUT' }));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle DELETE requests', async () => {
      const app = new Elysia().use(securityHeaders()).delete('/test', () => ({ method: 'DELETE' }));

      const response = await app.handle(new Request('http://localhost/test', { method: 'DELETE' }));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle PATCH requests', async () => {
      const app = new Elysia().use(securityHeaders()).patch('/test', () => ({ method: 'PATCH' }));

      const response = await app.handle(new Request('http://localhost/test', { method: 'PATCH' }));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle requests with query parameters', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test?foo=bar&baz=qux'));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should handle requests with custom headers', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: {
            'X-Custom-Header': 'custom-value',
          },
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Error Handling', () => {
    it('should apply headers to error responses', async () => {
      const app = new Elysia()
        .use(securityHeaders())
        .get('/error', () => {
          throw new Error('Test error');
        })
        .onError(({ set }) => {
          set.status = 500;
          return { error: 'Internal error' };
        });

      const response = await app.handle(new Request('http://localhost/error'));

      expect(response.status).toBe(500);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should apply headers to 404 responses', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/nonexistent'));

      expect(response.status).toBe(404);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should work with API routes', async () => {
      const app = new Elysia().use(securityHeaders()).group('/api/v1', api =>
        api
          .get('/users', () => ({ users: [] }))
          .post('/users', () => ({ created: true }))
          .get('/users/:id', ({ params }) => ({ userId: params.id }))
      );

      const responses = await Promise.all([
        app.handle(new Request('http://localhost/api/v1/users')),
        app.handle(new Request('http://localhost/api/v1/users', { method: 'POST' })),
        app.handle(new Request('http://localhost/api/v1/users/123')),
      ]);

      for (const response of responses) {
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(response.headers.get('X-Frame-Options')).toBeTruthy();
        expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
      }
    });

    it('should work with custom derive middleware', async () => {
      const customMiddleware = (app: Elysia) =>
        app.derive(() => ({
          customData: 'test-value',
          timestamp: Date.now(),
        }));

      const app = new Elysia()
        .use(customMiddleware)
        .use(securityHeaders())
        .get('/data', ({ customData, timestamp }) => ({ customData, timestamp }));

      const response = await app.handle(new Request('http://localhost/data'));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');

      const data = await response.json();
      expect(data.customData).toBe('test-value');
      expect(data.timestamp).toBeGreaterThan(0);
    });

    it('should work with CORS', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(
        new Request('http://localhost/test', {
          headers: {
            Origin: 'https://example.com',
          },
        })
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });
});
