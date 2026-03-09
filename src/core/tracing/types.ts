/**
 * Distributed Tracing Type Definitions
 *
 * This file contains type definitions for the OpenTelemetry-compatible
 * distributed tracing system.
 */

/**
 * Trace Context
 *
 * Represents the current trace context containing trace ID, span ID,
 * parent span ID, and sampling flag.
 */
export interface TraceContext {
  /** Unique identifier for the trace (32 hex characters) */
  traceId: string;

  /** Unique identifier for the current span (16 hex characters) */
  spanId: string;

  /** Parent span ID if this is a child span */
  parentSpanId?: string;

  /** Whether this trace is sampled for export */
  sampled: boolean;
}

/**
 * Span Log Entry
 *
 * Represents a single log entry within a span.
 */
export interface SpanLog {
  /** Log level (e.g., 'debug', 'info', 'warn', 'error') */
  level: string;

  /** Log message */
  message: string;

  /** Timestamp when the log was created */
  timestamp: number;

  /** Additional attributes for the log entry */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Span
 *
 * Represents a single span in a distributed trace.
 * A span is a single operation within a trace.
 */
export interface Span {
  /** Unique identifier for the trace this span belongs to */
  traceId: string;

  /** Unique identifier for this span */
  spanId: string;

  /** Parent span ID if this is a child span */
  parentSpanId?: string;

  /** Human-readable name for the span (e.g., 'HTTP GET /api/users') */
  name: string;

  /** Start timestamp in milliseconds */
  startTime: number;

  /** End timestamp in milliseconds (undefined if span is not ended) */
  endTime?: number;

  /** Duration in milliseconds (calculated when span ends) */
  duration?: number;

  /** Key-value pairs for span attributes */
  tags: Record<string, string | number | boolean>;

  /** Log entries within this span */
  logs: SpanLog[];
}

/**
 * Tracing Exporter Type
 *
 * Defines the available exporters for trace data.
 */
export type TracingExporter = 'console' | 'otlp' | 'jaeger';

/**
 * Tracing Configuration
 *
 * Configuration options for the tracing system.
 */
export interface TracingConfig {
  /** Whether tracing is enabled */
  enabled: boolean;

  /** Sampling rate (0.0 to 1.0) - probability of sampling a trace */
  samplingRate: number;

  /** Exporter type for trace data */
  exporter: TracingExporter;

  /** URL for the exporter (required for OTLP and Jaeger) */
  exporterUrl?: string;
}

/**
 * Trace Parent Header Format
 *
 * W3C Trace Context format: 00-{traceId}-{spanId}-{flags}
 * - version: always '00' for current version
 * - traceId: 32 hex characters
 * - spanId: 16 hex characters
 * - flags: '01' for sampled, '00' for not sampled
 */
export interface TraceParentHeader {
  /** Version (always '00') */
  version: string;

  /** Trace ID (32 hex characters) */
  traceId: string;

  /** Span ID (16 hex characters) */
  spanId: string;

  /** Flags (0-2 hex characters) */
  flags: string;
}
