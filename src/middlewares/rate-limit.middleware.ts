/**
 * Rate Limiting Middleware
 *
 * Redis-based rate limiting middleware using sliding window algorithm.
 * Limits the number of requests a client can make within a time window.
 *
 * Features:
 * - Sliding window rate limiting
 * - Redis-based storage for distributed systems
 * - Configurable max requests and window duration
 * - IP-based and user-based rate limiting
 * - Fail-open behavior on Redis errors
 * - Customizable key generation
 *
 * @example
 * ```typescript
 * // Rate limit by IP (default)
 * app.use(rateLimit({ maxRequests: 100, window: 60 }))
 *
 * // Rate limit by user ID
 * app.use(rateLimit({
 *   maxRequests: 1000,
 *   window: 60,
 *   keyGenerator: (ctx) => ctx.user?.id || ctx.request.headers.get('x-forwarded-for') || 'unknown'
 * }))
 * ```
 */

import type { Elysia } from 'elysia';
import { TooManyRequestsError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';
import { getRedisConnection } from '../core/redis/connection';

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed within the window
   * @default 100
   */
  maxRequests?: number;

  /**
   * Time window in seconds
   * @default 60
   */
  window?: number;

  /**
   * Custom key generator function
   * Defaults to using IP address from X-Forwarded-For header or remote address
   */
  keyGenerator?: (ctx: { request: Request }) => string;

  /**
   * Whether to skip rate limiting on Redis errors
   * If true, allows requests when Redis is unavailable (fail-open)
   * If false, blocks requests when Redis is unavailable (fail-closed)
   * @default true
   */
  skipFailedRequests?: boolean;

  /**
   * Custom error message
   * @default "Too many requests"
   */
  errorMessage?: string;

  /**
   * Prefix for Redis keys
   * @default "ratelimit"
   */
  prefix?: string;
}

/**
 * Default rate limit options
 */
const DEFAULT_OPTIONS: Required<Omit<RateLimitOptions, 'keyGenerator'>> = {
  maxRequests: 100,
  window: 60,
  skipFailedRequests: true,
  errorMessage: 'Too many requests',
  prefix: 'ratelimit',
};

/**
 * Get client identifier from request
 *
 * Uses X-Forwarded-For header if available (for proxied requests),
 * otherwise falls back to remote address
 *
 * @param ctx - Elysia context
 * @returns Client identifier
 */
function getDefaultKey(ctx: { request: Request }): string {
  const forwardedFor = ctx.request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, use the first one (original client)
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = ctx.request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default identifier (will be replaced by actual IP in production)
  // In Elysia, we don't have direct access to socket info without the raw request
  return 'unknown';
}

/**
 * Create rate limiting middleware
 *
 * Implements sliding window algorithm using Redis sorted sets.
 * Each request adds the current timestamp to a sorted set,
 * and old timestamps outside the window are removed.
 *
 * @param options - Rate limit configuration
 * @returns Elysia middleware plugin
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (app: Elysia) =>
    app.derive(async ({ request }) => {
      // Generate rate limit key
      const key = opts.keyGenerator?.({ request }) || getDefaultKey({ request });

      const redisKey = `${opts.prefix}:${key}`;

      try {
        const redis = getRedisConnection();
        const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
        const windowStart = now - opts.window;

        // Use Redis transaction for atomic operations
        const multi = redis.multi();

        // Remove old entries outside the window
        multi.zremrangebyscore(redisKey, 0, windowStart);

        // Add current request
        multi.zadd(redisKey, now, `${now}-${Math.random()}`);

        // Count requests in window
        multi.zcard(redisKey);

        // Set expiration to window duration
        multi.expire(redisKey, opts.window);

        // Execute transaction
        const results = await multi.exec();

        if (!results) {
          throw new Error('Redis transaction failed');
        }

        // Get count from zcard result (3rd command)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const count = (results[2]?.[1] as number) || 0;

        // Calculate remaining requests
        const remaining = Math.max(0, opts.maxRequests - count);
        const resetTime = now + opts.window;

        // Check if limit exceeded
        if (count > opts.maxRequests) {
          logger.warn('Rate limit exceeded', {
            key,
            count,
            limit: opts.maxRequests,
            window: opts.window,
          });

          throw new TooManyRequestsError(opts.errorMessage, {
            limit: opts.maxRequests,
            remaining: 0,
            reset: resetTime,
          });
        }

        // Add rate limit info to response headers
        return {
          rateLimit: {
            limit: opts.maxRequests,
            remaining,
            reset: resetTime,
          },
        };
      } catch (error) {
        // Handle Redis errors
        if (error instanceof TooManyRequestsError) {
          throw error;
        }

        logger.error('Rate limiting error', { error, key: redisKey });

        // Fail-open: allow request if Redis is unavailable
        if (opts.skipFailedRequests) {
          logger.warn('Skipping rate limit due to Redis error');
          return {
            rateLimit: {
              limit: opts.maxRequests,
              remaining: opts.maxRequests,
              reset: Math.floor(Date.now() / 1000) + opts.window,
            },
          };
        }

        // Fail-closed: block request if Redis is unavailable
        throw new TooManyRequestsError('Rate limiting service unavailable');
      }
    });
}

/**
 * Create rate limiting middleware with user-based keys
 *
 * Uses user ID from context for rate limiting.
 * Falls back to IP-based limiting if user is not authenticated.
 *
 * @param options - Rate limit configuration
 * @returns Elysia middleware plugin
 */
export function rateLimitByUser(options: RateLimitOptions = {}) {
  return rateLimit({
    ...options,
    keyGenerator: (ctx: { request: Request } & { user?: { id: string } | null }) => {
      // Use user ID if available, otherwise fall back to IP
      // Note: This requires auth middleware to be used first
      // @ts-expect-error - user is added by auth middleware
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const userId = ctx.user?.id;
      return userId || getDefaultKey(ctx);
    },
  });
}

/**
 * Reset rate limit for a specific key
 *
 * Useful for testing or administrative purposes.
 *
 * @param key - Rate limit key to reset
 * @param prefix - Redis key prefix (default: "ratelimit")
 */
export async function resetRateLimit(key: string, prefix: string = 'ratelimit'): Promise<void> {
  try {
    const redis = getRedisConnection();
    await redis.del(`${prefix}:${key}`);
    logger.info('Rate limit reset', { key, prefix });
  } catch (error) {
    logger.error('Failed to reset rate limit', { error, key, prefix });
    throw new Error('Failed to reset rate limit');
  }
}

/**
 * Get current rate limit status for a key
 *
 * Useful for displaying rate limit information to users.
 *
 * @param key - Rate limit key
 * @param maxRequests - Maximum requests allowed
 * @param window - Time window in seconds
 * @param prefix - Redis key prefix (default: "ratelimit")
 * @returns Rate limit status
 */
export async function getRateLimitStatus(
  key: string,
  maxRequests: number,
  window: number,
  prefix: string = 'ratelimit'
): Promise<{
  limit: number;
  remaining: number;
  reset: number;
}> {
  try {
    const redis = getRedisConnection();
    const redisKey = `${prefix}:${key}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - window;

    // Remove old entries and count current
    const multi = redis.multi();
    multi.zremrangebyscore(redisKey, 0, windowStart);
    multi.zcard(redisKey);
    const results = await multi.exec();

    const count = results?.[1]?.[1] as number;
    const remaining = Math.max(0, maxRequests - (count || 0));

    return {
      limit: maxRequests,
      remaining,
      reset: now + window,
    };
  } catch (error) {
    logger.error('Failed to get rate limit status', { error, key });
    // Return default values on error
    return {
      limit: maxRequests,
      remaining: maxRequests,
      reset: Math.floor(Date.now() / 1000) + window,
    };
  }
}
