/**
 * OpenTelemetry Integration
 *
 * This module provides optional distributed tracing via OpenTelemetry.
 * When disabled (default), it adds zero overhead to the application.
 *
 * ## Quick Start
 *
 * 1. Enable in `.env`:
 *    ```
 *    OTEL_ENABLED=true
 *    OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
 *    ```
 *
 * 2. Start observability stack:
 *    ```bash
 *    docker-compose -f docker/compose/docker-compose.observability.yaml up -d
 *    ```
 *
 * 3. View traces in Jaeger UI: http://localhost:16686
 *
 * ## Features
 *
 * - **HTTP Tracing**: Automatic request/response tracing
 * - **Database Tracing**: PostgreSQL query tracing (opt-in)
 * - **Redis Tracing**: Cache operation tracing (opt-in)
 * - **Zero Overhead**: When disabled, no performance impact
 *
 * @module telemetry
 */

// Re-export types
export type { TelemetryConfig } from './config';
export type { Span } from '@opentelemetry/api';

// Re-export config
export { getTelemetryConfig, isTelemetryEnabled, DEFAULT_SERVICE_NAME, DEFAULT_SERVICE_VERSION, DEFAULT_OTLP_ENDPOINT } from './config';

// Re-export tracer functions
export { initializeTracer, shutdownTracer, getTracer, isTracerInitialized, createSpan, withSpan, recordSpanError, setSpanOk } from './tracer';

// Re-export middleware
export { telemetryMiddleware, traceDatabaseOperation, traceRedisOperation, getActiveSpan, addSpanAttribute, addSpanEvent } from './middleware';
