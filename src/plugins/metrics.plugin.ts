/**
 * Metrics Plugin for Prometheus Metrics Export
 *
 * This plugin collects HTTP request metrics and exposes them
 * in Prometheus text format at the /metrics endpoint.
 *
 * Metrics collected:
 * - http_requests_total: Counter with method, path, status labels
 * - http_request_duration_seconds: Histogram with method, path labels
 * - active_connections: Gauge
 */

import { Elysia } from 'elysia';
import { metricsCollector } from '@core/metrics/collector';
import { logger } from '@core/logging/logger';

// Store for request metadata
interface RequestContext {
  startTime?: bigint;
  path: string;
  method: string;
}

const requestContext = new WeakMap<Request, RequestContext>();

/**
 * Normalize path for metrics reporting
 * Converts path parameters to placeholder format
 */
function normalizePath(path: string): string {
  // Remove query parameters
  const urlPath = path.split('?')[0];

  // Convert UUIDs and IDs to placeholders
  return urlPath
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Metrics plugin configuration
 */
export interface MetricsPluginOptions {
  /**
   * Path to expose metrics endpoint
   * @default '/metrics'
   */
  endpoint?: string;

  /**
   * Whether to track request duration
   * @default true
   */
  trackDuration?: boolean;

  /**
   * Whether to track request counts
   * @default true
   */
  trackRequests?: boolean;

  /**
   * Custom path normalization function
   */
  normalizePathFn?: (path: string) => string;
}

/**
 * Metrics plugin for Elysia
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { metricsPlugin } from '@/plugins/metrics.plugin';
 *
 * const app = new Elysia().use(metricsPlugin());
 * ```
 */
export function metricsPlugin(options: MetricsPluginOptions = {}) {
  const {
    endpoint = '/metrics',
    trackDuration = true,
    trackRequests = true,
    normalizePathFn = normalizePath,
  } = options;

  return new Elysia({ name: 'metrics-plugin' })
    .onRequest(({ request }) => {
      // Store request metadata for later use
      const url = new URL(request.url);
      const path = normalizePathFn(url.pathname);

      requestContext.set(request, {
        startTime: trackDuration ? process.hrtime.bigint() : undefined,
        path,
        method: request.method,
      });
    })
    .onAfterHandle({ as: 'global' }, ({ request, set }) => {
      const ctx = requestContext.get(request);
      if (!ctx) {
        return;
      }

      // Skip tracking for the metrics endpoint itself
      if (ctx.path === endpoint) {
        return;
      }

      const status = set.status || 200;

      // Record request count
      if (trackRequests) {
        metricsCollector.incrementHttpRequests(ctx.method, ctx.path, Number(status));
      }

      // Record request duration
      if (trackDuration && ctx.startTime) {
        const endTime = process.hrtime.bigint();
        const durationSeconds = Number(endTime - ctx.startTime) / 1e9;
        metricsCollector.recordHttpDuration(ctx.method, ctx.path, durationSeconds);
      }
    })
    .onError({ as: 'global' }, ({ request, set }) => {
      const ctx = requestContext.get(request);
      if (!ctx) {
        return;
      }

      // Skip tracking for the metrics endpoint itself
      if (ctx.path === endpoint) {
        return;
      }

      const status = set.status || 500;

      // Record failed request
      if (trackRequests) {
        metricsCollector.incrementHttpRequests(ctx.method, ctx.path, Number(status));
      }

      // Record duration even for failed requests
      if (trackDuration && ctx.startTime) {
        const endTime = process.hrtime.bigint();
        const durationSeconds = Number(endTime - ctx.startTime) / 1e9;
        metricsCollector.recordHttpDuration(ctx.method, ctx.path, durationSeconds);
      }
    })
    .onStart(() => {
      logger.info('Metrics plugin loaded');
    })
    .get(endpoint, () => {
      const metrics = metricsCollector.getMetrics();

      return new Response(metrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        },
      });
    });
}
