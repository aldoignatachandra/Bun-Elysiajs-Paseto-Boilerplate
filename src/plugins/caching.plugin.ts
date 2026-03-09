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
    const regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.');

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cacheErrors = false,
  } = options;

  const cacheService = new CacheService(redis);

  // Use Elysia's store for cache metadata
  return new Elysia({ name: 'caching-plugin' })
    .state({
      __cacheKey: '' as string,
      __cacheable: false,
      __fromCache: false,
    })
    .onRequest(({ set, store }) => {
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

      // Generate cache key (without prefix - CacheService will add it)
      const cacheKey = `http:${request.method}:${path}${queryString}`;

      // Determine if request is cacheable
      const isCacheable = !shouldBypass && isCacheableMethod && isCacheablePath;

      // Store in state
      store.__cacheKey = cacheKey;
      store.__cacheable = isCacheable;
      store.__fromCache = false;

      // Set X-Cache header for cacheable requests
      if (isCacheable) {
        set.headers['X-Cache'] = 'MISS';
      }
    })
    .onBeforeHandle(async ({ set, store }) => {
      if (!store.__cacheable) {
        return;
      }

      try {
        // Try to get from cache
        const result = await cacheService.get<{ body: string; headers: Record<string, string> }>(
          store.__cacheKey,
          prefix
        );

        if (result.hit && result.value) {
          // Mark as cache hit
          store.__fromCache = true;

          // Set HIT header
          set.headers['X-Cache'] = 'HIT';

          // Return cached response with HIT header
          const headers = new Headers(result.value.headers);
          headers.set('X-Cache', 'HIT');
          headers.set('Content-Type', 'application/json; charset=utf-8');

          return new Response(result.value.body, {
            status: 200,
            headers,
          });
        }
      } catch (error) {
        logger.error('Cache retrieval error', { cacheKey: store.__cacheKey, error });
        // Continue without caching on error
      }
    })
    .onAfterHandle(async ({ response, store }) => {
      // If this was a cache hit, don't cache it again
      if (store.__fromCache) {
        return response;
      }

      // For cacheable requests, store the response
      if (store.__cacheable && store.__cacheKey && response) {
        try {
          // Convert response to string if it's an object
          let responseBody: string;
          let contentType = 'application/json; charset=utf-8';

          if (typeof response === 'string') {
            responseBody = response;
          } else if (response instanceof Response) {
            // Handle Response objects - clone and read body
            const clonedResponse = response.clone();
            responseBody = await clonedResponse.text();

            // Extract content type from response headers
            const responseContentType = response.headers.get('Content-Type');
            if (responseContentType) {
              contentType = responseContentType;
            }
          } else {
            // It's an object, stringify it
            responseBody = JSON.stringify(response);
          }

          // Store response with headers
          const cacheValue = {
            body: responseBody,
            headers: {
              'Content-Type': contentType,
            },
          };

          // Cache the response
          await cacheService.set(store.__cacheKey, cacheValue, {
            ttl: defaultTTL,
            prefix,
          });
        } catch (error) {
          logger.error('Cache storage error', { cacheKey: store.__cacheKey, error });
          // Don't fail the request if caching fails
        }
      }

      return response;
    })
    .onAfterHandle(async ({ response, store, set }) => {
      // Ensure X-Cache header is set for all cacheable requests
      if (store.__cacheable && !set.headers['X-Cache']) {
        set.headers['X-Cache'] = store.__fromCache ? 'HIT' : 'MISS';
      }

      // If this was a cache hit, don't cache it again
      if (store.__fromCache) {
        return response;
      }

      // For cacheable requests, store the response
      if (store.__cacheable && store.__cacheKey && response) {
        try {
          // Convert response to string if it's an object
          let responseBody: string;
          let contentType = 'application/json; charset=utf-8';

          if (typeof response === 'string') {
            responseBody = response;
          } else if (response instanceof Response) {
            // Handle Response objects - clone and read body
            const clonedResponse = response.clone();
            responseBody = await clonedResponse.text();

            // Extract content type from response headers
            const responseContentType = response.headers.get('Content-Type');
            if (responseContentType) {
              contentType = responseContentType;
            }
          } else {
            // It's an object, stringify it
            responseBody = JSON.stringify(response);
          }

          // Store response with headers
          const cacheValue = {
            body: responseBody,
            headers: {
              'Content-Type': contentType,
            },
          };

          // Cache the response
          await cacheService.set(store.__cacheKey, cacheValue, {
            ttl: defaultTTL,
            prefix,
          });
        } catch (error) {
          logger.error('Cache storage error', { cacheKey: store.__cacheKey, error });
          // Don't fail the request if caching fails
        }
      }

      return response;
    })
    .mapResponse(({ response, set }) => {
      // Ensure X-Cache header is included in final response
      // For Response objects, we need to create a new Response with the header
      if (response instanceof Response && set.headers['X-Cache']) {
        const headers = new Headers(response.headers);
        headers.set('X-Cache', set.headers['X-Cache']);

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return response;
    })
    .onError(({ set, store }) => {
      // Ensure cache miss header is set on errors for cacheable requests
      if (!store.__fromCache && store.__cacheable && !set.headers['X-Cache']) {
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
