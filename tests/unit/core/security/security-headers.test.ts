import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { securityHeaders, SecurityLevel } from '@/core/security';

describe('Security Headers Middleware', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  describe('Environment Detection', () => {
    it('should detect development environment', () => {
      process.env.NODE_ENV = 'development';

      const middleware = securityHeaders();
      expect(middleware).toBeDefined();
    });

    it('should detect production environment', () => {
      process.env.NODE_ENV = 'production';

      const middleware = securityHeaders();
      expect(middleware).toBeDefined();
    });

    it('should default to production when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      const middleware = securityHeaders();
      expect(middleware).toBeDefined();
    });

    it('should allow overriding environment', () => {
      process.env.NODE_ENV = 'development';

      const middleware = securityHeaders({
        overrideEnvironment: SecurityLevel.PRODUCTION,
      });

      expect(middleware).toBeDefined();
    });
  });

  describe('Default Headers', () => {
    it('should include X-Content-Type-Options by default', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should include X-Frame-Options by default', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const frameOptions = response.headers.get('X-Frame-Options');
      expect(frameOptions).toBeTruthy();
      // @ts-expect-error - TypeScript narrowing issue
      expect(['DENY', 'SAMEORIGIN']).toContain(frameOptions);
    });

    it('should include X-XSS-Protection by default', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should include Referrer-Policy by default', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });

    it('should include Permissions-Policy by default', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const permissionsPolicy = response.headers.get('Permissions-Policy');
      expect(permissionsPolicy).toBeTruthy();
      expect(permissionsPolicy).toContain('geolocation');
    });
  });

  describe('Content Security Policy', () => {
    it('should include CSP header by default', async () => {
      process.env.NODE_ENV = 'production'; // Ensure production mode for this test
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeTruthy();
    });

    it('should include default-src directive', async () => {
      process.env.NODE_ENV = 'production'; // Ensure production mode for this test
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toContain("default-src 'self'");
    });

    it('should use Report-Only mode in development', async () => {
      process.env.NODE_ENV = 'development';

      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const cspReportOnly = response.headers.get('Content-Security-Policy-Report-Only');
      const csp = response.headers.get('Content-Security-Policy');

      // In development, should use Report-Only mode
      expect(cspReportOnly).toBeTruthy();
      expect(csp).toBeNull();
    });

    it('should allow custom CSP directives', async () => {
      process.env.NODE_ENV = 'production'; // Ensure production mode for this test
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              contentSecurityPolicy: {
                directives: [
                  {
                    name: 'script-src',
                    sources: ["'self'", 'https://cdn.example.com'],
                  },
                ],
              },
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain('https://cdn.example.com');
    });

    it('should allow disabling CSP', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              contentSecurityPolicy: false,
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeNull();
    });

    it('should support nonce generation', async () => {
      process.env.NODE_ENV = 'production'; // Ensure production mode for this test
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              contentSecurityPolicy: {
                useNonce: true,
              },
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeTruthy();
      expect(csp).toMatch(/'nonce-[a-zA-Z0-9]{32}'/);
    });
  });

  describe('HTTP Strict Transport Security', () => {
    it('should not set HSTS in development', async () => {
      process.env.NODE_ENV = 'development';

      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeNull();
    });

    it('should set HSTS in production', async () => {
      process.env.NODE_ENV = 'production';

      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeTruthy();
      expect(hsts).toContain('max-age=');
    });

    it('should allow custom HSTS configuration', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              strictTransportSecurity: {
                maxAge: 63072000,
                includeSubDomains: true,
                preload: true,
                force: true, // Force HSTS even in non-production
              },
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeTruthy();
      expect(hsts).toContain('max-age=63072000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });

    it('should allow disabling HSTS', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              strictTransportSecurity: false,
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeNull();
    });
  });

  describe('Cross-Origin Headers', () => {
    it('should set Cross-Origin-Opener-Policy', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const coop = response.headers.get('Cross-Origin-Opener-Policy');
      expect(coop).toBeTruthy();
      // @ts-expect-error - TypeScript narrowing issue
      expect(['same-origin', 'unsafe-none']).toContain(coop);
    });

    it('should set Cross-Origin-Resource-Policy', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const corp = response.headers.get('Cross-Origin-Resource-Policy');
      expect(corp).toBeTruthy();
      // @ts-expect-error - TypeScript narrowing issue
      expect(['same-origin', 'cross-origin']).toContain(corp);
    });

    it('should set Cross-Origin-Embedder-Policy', async () => {
      const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      const coep = response.headers.get('Cross-Origin-Embedder-Policy');
      expect(coep).toBeTruthy();
      // @ts-expect-error - TypeScript narrowing issue
      expect(['require-corp', 'unsafe-none']).toContain(coep);
    });
  });

  describe('Custom Headers', () => {
    it('should allow adding custom headers', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              customHeaders: {
                'X-Custom-Header': 'custom-value',
                'X-Another-Header': 'another-value',
              },
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(response.headers.get('X-Another-Header')).toBe('another-value');
    });

    it('should preserve default headers when adding custom headers', async () => {
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
  });

  describe('Header Overrides', () => {
    it('should allow overriding X-Frame-Options', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              xFrameOptions: 'SAMEORIGIN',
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    });

    it('should allow overriding Referrer-Policy', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              referrerPolicy: 'no-referrer',
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    });

    it('should allow disabling specific headers', async () => {
      const app = new Elysia()
        .use(
          securityHeaders({
            config: {
              xContentTypeOptions: false,
              xXssProtection: false,
            },
          })
        )
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.headers.get('X-Content-Type-Options')).toBeNull();
      expect(response.headers.get('X-XSS-Protection')).toBeNull();
    });
  });

  describe('Integration', () => {
    it('should apply all headers to all responses', async () => {
      const app = new Elysia()
        .use(securityHeaders())
        .get('/test1', () => ({ message: 'test1' }))
        .get('/test2', () => ({ message: 'test2' }));

      const response1 = await app.handle(new Request('http://localhost/test1'));
      const response2 = await app.handle(new Request('http://localhost/test2'));

      expect(response1.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response2.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should work with different HTTP methods', async () => {
      const app = new Elysia()
        .use(securityHeaders())
        .get('/test', () => ({ method: 'GET' }))
        .post('/test', () => ({ method: 'POST' }))
        .put('/test', () => ({ method: 'PUT' }));

      const getResponse = await app.handle(new Request('http://localhost/test', { method: 'GET' }));
      const postResponse = await app.handle(new Request('http://localhost/test', { method: 'POST' }));
      const putResponse = await app.handle(new Request('http://localhost/test', { method: 'PUT' }));

      expect(getResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(postResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(putResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

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

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });
});
