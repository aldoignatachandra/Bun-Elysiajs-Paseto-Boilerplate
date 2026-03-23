# Rate Limiter Redis Fallback - Design Document

> **Document Version:** 1.0.0
> **Last Updated:** 2026-03-23
> **Status:** Ready for Implementation
> **Author:** Backend Engineering Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Analysis](#2-problem-analysis)
3. [Solution Architecture](#3-solution-architecture)
4. [Implementation Details](#4-implementation-details)
5. [File Changes](#5-file-changes)
6. [Testing Strategy](#6-testing-strategy)
7. [Migration Guide](#7-migration-guide)
8. [Risk Assessment](#8-risk-assessment)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Overview

### 1.1 Purpose

Implement an in-memory rate limiter fallback mechanism that activates when Redis becomes unavailable, ensuring graceful degradation without breaking existing functionality.

### 1.2 Objectives

- **Zero Breaking Changes:** Existing API and behavior must remain unchanged when Redis is healthy
- **Graceful Degradation:** Automatic fallback to in-memory rate limiting when Redis is unavailable
- **Production Safety:** No memory leaks, proper cleanup, and visibility through logging
- **Simple Architecture:** Health check on every request (no complex circuit breaker)

### 1.3 Key Decisions

| Decision           | Choice                   | Rationale                                       |
| ------------------ | ------------------------ | ----------------------------------------------- |
| Fallback Algorithm | Token Bucket             | Matches reference project, smooth rate limiting |
| Detection Method   | Health check per request | Simple, reliable, appropriate for boilerplate   |
| Cleanup Interval   | 60 seconds               | Prevents memory leaks, minimal overhead         |
| Storage Location   | `src/helpers/`           | New folder for utility helpers                  |

---

## 2. Problem Analysis

### 2.1 Current State

The current rate limiter (`src/middlewares/rate-limit.middleware.ts`) uses Redis sorted sets (ZSET) for sliding window rate limiting. When Redis fails:

```typescript
// Current behavior (lines 101-117)
catch (error) {
  if (error instanceof TooManyRequestsError) {
    throw error;
  }

  logger.error('Rate limiting error', { error, key: redisKey });

  if (options.skipFailedRequests) {
    return {
      limit: options.maxRequests,
      remaining: options.maxRequests,  // ← Allows ALL requests
      reset: Math.floor(Date.now() / 1000) + options.window,
    };
  }

  throw new TooManyRequestsError('Rate limiting service unavailable');
}
```

### 2.2 Problem with Current Approach

- `skipFailedRequests: true` → **Fail-open**: No rate limiting, potential abuse
- `skipFailedRequests: false` → **Fail-closed**: All requests blocked, poor availability

### 2.3 Desired Behavior

```
Redis HEALTHY → Use Redis (distributed, existing behavior)
Redis UNHEALTHY → Use In-Memory (single instance, token bucket)
```

---

## 3. Solution Architecture

### 3.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        REQUEST ARRIVES                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Call isRedisHealthy()                          │
│                  (Redis PING command)                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
        ┌───────────────┐              ┌───────────────┐
        │ Redis HEALTHY │              │ Redis UNHEALTHY│
        └───────────────┘              └───────────────┘
                │                               │
                ▼                               ▼
┌─────────────────────────┐    ┌─────────────────────────────────┐
│ enforceWithRedis()      │    │ enforceWithInMemory()           │
│ - Sorted sets (ZSET)    │    │ - Token bucket algorithm        │
│ - Distributed           │    │ - Map<string, Bucket>           │
│ - Existing behavior     │    │ - Periodic cleanup (60s)        │
└─────────────────────────┘    │ - Log warning                   │
                               └─────────────────────────────────┘
                │                               │
                └───────────────┬───────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RETURN RATE LIMIT STATUS                     │
│              { limit, remaining, reset }                        │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Token Bucket Algorithm

The in-memory fallback uses a **token bucket** algorithm with lazy refill:

```
Bucket Structure:
┌────────────────────────────────────────┐
│ key: "user:123:GET:/api/v1/users/me"   │
├────────────────────────────────────────┤
│ tokens: 95.5      (current tokens)     │
│ lastRefill: 1711089600000 (timestamp)  │
│ limit: 100        (max tokens)         │
│ windowMs: 60000   (window in ms)       │
│ expiresAt: 1711089660000 (cleanup)     │
└────────────────────────────────────────┘

Algorithm:
1. On each request, calculate elapsed time since last refill
2. Add tokens = elapsed * (limit / windowMs)
3. Cap tokens at limit
4. If tokens >= 1: consume 1 token, allow request
5. If tokens < 1: deny request, calculate retryAfter
```

### 3.3 Memory Management

```
Cleanup Mechanism (every 60 seconds):
┌─────────────────────────────────────────────────────────────────┐
│                    Periodic Cleanup                              │
├─────────────────────────────────────────────────────────────────┤
│ for (const [key, bucket] of buckets.entries()) {               │
│   if (bucket.expiresAt <= now) {                               │
│     buckets.delete(key);  // Remove expired bucket             │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘

Expiration:
- Each bucket expires at: lastAccessTime + windowMs
- Expired buckets are removed during next cleanup cycle
- Maximum memory growth bounded by unique keys in 60-second window
```

---

## 4. Implementation Details

### 4.1 New File: `src/helpers/in-memory-rate-limiter.ts`

```typescript
/**
 * In-Memory Rate Limiter
 *
 * Token bucket implementation for graceful degradation when Redis is unavailable.
 * Based on reference implementation from bun-hono-kafkajs-boilerplate.
 *
 * IMPORTANT: This is a SINGLE-INSTANCE solution. In multi-instance deployments,
 * each instance maintains its own rate limit state. Use only as fallback.
 */

/**
 * Bucket state for a single rate limit key
 */
type Bucket = {
  /** Current number of tokens available (can be fractional) */
  tokens: number;
  /** Timestamp of last token refill (ms since epoch) */
  lastRefill: number;
  /** Maximum tokens allowed (equals maxRequests) */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Expiration timestamp for cleanup (ms since epoch) */
  expiresAt: number;
};

/**
 * Result of a rate limit check
 */
export type InMemoryRateLimitResult = {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Seconds until client should retry (0 if allowed) */
  retryAfter: number;
  /** Remaining requests in current window */
  remaining: number;
  /** Maximum requests allowed */
  limit: number;
  /** Current request count in window */
  current: number;
};

// In-memory bucket store: key -> Bucket
const buckets = new Map<string, Bucket>();

// Last cleanup timestamp to avoid frequent scans
let lastCleanup = 0;

// Cleanup interval in milliseconds (60 seconds)
const CLEANUP_INTERVAL_MS = 60000;

/**
 * Remove expired buckets to prevent memory leaks
 *
 * Runs at most once per CLEANUP_INTERVAL_MS to minimize overhead.
 * Buckets are considered expired when their expiresAt <= current time.
 *
 * @param now - Current timestamp in milliseconds
 */
function cleanupBuckets(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanup = now;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.expiresAt <= now) {
      buckets.delete(key);
    }
  }
}

/**
 * Check rate limit and consume a token if allowed
 *
 * Implements token bucket algorithm with lazy refill:
 * 1. Calculate elapsed time since last refill
 * 2. Add tokens based on refill rate (limit / windowMs)
 * 3. Cap tokens at limit
 * 4. Consume 1 token if available
 * 5. Return result with remaining count and retry info
 *
 * @param key - Unique identifier for rate limit bucket (e.g., "user:123:GET:/api/users")
 * @param limit - Maximum requests allowed in window
 * @param windowMs - Window duration in milliseconds
 * @param now - Current timestamp (defaults to Date.now())
 * @returns Rate limit result with allowed status and remaining count
 */
export function checkAndConsume(key: string, limit: number, windowMs: number, now: number = Date.now()): InMemoryRateLimitResult {
  // Run cleanup to prevent memory leaks
  cleanupBuckets(now);

  const existing = buckets.get(key);
  const refillRate = limit / windowMs; // tokens per millisecond

  // Case 1: New bucket, expired bucket, or policy change
  if (!existing || existing.limit !== limit || existing.windowMs !== windowMs || existing.expiresAt <= now) {
    const bucket: Bucket = {
      tokens: limit - 1, // Consume first token immediately
      lastRefill: now,
      limit,
      windowMs,
      expiresAt: now + windowMs,
    };
    buckets.set(key, bucket);

    return {
      allowed: true,
      retryAfter: 0,
      remaining: bucket.tokens,
      limit,
      current: 1,
    };
  }

  // Case 2: Existing bucket - refill tokens based on elapsed time
  const elapsed = now - existing.lastRefill;

  if (elapsed > 0) {
    // Add tokens based on time passed
    existing.tokens = Math.min(limit, existing.tokens + elapsed * refillRate);
    existing.lastRefill = now;
  }

  // Update expiration to keep bucket alive
  existing.expiresAt = now + windowMs;

  // Calculate current request count
  const current = Math.ceil(limit - existing.tokens);

  // Case 2a: Tokens available - consume and allow
  if (existing.tokens >= 1) {
    existing.tokens -= 1;

    return {
      allowed: true,
      retryAfter: 0,
      remaining: Math.floor(existing.tokens),
      limit,
      current,
    };
  }

  // Case 2b: No tokens - rate limited
  // Calculate time until next token is available
  const msUntilNext = Math.ceil((1 - existing.tokens) / refillRate);
  const retryAfter = Math.max(1, Math.ceil(msUntilNext / 1000));

  return {
    allowed: false,
    retryAfter,
    remaining: 0,
    limit,
    current,
  };
}

/**
 * Reset the in-memory store (for testing only)
 *
 * Clears all buckets and resets cleanup timer.
 * Should only be used in test environments.
 */
export function resetInMemoryStore(): void {
  buckets.clear();
  lastCleanup = 0;
}

/**
 * Get current bucket count (for monitoring/debugging)
 *
 * @returns Number of active buckets in memory
 */
export function getBucketCount(): number {
  return buckets.size;
}

/**
 * Get all bucket keys (for debugging only)
 *
 * @returns Array of bucket keys
 */
export function getBucketKeys(): string[] {
  return Array.from(buckets.keys());
}
```

### 4.2 Modified File: `src/middlewares/rate-limit.middleware.ts`

**Changes Required:**

1. Add new import for in-memory rate limiter and Redis health check
2. Extract Redis enforcement to separate function
3. Add in-memory enforcement function
4. Modify main `enforce` function to check Redis health and route accordingly

**Full Modified File:**

```typescript
import type { Elysia } from 'elysia';
import { TooManyRequestsError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';
import { getRedisConnection, isRedisHealthy } from '../core/redis/connection';
import { checkAndConsume } from '../helpers/in-memory-rate-limiter';

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

/**
 * Enforce rate limit using Redis (sorted sets)
 *
 * Uses sliding window algorithm with Redis ZSET.
 * This is the preferred method when Redis is available.
 */
async function enforceWithRedis(
  key: string,
  options: Required<Omit<RateLimitOptions, 'keyGenerator'>>
): Promise<{ limit: number; remaining: number; reset: number }> {
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
function enforceWithInMemory(
  key: string,
  options: Required<Omit<RateLimitOptions, 'keyGenerator'>>
): { limit: number; remaining: number; reset: number } {
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
 * 1. Check Redis health
 * 2. If healthy → use Redis enforcement
 * 3. If unhealthy → use in-memory fallback with warning log
 */
async function enforce(
  ctx: { request: Request; user?: { id?: string } | null },
  options: Required<Omit<RateLimitOptions, 'keyGenerator'>> & {
    keyGenerator?: (ctx: { request: Request; user?: { id?: string } | null }) => string;
  }
): Promise<{ limit: number; remaining: number; reset: number }> {
  const key = options.keyGenerator?.(ctx) || buildDefaultKey(ctx, options.strategy);

  try {
    // Check Redis health before attempting Redis operations
    const redisHealthy = await isRedisHealthy();

    if (redisHealthy) {
      // Use Redis (preferred)
      return await enforceWithRedis(key, options);
    }

    // Fallback to in-memory
    logger.warn('Redis unavailable, using in-memory rate limiter fallback', {
      key,
      fallback: 'in-memory',
    });

    return enforceWithInMemory(key, options);
  } catch (error) {
    // Handle Redis-specific errors during enforcement
    if (error instanceof TooManyRequestsError) {
      throw error;
    }

    logger.error('Rate limiting error, falling back to in-memory', {
      error,
      key,
    });

    // Fallback to in-memory on any Redis error
    return enforceWithInMemory(key, options);
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
```

### 4.3 Update tsconfig.json (Optional Path Alias)

Add `@helpers/*` path alias for consistency with existing patterns:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"],
      "@helpers/*": ["src/helpers/*"]
      // ... existing paths
    }
  }
}
```

---

## 5. File Changes

### 5.1 Summary Table

| File                                                   | Action     | Lines Changed | Risk Level |
| ------------------------------------------------------ | ---------- | ------------- | ---------- |
| `src/helpers/in-memory-rate-limiter.ts`                | **CREATE** | ~180 lines    | Low        |
| `src/middlewares/rate-limit.middleware.ts`             | **MODIFY** | ~50 lines     | Medium     |
| `tests/unit/helpers/in-memory-rate-limiter.test.ts`    | **CREATE** | ~150 lines    | Low        |
| `tests/unit/middlewares/rate-limit.middleware.test.ts` | **MODIFY** | ~80 lines     | Medium     |
| `tsconfig.json`                                        | **MODIFY** | 1 line        | Low        |

### 5.2 Detailed Changes

#### `src/middlewares/rate-limit.middleware.ts` - Specific Modifications

**Lines to ADD (imports):**

```typescript
// Line 4 - Add import
import { getRedisConnection, isRedisHealthy } from '../core/redis/connection';

// Line 5 - Add new import
import { checkAndConsume } from '../helpers/in-memory-rate-limiter';
```

**Lines to MODIFY (enforce function):**

- Lines 50-118: Refactor into `enforceWithRedis`, `enforceWithInMemory`, and `enforce`
- Add health check logic at start of `enforce`
- Add try-catch for fallback on Redis errors

**Existing functions UNCHANGED:**

- `getClientIp` (lines 25-37)
- `buildDefaultKey` (lines 39-48)
- `enforceRateLimit` (lines 120-136)
- `rateLimit` (lines 138-142)
- `rateLimitByUser` (lines 144-149)
- `resetRateLimit` (lines 151-160)
- `getRateLimitStatus` (lines 162-205)

---

## 6. Testing Strategy

### 6.1 Unit Tests: In-Memory Rate Limiter

**File:** `tests/unit/helpers/in-memory-rate-limiter.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { checkAndConsume, resetInMemoryStore, getBucketCount } from '../../../src/helpers/in-memory-rate-limiter';

describe('In-Memory Rate Limiter', () => {
  beforeEach(() => {
    resetInMemoryStore();
  });

  describe('checkAndConsume', () => {
    it('should allow first request within limit', () => {
      const result = checkAndConsume('test-key', 10, 60000, 1000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.limit).toBe(10);
      expect(result.current).toBe(1);
      expect(result.retryAfter).toBe(0);
    });

    it('should block request after limit exceeded', () => {
      const key = 'test-key';
      const limit = 3;
      const windowMs = 60000;
      const now = 1000;

      // Consume all tokens
      checkAndConsume(key, limit, windowMs, now);
      checkAndConsume(key, limit, windowMs, now + 1);
      checkAndConsume(key, limit, windowMs, now + 2);

      // Fourth request should be blocked
      const result = checkAndConsume(key, limit, windowMs, now + 3);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should refill tokens after time passes', () => {
      const key = 'test-key';
      const limit = 2;
      const windowMs = 1000; // 1 second window

      // Consume all tokens
      checkAndConsume(key, limit, windowMs, 1000);
      const blocked = checkAndConsume(key, limit, windowMs, 1001);

      expect(blocked.allowed).toBe(false);

      // Wait for window to pass (tokens refill)
      const allowed = checkAndConsume(key, limit, windowMs, 2500);

      expect(allowed.allowed).toBe(true);
    });

    it('should handle multiple independent keys', () => {
      const result1 = checkAndConsume('key-1', 5, 60000, 1000);
      const result2 = checkAndConsume('key-2', 5, 60000, 1000);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(getBucketCount()).toBe(2);
    });

    it('should create new bucket when limit changes', () => {
      const key = 'test-key';

      const result1 = checkAndConsume(key, 10, 60000, 1000);
      expect(result1.limit).toBe(10);

      // Change limit - should create new bucket
      const result2 = checkAndConsume(key, 20, 60000, 2000);
      expect(result2.limit).toBe(20);
    });

    it('should create new bucket when window changes', () => {
      const key = 'test-key';

      const result1 = checkAndConsume(key, 10, 60000, 1000);
      expect(result1.remaining).toBe(9);

      // Change window - should create new bucket
      const result2 = checkAndConsume(key, 10, 120000, 2000);
      expect(result2.remaining).toBe(9); // Fresh bucket
    });

    it('should calculate correct retryAfter', () => {
      const key = 'test-key';
      const limit = 1;
      const windowMs = 1000;

      checkAndConsume(key, limit, windowMs, 1000);
      const result = checkAndConsume(key, limit, windowMs, 1001);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThanOrEqual(1);
    });
  });

  describe('resetInMemoryStore', () => {
    it('should clear all buckets', () => {
      checkAndConsume('key-1', 10, 60000, 1000);
      checkAndConsume('key-2', 10, 60000, 1000);

      expect(getBucketCount()).toBe(2);

      resetInMemoryStore();

      expect(getBucketCount()).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should remove expired buckets during cleanup', () => {
      const key = 'test-key';
      const windowMs = 1000;

      // Create bucket at time 1000
      checkAndConsume(key, 10, windowMs, 1000);

      // Move time past cleanup interval AND bucket expiration
      // Cleanup runs every 60000ms, bucket expires at 1000 + 1000 = 2000
      const farFuture = 1000 + 60000 + 2000;

      // This should trigger cleanup and remove expired bucket
      checkAndConsume('new-key', 10, windowMs, farFuture);

      // Old bucket should be cleaned up
      // Only new-key bucket should exist
      expect(getBucketCount()).toBe(1);
    });
  });
});
```

### 6.2 Unit Tests: Rate Limit Middleware (Modifications)

**Add to existing file:** `tests/unit/middlewares/rate-limit.middleware.test.ts`

```typescript
describe('Redis Fallback', () => {
  it('should use Redis when healthy', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();

    const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

    const beforeHandle = enforceRateLimit({ maxRequests: 10, window: 60 });

    const ctx = {
      request: new Request('http://localhost/test'),
      user: null,
    };

    await beforeHandle(ctx);

    // Redis operations should have been called
    expect(mockRedis.multi).toHaveBeenCalled();
    expect(mockRedis.ping).toHaveBeenCalled();
  });

  it('should fallback to in-memory when Redis is unhealthy', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();

    // Make Redis unhealthy
    mockRedis.ping = vi.fn(async () => {
      throw new Error('Redis connection refused');
    });

    const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

    const beforeHandle = enforceRateLimit({ maxRequests: 5, window: 60 });

    const ctx = {
      request: new Request('http://localhost/test'),
      user: null,
    };

    // Should still work with in-memory fallback
    const result = await beforeHandle(ctx);

    expect(result.rateLimit.limit).toBe(5);
    expect(result.rateLimit.remaining).toBe(4);

    // Should have logged warning
    expect(mockLogger.warn).toHaveBeenCalledWith(
      'Redis unavailable, using in-memory rate limiter fallback',
      expect.objectContaining({ fallback: 'in-memory' })
    );
  });

  it('should fallback to in-memory when Redis multi fails', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();

    // Make Redis multi fail
    mockRedis.multi = vi.fn(() => {
      throw new Error('Redis multi error');
    });

    const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');

    const beforeHandle = enforceRateLimit({ maxRequests: 5, window: 60 });

    const ctx = {
      request: new Request('http://localhost/test'),
      user: null,
    };

    // Should fallback gracefully
    const result = await beforeHandle(ctx);

    expect(result.rateLimit.limit).toBe(5);
  });

  it('should respect rate limit in fallback mode', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();

    // Make Redis unhealthy
    mockRedis.ping = vi.fn(async () => {
      throw new Error('Redis connection refused');
    });

    const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');
    const { resetInMemoryStore } = await import('@/helpers/in-memory-rate-limiter');

    resetInMemoryStore();

    const beforeHandle = enforceRateLimit({ maxRequests: 2, window: 60 });

    const ctx = {
      request: new Request('http://localhost/test'),
      user: null,
    };

    // First two should succeed
    await beforeHandle(ctx);
    await beforeHandle(ctx);

    // Third should fail
    await expect(beforeHandle(ctx)).rejects.toThrow(TooManyRequestsError);
  });
});
```

---

## 7. Migration Guide

### 7.1 No Code Changes Required for Existing Users

The implementation is **fully backward compatible**:

- All existing exports remain unchanged
- All existing function signatures remain unchanged
- Default behavior remains the same when Redis is healthy

### 7.2 New Behavior

| Scenario                                      | Before             | After                  |
| --------------------------------------------- | ------------------ | ---------------------- |
| Redis healthy                                 | Use Redis          | Use Redis (unchanged)  |
| Redis unhealthy + `skipFailedRequests: true`  | Allow all requests | Use in-memory fallback |
| Redis unhealthy + `skipFailedRequests: false` | Block all requests | Use in-memory fallback |

### 7.3 Monitoring Recommendations

Add monitoring for the warning log to detect when fallback is active:

```typescript
// Alert when this log appears frequently
logger.warn('Redis unavailable, using in-memory rate limiter fallback', ...)
```

---

## 8. Risk Assessment

### 8.1 Risk Matrix

| Risk                      | Likelihood | Impact | Mitigation                           | Status       |
| ------------------------- | ---------- | ------ | ------------------------------------ | ------------ |
| Breaking existing tests   | Medium     | High   | Run full test suite before/after     | ✅ Mitigated |
| Memory leak in Map        | Low        | Medium | Cleanup every 60s, bucket expiration | ✅ Mitigated |
| Inconsistent behavior     | Low        | Medium | Comprehensive unit tests             | ✅ Mitigated |
| Health check adds latency | High       | Low    | ~1-5ms per request, acceptable       | ⚠️ Accepted  |
| Multi-instance drift      | Certain    | Low    | Documented as fallback only          | ⚠️ Accepted  |

### 8.2 Rollback Plan

If issues arise:

1. **Immediate:** Set `skipFailedRequests: true` (reverts to previous fail-open behavior)
2. **Code rollback:** Revert `rate-limit.middleware.ts` to previous version
3. **Full rollback:** Delete `src/helpers/in-memory-rate-limiter.ts`

---

## 9. Implementation Checklist

### Phase 1: Create In-Memory Rate Limiter

- [ ] Create `src/helpers/` directory
- [ ] Create `src/helpers/in-memory-rate-limiter.ts`
- [ ] Implement `Bucket` type
- [ ] Implement `InMemoryRateLimitResult` type
- [ ] Implement `cleanupBuckets` function
- [ ] Implement `checkAndConsume` function
- [ ] Implement `resetInMemoryStore` function
- [ ] Implement `getBucketCount` function

### Phase 2: Create Tests for In-Memory Rate Limiter

- [ ] Create `tests/unit/helpers/` directory
- [ ] Create `tests/unit/helpers/in-memory-rate-limiter.test.ts`
- [ ] Test: Allow first request within limit
- [ ] Test: Block request after limit exceeded
- [ ] Test: Refill tokens after time passes
- [ ] Test: Handle multiple independent keys
- [ ] Test: Create new bucket when limit changes
- [ ] Test: Create new bucket when window changes
- [ ] Test: Calculate correct retryAfter
- [ ] Test: Clear all buckets with reset
- [ ] Test: Remove expired buckets during cleanup

### Phase 3: Modify Rate Limit Middleware

- [ ] Add import for `isRedisHealthy`
- [ ] Add import for `checkAndConsume`
- [ ] Extract `enforceWithRedis` function
- [ ] Create `enforceWithInMemory` function
- [ ] Modify `enforce` function with health check
- [ ] Add try-catch for Redis errors
- [ ] Add warning log for fallback activation

### Phase 4: Add Middleware Fallback Tests

- [ ] Test: Use Redis when healthy
- [ ] Test: Fallback to in-memory when Redis unhealthy
- [ ] Test: Fallback when Redis multi fails
- [ ] Test: Respect rate limit in fallback mode

### Phase 5: Optional Configuration

- [ ] Add `@helpers/*` path alias to `tsconfig.json` (optional)

### Phase 6: Verification

- [ ] Run all existing tests: `bun test`
- [ ] Verify no breaking changes
- [ ] Manual test with Redis down
- [ ] Review memory usage under load

---

## Appendix A: Reference Implementation

The in-memory rate limiter is based on the reference implementation from:
`/Users/ignata/Desktop/Self Project/Project-Javascript/bun-hono-kafkajs-boilerplate/service-auth/src/helpers/rate-limiter.ts`

Key differences from reference:

1. Added `current` field to result for consistency with Redis implementation
2. Added `getBucketCount` and `getBucketKeys` for monitoring
3. Added comprehensive JSDoc documentation
4. Added TypeScript strict types

---

## Appendix B: Performance Characteristics

| Operation            | Time Complexity | Space Complexity           |
| -------------------- | --------------- | -------------------------- |
| `checkAndConsume`    | O(1) average    | O(K) where K = unique keys |
| `cleanupBuckets`     | O(K) every 60s  | -                          |
| `resetInMemoryStore` | O(K)            | -                          |

Expected memory usage:

- Each bucket: ~100 bytes
- 10,000 unique keys: ~1 MB
- 100,000 unique keys: ~10 MB

---

**End of Document**
