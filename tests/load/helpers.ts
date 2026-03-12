/**
 * Load Testing Helpers
 *
 * Utility functions for load testing and performance measurement.
 * Provides request batching, timing, and statistics calculation.
 *
 * @module LoadTestingHelpers
 */

/* eslint-disable no-console */

/**
 * Request result with timing information
 */
export interface RequestResult {
  /** Request index in the batch */
  index: number;
  /** Whether the request was successful */
  success: boolean;
  /** HTTP status code */
  status: number;
  /** Response time in milliseconds */
  duration: number;
  /** Response body (if successful) */
  body?: unknown;
  /** Error message (if failed) */
  error?: string;
  /** Timestamp when request started */
  timestamp: number;
}

/**
 * Statistics summary for a batch of requests
 */
export interface RequestStatistics {
  /** Total number of requests */
  total: number;
  /** Number of successful requests */
  successful: number;
  /** Number of failed requests */
  failed: number;
  /** Success rate as percentage (0-100) */
  successRate: number;
  /** Minimum response time in milliseconds */
  minDuration: number;
  /** Maximum response time in milliseconds */
  maxDuration: number;
  /** Mean (average) response time in milliseconds */
  meanDuration: number;
  /** Median response time in milliseconds */
  medianDuration: number;
  /** 50th percentile response time (p50) in milliseconds */
  p50: number;
  /** 95th percentile response time (p95) in milliseconds */
  p95: number;
  /** 99th percentile response time (p99) in milliseconds */
  p99: number;
  /** Standard deviation of response times */
  stdDev: number;
  /** Total requests per second */
  requestsPerSecond: number;
  /** Total time for all requests in seconds */
  totalTime: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  /** Total requests made */
  total: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Cache hit rate as percentage (0-100) */
  hitRate: number;
}

/**
 * Batch request options
 */
export interface BatchOptions {
  /** Number of concurrent requests */
  concurrency: number;
  /** Delay between batches in milliseconds */
  delayBetweenBatches?: number;
  /** Timeout for each request in milliseconds */
  timeout?: number;
}

/**
 * Measure execution time of an async function
 *
 * @param fn - Function to measure
 * @returns Object with result and duration in milliseconds
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{
  result: T;
  duration: number;
}> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  return { result, duration: endTime - startTime };
}

/**
 * Execute a batch of requests concurrently
 *
 * @param requests - Array of request functions to execute
 * @param options - Batch options
 * @returns Array of request results
 */
export async function executeBatch<T>(
  requests: Array<() => Promise<T>>,
  options: BatchOptions = { concurrency: 10 }
): Promise<RequestResult[]> {
  const { concurrency } = options;
  const results: RequestResult[] = [];

  // Split requests into batches based on concurrency
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);

    // Execute batch concurrently
    const batchResults = await Promise.allSettled(
      batch.map(async (request, batchIndex) => {
        const index = i + batchIndex;
        const timestamp = Date.now();
        const startTime = performance.now();

        try {
          const result = await request();
          const endTime = performance.now();
          const duration = endTime - startTime;

          // Check if result is a Response object
          if (result instanceof Response) {
            return {
              index,
              success: result.ok,
              status: result.status,
              duration,
              timestamp,
            };
          }

          return {
            index,
            success: true,
            status: 200,
            duration,
            body: result,
            timestamp,
          };
        } catch (error) {
          const endTime = performance.now();
          const duration = endTime - startTime;

          return {
            index,
            success: false,
            status: 0,
            duration,
            error: error instanceof Error ? error.message : String(error),
            timestamp,
          };
        }
      })
    );

    // Process batch results
    for (const settledResult of batchResults) {
      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value);
      } else {
        results.push({
          index: results.length,
          success: false,
          status: 0,
          duration: 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          error: (settledResult.reason as Error | undefined)?.message || 'Unknown error',
          timestamp: Date.now(),
        });
      }
    }

    // Add delay between batches if specified
    if (options.delayBetweenBatches && i + concurrency < requests.length) {
      await sleep(options.delayBetweenBatches);
    }
  }

  return results;
}

/**
 * Calculate statistics from request results
 *
 * @param results - Array of request results
 * @returns Statistics summary
 */
export function calculateStatistics(results: RequestResult[]): RequestStatistics {
  if (results.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
      minDuration: 0,
      maxDuration: 0,
      meanDuration: 0,
      medianDuration: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
      requestsPerSecond: 0,
      totalTime: 0,
    };
  }

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const durations = successful.map(r => r.duration).sort((a, b) => a - b);

  const total = results.length;
  const successRate = (successful.length / total) * 100;

  // Calculate min, max, mean
  const minDuration = durations.length > 0 ? durations[0] : 0;
  const maxDuration = durations.length > 0 ? durations[durations.length - 1] : 0;
  const sum = durations.reduce((acc, val) => acc + val, 0);
  const meanDuration = durations.length > 0 ? sum / durations.length : 0;

  // Calculate percentiles
  const percentile = (p: number): number => {
    if (durations.length === 0) return 0;
    const index = Math.ceil((p / 100) * durations.length) - 1;
    return durations[Math.max(0, index)];
  };

  const p50 = percentile(50);
  const medianDuration = p50;
  const p95 = percentile(95);
  const p99 = percentile(99);

  // Calculate standard deviation
  const variance =
    durations.length > 0
      ? durations.reduce((acc, val) => acc + Math.pow(val - meanDuration, 2), 0) / durations.length
      : 0;
  const stdDev = Math.sqrt(variance);

  // Calculate total time and requests per second
  const timestamps = results.map(r => r.timestamp);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const totalTime = (maxTime - minTime) / 1000; // Convert to seconds
  const requestsPerSecond = totalTime > 0 ? total / totalTime : 0;

  return {
    total,
    successful: successful.length,
    failed: failed.length,
    successRate,
    minDuration,
    maxDuration,
    meanDuration,
    medianDuration,
    p50,
    p95,
    p99,
    stdDev,
    requestsPerSecond,
    totalTime,
  };
}

/**
 * Calculate cache statistics from response headers
 *
 * @param results - Array of request results
 * @returns Cache statistics
 */
export function calculateCacheStatistics(results: RequestResult[]): CacheStatistics {
  const total = results.length;
  let hits = 0;
  let misses = 0;

  for (const result of results) {
    if (result.success && result.body && typeof result.body === 'object') {
      // Check for X-Cache header in response
      const headers = (result.body as { headers?: Record<string, string> }).headers;
      if (headers?.['X-Cache'] === 'HIT') {
        hits++;
      } else if (headers?.['X-Cache'] === 'MISS') {
        misses++;
      }
    }
  }

  return {
    total,
    hits,
    misses,
    hitRate: total > 0 ? (hits / total) * 100 : 0,
  };
}

/**
 * Log statistics in a formatted way
 *
 * @param stats - Statistics to log
 * @param title - Optional title for the log
 */
export function logStatistics(stats: RequestStatistics, title = 'Statistics'): void {
  console.log(`\n${title}:`);
  console.log('='.repeat(50));
  console.log(`Total Requests:      ${stats.total}`);
  console.log(`Successful:          ${stats.successful}`);
  console.log(`Failed:              ${stats.failed}`);
  console.log(`Success Rate:        ${stats.successRate.toFixed(2)}%`);
  console.log(`Requests/sec:        ${stats.requestsPerSecond.toFixed(2)}`);
  console.log(`Total Time:          ${stats.totalTime.toFixed(2)}s`);
  console.log('\nResponse Times (ms):');
  console.log(`  Min:               ${stats.minDuration.toFixed(2)}`);
  console.log(`  Max:               ${stats.maxDuration.toFixed(2)}`);
  console.log(`  Mean:              ${stats.meanDuration.toFixed(2)}`);
  console.log(`  Median:            ${stats.medianDuration.toFixed(2)}`);
  console.log(`  p50:               ${stats.p50.toFixed(2)}`);
  console.log(`  p95:               ${stats.p95.toFixed(2)}`);
  console.log(`  p99:               ${stats.p99.toFixed(2)}`);
  console.log(`  Std Dev:           ${stats.stdDev.toFixed(2)}`);
  console.log('='.repeat(50));
}

/**
 * Sleep for a specified number of milliseconds
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random email address for testing
 *
 * @param index - Optional index to make email unique
 * @returns Random email address
 */
export function generateTestEmail(index = 0): string {
  return `test.user.${index}.${Date.now()}@example.com`;
}

/**
 * Generate a random password for testing
 *
 * @returns Random password
 */
export function generateTestPassword(): string {
  const prefix = 'TestPass123!';
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${prefix}${suffix}`;
}

/**
 * Wait for server to be ready
 *
 * @param url - Server URL to check
 * @param maxAttempts - Maximum number of attempts
 * @param delay - Delay between attempts in milliseconds
 * @returns Promise that resolves when server is ready
 */
export async function waitForServer(url: string, maxAttempts = 30, delay = 500): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url);
      // For readiness we only need a reachable HTTP server.
      if (response.status >= 100 && response.status < 600) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    await sleep(delay);
  }
  throw new Error(`Server not ready after ${maxAttempts} attempts`);
}

/**
 * Create a test server URL
 *
 * @param port - Port number
 * @param path - Path to append
 * @returns Full URL
 */
export function createTestUrl(port: number, path = ''): string {
  return `http://localhost:${port}${path}`;
}
