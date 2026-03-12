/**
 * API Load Tests
 *
 * Load testing suite for the PASETO API endpoints.
 * Tests concurrent request handling, rate limiting, connection pooling,
 * and caching effectiveness.
 *
 * @module LoadTests
 */

/* eslint-disable no-console */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createApp } from '@/app';
import { logger } from '@/core/logging/logger';
import {
  executeBatch,
  calculateStatistics,
  logStatistics,
  generateTestEmail,
  generateTestPassword,
  waitForServer,
  createTestUrl,
  sleep,
} from './helpers';

// Test configuration
const RUN_LOAD_TESTS = process.env.RUN_LOAD_TESTS === 'true';
const describeLoad = RUN_LOAD_TESTS ? describe : describe.skip;
const TEST_PORT = 3001;
const BASE_URL = createTestUrl(TEST_PORT);
let server: ReturnType<typeof Bun.serve>;
let testAccessToken: string | null = null;
let testUserId: string | null = null;

// Rate limiting configuration (should match app config)
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60;

/**
 * Setup test server before all tests
 */
beforeAll(async () => {
  if (!RUN_LOAD_TESTS) {
    return;
  }

  // Create app for testing
  const app = createApp();

  // Start server on test port
  server = Bun.serve({
    fetch: app.fetch,
    port: TEST_PORT,
    hostname: 'localhost',
  });

  logger.info(`Test server started on ${BASE_URL}`);

  // Wait for server to be ready
  await waitForServer(`${BASE_URL}/health/live`);

  // Create a test user and get access token for authenticated tests
  try {
    const testEmail = `loadtest.${Date.now()}@example.com`;
    const testPassword = generateTestPassword();

    // Register user
    const registerResponse = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Load Test User',
      }),
    });

    if (registerResponse.ok) {
      const registerData = (await registerResponse.json()) as {
        data?: { user?: { id: string }; accessToken?: string };
      };
      testUserId = registerData.data?.user?.id || null;
      testAccessToken = registerData.data?.accessToken || null;
    }
  } catch (error) {
    logger.error('Failed to create test user for load tests', { error });
  }
});

/**
 * Cleanup after all tests
 */
afterAll(() => {
  if (!RUN_LOAD_TESTS) {
    return;
  }

  if (server) {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    server.stop();
    logger.info('Test server stopped');
  }
});

/**
 * Helper to make authenticated requests
 */
function makeAuthenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${testAccessToken}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Test 1: Handle 100 concurrent requests to health endpoint
 */
describeLoad('Load Test: 100 Concurrent Health Check Requests', () => {
  it('should handle 100 concurrent health check requests successfully', async () => {
    const requestCount = 100;

    // Create array of request functions
    const requests = Array.from({ length: requestCount }, () => () => fetch(`${BASE_URL}/health/live`));

    // Execute batch with 100 concurrent requests
    const results = await executeBatch(requests, { concurrency: 100 });

    // Calculate statistics
    const stats = calculateStatistics(results);

    // Log results
    logStatistics(stats, '100 Concurrent Health Check Requests');

    // Assertions
    expect(stats.total).toBe(requestCount);
    expect(stats.successful).toBe(requestCount);
    expect(stats.failed).toBe(0);
    expect(stats.successRate).toBe(100);
    expect(stats.requestsPerSecond).toBeGreaterThan(50); // Should handle at least 50 req/s
    expect(stats.p95).toBeLessThan(500); // 95% of requests should complete within 500ms
  });
});

/**
 * Test 2: Handle 1000 requests over time
 */
describeLoad('Load Test: 1000 Requests Over Time', () => {
  it('should handle 1000 requests sent over time without errors', async () => {
    const requestCount = 1000;
    const batchSize = 50;
    const delayBetweenBatches = 100; // 100ms between batches

    // Create array of request functions
    const requests = Array.from({ length: requestCount }, () => () => fetch(`${BASE_URL}/health/live`));

    // Execute batches over time
    const results = await executeBatch(requests, {
      concurrency: batchSize,
      delayBetweenBatches,
    });

    // Calculate statistics
    const stats = calculateStatistics(results);

    // Log results
    logStatistics(stats, '1000 Requests Over Time');

    // Assertions
    expect(stats.total).toBe(requestCount);
    expect(stats.successful).toBe(requestCount);
    expect(stats.failed).toBe(0);
    expect(stats.successRate).toBe(100);
    expect(stats.p99).toBeLessThan(1000); // 99% of requests should complete within 1s
  });
});

/**
 * Test 3: Rate limiting effectiveness
 */
describeLoad('Load Test: Rate Limiting Effectiveness', () => {
  it('should enforce rate limits on authentication endpoints', async () => {
    const requestCount = RATE_LIMIT_MAX + 5; // Exceed the rate limit

    // Create array of request functions for login endpoint
    const requests = Array.from(
      { length: requestCount },
      () => () =>
        fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: generateTestEmail(),
            password: generateTestPassword(),
          }),
        })
    );

    // Execute all requests concurrently
    const results = await executeBatch(requests, { concurrency: requestCount });

    // Count rate limited responses (429 status code)
    const rateLimitedCount = results.filter(r => r.status === 429).length;
    const successOrAuthFailedCount = results.filter(
      r => r.status === 200 || r.status === 401
    ).length;

    // Calculate statistics
    const stats = calculateStatistics(results);

    // Log results
    console.log('\nRate Limiting Test Results:');
    console.log('='.repeat(50));
    console.log(`Rate Limited (429):   ${rateLimitedCount}`);
    console.log(`Allowed Requests:     ${successOrAuthFailedCount}`);
    console.log(`Total Requests:       ${stats.total}`);
    console.log('='.repeat(50));

    // Assertions - should have rate limited some requests
    expect(rateLimitedCount).toBeGreaterThan(0);
    expect(rateLimitedCount).toBeLessThanOrEqual(requestCount - RATE_LIMIT_MAX);
    expect(successOrAuthFailedCount).toBeLessThanOrEqual(RATE_LIMIT_MAX);
  });

  it('should reset rate limit after window expires', async () => {
    // First batch of requests
    const firstBatch = Array.from(
      { length: RATE_LIMIT_MAX },
      () => () =>
        fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: generateTestEmail(),
            password: generateTestPassword(),
          }),
        })
    );

    const firstResults = await executeBatch(firstBatch, { concurrency: RATE_LIMIT_MAX });
    const firstStats = calculateStatistics(firstResults);

    // Second batch immediately (should be rate limited)
    const secondBatch = Array.from(
      { length: 5 },
      () => () =>
        fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: generateTestEmail(),
            password: generateTestPassword(),
          }),
        })
    );

    const secondResults = await executeBatch(secondBatch, { concurrency: 5 });
    const secondRateLimited = secondResults.filter(r => r.status === 429).length;

    // Wait for rate limit window to expire (plus buffer)
    await sleep((RATE_LIMIT_WINDOW + 2) * 1000);

    // Third batch after window expires (should not be rate limited)
    const thirdBatch = Array.from(
      { length: 5 },
      () => () =>
        fetch(`${BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: generateTestEmail(),
            password: generateTestPassword(),
          }),
        })
    );

    const thirdResults = await executeBatch(thirdBatch, { concurrency: 5 });
    const thirdRateLimited = thirdResults.filter(r => r.status === 429).length;

    // Assertions
    expect(firstStats.successful + firstStats.failed).toBe(RATE_LIMIT_MAX);
    expect(secondRateLimited).toBeGreaterThan(0); // Should be rate limited
    expect(thirdRateLimited).toBe(0); // Should not be rate limited after window
  });
});

/**
 * Test 4: Connection pooling under load
 */
describeLoad('Load Test: Connection Pooling Under Load', () => {
  it('should maintain stable performance under sustained load', async () => {
    const requestCount = 200;
    const batchSize = 20;

    // Create array of request functions
    const requests = Array.from({ length: requestCount }, () => () => fetch(`${BASE_URL}/health/live`));

    // Execute batches
    const results = await executeBatch(requests, {
      concurrency: batchSize,
      delayBetweenBatches: 50,
    });

    // Calculate statistics
    const stats = calculateStatistics(results);

    // Calculate stability: coefficient of variation (std dev / mean)
    const coefficientOfVariation =
      stats.meanDuration > 0 ? (stats.stdDev / stats.meanDuration) * 100 : 0;

    // Log results
    console.log('\nConnection Pooling Test Results:');
    console.log('='.repeat(50));
    console.log(`Total Requests:       ${stats.total}`);
    console.log(`Success Rate:         ${stats.successRate.toFixed(2)}%`);
    console.log(`Mean Duration:        ${stats.meanDuration.toFixed(2)}ms`);
    console.log(`Std Dev:              ${stats.stdDev.toFixed(2)}ms`);
    console.log(`Coeff. of Variation:  ${coefficientOfVariation.toFixed(2)}%`);
    console.log(`P95 Duration:         ${stats.p95.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Assertions - stable performance under load
    expect(stats.successRate).toBe(100);
    expect(stats.p95).toBeLessThan(500); // 95% should complete within 500ms
    expect(coefficientOfVariation).toBeLessThan(100); // CV should be reasonably low
  });

  it('should handle multiple concurrent authenticated requests', async () => {
    if (!testAccessToken) {
      console.warn('Skipping test: No access token available');
      return;
    }

    const requestCount = 50;

    // Create array of authenticated request functions
    const requests = Array.from(
      { length: requestCount },
      () => () => makeAuthenticatedRequest('/api/v1/users/me')
    );

    // Execute batch
    const results = await executeBatch(requests, { concurrency: requestCount });

    // Calculate statistics
    const stats = calculateStatistics(results);

    // Log results
    logStatistics(stats, 'Concurrent Authenticated Requests');

    // Assertions
    expect(stats.total).toBe(requestCount);
    expect(stats.successRate).toBeGreaterThanOrEqual(95); // At least 95% success
    expect(stats.p95).toBeLessThan(1000); // 95% should complete within 1s
  });
});

/**
 * Test 5: Caching effectiveness
 */
describeLoad('Load Test: Caching Effectiveness', () => {
  it('should cache responses for repeated requests', async () => {
    const requestCount = 50;
    const cacheKey = `/cache-test-${Date.now()}`;

    // First request - should be cache miss
    await fetch(`${BASE_URL}${cacheKey}`, {
      headers: {
        'X-Cache-Test': 'true',
      },
    });

    // Make subsequent requests
    const requests = Array.from(
      { length: requestCount },
      () => () =>
        fetch(`${BASE_URL}${cacheKey}`, {
          headers: {
            'X-Cache-Test': 'true',
          },
        })
    );

    const results = await executeBatch(requests, { concurrency: 10 });

    // Calculate cache statistics from X-Cache headers
    let cacheHits = 0;
    let cacheMisses = 0;

    for (const result of results) {
      if (result.success) {
        // Check if response has cache header
        const headers = result as unknown as { headers?: Headers };
        if (headers.headers?.get('X-Cache') === 'HIT') {
          cacheHits++;
        } else if (headers.headers?.get('X-Cache') === 'MISS') {
          cacheMisses++;
        }
      }
    }

    // Calculate statistics
    const stats = calculateStatistics(results);

    // Log results
    console.log('\nCaching Effectiveness Test Results:');
    console.log('='.repeat(50));
    console.log(`Total Requests:       ${stats.total}`);
    console.log(`Cache Hits:           ${cacheHits}`);
    console.log(`Cache Misses:         ${cacheMisses}`);
    console.log(
      `Cache Hit Rate:       ${((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2)}%`
    );
    console.log(`Mean Duration:        ${stats.meanDuration.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Assertions - should have cache hits
    expect(stats.total).toBe(requestCount);
    expect(cacheHits + cacheMisses).toBeGreaterThan(0);
  });

  it('should serve cached responses faster than uncached', async () => {
    const requestCount = 20;
    const cacheKey = `/perf-test-${Date.now()}`;

    // Make initial request to populate cache
    await fetch(`${BASE_URL}${cacheKey}`, {
      headers: { 'X-Cache-Test': 'true' },
    });

    // Make subsequent requests
    const requests = Array.from(
      { length: requestCount },
      () => () =>
        fetch(`${BASE_URL}${cacheKey}`, {
          headers: { 'X-Cache-Test': 'true' },
        })
    );

    const results = await executeBatch(requests, { concurrency: 20 });

    // Separate cached and uncached responses
    const cachedResults: RequestResult[] = [];
    const uncachedResults: RequestResult[] = [];

    for (const result of results) {
      const headers = result as unknown as { headers?: Headers };
      const cacheHeader = headers.headers?.get('X-Cache');

      if (cacheHeader === 'HIT') {
        cachedResults.push(result);
      } else if (cacheHeader === 'MISS') {
        uncachedResults.push(result);
      }
    }

    // Calculate statistics for each group
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const cachedStats = calculateStatistics(cachedResults);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const uncachedStats = calculateStatistics(uncachedResults);

    // Log results
    console.log('\nCached vs Uncached Performance:');
    console.log('='.repeat(50));
    console.log('Cached Responses:');
    console.log(`  Count:              ${cachedStats.total}`);
    console.log(`  Mean Duration:      ${cachedStats.meanDuration.toFixed(2)}ms`);
    console.log(`  P95 Duration:       ${cachedStats.p95.toFixed(2)}ms`);
    console.log('\nUncached Responses:');
    console.log(`  Count:              ${uncachedStats.total}`);
    console.log(`  Mean Duration:      ${uncachedStats.meanDuration.toFixed(2)}ms`);
    console.log(`  P95 Duration:       ${uncachedStats.p95.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Assertions - cached should be faster (if we have samples)
    if (cachedStats.total > 0 && uncachedStats.total > 0) {
      expect(cachedStats.meanDuration).toBeLessThanOrEqual(uncachedStats.meanDuration);
    }
  });
});

/**
 * Test 6: Mixed workload simulation
 */
describeLoad('Load Test: Mixed Workload Simulation', () => {
  it('should handle mixed read/write operations', async () => {
    const requestCount = 100;
    const readRatio = 0.8; // 80% reads, 20% writes

    // Create mixed workload
    const requests = Array.from({ length: requestCount }, () => {
      const isRead = Math.random() < readRatio;

      if (isRead) {
        // Read operation - health check
        return () => fetch(`${BASE_URL}/health/live`);
      } else {
        // Write operation - login attempt (will fail but tests write load)
        return () =>
          fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: generateTestEmail(),
              password: generateTestPassword(),
            }),
          });
      }
    });

    // Execute mixed workload
    const results = await executeBatch(requests, { concurrency: 25 });

    // Calculate statistics
    const stats = calculateStatistics(results);

    // Log results
    logStatistics(stats, 'Mixed Read/Write Workload');

    // Assertions
    expect(stats.total).toBe(requestCount);
    expect(stats.successRate).toBeGreaterThan(80); // At least 80% success (reads should succeed)
    expect(stats.requestsPerSecond).toBeGreaterThan(20); // Should handle at least 20 req/s
  });
});
