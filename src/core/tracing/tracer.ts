/**
 * Distributed Tracing with OpenTelemetry Compatibility
 *
 * This module provides a tracer implementation compatible with OpenTelemetry
 * concepts and W3C Trace Context format.
 */

import type { Span, TraceContext, TracingConfig, SpanLog } from './types';

/**
 * Tracer Class
 *
 * Manages the creation and lifecycle of spans for distributed tracing.
 * Compatible with OpenTelemetry concepts and W3C Trace Context format.
 */
export class Tracer {
  private config: TracingConfig;
  private spans: Map<string, Span> = new Map();
  private currentTraceId: string | undefined;
  private currentSpanId: string | undefined;

  constructor(config: TracingConfig) {
    this.config = config;
  }

  /**
   * Start a new span
   *
   * @param name - Human-readable name for the span
   * @param parentSpanId - Optional parent span ID for child spans
   * @returns The created span
   */
  startSpan(name: string, parentSpanId?: string): Span {
    if (!this.config.enabled) {
      return {
        traceId: '',
        spanId: '',
        name,
        startTime: Date.now(),
        tags: {},
        logs: [],
      };
    }

    const spanId = this.generateSpanId();
    const traceId = this.currentTraceId || this.generateTraceId();

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: Date.now(),
      tags: {},
      logs: [],
    };

    this.spans.set(spanId, span);
    this.currentTraceId = traceId;
    this.currentSpanId = spanId;

    return span;
  }

  /**
   * End a span and export it
   *
   * @param spanId - The span ID to end
   * @returns The ended span with duration calculated, or undefined if not found
   */
  endSpan(spanId: string): Span | undefined {
    if (!this.config.enabled) {
      return undefined;
    }

    const span = this.spans.get(spanId);

    if (!span || span.endTime) {
      return undefined;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;

    // Export the span
    this.exportSpan(span);

    // Remove from active spans
    this.spans.delete(spanId);

    // Update current span if this was the current one
    if (this.currentSpanId === spanId) {
      this.currentSpanId = undefined;
    }

    return span;
  }

  /**
   * Add a tag to a span
   *
   * @param spanId - The span ID
   * @param key - Tag key
   * @param value - Tag value
   * @returns True if tag was added, false if span not found
   */
  addTag(spanId: string, key: string, value: string | number | boolean): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const span = this.spans.get(spanId);

    if (!span) {
      return false;
    }

    span.tags[key] = value;
    return true;
  }

  /**
   * Add a log entry to a span
   *
   * @param spanId - The span ID
   * @param level - Log level (e.g., 'debug', 'info', 'warn', 'error')
   * @param message - Log message
   * @param attributes - Optional additional attributes
   * @returns True if log was added, false if span not found
   */
  addLog(
    spanId: string,
    level: string,
    message: string,
    attributes?: Record<string, string | number | boolean>
  ): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const span = this.spans.get(spanId);

    if (!span) {
      return false;
    }

    const log: SpanLog = {
      level,
      message,
      timestamp: Date.now(),
      attributes,
    };

    span.logs.push(log);
    return true;
  }

  /**
   * Get the current trace context
   *
   * @returns The current trace context
   */
  getCurrentContext(): TraceContext {
    const spanId = this.currentSpanId || this.generateSpanId();
    const traceId = this.currentTraceId || this.generateTraceId();
    const span = this.spans.get(spanId);

    return {
      traceId,
      spanId,
      parentSpanId: span?.parentSpanId,
      sampled: Math.random() < this.config.samplingRate,
    };
  }

  /**
   * Inject trace context into headers for downstream calls
   *
   * @param context - The trace context to inject
   * @returns Headers object with trace information
   */
  injectContext(context: TraceContext): Record<string, string> {
    const sampledFlag = context.sampled ? '01' : '00';
    const traceparent = `00-${context.traceId}-${context.spanId}-${sampledFlag}`;

    return {
      traceparent,
      'X-Trace-Id': context.traceId,
      'X-Span-Id': context.spanId,
    };
  }

  /**
   * Extract trace context from headers
   *
   * @param headers - Headers object potentially containing trace information
   * @returns The extracted trace context, or a new context if none found
   */
  extractContext(headers: Record<string, string>): TraceContext {
    const traceparent = headers['traceparent'] || headers['traceparent'];

    if (!traceparent) {
      // No trace context, create a new one
      return {
        traceId: this.generateTraceId(),
        spanId: this.generateSpanId(),
        sampled: Math.random() < this.config.samplingRate,
      };
    }

    try {
      // Parse traceparent header: version-traceId-spanId-flags
      const parts = traceparent.split('-');

      if (parts.length < 4) {
        throw new Error('Invalid traceparent format');
      }

      const [, traceId, spanId, flags] = parts;
      const sampled = flags === '01';

      // Update current trace context
      this.currentTraceId = traceId;

      return {
        traceId,
        spanId,
        parentSpanId: spanId, // Use the incoming span as parent
        sampled,
      };
    } catch (error) {
      // Invalid traceparent, create new context
      return {
        traceId: this.generateTraceId(),
        spanId: this.generateSpanId(),
        sampled: Math.random() < this.config.samplingRate,
      };
    }
  }

  /**
   * Export a span
   *
   * Currently exports to console. In production, this would send to
   * an OTLP collector or Jaeger agent.
   *
   * @param span - The span to export
   */
  private exportSpan(span: Span): void {
    if (this.config.exporter === 'console') {
      // eslint-disable-next-line no-console
      console.log(
        `[TRACE] Span exported: ${span.name} (traceId: ${span.traceId}, spanId: ${span.spanId}, duration: ${span.duration}ms)`
      );

      if (Object.keys(span.tags).length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[TRACE]   Tags:`, span.tags);
      }

      if (span.logs.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`[TRACE]   Logs:`, span.logs);
      }
    }
    // TODO: Implement OTLP export for production
    // TODO: Implement Jaeger export for production
  }

  /**
   * Generate a random trace ID (32 hex characters)
   *
   * @returns A random trace ID
   */
  private generateTraceId(): string {
    return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  /**
   * Generate a random span ID (16 hex characters)
   *
   * @returns A random span ID
   */
  private generateSpanId(): string {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }
}

// Export types from this module
export type { TraceContext, Span, TracingConfig, SpanLog };
