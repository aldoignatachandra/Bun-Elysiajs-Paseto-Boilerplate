# Rate Limiter Redis Fallback Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement in-memory rate limiter fallback that activates when Redis is unavailable, ensuring graceful degradation without breaking existing functionality.

**Architecture:** Token bucket algorithm stored in Map<string, Bucket> with periodic cleanup (60s). Health check on every request routes to Redis when healthy, in-memory fallback when unhealthy. Zero breaking changes to existing API.

**Tech Stack:** TypeScript, Bun test framework, Map data structure, existing Redis infrastructure

**Design Doc:** `docs/plans/2026-03-23-rate-limiter-redis-fallback-design.md`

---

## Phase 1: In-Memory Rate Limiter Helper

### Task 1.1: Create helpers directory structure

**Files:**

- Create: `src/helpers/` (directory)
- Create: `tests/unit/helpers/` (directory)

**Step 1: Create the helpers directory**

Run:

```bash
mkdir -p src/helpers tests/unit/helpers
```

**Step 2: Verify directories exist**

Run:

```bash
ls -la src/helpers tests/unit/helpers
```

Expected: Empty directories created

---

### Task 1.2: Write in-memory rate limiter type definitions

**Files:**

- Create: `src/helpers/in-memory-rate-limiter.ts`

**Step 1: Create the file with type definitions**

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
```

**Step 2: Verify TypeScript compiles**

Run:

```bash
bun run tsc --noEmit src/helpers/in-memory-rate-limiter.ts
```

Expected: No errors

---

### Task 1.3: Implement bucket storage and cleanup

**Files:**

- Modify: `src/helpers/in-memory-rate-limiter.ts`

**Step 1: Add bucket storage and cleanup function**

Append to file after the type definitions:

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run:

```bash
bun run tsc --noEmit src/helpers/in-memory-rate-limiter.ts
```

Expected: No errors

---

### Task 1.4: Implement checkAndConsume function

**Files:**

- Modify: `src/helpers/in-memory-rate-limiter.ts`

**Step 1: Add the main checkAndConsume function**

Append to file:

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run:

```bash
bun run tsc --noEmit src/helpers/in-memory-rate-limiter.ts
```

Expected: No errors

---

### Task 1.5: Add utility functions for testing and monitoring

**Files:**

- Modify: `src/helpers/in-memory-rate-limiter.ts`

**Step 1: Add reset and monitoring functions**

Append to file:

```typescript
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

**Step 2: Verify full file compiles**

Run:

```bash
bun run tsc --noEmit src/helpers/in-memory-rate-limiter.ts
```

Expected: No errors

**Step 3: Commit in-memory rate limiter helper**

Run:

```bash
git add src/helpers/in-memory-rate-limiter.ts
git commit -m "add(helpers): in-memory rate limiter with token bucket algorithm"
```

---

## Phase 2: In-Memory Rate Limiter Tests

### Task 2.1: Write basic functionality tests

**Files:**

- Create: `tests/unit/helpers/in-memory-rate-limiter.test.ts`

**Step 1: Create test file with basic tests**

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

    it('should decrement remaining on each request', () => {
      const key = 'test-key';
      const limit = 5;
      const windowMs = 60000;
      const now = 1000;

      const result1 = checkAndConsume(key, limit, windowMs, now);
      expect(result1.remaining).toBe(4);

      const result2 = checkAndConsume(key, limit, windowMs, now + 1);
      expect(result2.remaining).toBe(3);

      const result3 = checkAndConsume(key, limit, windowMs, now + 2);
      expect(result3.remaining).toBe(2);
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
  });
});
```

**Step 2: Run tests to verify they pass**

Run:

```bash
bun test tests/unit/helpers/in-memory-rate-limiter.test.ts
```

Expected: All tests pass

---

### Task 2.2: Write token refill tests

**Files:**

- Modify: `tests/unit/helpers/in-memory-rate-limiter.test.ts`

**Step 1: Add refill tests inside the describe('checkAndConsume') block**

Add after the last test:

```typescript
it('should refill tokens after time passes', () => {
  const key = 'test-key';
  const limit = 2;
  const windowMs = 1000; // 1 second window

  // Consume all tokens
  checkAndConsume(key, limit, windowMs, 1000);
  const blocked = checkAndConsume(key, limit, windowMs, 1001);

  expect(blocked.allowed).toBe(false);

  // Wait for window to pass (tokens refill)
  // At 1500ms, 0.5 tokens refilled (not enough)
  const stillBlocked = checkAndConsume(key, limit, windowMs, 1500);
  expect(stillBlocked.allowed).toBe(false);

  // At 2001ms, full window passed, should have new tokens
  const allowed = checkAndConsume(key, limit, windowMs, 2500);
  expect(allowed.allowed).toBe(true);
});

it('should cap tokens at limit', () => {
  const key = 'test-key';
  const limit = 5;
  const windowMs = 1000;

  // Make one request
  checkAndConsume(key, limit, windowMs, 1000);

  // Wait a long time (should cap at limit, not exceed)
  const result = checkAndConsume(key, limit, windowMs, 100000);
  expect(result.remaining).toBe(4); // limit - 1 (current request)
});
```

**Step 2: Run tests to verify they pass**

Run:

```bash
bun test tests/unit/helpers/in-memory-rate-limiter.test.ts
```

Expected: All tests pass

---

### Task 2.3: Write multi-key and policy change tests

**Files:**

- Modify: `tests/unit/helpers/in-memory-rate-limiter.test.ts`

**Step 1: Add multi-key and policy tests**

Add a new describe block after the existing one:

```typescript
describe('multiple keys', () => {
  it('should handle multiple independent keys', () => {
    const result1 = checkAndConsume('key-1', 5, 60000, 1000);
    const result2 = checkAndConsume('key-2', 5, 60000, 1000);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(getBucketCount()).toBe(2);
  });

  it('should track each key independently', () => {
    // Exhaust key-1
    checkAndConsume('key-1', 2, 60000, 1000);
    checkAndConsume('key-1', 2, 60000, 1001);
    const key1Result = checkAndConsume('key-1', 2, 60000, 1002);
    expect(key1Result.allowed).toBe(false);

    // key-2 should still work
    const key2Result = checkAndConsume('key-2', 2, 60000, 1002);
    expect(key2Result.allowed).toBe(true);
  });
});

describe('policy changes', () => {
  it('should create new bucket when limit changes', () => {
    const key = 'test-key';

    const result1 = checkAndConsume(key, 10, 60000, 1000);
    expect(result1.limit).toBe(10);

    // Change limit - should create new bucket
    const result2 = checkAndConsume(key, 20, 60000, 2000);
    expect(result2.limit).toBe(20);
    expect(result2.remaining).toBe(19); // Fresh bucket
  });

  it('should create new bucket when window changes', () => {
    const key = 'test-key';

    const result1 = checkAndConsume(key, 10, 60000, 1000);
    expect(result1.remaining).toBe(9);

    // Change window - should create new bucket
    const result2 = checkAndConsume(key, 10, 120000, 2000);
    expect(result2.remaining).toBe(9); // Fresh bucket
  });
});
```

**Step 2: Run tests to verify they pass**

Run:

```bash
bun test tests/unit/helpers/in-memory-rate-limiter.test.ts
```

Expected: All tests pass

---

### Task 2.4: Write cleanup and utility function tests

**Files:**

- Modify: `tests/unit/helpers/in-memory-rate-limiter.test.ts`

**Step 1: Add cleanup and utility tests**

Add new describe blocks:

```typescript
describe('resetInMemoryStore', () => {
  it('should clear all buckets', () => {
    checkAndConsume('key-1', 10, 60000, 1000);
    checkAndConsume('key-2', 10, 60000, 1000);

    expect(getBucketCount()).toBe(2);

    resetInMemoryStore();

    expect(getBucketCount()).toBe(0);
  });

  it('should reset cleanup timer', () => {
    // Create some buckets
    checkAndConsume('key-1', 10, 60000, 1000);

    resetInMemoryStore();

    // After reset, should start fresh
    checkAndConsume('key-2', 10, 60000, 1000);
    expect(getBucketCount()).toBe(1);
  });
});

describe('getBucketCount', () => {
  it('should return 0 for empty store', () => {
    resetInMemoryStore();
    expect(getBucketCount()).toBe(0);
  });

  it('should return correct count after operations', () => {
    resetInMemoryStore();

    checkAndConsume('key-1', 10, 60000, 1000);
    expect(getBucketCount()).toBe(1);

    checkAndConsume('key-2', 10, 60000, 1000);
    expect(getBucketCount()).toBe(2);

    checkAndConsume('key-1', 10, 60000, 1001); // Same key
    expect(getBucketCount()).toBe(2);
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

    // Old bucket should be cleaned up, only new-key should exist
    expect(getBucketCount()).toBe(1);
  });

  it('should not cleanup before interval', () => {
    checkAndConsume('key-1', 10, 60000, 1000);
    checkAndConsume('key-2', 10, 60000, 2000); // Within cleanup interval

    // Both should still exist
    expect(getBucketCount()).toBe(2);
  });
});
```

**Step 2: Run all tests to verify they pass**

Run:

```bash
bun test tests/unit/helpers/in-memory-rate-limiter.test.ts
```

Expected: All tests pass (11 tests)

**Step 3: Commit tests**

Run:

```bash
git add tests/unit/helpers/in-memory-rate-limiter.test.ts
git commit -m "add(tests): in-memory rate limiter unit tests"
```

---

## Phase 3: Modify Rate Limit Middleware

### Task 3.1: Add new imports to middleware

**Files:**

- Modify: `src/middlewares/rate-limit.middleware.ts`

**Step 1: Update imports at top of file**

Current imports (lines 1-4):

```typescript
import type { Elysia } from 'elysia';
import { TooManyRequestsError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';
import { getRedisConnection } from '../core/redis/connection';
```

Replace with:

```typescript
import type { Elysia } from 'elysia';
import { TooManyRequestsError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';
import { getRedisConnection, isRedisHealthy } from '../core/redis/connection';
import { checkAndConsume } from '../helpers/in-memory-rate-limiter';
```

**Step 2: Verify file compiles**

Run:

```bash
bun run tsc --noEmit src/middlewares/rate-limit.middleware.ts
```

Expected: No errors

---

### Task 3.2: Extract Redis enforcement to separate function

**Files:**

- Modify: `src/middlewares/rate-limit.middleware.ts`

**Step 1: Add enforceWithRedis function after buildDefaultKey function**

Insert after line 48 (after `buildDefaultKey` function):

```typescript
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
```

**Step 2: Verify file compiles**

Run:

```bash
bun run tsc --noEmit src/middlewares/rate-limit.middleware.ts
```

Expected: No errors

---

### Task 3.3: Add in-memory enforcement function

**Files:**

- Modify: `src/middlewares/rate-limit.middleware.ts`

**Step 1: Add enforceWithInMemory function after enforceWithRedis**

Insert after the `enforceWithRedis` function:

```typescript
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
```

**Step 2: Verify file compiles**

Run:

```bash
bun run tsc --noEmit src/middlewares/rate-limit.middleware.ts
```

Expected: No errors

---

### Task 3.4: Replace enforce function with health check version

**Files:**

- Modify: `src/middlewares/rate-limit.middleware.ts`

**Step 1: Find and replace the enforce function**

Find the existing `enforce` function (approximately lines 50-118) and replace it entirely with:

```typescript
/**
 * Main enforcement function with Redis health check and fallback
 *
 * Flow:
 * 1. Check Redis health
 * 2. If healthy -> use Redis enforcement
 * 3. If unhealthy -> use in-memory fallback with warning log
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
```

**Step 2: Verify full file compiles**

Run:

```bash
bun run tsc --noEmit src/middlewares/rate-limit.middleware.ts
```

Expected: No errors

---

### Task 3.5: Run existing middleware tests to verify no breaking changes

**Step 1: Run all rate limit middleware tests**

Run:

```bash
bun test tests/unit/middlewares/rate-limit.middleware.test.ts
```

Expected: All existing tests pass (no breaking changes)

**Step 2: Commit middleware changes**

Run:

```bash
git add src/middlewares/rate-limit.middleware.ts
git commit -m "fix(middleware): add Redis health check with in-memory fallback for rate limiter"
```

---

## Phase 4: Add Fallback Tests to Middleware

### Task 4.1: Add Redis fallback test suite

**Files:**

- Modify: `tests/unit/middlewares/rate-limit.middleware.test.ts`

**Step 1: Add new describe block for Redis Fallback at end of file**

Add before the last closing bracket:

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

  it('should use user ID for key in fallback mode', async () => {
    mockRedis._clear();
    mockRedis._resetImplementations();

    // Make Redis unhealthy
    mockRedis.ping = vi.fn(async () => {
      throw new Error('Redis connection refused');
    });

    const { enforceRateLimit } = await import('@/middlewares/rate-limit.middleware');
    const { resetInMemoryStore } = await import('@/helpers/in-memory-rate-limiter');

    resetInMemoryStore();

    const beforeHandle = enforceRateLimit({ maxRequests: 5, window: 60, strategy: 'user_or_ip' });

    const ctx = {
      request: new Request('http://localhost/test'),
      user: { id: 'user-123' },
    };

    const result = await beforeHandle(ctx);

    expect(result.rateLimit.limit).toBe(5);
  });
});
```

**Step 2: Run all middleware tests**

Run:

```bash
bun test tests/unit/middlewares/rate-limit.middleware.test.ts
```

Expected: All tests pass including new Redis Fallback tests

**Step 3: Commit fallback tests**

Run:

```bash
git add tests/unit/middlewares/rate-limit.middleware.test.ts
git commit -m "add(tests): rate limiter Redis fallback tests"
```

---

## Phase 5: Final Verification

### Task 5.1: Run complete test suite

**Step 1: Run all tests**

Run:

```bash
bun test
```

Expected: All tests pass

**Step 2: Run linting**

Run:

```bash
bun run lint
```

Expected: No errors

---

### Task 5.2: Optional - Add path alias to tsconfig

**Files:**

- Modify: `tsconfig.json`

**Step 1: Add @helpers path alias**

In the `paths` object, add:

```json
"@helpers/*": ["src/helpers/*"]
```

The paths section should look like:

```json
"paths": {
  "@/*": ["src/*"],
  "@config/*": ["src/config/*"],
  "@core/*": ["src/core/*"],
  "@database/*": ["src/database/*"],
  "@helpers/*": ["src/helpers/*"],
  "@plugins/*": ["src/plugins/*"],
  "@repositories/*": ["src/repositories/*"],
  "@services/*": ["src/services/*"],
  "@controllers/*": ["src/controllers/*"],
  "@routes/*": ["src/routes/*"],
  "@middlewares/*": ["src/middlewares/*"],
  "@types/*": ["src/types/*"],
  "@utils/*": ["src/utils/*"]
}
```

**Step 2: Verify TypeScript still compiles**

Run:

```bash
bun run tsc --noEmit
```

Expected: No errors

**Step 3: Commit tsconfig change**

Run:

```bash
git add tsconfig.json
git commit -m "add(tsconfig): add @helpers path alias"
```

---

### Task 5.3: Final commit and summary

**Step 1: Verify all changes are committed**

Run:

```bash
git status
```

Expected: No uncommitted changes

**Step 2: View commit history**

Run:

```bash
git log --oneline -10
```

Expected to see commits for:

- Design document
- In-memory rate limiter helper
- In-memory rate limiter tests
- Middleware modifications
- Middleware fallback tests
- (Optional) tsconfig path alias

---

## Summary

**Files Created:**

- `src/helpers/in-memory-rate-limiter.ts` - Token bucket implementation
- `tests/unit/helpers/in-memory-rate-limiter.test.ts` - Unit tests

**Files Modified:**

- `src/middlewares/rate-limit.middleware.ts` - Added fallback logic
- `tests/unit/middlewares/rate-limit.middleware.test.ts` - Added fallback tests
- `tsconfig.json` - (Optional) Added @helpers path alias

**Key Changes:**

1. New `checkAndConsume()` function for in-memory rate limiting
2. Health check on every request via `isRedisHealthy()`
3. Automatic fallback to in-memory when Redis unavailable
4. Warning logs when fallback is active
5. Graceful error handling for Redis failures

**Testing:**

- 11 new tests for in-memory rate limiter
- 5 new tests for middleware fallback behavior
- All existing tests continue to pass

---

**End of Implementation Plan**
