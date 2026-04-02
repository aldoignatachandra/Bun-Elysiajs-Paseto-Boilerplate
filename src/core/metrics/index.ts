/**
 * Metrics module barrel export
 *
 * @example
 * ```typescript
 * import { getMetricsRegistry, metricsPlugin } from '@/core/metrics';
 *
 * // Get registry instance
 * const registry = getMetricsRegistry();
 *
 * // Use plugin
 * app.use(metricsPlugin());
 *
 * // Track database queries (when SYSTEM_METRICS_ENABLED=true)
 * import { trackDatabaseQuery } from '@/core/metrics';
 * const result = await trackDatabaseQuery('select', () => db.select().from(users));
 * ```
 */

// Core registry
export { MetricsRegistry, getMetricsRegistry } from './metrics';

// Types
export type {
  MetricDefinition,
  MetricType,
  LabelValues,
  HistogramBucket,
  HistogramData,
  SummaryQuantile,
  SummaryData,
  HTTPRequestLabels,
  HTTPErrorLabels,
  DEFAULT_LATENCY_BUCKETS,
  DEFAULT_QUANTILES,
} from './types';

// Middleware and plugins
export { metricsMiddleware, metricsPlugin, getMetricsHandler, isMetricsEnabled, type MetricsMiddlewareConfig } from './middleware';

// System metrics collector (opt-in via SYSTEM_METRICS_ENABLED=true)
export {
  getSystemMetricsCollector,
  getSystemMetricsConfig,
  initializeSystemMetrics,
  shutdownSystemMetrics,
  trackDatabaseQuery,
  updateDatabasePoolMetrics,
} from './system-collector';
