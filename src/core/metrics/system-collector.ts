/**
 * System Metrics Collector
 *
 * Collects system-level metrics (memory, event loop, database)
 * when SYSTEM_METRICS_ENABLED=true.
 *
 * Zero overhead when disabled - no timers, no collection cycles.
 *
 * @example
 * ```typescript
 * // Initialize (call once at app startup)
 * initializeSystemMetrics();
 *
 * // Shutdown (call on app termination)
 * shutdownSystemMetrics();
 * ```
 */

import { getMetricsRegistry } from './metrics';

/* eslint-disable no-console */

/**
 * Configuration for system metrics collection
 */
interface SystemMetricsConfig {
  /** Enable system metrics collection */
  readonly enabled: boolean;
  /** Collection interval in milliseconds */
  readonly intervalMs: number;
}

/**
 * Get system metrics configuration from environment
 *
 * @returns SystemMetricsConfig object
 */
export function getSystemMetricsConfig(): SystemMetricsConfig {
  return {
    enabled: process.env.SYSTEM_METRICS_ENABLED === 'true',
    intervalMs: parseInt(process.env.SYSTEM_METRICS_INTERVAL_MS || '10000', 10),
  };
}

/**
 * System Metrics Collector
 *
 * Periodically collects system metrics and updates the registry.
 * All metrics are opt-in via SYSTEM_METRICS_ENABLED environment variable.
 */
export class SystemMetricsCollector {
  private intervalId: Timer | null = null;
  private isRunning = false;

  constructor(private readonly config: SystemMetricsConfig) {}

  /**
   * Start collecting system metrics
   *
   * Does nothing if:
   * - Config is disabled (SYSTEM_METRICS_ENABLED !== 'true')
   * - Already running
   */
  start(): void {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.registerMetrics();
    this.startCollection();

    console.log('[SystemMetrics] Collector started', {
      intervalMs: this.config.intervalMs,
    });
  }

  /**
   * Stop collecting system metrics
   *
   * Clears the collection interval and resets state.
   * Safe to call multiple times.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[SystemMetrics] Collector stopped');
  }

  /**
   * Check if collector is currently running
   *
   * @returns true if collecting metrics
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Register system metrics with the registry
   *
   * Registers all system metrics even if they won't be collected,
   * so they appear in the /metrics output with zero values.
   */
  private registerMetrics(): void {
    const registry = getMetricsRegistry();

    // Process memory metrics
    registry.registerGauge('process_memory_bytes', 'Process memory usage in bytes', ['type']);

    // Event loop lag
    registry.registerGauge('event_loop_lag_seconds', 'Event loop lag in seconds');

    // Database metrics (collected on-demand via instrumentation)
    registry.registerHistogram(
      'db_query_duration_seconds',
      'Database query duration in seconds',
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      ['operation']
    );

    registry.registerGauge('db_connections', 'Database connection pool status', ['state']);

    registry.registerCounter('db_query_errors_total', 'Total database query errors', ['error_type']);
  }

  /**
   * Start periodic collection
   */
  private startCollection(): void {
    // Collect immediately
    this.collect();

    // Then periodically
    this.intervalId = setInterval(() => {
      this.collect();
    }, this.config.intervalMs);
  }

  /**
   * Collect all system metrics
   *
   * Called periodically based on config.intervalMs.
   */
  private collect(): void {
    this.collectMemoryMetrics();
    this.collectEventLoopLag();
    // Database metrics are collected on-demand via instrumentation
    // (see trackDatabaseQuery helper below)
  }

  /**
   * Collect process memory metrics
   *
   * Uses process.memoryUsage() - Bun/Node.js built-in
   */
  private collectMemoryMetrics(): void {
    const registry = getMetricsRegistry();
    const mem = process.memoryUsage();

    registry.setGauge('process_memory_bytes', mem.rss, { type: 'rss' });
    registry.setGauge('process_memory_bytes', mem.heapTotal, { type: 'heap_total' });
    registry.setGauge('process_memory_bytes', mem.heapUsed, { type: 'heap_used' });
    registry.setGauge('process_memory_bytes', mem.external, { type: 'external' });
  }

  /**
   * Collect event loop lag
   *
   * Measures the delay between when a callback was scheduled
   * and when it actually executed using setImmediate polling.
   */
  private collectEventLoopLag(): void {
    const registry = getMetricsRegistry();
    const start = performance.now();

    setImmediate(() => {
      const lag = (performance.now() - start) / 1000; // Convert to seconds
      registry.setGauge('event_loop_lag_seconds', lag);
    });
  }
}

// Singleton instance
let collectorInstance: SystemMetricsCollector | null = null;

/**
 * Get or create the system metrics collector singleton
 *
 * @returns SystemMetricsCollector instance
 */
export function getSystemMetricsCollector(): SystemMetricsCollector {
  if (!collectorInstance) {
    const config = getSystemMetricsConfig();
    collectorInstance = new SystemMetricsCollector(config);
  }
  return collectorInstance;
}

/**
 * Initialize system metrics collection
 *
 * Call once at application startup.
 * Does nothing if SYSTEM_METRICS_ENABLED is not 'true'.
 */
export function initializeSystemMetrics(): void {
  const collector = getSystemMetricsCollector();
  collector.start();
}

/**
 * Shutdown system metrics collection
 *
 * Call on application shutdown to clean up timers.
 * Safe to call multiple times.
 */
export function shutdownSystemMetrics(): void {
  if (collectorInstance) {
    collectorInstance.stop();
    collectorInstance = null;
  }
}

/**
 * Track database query duration
 *
 * Helper to track database query metrics.
 * Use this to wrap database operations.
 *
 * @param operation - Operation name (e.g., 'select', 'insert', 'update')
 * @param fn - Async function to execute and track
 * @returns Result of the function
 *
 * @example
 * ```typescript
 * const users = await trackDatabaseQuery('select', () =>
 *   db.select().from(usersTable)
 * );
 * ```
 */
export async function trackDatabaseQuery<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const config = getSystemMetricsConfig();

  // Zero overhead when disabled
  if (!config.enabled) {
    return fn();
  }

  const start = performance.now();

  try {
    const result = await fn();

    // Track success - non-critical, never crash the app
    try {
      const duration = (performance.now() - start) / 1000;
      const registry = getMetricsRegistry();
      registry.observeHistogram('db_query_duration_seconds', duration, { operation });
    } catch (metricsError) {
      console.warn('[Metrics] Failed to record query duration', { operation, error: String(metricsError) });
    }

    return result;
  } catch (error) {
    // Track error - non-critical, never crash the app
    try {
      const errorType = error instanceof Error ? error.constructor.name : 'unknown';
      const registry = getMetricsRegistry();
      registry.incrementCounter('db_query_errors_total', 1, { error_type: errorType });
    } catch (metricsError) {
      console.warn('[Metrics] Failed to record query error', { operation, error: String(metricsError) });
    }

    throw error;
  }
}

/**
 * Update database connection pool metrics
 *
 * Call this when connection pool state changes.
 *
 * @param active - Number of active connections
 * @param idle - Number of idle connections
 *
 * @example
 * ```typescript
 * updateDatabasePoolMetrics(5, 3); // 5 active, 3 idle
 * ```
 */
export function updateDatabasePoolMetrics(active: number, idle: number): void {
  const config = getSystemMetricsConfig();

  // Zero overhead when disabled
  if (!config.enabled) {
    return;
  }

  // Non-critical - never crash the app due to metrics
  try {
    const registry = getMetricsRegistry();
    registry.setGauge('db_connections', active, { state: 'active' });
    registry.setGauge('db_connections', idle, { state: 'idle' });
  } catch (error) {
    console.warn('[Metrics] Failed to update pool metrics', { error: String(error) });
  }
}
