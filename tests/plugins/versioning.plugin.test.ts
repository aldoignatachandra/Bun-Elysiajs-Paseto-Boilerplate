import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { versioningPlugin } from '@/plugins/versioning.plugin';
import { versionManager } from '@/core/versioning/version-manager';

describe('Versioning Plugin', () => {
  beforeEach(() => {
    // Reset to default configuration before each test
    versionManager.configure({
      defaultVersion: 'v1',
      supportedVersions: ['v1'],
      deprecatedVersions: [],
    });
  });

  describe('Version Extraction from URL', () => {
    it('should extract version from /api/v1/ path', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v1/test'));
      const data = await response.json();

      expect(data.apiVersion).toBe('v1');
    });

    it('should extract version from /api/v2/ path', async () => {
      versionManager.configure({
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
      });

      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v2/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v2/test'));
      const data = await response.json();

      expect(data.apiVersion).toBe('v2');
    });

    it('should use default version when no version in path', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/test'));
      const data = await response.json();

      expect(data.apiVersion).toBe('v1');
    });

    it('should handle complex paths with version', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/users/123/posts', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v1/users/123/posts'));
      const data = await response.json();

      expect(data.apiVersion).toBe('v1');
    });
  });

  describe('API-Version Header', () => {
    it('should set API-Version header for versioned requests', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v1/test'));

      expect(response.headers.get('API-Version')).toBe('v1');
    });

    it('should set API-Version header for default version requests', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/test'));

      expect(response.headers.get('API-Version')).toBe('v1');
    });

    it('should set API-Version header for all response types', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/text', () => 'plain text')
        .get('/api/v1/json', () => ({ data: 'json' }))
        .get('/api/v1/number', () => 42);

      const textResponse = await app.handle(new Request('http://localhost/api/v1/text'));
      const jsonResponse = await app.handle(new Request('http://localhost/api/v1/json'));
      const numberResponse = await app.handle(new Request('http://localhost/api/v1/number'));

      expect(textResponse.headers.get('API-Version')).toBe('v1');
      expect(jsonResponse.headers.get('API-Version')).toBe('v1');
      expect(numberResponse.headers.get('API-Version')).toBe('v1');
    });
  });

  describe('Unsupported Version Handling', () => {
    it('should return 400 for unsupported version', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v99/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v99/test'));

      expect(response.status).toBe(400);
    });

    it('should include error details for unsupported version', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v99/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v99/test'));
      const data = await response.json();

      expect(data.error).toBeDefined();
      expect(data.error).toContain('unsupported');
      expect(data.error).toContain('version');
      expect(data.supportedVersions).toBeDefined();
    });

    it('should return 400 for invalid version format', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/invalid/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/invalid/test'));

      expect(response.status).toBe(400);
    });
  });

  describe('Deprecated Version Handling', () => {
    beforeEach(() => {
      versionManager.configure({
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
        deprecatedVersions: ['v1'],
        deprecationDate: new Date('2024-01-01'),
      });
    });

    it('should add Deprecation header for deprecated versions', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v1/test'));

      expect(response.headers.has('Deprecation')).toBe(true);
      const deprecationHeader = response.headers.get('Deprecation');
      expect(deprecationHeader).toContain('v1');
    });

    it('should include sunset information in Deprecation header', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v1/test'));
      const deprecationInfo = versionManager.getDeprecationInfo('v1');

      const deprecationHeader = response.headers.get('Deprecation');
      expect(deprecationHeader).toContain(deprecationInfo?.sunsetAt.toISOString() || '');
    });

    it('should not add Deprecation header for active versions', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v2/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v2/test'));

      expect(response.headers.has('Deprecation')).toBe(false);
    });

    it('should add deprecation warning to response body', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/test', () => ({ message: 'test' }));

      const response = await app.handle(new Request('http://localhost/api/v1/test'));
      const data = await response.json();

      expect(data.deprecationWarning).toBeDefined();
      expect(data.deprecationWarning).toContain('deprecated');
    });
  });

  describe('Accept Header Negotiation', () => {
    it('should use version from Accept header if present', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(
        new Request('http://localhost/api/test', {
          headers: {
            Accept: 'application/vnd.api.v1+json',
          },
        })
      );

      const data = await response.json();
      expect(data.apiVersion).toBe('v1');
    });

    it('should prioritize URL version over Accept header', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v2/test', () => ({ message: 'test' }));

      const response = await app.handle(
        new Request('http://localhost/api/v2/test', {
          headers: {
            Accept: 'application/vnd.api.v1+json',
          },
        })
      );

      const data = await response.json();
      expect(data.apiVersion).toBe('v2');
    });

    it('should handle invalid Accept header format gracefully', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/test', () => ({ message: 'test' }));

      const response = await app.handle(
        new Request('http://localhost/api/test', {
          headers: {
            Accept: 'application/json',
          },
        })
      );

      const data = await response.json();
      expect(data.apiVersion).toBe('v1'); // Should fall back to default
    });
  });

  describe('Response Enhancement', () => {
    it('should add apiVersion to object responses', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/data', () => ({ name: 'test', value: 123 }));

      const response = await app.handle(new Request('http://localhost/api/v1/data'));
      const data = await response.json();

      expect(data.apiVersion).toBe('v1');
      expect(data.name).toBe('test');
      expect(data.value).toBe(123);
    });

    it('should add apiVersion to array responses', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/items', () => [{ id: 1 }, { id: 2 }]);

      const response = await app.handle(new Request('http://localhost/api/v1/items'));
      const data = await response.json();

      expect(data.apiVersion).toBe('v1');
      expect(Array.isArray(data)).toBe(true);
    });

    it('should add apiVersion to nested object responses', async () => {
      const app = new Elysia().use(versioningPlugin()).get('/api/v1/nested', () => ({
        user: { name: 'John', age: 30 },
        meta: { total: 100 },
      }));

      const response = await app.handle(new Request('http://localhost/api/v1/nested'));
      const data = await response.json();

      expect(data.apiVersion).toBe('v1');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect((data.user as Record<string, unknown>).name).toBe('John');
    });

    it('should not add apiVersion to string responses', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/text', () => 'plain text response');

      const response = await app.handle(new Request('http://localhost/api/v1/text'));
      const text = await response.text();

      expect(text).toBe('plain text response');
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    it('should not add apiVersion to number responses', async () => {
      const app = new Elysia().use(versioningPlugin()).get('/api/v1/number', () => 42);

      const response = await app.handle(new Request('http://localhost/api/v1/number'));
      const number = await response.text();

      expect(parseInt(number)).toBe(42);
      expect(response.headers.get('API-Version')).toBe('v1');
    });
  });

  describe('Non-API Paths', () => {
    it('should not process versioning for non-api paths', async () => {
      const app = new Elysia().use(versioningPlugin()).get('/health', () => ({ status: 'ok' }));

      const response = await app.handle(new Request('http://localhost/health'));
      const data = await response.json();

      expect(data.apiVersion).toBeUndefined();
    });

    it('should not process versioning for static assets', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/static/file.js', () => 'console.log("test");');

      const response = await app.handle(new Request('http://localhost/static/file.js'));

      expect(response.headers.get('API-Version')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response body', async () => {
      const app = new Elysia().use(versioningPlugin()).get('/api/v1/empty', () => null);

      const response = await app.handle(new Request('http://localhost/api/v1/empty'));

      expect(response.status).toBe(200);
      expect(response.headers.get('API-Version')).toBe('v1');
    });

    it('should handle error responses correctly', async () => {
      const app = new Elysia().use(versioningPlugin()).get('/api/v1/error', () => {
        throw new Error('Test error');
      });

      const response = await app.handle(new Request('http://localhost/api/v1/error'));

      expect(response.status).toBe(500);
    });

    it('should handle requests with query parameters', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/search', () => ({ results: [] }));

      const response = await app.handle(
        new Request('http://localhost/api/v1/search?q=test&limit=10')
      );
      const data = await response.json();

      expect(data.apiVersion).toBe('v1');
    });

    it('should handle case-sensitive URL matching', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/test', () => ({ message: 'test' }));

      // Should work with lowercase
      const response1 = await app.handle(new Request('http://localhost/api/v1/test'));
      expect(response1.status).toBe(200);

      // Should work with uppercase API
      const response2 = await app.handle(new Request('http://localhost/API/v1/test'));
      expect(response2.status).toBe(404);
    });
  });

  describe('Plugin Integration', () => {
    it('should work with other Elysia plugins', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .derive(() => ({ userId: '123' }))
        .get('/api/v1/profile', ({ userId }) => ({ userId, name: 'John' }));

      const response = await app.handle(new Request('http://localhost/api/v1/profile'));
      const data = await response.json();

      expect(data.apiVersion).toBe('v1');
      expect(data.userId).toBe('123');
      expect(data.name).toBe('John');
    });

    it('should work with multiple routes', async () => {
      const app = new Elysia()
        .use(versioningPlugin())
        .get('/api/v1/users', () => ({ users: [] }))
        .post('/api/v1/users', () => ({ created: true }))
        .get('/api/v1/posts', () => ({ posts: [] }));

      const usersResponse = await app.handle(new Request('http://localhost/api/v1/users'));
      const postsResponse = await app.handle(new Request('http://localhost/api/v1/posts'));

      expect((await usersResponse.json()).apiVersion).toBe('v1');
      expect((await postsResponse.json()).apiVersion).toBe('v1');
    });
  });
});
