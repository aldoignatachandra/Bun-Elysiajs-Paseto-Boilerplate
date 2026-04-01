/**
 * OpenTelemetry Tracer Setup
 *
 * Provides distributed tracing via OpenTelemetry SDK.
 * When disabled (default), it adds zero overhead to the application.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { trace, Tracer, SpanStatusCode, Span, Context } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

import type { TelemetryConfig } from './config';

/* eslint-disable no-console */

let sdk: NodeSDK | null = null;
let tracer: Tracer | null = null;

/**
 * Initialize the OpenTelemetry SDK and tracer provider.
 *
 * @param config - Telemetry configuration
 */
export function initializeTracer(config: TelemetryConfig): void {
  if (!config.enabled) {
    console.log('[Telemetry] OpenTelemetry is disabled, skipping initialization');
    return;
  }

  try {
    // Create OTLP trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${config.otlpEndpoint}/v1/traces`,
      headers: {},
    });

    // Create SDK with auto-instrumentations
    // Note: Some instrumentations are disabled because Bun doesn't support certain Node.js APIs
    sdk = new NodeSDK({
      serviceName: config.serviceName,
      spanProcessor: new BatchSpanProcessor(traceExporter),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable instrumentations we don't need or handle manually
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // File system tracing is noisy
          },
          '@opentelemetry/instrumentation-http': {
            enabled: config.traceHTTP,
          },
          // Disable runtime node instrumentation - Bun doesn't support getHeapSpaceStatistics
          '@opentelemetry/instrumentation-runtime-node': {
            enabled: false,
          },
        }),
      ],
    });

    // Start the SDK (sync in this version)
    sdk.start();

    // Get tracer instance
    tracer = trace.getTracer(config.serviceName, config.serviceVersion);

    console.log('[Telemetry] OpenTelemetry initialized successfully', {
      serviceName: config.serviceName,
      endpoint: config.otlpEndpoint,
    });
  } catch (error) {
    console.error('[Telemetry] Failed to initialize OpenTelemetry:', error);
    // Don't throw - we want the app to work even if telemetry fails
  }
}

/**
 * Shutdown the OpenTelemetry SDK gracefully.
 * Should be called on application shutdown.
 */
export async function shutdownTracer(): Promise<void> {
  if (!sdk) {
    return;
  }

  try {
    await sdk.shutdown();
    sdk = null;
    tracer = null;
    console.log('[Telemetry] OpenTelemetry shutdown completed');
  } catch (error) {
    console.error('[Telemetry] Failed to shutdown OpenTelemetry:', error);
  }
}

/**
 * Get the tracer instance.
 * Returns null if telemetry is not initialized.
 *
 * @returns Tracer instance or null
 */
export function getTracer(): Tracer | null {
  return tracer;
}

/**
 * Check if tracer is initialized
 *
 * @returns true if tracer is available
 */
export function isTracerInitialized(): boolean {
  return tracer !== null;
}

/**
 * Record an error on a span
 *
 * @param span - The span to record the error on
 * @param error - The error to record
 */
export function recordSpanError(span: Span, error: Error): void {
  span.recordException(error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
}

/**
 * Set span status to OK
 *
 * @param span - The span to set OK status on
 */
export function setSpanOk(span: Span): void {
  span.setStatus({ code: SpanStatusCode.OK });
}

/**
 * Create a child span for an operation.
 *
 * @param name - Span name
 * @param parentContext - Parent context (optional, uses active context if not provided)
 * @returns Span object or null if tracer not initialized
 */
export function createSpan(name: string, parentContext?: Context): Span | null {
  if (!tracer) {
    return null;
  }

  return tracer.startSpan(name, undefined, parentContext);
}

/**
 * Execute a function within a traced span.
 * Automatically handles span lifecycle and error recording.
 *
 * @param spanName - Name for the span
 * @param fn - Function to execute within the span
 * @param attributes - Optional attributes to set on the span
 * @returns Result of the function
 */
export async function withSpan<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  if (!tracer) {
    // If telemetry is disabled, just execute the function
    return fn({} as Span);
  }

  const span = tracer.startSpan(spanName);

  if (attributes) {
    span.setAttributes(attributes);
  }

  try {
    const result = await fn(span);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    if (error instanceof Error) {
      recordSpanError(span, error);
    }
    throw error;
  } finally {
    span.end();
  }
}

// Re-export Span type for convenience
export type { Span } from '@opentelemetry/api';
