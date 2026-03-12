import type { Elysia } from 'elysia';
import { TooManyRequestsError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';
import { getRedisConnection } from '../core/redis/connection';

export interface RateLimitOptions {
  maxRequests?: number;
  window?: number;
  keyGenerator?: (ctx: { request: Request; user?: { id?: string } | null }) => string;
  skipFailedRequests?: boolean;
  errorMessage?: string;
  prefix?: string;
  strategy?: 'ip' | 'user_or_ip';
}

const DEFAULT_OPTIONS: Required<Omit<RateLimitOptions, 'keyGenerator'>> = {
  maxRequests: 100,
  window: 60,
  skipFailedRequests: true,
  errorMessage: 'Too many requests',
  prefix: 'ratelimit',
  strategy: 'ip',
};

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

function buildDefaultKey(ctx: { request: Request; user?: { id?: string } | null }, strategy: 'ip' | 'user_or_ip'): string {
  const path = new URL(ctx.request.url).pathname;
  const method = ctx.request.method;

  if (strategy === 'user_or_ip' && ctx.user?.id) {
    return `user:${ctx.user.id}:${method}:${path}`;
  }

  return `ip:${getClientIp(ctx.request)}:${method}:${path}`;
}

async function enforce(
  ctx: { request: Request; user?: { id?: string } | null },
  options: Required<Omit<RateLimitOptions, 'keyGenerator'>> & {
    keyGenerator?: (ctx: { request: Request; user?: { id?: string } | null }) => string;
  }
): Promise<{ limit: number; remaining: number; reset: number }> {
  const key = options.keyGenerator?.(ctx) || buildDefaultKey(ctx, options.strategy);
  const redisKey = `${options.prefix}:${key}`;

  try {
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
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      throw error;
    }

    logger.error('Rate limiting error', { error, key: redisKey });

    if (options.skipFailedRequests) {
      return {
        limit: options.maxRequests,
        remaining: options.maxRequests,
        reset: Math.floor(Date.now() / 1000) + options.window,
      };
    }

    throw new TooManyRequestsError('Rate limiting service unavailable');
  }
}

export function enforceRateLimit(options: RateLimitOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (ctx: { request: Request; user?: { id?: string } | null; rateLimit?: unknown }) => {
    const status = await enforce(
      {
        request: ctx.request,
        user: ctx.user,
      },
      opts
    );

    return {
      rateLimit: status,
    };
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
