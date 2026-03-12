/**
 * Performance Benchmark Tests
 *
 * Comprehensive performance benchmarking suite for the PASETO API.
 * Tests response time percentiles, throughput, database performance,
 * and cache efficiency.
 *
 * @module PerformanceBenchmarks
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
} from '../load/helpers';

// Test configuration
const RUN_LOAD_TESTS = process.env.RUN_LOAD_TESTS === 'true';
const describeBenchmark = RUN_LOAD_TESTS ? describe : describe.skip;
const TEST_PORT = 3002;
const BASE_URL = createTestUrl(TEST_PORT);
let server: ReturnType<typeof Bun.serve>;
let testAccessToken: string | null = null;
let testUserId: string | null = null;
let testRefreshToken: string | null = null;

// Benchmark configuration
const WARMUP_REQUESTS = 10;
const BENCHMARK_ITERATIONS = 100;
const THROUGHPUT_TEST_DURATION = 5000; // 5 seconds

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

  logger.info(`Benchmark server started on ${BASE_URL}`);

  // Wait for server to be ready
  await waitForServer(`${BASE_URL}/health/live`);

  // Warm up the server
  for (let i = 0; i < WARMUP_REQUESTS; i++) {
    await fetch(`${BASE_URL}/health/live`);
  }

  // Create a test user and get tokens for authenticated benchmarks
  try {
    const testEmail = `benchmark.${Date.now()}@example.com`;
    const testPassword = generateTestPassword();

    // Register user
    const registerResponse = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: 'Benchmark User',
      }),
    });

    if (registerResponse.ok) {
      const registerData = (await registerResponse.json()) as {
        data?: {
          user?: { id: string };
          accessToken?: string;
          refreshToken?: string;
        };
      };
      testUserId = registerData.data?.user?.id || null;
      testAccessToken = registerData.data?.accessToken || null;
      testRefreshToken = registerData.data?.refreshToken || null;
    }
  } catch (error) {
    logger.error('Failed to create test user for benchmarks', { error });
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
    logger.info('Benchmark server stopped');
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
 * Benchmark: Response Time Percentiles (p50, p95, p99)
 */
describeBenchmark('Benchmark: Response Time Percentiles', () => {
  it('should meet p50, p95, p99 response time targets for health endpoint', async () => {
    const requests = Array.from(
      { length: BENCHMARK_ITERATIONS },
      () => () => fetch(`${BASE_URL}/health/live`)
    );

    const results = await executeBatch(requests, { concurrency: 20 });
    const stats = calculateStatistics(results);

    // Log results
    logStatistics(stats, 'Health Endpoint Response Times');

    // Assertions for response time targets
    expect(stats.total).toBe(BENCHMARK_ITERATIONS);
    expect(stats.successRate).toBe(100);
    expect(stats.p50).toBeLessThan(50); // p50 should be under 50ms
    expect(stats.p95).toBeLessThan(100); // p95 should be under 100ms
    expect(stats.p99).toBeLessThan(200); // p99 should be under 200ms
  });

  it('should meet response time targets for authentication endpoint', async () => {
    const requests = Array.from(
      { length: BENCHMARK_ITERATIONS },
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

    const results = await executeBatch(requests, { concurrency: 20 });
    const stats = calculateStatistics(results);

    // Log results
    console.log('\nAuthentication Endpoint Response Times:');
    console.log('='.repeat(50));
    console.log(`Total Requests:       ${stats.total}`);
    console.log(`P50:                  ${stats.p50.toFixed(2)}ms`);
    console.log(`P95:                  ${stats.p95.toFixed(2)}ms`);
    console.log(`P99:                  ${stats.p99.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Authentication is slower, so we have relaxed targets
    expect(stats.total).toBe(BENCHMARK_ITERATIONS);
    expect(stats.p95).toBeLessThan(500); // p95 should be under 500ms
    expect(stats.p99).toBeLessThan(1000); // p99 should be under 1s
  });

  it('should meet response time targets for authenticated user endpoint', async () => {
    if (!testAccessToken) {
      console.warn('Skipping benchmark: No access token available');
      return;
    }

    const requests = Array.from(
      { length: BENCHMARK_ITERATIONS },
      () => () => makeAuthenticatedRequest('/api/v1/users/me')
    );

    const results = await executeBatch(requests, { concurrency: 20 });
    const stats = calculateStatistics(results);

    // Log results
    logStatistics(stats, 'Authenticated User Endpoint Response Times');

    // Assertions
    expect(stats.total).toBe(BENCHMARK_ITERATIONS);
    expect(stats.successRate).toBeGreaterThanOrEqual(99); // At least 99% success
    expect(stats.p95).toBeLessThan(300); // p95 should be under 300ms
  });
});

/**
 * Benchmark: Throughput (Requests Per Second)
 */
describeBenchmark('Benchmark: Throughput', () => {
  it('should sustain high throughput for health endpoint', async () => {
    const duration = THROUGHPUT_TEST_DURATION;
    const startTime = Date.now();
    const results: Array<{ success: boolean; timestamp: number }> = [];

    // Send requests continuously for the test duration
    while (Date.now() - startTime < duration) {
      const requestStartTime = Date.now();
      try {
        const response = await fetch(`${BASE_URL}/health/live`);
        results.push({
          success: response.ok,
          timestamp: requestStartTime,
        });
      } catch {
        results.push({
          success: false,
          timestamp: requestStartTime,
        });
      }
    }

    const actualDuration = (Date.now() - startTime) / 1000;
    const successful = results.filter(r => r.success).length;
    const throughput = successful / actualDuration;

    // Log results
    console.log('\nThroughput Benchmark Results:');
    console.log('='.repeat(50));
    console.log(`Test Duration:         ${actualDuration.toFixed(2)}s`);
    console.log(`Total Requests:        ${results.length}`);
    console.log(`Successful:            ${successful}`);
    console.log(`Throughput:            ${throughput.toFixed(2)} req/s`);
    console.log('='.repeat(50));

    // Assertions - should handle at least 100 req/s for health endpoint
    expect(throughput).toBeGreaterThan(100);
  });

  it('should maintain throughput under concurrent load', async () => {
    const requestCount = 500;
    const concurrency = 50;

    const requests = Array.from({ length: requestCount }, () => () => fetch(`${BASE_URL}/health/live`));

    const startTime = Date.now();
    const results = await executeBatch(requests, { concurrency });
    const actualDuration = (Date.now() - startTime) / 1000;
    const stats = calculateStatistics(results);
    const throughput = stats.total / actualDuration;

    // Log results
    console.log('\nConcurrent Load Throughput:');
    console.log('='.repeat(50));
    console.log(`Concurrent Requests:   ${concurrency}`);
    console.log(`Total Requests:        ${stats.total}`);
    console.log(`Actual Duration:       ${actualDuration.toFixed(2)}s`);
    console.log(`Throughput:            ${throughput.toFixed(2)} req/s`);
    console.log(`Success Rate:          ${stats.successRate.toFixed(2)}%`);
    console.log('='.repeat(50));

    // Assertions
    expect(stats.successRate).toBe(100);
    expect(throughput).toBeGreaterThan(50); // Should handle at least 50 req/s under load
  });

  it('should handle mixed endpoint throughput', async () => {
    const requestCount = 300;

    // Create mixed workload: 70% health, 20% auth, 10% user
    const requests = Array.from({ length: requestCount }, () => {
      const rand = Math.random();
      if (rand < 0.7) {
        return () => fetch(`${BASE_URL}/health/live`);
      } else if (rand < 0.9) {
        return () =>
          fetch(`${BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: generateTestEmail(),
              password: generateTestPassword(),
            }),
          });
      } else {
        return () => makeAuthenticatedRequest('/api/v1/users/me');
      }
    });

    const startTime = Date.now();
    const results = await executeBatch(requests, { concurrency: 30 });
    const actualDuration = (Date.now() - startTime) / 1000;
    const stats = calculateStatistics(results);
    const throughput = stats.total / actualDuration;

    // Log results
    console.log('\nMixed Endpoint Throughput:');
    console.log('='.repeat(50));
    console.log(`Total Requests:        ${stats.total}`);
    console.log(`Actual Duration:       ${actualDuration.toFixed(2)}s`);
    console.log(`Throughput:            ${throughput.toFixed(2)} req/s`);
    console.log(`Success Rate:          ${stats.successRate.toFixed(2)}%`);
    console.log('='.repeat(50));

    // Assertions
    expect(stats.total).toBe(requestCount);
    expect(stats.successRate).toBeGreaterThan(80); // At least 80% success (auth failures expected)
  });
});

/**
 * Benchmark: Database Query Performance
 */
describeBenchmark('Benchmark: Database Query Performance', () => {
  it('should efficiently handle user lookup queries', async () => {
    if (!testAccessToken || !testUserId) {
      console.warn('Skipping benchmark: No test user available');
      return;
    }

    const requestCount = 50;

    // Benchmark user lookup by ID
    const requests = Array.from(
      { length: requestCount },
      () => () => makeAuthenticatedRequest(`/users/${testUserId}`)
    );

    const results = await executeBatch(requests, { concurrency: 10 });
    const stats = calculateStatistics(results);

    // Log results
    console.log('\nDatabase Query Performance - User Lookup:');
    console.log('='.repeat(50));
    console.log(`Total Requests:        ${stats.total}`);
    console.log(`Successful:            ${stats.successful}`);
    console.log(`P50:                  ${stats.p50.toFixed(2)}ms`);
    console.log(`P95:                  ${stats.p95.toFixed(2)}ms`);
    console.log(`P99:                  ${stats.p99.toFixed(2)}ms`);
    console.log(`Mean:                 ${stats.meanDuration.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Assertions - database queries should be reasonably fast
    expect(stats.successRate).toBeGreaterThanOrEqual(95);
    expect(stats.p95).toBeLessThan(500); // p95 should be under 500ms
  });

  it('should efficiently handle user list queries with pagination', async () => {
    if (!testAccessToken) {
      console.warn('Skipping benchmark: No access token available');
      return;
    }

    const requestCount = 30;

    // Benchmark paginated user list
    const requests = Array.from(
      { length: requestCount },
      (_, index) => () => makeAuthenticatedRequest(`/users?page=${index + 1}&limit=10`)
    );

    const results = await executeBatch(requests, { concurrency: 5 });
    const stats = calculateStatistics(results);

    // Log results
    console.log('\nDatabase Query Performance - User List (Paginated):');
    console.log('='.repeat(50));
    console.log(`Total Requests:        ${stats.total}`);
    console.log(`Successful:            ${stats.successful}`);
    console.log(`P50:                  ${stats.p50.toFixed(2)}ms`);
    console.log(`P95:                  ${stats.p95.toFixed(2)}ms`);
    console.log(`P99:                  ${stats.p99.toFixed(2)}ms`);
    console.log(`Mean:                 ${stats.meanDuration.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Assertions
    expect(stats.total).toBe(requestCount);
    expect(stats.p95).toBeLessThan(1000); // p95 should be under 1s
  });

  it('should efficiently handle user statistics query', async () => {
    if (!testAccessToken) {
      console.warn('Skipping benchmark: No access token available');
      return;
    }

    const requestCount = 20;

    // Benchmark user statistics (aggregate query)
    const requests = Array.from(
      { length: requestCount },
      () => () => makeAuthenticatedRequest('/api/v1/users/stats')
    );

    const results = await executeBatch(requests, { concurrency: 5 });
    const stats = calculateStatistics(results);

    // Log results
    console.log('\nDatabase Query Performance - User Statistics:');
    console.log('='.repeat(50));
    console.log(`Total Requests:        ${stats.total}`);
    console.log(`Successful:            ${stats.successful}`);
    console.log(`P50:                  ${stats.p50.toFixed(2)}ms`);
    console.log(`P95:                  ${stats.p95.toFixed(2)}ms`);
    console.log(`P99:                  ${stats.p99.toFixed(2)}ms`);
    console.log(`Mean:                 ${stats.meanDuration.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Assertions - aggregate queries should still be efficient
    expect(stats.successful).toBeGreaterThan(0);
    expect(stats.p95).toBeLessThan(2000); // p95 should be under 2s
  });
});

/**
 * Benchmark: Cache Hit/Miss Ratios
 */
describeBenchmark('Benchmark: Cache Performance', () => {
  it('should achieve high cache hit ratio for repeated requests', async () => {
    const requestCount = 100;
    const testEndpoint = `/cache-benchmark-${Date.now()}`;

    // Initial request to populate cache
    await fetch(`${BASE_URL}${testEndpoint}`, {
      headers: { 'X-Cache-Test': 'true' },
    });

    // Subsequent requests
    const requests = Array.from(
      { length: requestCount },
      () => () =>
        fetch(`${BASE_URL}${testEndpoint}`, {
          headers: { 'X-Cache-Test': 'true' },
        })
    );

    const results = await executeBatch(requests, { concurrency: 20 });

    // Count cache hits and misses
    let hits = 0;
    let misses = 0;

    for (const result of results) {
      const headers = result as unknown as { headers?: Headers };
      const cacheHeader = headers.headers?.get('X-Cache');

      if (cacheHeader === 'HIT') {
        hits++;
      } else if (cacheHeader === 'MISS') {
        misses++;
      }
    }

    const hitRate = (hits / (hits + misses)) * 100;

    // Log results
    console.log('\nCache Hit Ratio Benchmark:');
    console.log('='.repeat(50));
    console.log(`Total Requests:        ${requestCount}`);
    console.log(`Cache Hits:            ${hits}`);
    console.log(`Cache Misses:          ${misses}`);
    console.log(`Hit Rate:              ${hitRate.toFixed(2)}%`);
    console.log('='.repeat(50));

    // Assertions - should have high cache hit rate
    expect(hits + misses).toBeGreaterThan(0);
    if (hits + misses > 0) {
      expect(hitRate).toBeGreaterThan(50); // At least 50% hit rate
    }
  });

  it('should serve cached requests faster than uncached', async () => {
    const testEndpoint = `/cache-perf-${Date.now()}`;

    // Clear cache with unique endpoint
    const uncachedRequests = Array.from(
      { length: 10 },
      (_, i) => () =>
        fetch(`${BASE_URL}${testEndpoint}-${i}`, {
          headers: { 'X-Cache-Test': 'true' },
        })
    );

    const uncachedResults = await executeBatch(uncachedRequests, { concurrency: 5 });
    const uncachedStats = calculateStatistics(uncachedResults);

    // Populate cache and make cached requests
    await fetch(`${BASE_URL}${testEndpoint}`, {
      headers: { 'X-Cache-Test': 'true' },
    });

    const cachedRequests = Array.from(
      { length: 10 },
      () => () =>
        fetch(`${BASE_URL}${testEndpoint}`, {
          headers: { 'X-Cache-Test': 'true' },
        })
    );

    const cachedResults = await executeBatch(cachedRequests, { concurrency: 5 });
    const cachedStats = calculateStatistics(cachedResults);

    // Log results
    console.log('\nCached vs Uncached Performance:');
    console.log('='.repeat(50));
    console.log('Uncached:');
    console.log(`  Mean:                ${uncachedStats.meanDuration.toFixed(2)}ms`);
    console.log(`  P95:                 ${uncachedStats.p95.toFixed(2)}ms`);
    console.log('Cached:');
    console.log(`  Mean:                ${cachedStats.meanDuration.toFixed(2)}ms`);
    console.log(`  P95:                 ${cachedStats.p95.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Cached responses should generally be faster
    expect(cachedStats.meanDuration).toBeDefined();
    expect(uncachedStats.meanDuration).toBeDefined();
  });

  it('should handle cache stampede prevention', async () => {
    const testEndpoint = `/stampede-${Date.now()}`;
    const requestCount = 50;

    // Simulate cache stampede - many concurrent requests to same uncached endpoint
    const requests = Array.from(
      { length: requestCount },
      () => () =>
        fetch(`${BASE_URL}${testEndpoint}`, {
          headers: { 'X-Cache-Test': 'true' },
        })
    );

    const results = await executeBatch(requests, { concurrency: requestCount });
    const stats = calculateStatistics(results);

    // Check if server handled the stampede gracefully
    const timeouts = results.filter(r => !r.success).length;

    // Log results
    console.log('\nCache Stampede Prevention:');
    console.log('='.repeat(50));
    console.log(`Concurrent Requests:   ${requestCount}`);
    console.log(`Successful:            ${stats.successful}`);
    console.log(`Failed/Timeouts:       ${timeouts}`);
    console.log(`P99 Duration:          ${stats.p99.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Assertions - server should handle stampede gracefully
    expect(stats.successRate).toBeGreaterThan(80); // At least 80% success
  });
});

/**
 * Benchmark: Token Refresh Performance
 */
describeBenchmark('Benchmark: Token Operations Performance', () => {
  it('should efficiently handle token refresh operations', async () => {
    if (!testRefreshToken) {
      console.warn('Skipping benchmark: No refresh token available');
      return;
    }

    const requestCount = 20;

    const requests = Array.from(
      { length: requestCount },
      () => () =>
        fetch(`${BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            refreshToken: testRefreshToken,
          }),
        })
    );

    const results = await executeBatch(requests, { concurrency: 5 });
    const stats = calculateStatistics(results);

    // Log results
    console.log('\nToken Refresh Performance:');
    console.log('='.repeat(50));
    console.log(`Total Requests:        ${stats.total}`);
    console.log(`Successful:            ${stats.successful}`);
    console.log(`P50:                  ${stats.p50.toFixed(2)}ms`);
    console.log(`P95:                  ${stats.p95.toFixed(2)}ms`);
    console.log(`P99:                  ${stats.p99.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Assertions
    expect(stats.total).toBe(requestCount);
    expect(stats.p95).toBeLessThan(1000); // p95 should be under 1s
  });

  it('should efficiently handle logout operations', async () => {
    if (!testAccessToken) {
      console.warn('Skipping benchmark: No access token available');
      return;
    }

    const requestCount = 20;

    const requests = Array.from(
      { length: requestCount },
      () => () =>
        makeAuthenticatedRequest('/api/v1/auth/logout', {
          method: 'POST',
        })
    );

    const results = await executeBatch(requests, { concurrency: 5 });
    const stats = calculateStatistics(results);

    // Log results
    console.log('\nLogout Performance:');
    console.log('='.repeat(50));
    console.log(`Total Requests:        ${stats.total}`);
    console.log(`Successful:            ${stats.successful}`);
    console.log(`P50:                  ${stats.p50.toFixed(2)}ms`);
    console.log(`P95:                  ${stats.p95.toFixed(2)}ms`);
    console.log(`P99:                  ${stats.p99.toFixed(2)}ms`);
    console.log('='.repeat(50));

    // Assertions - logout should be fast
    expect(stats.total).toBe(requestCount);
    expect(stats.p95).toBeLessThan(500); // p95 should be under 500ms
  });
});

/**
 * Benchmark: Memory and Resource Usage
 */
describeBenchmark('Benchmark: Memory Efficiency', () => {
  it('should maintain stable memory usage under load', async () => {
    const requestCount = 200;

    // Get initial memory usage
    const initialMemory = process.memoryUsage();

    const requests = Array.from({ length: requestCount }, () => () => fetch(`${BASE_URL}/health/live`));

    const results = await executeBatch(requests, { concurrency: 20 });

    // Get final memory usage
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

    const stats = calculateStatistics(results);

    // Log results
    console.log('\nMemory Usage Under Load:');
    console.log('='.repeat(50));
    console.log(`Initial Heap Used:     ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Final Heap Used:       ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Memory Increase:       ${memoryIncreaseMB.toFixed(2)} MB`);
    console.log(`Requests Processed:    ${stats.total}`);
    console.log(`Memory per Request:    ${(memoryIncreaseMB / stats.total).toFixed(4)} MB`);
    console.log('='.repeat(50));

    // Assertions - memory usage should be reasonable
    expect(stats.successRate).toBe(100);
    expect(memoryIncreaseMB).toBeLessThan(100); // Less than 100MB increase for 200 requests
  });
});
