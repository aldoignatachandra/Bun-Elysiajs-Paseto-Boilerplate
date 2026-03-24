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

    it('should refill tokens after time passes', () => {
      const key = 'test-key';
      const limit = 2;
      const windowMs = 1000; // 1 second window

      // Consume all tokens (2 requests = 2 tokens consumed)
      checkAndConsume(key, limit, windowMs, 1000);
      checkAndConsume(key, limit, windowMs, 1001);
      // Third request should be blocked (no tokens left)
      const blocked = checkAndConsume(key, limit, windowMs, 1002);

      expect(blocked.allowed).toBe(false);

      // At 1100ms, only ~0.2 tokens refilled (not enough for 1 token)
      // refillRate = 2/1000 = 0.002 tokens/ms
      // elapsed from 1002 to 1100 = 98ms, tokens = 0.004 + 98*0.002 = 0.2
      const stillBlocked = checkAndConsume(key, limit, windowMs, 1100);
      expect(stillBlocked.allowed).toBe(false);

      // At 2000ms, ~2 tokens should be refilled (full window)
      const allowed = checkAndConsume(key, limit, windowMs, 2000);
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
  });

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
});
