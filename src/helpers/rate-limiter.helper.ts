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

  // Collect expired keys first to avoid modification during iteration
  const expiredKeys: string[] = [];
  buckets.forEach((bucket, key) => {
    if (bucket.expiresAt <= now) {
      expiredKeys.push(key);
    }
  });

  // Delete expired buckets
  for (const key of expiredKeys) {
    buckets.delete(key);
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
