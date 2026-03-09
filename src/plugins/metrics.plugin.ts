import { Elysia } from 'elysia';
import { logger } from '@core/logging/logger';

/**
 * Metrics plugin
 *
 * Stub implementation for Prometheus metrics collection.
 * Full implementation will be provided in Task 25.
 *
 * This plugin will eventually:
 * - Collect HTTP request metrics (latency, status codes, etc.)
 * - Expose metrics in Prometheus format at /metrics endpoint
 * - Track application-specific metrics
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { metricsPlugin } from '@/plugins/metrics.plugin';
 *
 * const app = new Elysia().use(metricsPlugin());
 * ```
 */
export function metricsPlugin() {
  return new Elysia({ name: 'metrics-plugin' }).onStart(() => {
    logger.info('Metrics plugin loaded (stub implementation)');
    // Full implementation will be added in Task 25
  });
}
