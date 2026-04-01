/**
 * OpenTelemetry Middleware for Elysia
 *
 * Provides automatic request tracing for HTTP requests.
 * Only adds overhead when OTEL_ENABLED=true.
 */

import type { Elysia } from 'elysia';
import { context, trace, SpanStatusCode, SpanKind, type Span } from '@opentelemetry/api';

import { getTelemetryConfig } from './config';
import { getTracer } from './tracer';

/**
 * Paths to exclude from tracing
 */
const EXCLUDED_PATHS = ['/health', '/health/live', '/health/ready', '/metrics', '/favicon.ico', '/swagger'];

/**
 * Check if a path should be excluded from tracing
 *
 * @param path - Request path
 * @returns true if path should be excluded
 */
function shouldExcludePath(path: string): boolean {
  return EXCLUDED_PATHS.some(excluded => path === excluded || path.startsWith(`${excluded}/`));
}

/**
 * Extract span name from request
 *
 * @param method - HTTP method
 * @param path - Request path
 * @returns Sanitized span name
 */
function getSpanName(method: string, path: string): string {
  return `${method} ${path}`;
}

/**
 * Request context containing span information
 */
export interface RequestTraceContext {
  /** Active span for the request */
  traceSpan: Span | undefined;
}

/**
 * Telemetry middleware plugin for Elysia
 *
 * Follows the same pattern as other middleware in the codebase (loggingPlugin, metricsMiddleware)
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { telemetryMiddleware } from '@/core/telemetry';
 *
 * const app = new Elysia().use(telemetryMiddleware());
 * ```
 *
 * @returns Elysia plugin function
 */
export function telemetryMiddleware<T extends Elysia>() {
  return (app: T) => {
    const config = getTelemetryConfig();

    // Return unchanged app if telemetry is disabled
    if (!config.enabled) {
      return app;
    }

    return app
      .derive(() => ({
        traceSpan: undefined as Span | undefined,
      }))
      .onBeforeHandle(ctx => {
        const tracer = getTracer();
        if (!tracer) return;

        const path = ctx.path || new URL(ctx.request.url).pathname;

        // Skip excluded paths
        if (shouldExcludePath(path)) {
          return;
        }

        const method = ctx.request.method;
        const spanName = getSpanName(method, path);

        // Create span
        const span = tracer.startSpan(spanName, {
          kind: SpanKind.SERVER,
          attributes: {
            'http.method': method,
            'http.target': path,
            'http.scheme': 'http',
            'http.host': ctx.request.headers.get('host') || 'localhost',
            'http.flavor': '1.1',
            'http.user_agent': ctx.request.headers.get('user-agent') || '',
          },
        });

        // Store span in context
        (ctx as unknown as RequestTraceContext).traceSpan = span;

        // Set active span in context
        context.with(trace.setSpan(context.active(), span), () => {});
      })
      .onAfterHandle(ctx => {
        const span = (ctx as unknown as RequestTraceContext).traceSpan;
        if (!span) return;

        try {
          // Get response status
          const statusCode = typeof ctx.set.status === 'number' ? ctx.set.status : 200;

          // Set response attributes
          span.setAttribute('http.status_code', statusCode);

          // Set span status based on HTTP status
          if (statusCode >= 500) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `HTTP ${statusCode}`,
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }
        } finally {
          span.end();
        }
      })
      .onError(ctx => {
        const span = (ctx as unknown as RequestTraceContext).traceSpan;
        if (!span) return;

        const error = ctx.error;
        if (error instanceof Error) {
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
        }
        span.end();
      });
  };
}

/**
 * Trace a database operation.
 * Returns the result of the operation.
 *
 * @param operation - Operation name (e.g., 'select', 'insert')
 * @param table - Table name
 * @param fn - Function to execute
 * @returns Result of the function
 */
export async function traceDatabaseOperation<T>(operation: string, table: string, fn: () => Promise<T>): Promise<T> {
  const config = getTelemetryConfig();

  if (!config.enabled || !config.traceDatabase) {
    return fn();
  }

  const tracer = getTracer();
  if (!tracer) {
    return fn();
  }

  const span = tracer.startSpan(`db.${operation} ${table}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.operation': operation,
      'db.table': table,
      'db.system': 'postgresql',
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Trace a Redis operation.
 * Returns the result of the operation.
 *
 * @param operation - Operation name (e.g., 'get', 'set')
 * @param key - Redis key
 * @param fn - Function to execute
 * @returns Result of the function
 */
export async function traceRedisOperation<T>(operation: string, key: string, fn: () => Promise<T>): Promise<T> {
  const config = getTelemetryConfig();

  if (!config.enabled || !config.traceRedis) {
    return fn();
  }

  const tracer = getTracer();
  if (!tracer) {
    return fn();
  }

  const span = tracer.startSpan(`redis.${operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.operation': operation,
      'db.statement': operation,
      'db.system': 'redis',
      'db.key': key,
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Get the current active span from context.
 * Returns null if no active span.
 *
 * @returns Active span or null
 */
export function getActiveSpan(): Span | null {
  const span = trace.getActiveSpan();
  return span || null;
}

/**
 * Add an attribute to the current active span.
 * Does nothing if no active span.
 *
 * @param key - Attribute key
 * @param value - Attribute value
 */
export function addSpanAttribute(key: string, value: string | number | boolean): void {
  const span = getActiveSpan();
  if (span) {
    span.setAttribute(key, value);
  }
}

/**
 * Add an event to the current active span.
 * Does nothing if no active span.
 *
 * @param name - Event name
 * @param attributes - Optional event attributes
 */
export function addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
  const span = getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}
