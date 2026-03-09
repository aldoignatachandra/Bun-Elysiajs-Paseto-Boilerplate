import { metricsCollector } from '@/core/metrics/collector';
import { logger } from '@/core/logging/logger';

/**
 * Configuration for database performance monitoring
 */
export interface DatabasePerformanceMonitorConfig {
  /**
   * Threshold in milliseconds for considering a query as "slow"
   * @default 1000 (1 second)
   */
  slowQueryThreshold?: number;

  /**
   * Enable query logging
   * @default true
   */
  enableQueryLogging?: boolean;

  /**
   * Enable metrics collection
   * @default true
   */
  enableMetrics?: boolean;
}

/**
 * Statistics about database performance
 */
export interface DatabasePerformanceStatistics {
  /**
   * Total number of queries tracked
   */
  totalQueries: number;

  /**
   * Number of slow queries (exceeding threshold)
   */
  slowQueries: number;

  /**
   * Number of query errors
   */
  errors: number;

  /**
   * Average query duration in milliseconds
   */
  averageDuration: number;

  /**
   * Total query duration in milliseconds
   */
  totalDuration: number;
}

/**
 * Labels for query metrics
 */
export interface QueryLabels {
  /**
   * Operation type (select, insert, update, delete, etc.)
   */
  operation?: string;

  /**
   * Table name
   */
  table?: string;

  /**
   * Query hash or identifier
   */
  query?: string;
}

/**
 * Pool statistics for monitoring
 */
export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<DatabasePerformanceMonitorConfig> = {
  slowQueryThreshold: 1000,
  enableQueryLogging: true,
  enableMetrics: true,
} as const;

/**
 * Database Performance Monitor
 *
 * Tracks query performance, logs slow queries, and records metrics
 */
export class DatabasePerformanceMonitor {
  private config: Required<DatabasePerformanceMonitorConfig>;
  private stats: DatabasePerformanceStatistics;
  private disposed: boolean = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private loggerInstance: any;

  constructor(config: DatabasePerformanceMonitorConfig = {}) {
    this.config = {
      slowQueryThreshold: config.slowQueryThreshold ?? DEFAULT_CONFIG.slowQueryThreshold,
      enableQueryLogging: config.enableQueryLogging ?? DEFAULT_CONFIG.enableQueryLogging,
      enableMetrics: config.enableMetrics ?? DEFAULT_CONFIG.enableMetrics,
    };

    this.stats = {
      totalQueries: 0,
      slowQueries: 0,
      errors: 0,
      averageDuration: 0,
      totalDuration: 0,
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    this.loggerInstance = logger.child({ component: 'DatabasePerformanceMonitor' });
  }

  /**
   * Track a database query execution
   *
   * @param query - SQL query string (will be truncated if too long)
   * @param params - Query parameters
   * @param labels - Additional labels for metrics
   * @returns Query execution time in milliseconds
   */
  trackQuery(query: string, params?: unknown[], labels?: QueryLabels): number {
    if (this.disposed) {
      return 0;
    }

    const startTime = performance.now();

    try {
      // Simulate query execution tracking
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.updateStatistics(duration);
      this.recordQueryMetrics(query, duration, labels);
      this.logSlowQuery(query, params, duration);

      return duration;
    } catch (error) {
      this.trackError(query, error as Error, labels);
      throw error;
    }
  }

  /**
   * Track a database query error
   *
   * @param query - SQL query that failed
   * @param error - Error object
   * @param labels - Additional labels for metrics
   */
  trackError(query: string, error: Error, labels?: QueryLabels): void {
    if (this.disposed) {
      return;
    }

    this.stats.errors++;

    if (this.config.enableMetrics) {
      const errorLabels: QueryLabels = {
        ...labels,
        error: error instanceof Error ? error.name : 'unknown',
      };

      metricsCollector.counter('db_query_errors_total', 1, this.buildLabels(query, errorLabels));
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    this.loggerInstance.error('Database query error', error, {
      query: this.truncateQuery(query),
      labels,
    });
  }

  /**
   * Record connection pool statistics
   *
   * @param stats - Pool statistics
   */
  recordPoolStats(stats: PoolStats): void {
    if (this.disposed || !this.config.enableMetrics) {
      return;
    }

    metricsCollector.gauge('db_pool_active_connections', stats.totalCount);
    metricsCollector.gauge('db_pool_idle_connections', stats.idleCount);
    metricsCollector.gauge('db_pool_waiting_connections', stats.waitingCount);

    // Calculate and record pool utilization
    const total = stats.totalCount;
    metricsCollector.gauge('db_pool_utilization', total > 0 ? 1 : 0);
  }

  /**
   * Get current performance statistics
   *
   * @returns Current statistics snapshot
   */
  getStatistics(): DatabasePerformanceStatistics {
    return { ...this.stats };
  }

  /**
   * Reset all statistics
   */
  resetStatistics(): void {
    this.stats = {
      totalQueries: 0,
      slowQueries: 0,
      errors: 0,
      averageDuration: 0,
      totalDuration: 0,
    };
  }

  /**
   * Dispose of the monitor and stop tracking
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    this.loggerInstance.debug('Database performance monitor disposed');
  }

  /**
   * Update internal statistics
   */
  private updateStatistics(duration: number): void {
    this.stats.totalQueries++;
    this.stats.totalDuration += duration;
    this.stats.averageDuration = this.stats.totalDuration / this.stats.totalQueries;

    // Consider query slow if duration >= threshold (allowing threshold of 0 to catch all queries)
    if (this.config.slowQueryThreshold === 0 || duration >= this.config.slowQueryThreshold) {
      this.stats.slowQueries++;
    }
  }

  /**
   * Record query metrics to the metrics collector
   */
  private recordQueryMetrics(query: string, duration: number, labels?: QueryLabels): void {
    if (!this.config.enableMetrics) {
      return;
    }

    const queryLabels = this.buildLabels(query, labels);

    // Record query duration in seconds (Prometheus standard)
    const durationInSeconds = duration / 1000;
    metricsCollector.histogram('db_query_duration_seconds', durationInSeconds, queryLabels);

    // Increment query counter
    metricsCollector.counter('db_queries_total', 1, queryLabels);

    // Increment slow query counter if applicable (using >= to include threshold of 0)
    if (this.config.slowQueryThreshold === 0 || duration >= this.config.slowQueryThreshold) {
      metricsCollector.counter('db_slow_queries_total', 1, queryLabels);
    }
  }

  /**
   * Log slow queries
   */
  private logSlowQuery(query: string, params: unknown[] | undefined, duration: number): void {
    if (!this.config.enableQueryLogging) {
      return;
    }

    // Consider query slow if duration >= threshold (allowing threshold of 0 to catch all queries)
    if (this.config.slowQueryThreshold === 0 || duration >= this.config.slowQueryThreshold) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      this.loggerInstance.warn('Slow database query detected', null, {
        query: this.truncateQuery(query),
        params: params ? JSON.stringify(params) : undefined,
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${this.config.slowQueryThreshold}ms`,
      });
    }
  }

  /**
   * Build metric labels from query and custom labels
   */
  private buildLabels(query: string, customLabels?: QueryLabels): QueryLabels {
    const labels: QueryLabels = { ...customLabels };

    // Extract operation type from query if not provided
    if (!labels.operation) {
      const trimmedQuery = query.trim().toUpperCase();
      if (trimmedQuery.startsWith('SELECT')) {
        labels.operation = 'select';
      } else if (trimmedQuery.startsWith('INSERT')) {
        labels.operation = 'insert';
      } else if (trimmedQuery.startsWith('UPDATE')) {
        labels.operation = 'update';
      } else if (trimmedQuery.startsWith('DELETE')) {
        labels.operation = 'delete';
      } else {
        labels.operation = 'other';
      }
    }

    // Extract table name from query if not provided
    if (!labels.table) {
      const tableMatch = query.match(/FROM\s+(\w+)|INTO\s+(\w+)|UPDATE\s+(\w+)/i);
      if (tableMatch) {
        labels.table = tableMatch[1] || tableMatch[2] || tableMatch[3];
      }
    }

    // Add truncated query as identifier
    if (!labels.query) {
      labels.query = this.truncateQuery(query, 50);
    }

    return labels;
  }

  /**
   * Truncate query string to avoid flooding logs/metrics
   */
  private truncateQuery(query: string, maxLength: number = 200): string {
    if (query.length <= maxLength) {
      return query;
    }

    return query.substring(0, maxLength) + '...';
  }
}

/**
 * Default singleton instance
 */
export const databasePerformanceMonitor = new DatabasePerformanceMonitor();
