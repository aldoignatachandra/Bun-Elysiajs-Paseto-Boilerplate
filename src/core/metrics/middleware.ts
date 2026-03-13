/**
 * Metrics middleware for Elysia
 *
 * Automatically tracks HTTP request metrics including:
 * - Request duration (histogram)
 * - Request count (counter)
 * - Active requests (gauge)
 * - Error tracking (counter)
 */

import type { Elysia } from 'elysia';
import { getMetricsRegistry } from './metrics';

/**
 * HTTP request metadata stored during request processing
 */
interface HTTPRequestMetadata {
  /** Request start time in milliseconds */
  startTime: number;
  /** HTTP method */
  method: string;
  /** Route path pattern */
  route: string;
  /** Original URL path */
  path: string;
}

/**
 * Plugin configuration options
 */
export interface MetricsMiddlewareConfig {
  /**
   * Enable/disable HTTP request tracking
   * @default true
   */
  trackHTTP?: boolean;

  /**
   * Exclude specific paths from metrics collection
   * @default ['/health', '/metrics']
   */
  excludePaths?: string[];

  /**
   * Only track specific paths (if set, other paths are excluded)
   * @default undefined
   */
  includePaths?: string[];

  /**
   * Custom path extractor function
   * @default (path) => path
   */
  pathExtractor?: (path: string) => string;
}

/**
 * WeakMap to store request metadata without preventing garbage collection
 */
const requestMetadataMap = new WeakMap<Request, HTTPRequestMetadata>();

/**
 * Get HTTP status code class from status code
 *
 * @param statusCode - HTTP status code
 * @returns Status class (e.g., "2xx", "3xx", "4xx", "5xx")
 */
function getStatusClass(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '2xx';
  if (statusCode >= 300 && statusCode < 400) return '3xx';
  if (statusCode >= 400 && statusCode < 500) return '4xx';
  if (statusCode >= 500 && statusCode < 600) return '5xx';
  return 'unknown';
}

/**
 * Extract route pattern from request
 *
 * @param path - Request path
 * @param pathExtractor - Optional custom path extractor
 * @returns Route pattern for metrics
 */
function extractRoute(path: string, pathExtractor?: (path: string) => string): string {
  if (pathExtractor) {
    return pathExtractor(path);
  }

  // Simple path normalization - replace IDs with :id placeholder
  // This can be enhanced with actual route pattern matching
  return path
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // UUID pattern
    .replace(/\/[a-f0-9]{24}/g, '/:mongoId'); // MongoDB ObjectId pattern
}

/**
 * Check if a path should be tracked
 *
 * @param path - Request path
 * @param excludePaths - Paths to exclude
 * @param includePaths - Paths to include (exclusive mode)
 * @returns true if path should be tracked
 */
function shouldTrackPath(path: string, excludePaths: string[] = [], includePaths?: string[]): boolean {
  // Check if path is explicitly excluded
  for (const excluded of excludePaths) {
    if (path.startsWith(excluded)) {
      return false;
    }
  }

  // If includePaths is specified, only track matching paths
  if (includePaths && includePaths.length > 0) {
    for (const included of includePaths) {
      if (path.startsWith(included)) {
        return true;
      }
    }
    return false;
  }

  return true;
}

/**
 * Record request start
 *
 * @param request - Request object
 * @param config - Middleware configuration
 */
function recordRequestStart(request: Request, config: MetricsMiddlewareConfig): void {
  const url = new URL(request.url);
  const path = url.pathname;

  if (!shouldTrackPath(path, config.excludePaths, config.includePaths)) {
    return;
  }

  const metadata: HTTPRequestMetadata = {
    startTime: performance.now(),
    method: request.method,
    route: extractRoute(path, config.pathExtractor),
    path,
  };

  requestMetadataMap.set(request, metadata);

  // Increment active requests gauge
  const registry = getMetricsRegistry();
  registry.incrementGauge('http_requests_in_flight', 1);
}

/**
 * Record request completion
 *
 * @param request - Request object
 * @param statusCode - HTTP status code
 * @param config - Middleware configuration
 */
function recordRequestEnd(request: Request, statusCode: number, _config: MetricsMiddlewareConfig): void {
  const metadata = requestMetadataMap.get(request);
  if (!metadata) {
    return;
  }

  const registry = getMetricsRegistry();
  const duration = (performance.now() - metadata.startTime) / 1000; // Convert to seconds
  const statusClass = getStatusClass(statusCode);
  const statusCodeStr = statusCode.toString();

  // Record request duration histogram
  registry.observeHistogram('http_request_duration_seconds', duration, {
    method: metadata.method,
    route: metadata.route,
    status_code: statusCodeStr,
    status_class: statusClass,
  });

  // Increment total requests counter
  registry.incrementCounter('http_requests_total', 1, {
    method: metadata.method,
    route: metadata.route,
    status_code: statusCodeStr,
    status_class: statusClass,
  });

  // Track errors (4xx and 5xx)
  if (statusCode >= 400) {
    registry.incrementCounter('http_errors_total', 1, {
      method: metadata.method,
      route: metadata.route,
      status_code: statusCodeStr,
      error_type: statusClass,
    });
  }

  // Decrement active requests gauge
  registry.incrementGauge('http_requests_in_flight', -1);

  // Clean up metadata
  requestMetadataMap.delete(request);
}

/**
 * Metrics middleware plugin for Elysia
 *
 * Follows the same pattern as loggingPlugin in the codebase
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { metricsPlugin } from '@/core/metrics';
 *
 * const app = new Elysia().use(metricsPlugin());
 * ```
 *
 * @param config - Plugin configuration
 * @returns Elysia plugin function
 */
export function metricsMiddleware<T extends Elysia>(config: MetricsMiddlewareConfig = {}) {
  return (app: T) => {
    const { trackHTTP = true, excludePaths = ['/health', '/metrics'], includePaths, pathExtractor } = config;

    const middlewareConfig = { excludePaths, includePaths, pathExtractor };

    return app
      .onBeforeHandle(({ request }) => {
        if (trackHTTP) {
          recordRequestStart(request, middlewareConfig);
        }
      })
      .onAfterHandle(({ request, set }) => {
        if (trackHTTP) {
          const statusCode = (set.status as number) ?? 200;
          recordRequestEnd(request, statusCode, middlewareConfig);
        }
      })
      .onError(({ request, set }) => {
        if (trackHTTP) {
          const statusCode = (set.status as number) ?? 500;
          recordRequestEnd(request, statusCode, middlewareConfig);
        }
      });
  };
}

/**
 * Get metrics endpoint handler
 *
 * Returns metrics in Prometheus exposition format
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { getMetricsHandler } from '@/core/metrics';
 *
 * app.get('/metrics', getMetricsHandler());
 * ```
 *
 * @returns Response handler function
 */
export function getMetricsHandler() {
  return () => {
    const registry = getMetricsRegistry();
    const metrics = registry.getMetrics();

    return new Response(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      },
    });
  };
}

/**
 * Check if metrics endpoint should be enabled based on environment
 *
 * @returns true if metrics should be enabled
 */
export function isMetricsEnabled(): boolean {
  const envValue = process.env.METRICS_ENABLED;
  if (envValue === undefined) {
    // Enable in development by default, disable in production
    return process.env.NODE_ENV !== 'production';
  }
  return envValue === 'true' || envValue === '1';
}

/**
 * Create metrics plugin with /metrics endpoint
 *
 * This plugin includes both the middleware and the /metrics endpoint
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { metricsPlugin } from '@/core/metrics';
 *
 * const app = new Elysia().use(metricsPlugin());
 * ```
 *
 * @param config - Plugin configuration
 * @returns Elysia plugin function
 */
export function metricsPlugin<T extends Elysia>(config: MetricsMiddlewareConfig = {}) {
  return (app: T) => {
    // First apply the middleware
    const withMiddleware = metricsMiddleware(config)(app);

    // Then add the /metrics endpoint
    return withMiddleware.get('/metrics', getMetricsHandler(), {
      detail: {
        summary: 'Prometheus metrics endpoint',
        description: 'Returns application metrics in Prometheus exposition format',
        tags: ['Monitoring'],
      },
    });
  };
}
