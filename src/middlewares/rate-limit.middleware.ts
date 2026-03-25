import type { Elysia } from 'elysia';
import { TooManyRequestsError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';
import { getRedisConnection, isRedisHealthy } from '../core/redis/connection';
import { checkAndConsume } from '../helpers/rate-limiter.helper';
import { getClientIp } from '../helpers/ip.helper';

export interface RateLimitOptions {
  maxRequests?: number;
  window?: number;
  keyGenerator?: (ctx: { request: Request; user?: { id?: string } | null }) => string;
  skipFailedRequests?: boolean;
  errorMessage?: string;
  prefix?: string;
  strategy?: 'ip' | 'user_or_ip';
}

interface RateLimitStatus {
  limit: number;
  remaining: number;
  reset: number;
}

const DEFAULT_OPTIONS: Required<Omit<RateLimitOptions, 'keyGenerator'>> = {
  maxRequests: 100,
  window: 60,
  skipFailedRequests: true,
  errorMessage: 'Too many requests',
  prefix: 'ratelimit',
  strategy: 'ip',
};

function buildDefaultKey(ctx: { request: Request; user?: { id?: string } | null }, strategy: 'ip' | 'user_or_ip'): string {
  const path = new URL(ctx.request.url).pathname;
  const method = ctx.request.method;

  if (strategy === 'user_or_ip' && ctx.user?.id) {
    return `user:${ctx.user.id}:${method}:${path}`;
  }

  return `ip:${getClientIp(ctx.request)}:${method}:${path}`;
}

/**
 * Enforce rate limit using Redis (sorted sets)
 *
 * Uses sliding window algorithm with Redis ZSET.
 * This is the preferred method when Redis is available.
 */
async function enforceWithRedis(key: string, options: Required<Omit<RateLimitOptions, 'keyGenerator'>>): Promise<RateLimitStatus> {
  const redisKey = `${options.prefix}:${key}`;

  const redis = getRedisConnection();
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - options.window;

  const multi = redis.multi();
  multi.zremrangebyscore(redisKey, 0, windowStart);
  multi.zadd(redisKey, now, `${now}-${Math.random()}`);
  multi.zcard(redisKey);
  multi.expire(redisKey, options.window);

  const results = await multi.exec();

  if (!results) {
    throw new Error('Redis transaction failed');
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const count = (results[2]?.[1] as number) || 0;
  const remaining = Math.max(0, options.maxRequests - count);
  const resetTime = now + options.window;

  if (count > options.maxRequests) {
    logger.warn('Rate limit exceeded', {
      key,
      count,
      limit: options.maxRequests,
      window: options.window,
    });

    throw new TooManyRequestsError(options.errorMessage, {
      limit: options.maxRequests,
      remaining: 0,
      reset: resetTime,
    });
  }

  return {
    limit: options.maxRequests,
    remaining,
    reset: resetTime,
  };
}

/**
 * Enforce rate limit using in-memory fallback
 *
 * Uses token bucket algorithm with Map storage.
 * Used when Redis is unavailable to ensure graceful degradation.
 */
function enforceWithInMemory(key: string, options: Required<Omit<RateLimitOptions, 'keyGenerator'>>): RateLimitStatus {
  const windowMs = options.window * 1000;
  const result = checkAndConsume(key, options.maxRequests, windowMs);

  const resetTime = Math.floor(Date.now() / 1000) + options.window;

  if (!result.allowed) {
    logger.warn('Rate limit exceeded (in-memory fallback)', {
      key,
      count: result.current,
      limit: options.maxRequests,
      window: options.window,
    });

    throw new TooManyRequestsError(options.errorMessage, {
      limit: options.maxRequests,
      remaining: 0,
      reset: resetTime,
    });
  }

  return {
    limit: result.limit,
    remaining: result.remaining,
    reset: resetTime,
  };
}

/**
 * Main enforcement function with Redis health check and fallback
 *
 * Flow:
 * 1. Check Redis health using isRedisHealthy()
 * 2. If healthy -> use Redis enforcement (enforceWithRedis)
 * 3. if unhealthy -> use in-memory fallback (enforceWithInMemory) with warning log
 * 4. On Redis errors -> gracefully fall back to in-memory
 *
 * This ensures graceful degradation when Redis is temporarily unavailable,
 * maintaining rate limiting protection without blocking legitimate requests.
 */
async function enforce(
  ctx: { request: Request; user?: { id?: string } | null },
  options: Required<Omit<RateLimitOptions, 'keyGenerator'>> & {
    keyGenerator?: (ctx: { request: Request; user?: { id?: string } | null }) => string;
  }
): Promise<RateLimitStatus> {
  const key = options.keyGenerator?.(ctx) || buildDefaultKey(ctx, options.strategy);

  try {
    // Check Redis health before attempting Redis operations
    const redisHealthy = await isRedisHealthy();

    if (redisHealthy) {
      // Redis is available - use distributed rate limiting
      return await enforceWithRedis(key, options);
    }

    // Redis is unavailable - use in-memory fallback
    logger.warn('Redis unavailable, using in-memory rate limiter fallback', {
      key,
      fallback: 'in-memory',
    });

    return enforceWithInMemory(key, options);
  } catch (error) {
    // Re-throw rate limit errors as-is (client should see 429)
    if (error instanceof TooManyRequestsError) {
      throw error;
    }

    // Unexpected error - log and fall back to in-memory
    logger.error('Rate limiting error, falling back to in-memory', {
      error: error instanceof Error ? error.message : String(error),
      key,
    });

    return enforceWithInMemory(key, options);
  }
}

export function enforceRateLimit(options: RateLimitOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (ctx: { request: Request; user?: { id?: string } | null; rateLimit?: RateLimitStatus }) => {
    const status = await enforce(
      {
        request: ctx.request,
        user: ctx.user,
      },
      opts
    );

    // Store rate limit info in context for later use (e.g., adding headers)
    // Do NOT return anything - returning would short-circuit the handler
    ctx.rateLimit = status;
  };
}

export function rateLimit(options: RateLimitOptions = {}) {
  const beforeHandle = enforceRateLimit(options);

  return (app: Elysia) => app.onBeforeHandle(ctx => beforeHandle(ctx as { request: Request; user?: { id?: string } | null }));
}

export function rateLimitByUser(options: RateLimitOptions = {}) {
  return rateLimit({
    ...options,
    strategy: 'user_or_ip',
  });
}

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

export async function getRateLimitStatus(
  key: string,
  maxRequests: number,
  window: number,
  prefix: string = 'ratelimit'
): Promise<{
  limit: number;
  remaining: number;
  reset: number;
  current: number;
}> {
  try {
    const redis = getRedisConnection();
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - window;
    const redisKey = `${prefix}:${key}`;

    const multi = redis.multi();
    multi.zremrangebyscore(redisKey, 0, windowStart);
    multi.zcard(redisKey);
    multi.ttl(redisKey);

    const results = await multi.exec();

    if (!results) {
      throw new Error('Redis transaction failed');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const current = (results[1]?.[1] as number) || 0;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const ttl = (results[2]?.[1] as number) || window;

    return {
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - current),
      reset: now + ttl,
      current,
    };
  } catch (error) {
    logger.error('Failed to get rate limit status', { error, key, prefix });
    throw new Error('Failed to get rate limit status');
  }
}
