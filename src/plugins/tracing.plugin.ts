/**
 * Distributed Tracing Plugin
 *
 * Elysia plugin for OpenTelemetry-compatible distributed tracing.
 * Handles trace context extraction, span creation, and context propagation.
 */

import { Elysia } from 'elysia';
import { Tracer } from '@/core/tracing/tracer';
import type { TracingConfig, TraceContext } from '@/core/tracing/types';
import { logger } from '@core/logging/logger';

/**
 * Default tracing configuration
 */
const DEFAULT_CONFIG: TracingConfig = {
  enabled: true,
  samplingRate: 1.0,
  exporter: 'console',
  exporterUrl: undefined,
};

/**
 * Store for per-request tracing data
 */
interface TracingStore {
  spanId?: string;
  traceContext?: TraceContext;
  traceHeaders?: Record<string, string>;
}

/**
 * Tracing Plugin
 *
 * Integrates distributed tracing with Elysia request lifecycle.
 * Creates spans for HTTP requests and propagates trace context.
 *
 * @param config - Optional tracing configuration
 * @returns Elysia plugin instance
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { tracingPlugin } from '@/plugins/tracing.plugin';
 *
 * const app = new Elysia().use(tracingPlugin());
 * ```
 *
 * @example
 * ```typescript
 * // With custom configuration
 * const app = new Elysia().use(tracingPlugin({
 *   enabled: true,
 *   samplingRate: 0.5,
 *   exporter: 'otlp',
 *   exporterUrl: 'http://otel-collector:4317',
 * }));
 * ```
 */
export function tracingPlugin(config: Partial<TracingConfig> = {}): Elysia {
  const mergedConfig: TracingConfig = { ...DEFAULT_CONFIG, ...config };
  const tracer = new Tracer(mergedConfig);

  return new Elysia({ name: 'tracing-plugin' })
    .derive(({ request }) => {
      // Extract or create trace context
      const headers: Record<string, string> = {};
      request.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const traceContext = tracer.extractContext(headers);

      // Get client IP from headers
      const clientIp =
        headers['x-forwarded-for']?.split(',')[0]?.trim() || headers['x-real-ip'] || 'unknown';

      return {
        tracing: {
          traceContext,
          clientIp,
          headers,
        },
      };
    })
    .onBeforeHandle(({ request, tracing, store }) => {
      if (!mergedConfig.enabled) {
        return;
      }

      const tracingStore = store as TracingStore;

      // Extract HTTP method and path
      const method = request.method;
      const url = new URL(request.url);
      const path = url.pathname;

      // Start span for this request
      const spanName = `${method} ${path}`;
      const span = tracer.startSpan(spanName, tracing.traceContext.spanId);

      tracingStore.spanId = span.spanId;
      tracingStore.traceContext = tracer.getCurrentContext();

      // Add HTTP tags to span
      tracer.addTag(span.spanId, 'http.method', method);
      tracer.addTag(span.spanId, 'http.url', path);
      tracer.addTag(span.spanId, 'http.flavor', '1.1');
      tracer.addTag(span.spanId, 'http.scheme', url.protocol.replace(':', ''));
      tracer.addTag(span.spanId, 'http.host', url.host);
      tracer.addTag(span.spanId, 'net.host.port', url.port || '80');

      // Add user agent if present
      const userAgent = tracing.headers['user-agent'];
      if (userAgent) {
        tracer.addTag(span.spanId, 'http.user_agent', userAgent);
      }

      // Add client IP
      tracer.addTag(span.spanId, 'http.client_ip', tracing.clientIp);

      // Inject trace headers for downstream calls
      tracingStore.traceHeaders = tracer.injectContext(tracingStore.traceContext);
    })
    .onAfterHandle(({ store, set }) => {
      if (!mergedConfig.enabled) {
        return;
      }

      const tracingStore = store as TracingStore;

      if (!tracingStore.spanId) {
        return;
      }

      // Add status code tag
      tracer.addTag(tracingStore.spanId, 'http.status_code', set.status.toString());

      // End the span
      tracer.endSpan(tracingStore.spanId);
    })
    .onError(({ store, error, set }) => {
      if (!mergedConfig.enabled) {
        return;
      }

      const tracingStore = store as TracingStore;

      if (!tracingStore.spanId) {
        return;
      }

      // Add error tag
      tracer.addTag(tracingStore.spanId, 'error', true);

      // Add error log
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = error instanceof Error ? error.constructor.name : 'Unknown';

      tracer.addLog(tracingStore.spanId, 'error', `Request failed: ${errorMessage}`, {
        'error.type': errorType,
        'error.message': errorMessage,
        'http.status_code': set.status?.toString() || '500',
      });

      // End the span
      tracer.endSpan(tracingStore.spanId);
    })
    .onStart(() => {
      if (mergedConfig.enabled) {
        logger.info('Tracing plugin loaded', {
          enabled: mergedConfig.enabled,
          samplingRate: mergedConfig.samplingRate,
          exporter: mergedConfig.exporter,
        });
      }
    });
}

// Export types for use in other modules
export type { TracingConfig, TraceContext };
