/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/**
 * Caching Plugin for Elysia
 *
 * Provides HTTP response caching using Redis.
 *
 * Features:
 * - Configurable cacheable paths and methods
 * - X-Cache headers (HIT/MISS)
 * - Cache bypass support
 * - Query parameter handling
 * - Graceful error handling
 */

import { Elysia } from 'elysia';
import Redis from 'ioredis';
import { CacheService } from '@core/cache/cache.service';
import { logger } from '@core/logging/logger';

/**
 * Normalize query parameters for cache key
 * Sorts parameters to ensure consistent cache keys regardless of order
 */
function normalizeQueryParams(searchParams: URLSearchParams): string {
  const params = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return params ? `?${params}` : '';
}

/**
 * Check if a path matches any of the given patterns
 */
function pathMatchesPatterns(path: string, patterns: string[]): boolean {
  if (patterns.length === 0) {
    return true; // No patterns configured - cache all paths
  }

  return patterns.some(pattern => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  });
}

/**
 * Caching plugin configuration
 */
export interface CachingPluginOptions {
  /**
   * Redis instance for caching
   */
  redis: Redis;

  /**
   * Default TTL for cached responses in seconds (default: 3600)
   */
  defaultTTL?: number;

  /**
   * Cache key prefix (default: 'cache:')
   */
  prefix?: string;

  /**
   * Path patterns to cache (default: all paths)
   * Uses glob patterns (e.g., '/api/public/*')
   */
  cacheablePaths?: string[];

  /**
   * HTTP methods to cache (default: ['GET'])
   */
  cacheableMethods?: string[];

  /**
   * Whether to cache responses with non-200 status codes (default: false)
   */
  cacheErrors?: boolean;
}

/**
 * Store for request metadata
 */
interface RequestContext {
  cacheKey: string;
  fromCache: boolean;
  cacheable: boolean;
}

const requestContext = new WeakMap<Request, RequestContext>();

/**
 * Caching plugin for Elysia
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { cachingPlugin } from '@/plugins/caching.plugin';
 *
 * const app = new Elysia().use(cachingPlugin({ redis }));
 * ```
 */
export function cachingPlugin(options: CachingPluginOptions) {
  const {
    redis,
    defaultTTL = 3600,
    prefix = 'cache:',
    cacheablePaths = [],
    cacheableMethods = ['GET'],
    cacheErrors = false,
  } = options;

  const cacheService = new CacheService(redis);
  const httpPrefix = `${prefix}http:`;

  return new Elysia({ name: 'caching-plugin' })
    .onRequest(({ request }) => {
      // Check if request should bypass cache
      const shouldBypass =
        request.headers.get('Cache-Control') === 'no-cache' ||
        request.headers.get('X-Cache-Bypass') === 'true';

      // Check if request method is cacheable
      const isCacheableMethod = cacheableMethods.includes(request.method);

      // Get request path
      const url = new URL(request.url);
      const path = url.pathname;
      const queryString = normalizeQueryParams(url.searchParams);

      // Check if path is cacheable
      const isCacheablePath = pathMatchesPatterns(path, cacheablePaths);

      // Generate cache key
      const cacheKey = `${httpPrefix}${request.method}:${path}${queryString}`;

      // Determine if request is cacheable
      const isCacheable = !shouldBypass && isCacheableMethod && isCacheablePath;

      // Store context for later use
      requestContext.set(request, {
        cacheKey,
        fromCache: false,
        cacheable: isCacheable,
      });
    })
    .onBeforeHandle(async ({ request }) => {
      const ctx = requestContext.get(request);

      // Skip caching if not cacheable
      if (!ctx || !ctx.cacheable) {
        return;
      }

      try {
        // Try to get from cache
        const result = await cacheService.get<{ body: string; headers: Record<string, string> }>(
          ctx.cacheKey.replace(prefix, '') // Remove prefix for get operation
        );

        if (result.hit && result.value) {
          // Update context
          requestContext.set(request, { ...ctx, fromCache: true });

          // Return cached body
          return result.value.body;
        }
      } catch (error) {
        logger.error('Cache retrieval error', { cacheKey: ctx.cacheKey, error });
        // Continue without caching on error
      }
    })
    .mapResponse(async ({ request, response }) => {
      const ctx = requestContext.get(request);

      if (!ctx) {
        return response;
      }

      // Clone the response to modify headers
      const headers = new Headers(response.headers);

      if (ctx.fromCache) {
        // Cache hit - set HIT header
        headers.set('X-Cache', 'HIT');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } else if (ctx.cacheable) {
        // Cache miss - set MISS header and cache the response
        headers.set('X-Cache', 'MISS');

        // Check if response should be cached
        const status = response.status;
        if (cacheErrors || (status >= 200 && status < 300)) {
          try {
            const body = await response.text();

            // Store response with headers
            const cacheValue = {
              body,
              headers: Object.fromEntries(headers.entries()),
            };

            await cacheService.set(ctx.cacheKey.replace(prefix, ''), cacheValue, {
              ttl: defaultTTL,
              prefix,
            });

            // Return new response with cached body
            return new Response(body, {
              status,
              headers,
            });
          } catch (error) {
            logger.error('Cache storage error', { cacheKey: ctx.cacheKey, error });
            // Don't fail the request if caching fails
          }
        }
      }

      // Return response with X-Cache header
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    })
    .onError(({ request, set }) => {
      const ctx = requestContext.get(request);

      // Ensure cache miss header is set on errors for cacheable requests
      if (ctx && !ctx.fromCache && ctx.cacheable) {
        set.headers['X-Cache'] = 'MISS';
      }
    })
    .onStart(() => {
      logger.info('Caching plugin loaded', {
        defaultTTL,
        cacheablePaths,
        cacheableMethods,
      });
    });
}

export { CacheService };
