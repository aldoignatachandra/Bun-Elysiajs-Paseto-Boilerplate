import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Elysia } from 'elysia';
import { securityHeadersPlugin } from '@/plugins/security-headers.plugin';

describe('Security Headers Plugin', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    // Store original NODE_ENV
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  describe('Default Security Headers', () => {
    it('should set Content-Security-Policy header with default policy', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toBe(
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';"
      );
    });

    it('should set X-Frame-Options header to DENY by default', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const xFrameOptions = response.headers.get('X-Frame-Options');
      expect(xFrameOptions).toBe('DENY');
    });

    it('should set X-Content-Type-Options header to nosniff', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const xContentTypeOptions = response.headers.get('X-Content-Type-Options');
      expect(xContentTypeOptions).toBe('nosniff');
    });

    it('should set Referrer-Policy header to no-referrer by default', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const referrerPolicy = response.headers.get('Referrer-Policy');
      expect(referrerPolicy).toBe('no-referrer');
    });

    it('should set Permissions-Policy header with default policy', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const permissionsPolicy = response.headers.get('Permissions-Policy');
      expect(permissionsPolicy).toBeDefined();
      expect(permissionsPolicy).toBe(
        'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
      );
    });

    it('should set X-XSS-Protection header', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const xXssProtection = response.headers.get('X-XSS-Protection');
      expect(xXssProtection).toBe('1; mode=block');
    });

    it('should set X-DNS-Prefetch-Control header to off', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const xDnsPrefetchControl = response.headers.get('X-DNS-Prefetch-Control');
      expect(xDnsPrefetchControl).toBe('off');
    });

    it('should set X-Download-Options header to noopen', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const xDownloadOptions = response.headers.get('X-Download-Options');
      expect(xDownloadOptions).toBe('noopen');
    });

    it('should set X-Permitted-Cross-Domain-Policies header to none', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const xPermittedCrossDomainPolicies = response.headers.get(
        'X-Permitted-Cross-Domain-Policies'
      );
      expect(xPermittedCrossDomainPolicies).toBe('none');
    });

    it('should set Cross-Origin-Opener-Policy header to same-origin', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const crossOriginOpenerPolicy = response.headers.get('Cross-Origin-Opener-Policy');
      expect(crossOriginOpenerPolicy).toBe('same-origin');
    });

    it('should set Cross-Origin-Resource-Policy header to same-origin', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const crossOriginResourcePolicy = response.headers.get('Cross-Origin-Resource-Policy');
      expect(crossOriginResourcePolicy).toBe('same-origin');
    });

    it('should remove X-Powered-By header', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const xPoweredBy = response.headers.get('X-Powered-By');
      expect(xPoweredBy).toBeNull();
    });

    it('should set all security headers on a response', async () => {
      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
      expect(response.headers.get('Permissions-Policy')).toBeDefined();
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('off');
      expect(response.headers.get('X-Download-Options')).toBe('noopen');
      expect(response.headers.get('X-Permitted-Cross-Domain-Policies')).toBe('none');
      expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
      expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin');
      expect(response.headers.get('X-Powered-By')).toBeNull();
    });
  });

  describe('HSTS (Strict-Transport-Security)', () => {
    it('should NOT set Strict-Transport-Security in development', async () => {
      process.env.NODE_ENV = 'development';

      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeNull();
    });

    it('should NOT set Strict-Transport-Security when NODE_ENV is not set', async () => {
      delete process.env.NODE_ENV;

      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeNull();
    });

    it('should set Strict-Transport-Security in production with default values', async () => {
      process.env.NODE_ENV = 'production';

      const app = new Elysia().use(securityHeadersPlugin());
      const response = await app.handle(new Request('http://localhost/'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeDefined();
      expect(hsts).toBe('max-age=31536000; includeSubDomains');
    });
  });

  describe('Configuration Options', () => {
    it('should override default CSP with custom contentSecurityPolicy', async () => {
      const customCsp = "default-src 'none'; script-src 'https://cdn.example.com'";

      const app = new Elysia().use(
        securityHeadersPlugin({
          contentSecurityPolicy: customCsp,
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBe(customCsp);
    });

    it('should override X-Frame-Options with custom value', async () => {
      const app = new Elysia().use(
        securityHeadersPlugin({
          xFrameOptions: 'SAMEORIGIN',
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const xFrameOptions = response.headers.get('X-Frame-Options');
      expect(xFrameOptions).toBe('SAMEORIGIN');
    });

    it('should override Referrer-Policy with custom value', async () => {
      const app = new Elysia().use(
        securityHeadersPlugin({
          referrerPolicy: 'same-origin',
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const referrerPolicy = response.headers.get('Referrer-Policy');
      expect(referrerPolicy).toBe('same-origin');
    });

    it('should override Permissions-Policy with custom array', async () => {
      const customPermissions = ['camera=(self)', 'microphone=()'];

      const app = new Elysia().use(
        securityHeadersPlugin({
          permissionsPolicy: customPermissions,
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const permissionsPolicy = response.headers.get('Permissions-Policy');
      expect(permissionsPolicy).toBe('camera=(self), microphone=()');
    });

    it('should allow disabling CSP with enableCSP set to false', async () => {
      const app = new Elysia().use(
        securityHeadersPlugin({
          enableCSP: false,
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeNull();
    });

    it('should allow custom HSTS max-age in production', async () => {
      process.env.NODE_ENV = 'production';

      const app = new Elysia().use(
        securityHeadersPlugin({
          hstsMaxAge: 86400, // 1 day
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBe('max-age=86400; includeSubDomains');
    });

    it('should allow disabling HSTS includeSubDomains in production', async () => {
      process.env.NODE_ENV = 'production';

      const app = new Elysia().use(
        securityHeadersPlugin({
          hstsIncludeSubDomains: false,
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBe('max-age=31536000');
    });

    it('should enable HSTS preload in production when configured', async () => {
      process.env.NODE_ENV = 'production';

      const app = new Elysia().use(
        securityHeadersPlugin({
          hstsPreload: true,
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBe('max-age=31536000; includeSubDomains; preload');
    });

    it('should allow disabling HSTS with enableHSTS set to false even in production', async () => {
      process.env.NODE_ENV = 'production';

      const app = new Elysia().use(
        securityHeadersPlugin({
          enableHSTS: false,
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const hsts = response.headers.get('Strict-Transport-Security');
      expect(hsts).toBeNull();
    });

    it('should allow disabling X-Content-Type-Options with xContentTypeOptions set to false', async () => {
      const app = new Elysia().use(
        securityHeadersPlugin({
          xContentTypeOptions: false,
        })
      );
      const response = await app.handle(new Request('http://localhost/'));

      const xContentTypeOptions = response.headers.get('X-Content-Type-Options');
      expect(xContentTypeOptions).toBeNull();
    });
  });

  describe('Plugin Integration', () => {
    it('should work with routes', async () => {
      const app = new Elysia()
        .use(securityHeadersPlugin())
        .get('/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/test'));

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-Powered-By')).toBeNull();
    });

    it('should apply headers to all routes', async () => {
      const app = new Elysia()
        .use(securityHeadersPlugin())
        .get('/route1', () => ({ message: 'route1' }))
        .get('/route2', () => ({ message: 'route2' }));

      const response1 = await app.handle(new Request('http://localhost/route1'));
      const response2 = await app.handle(new Request('http://localhost/route2'));

      expect(response1.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response2.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response1.headers.get('Content-Security-Policy')).toBeDefined();
      expect(response2.headers.get('Content-Security-Policy')).toBeDefined();
    });
  });
});
