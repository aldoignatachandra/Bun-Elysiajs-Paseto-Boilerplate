/**
 * Telemetry configuration
 *
 * Provides configuration for OpenTelemetry tracing.
 * All features are opt-in via environment variables.
 */

/**
 * Telemetry configuration interface
 */
export interface TelemetryConfig {
  /** Enable OpenTelemetry (default: false) */
  readonly enabled: boolean;

  /** Service name for traces */
  readonly serviceName: string;

  /** Service version */
  readonly serviceVersion: string;

  /** OTLP endpoint (default: http://localhost:4318) */
  readonly otlpEndpoint: string;

  /** Enable HTTP request tracing */
  readonly traceHTTP: boolean;

  /** Enable database query tracing */
  readonly traceDatabase: boolean;

  /** Enable Redis operation tracing */
  readonly traceRedis: boolean;

  /** Sample rate (0.0 to 1.0) */
  readonly sampleRate: number;

  /** Log level for telemetry */
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Default values for telemetry configuration
 */
const defaults = {
  serviceName: 'bun-elysia-api',
  serviceVersion: '1.0.0',
  otlpEndpoint: 'http://localhost:4318',
} as const;

/**
 * Get telemetry configuration from environment variables.
 * All features are disabled by default.
 *
 * @returns TelemetryConfig object
 */
export function getTelemetryConfig(): TelemetryConfig {
  return {
    enabled: process.env.OTEL_ENABLED === 'true',
    serviceName: process.env.OTEL_SERVICE_NAME || defaults.serviceName,
    serviceVersion: process.env.npm_package_version || defaults.serviceVersion,
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || defaults.otlpEndpoint,
    traceHTTP: process.env.OTEL_TRACE_HTTP !== 'false',
    traceDatabase: process.env.OTEL_TRACE_DATABASE === 'true',
    traceRedis: process.env.OTEL_TRACE_REDIS === 'true',
    sampleRate: Math.max(0, Math.min(1, parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'))),
    logLevel: (process.env.OTEL_LOG_LEVEL as TelemetryConfig['logLevel']) || 'info',
  };
}

/**
 * Check if telemetry is enabled
 *
 * @returns true if telemetry is enabled
 */
export function isTelemetryEnabled(): boolean {
  return process.env.OTEL_ENABLED === 'true';
}

/**
 * Default service name for traces
 */
export const DEFAULT_SERVICE_NAME = defaults.serviceName;

/**
 * Default service version
 */
export const DEFAULT_SERVICE_VERSION = defaults.serviceVersion;

/**
 * Default OTLP endpoint
 */
export const DEFAULT_OTLP_ENDPOINT = defaults.otlpEndpoint;
