import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { getTelemetryConfig, isTelemetryEnabled } from '@/core/telemetry/config';

describe('Telemetry Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getTelemetryConfig', () => {
    it('should return disabled config by default', () => {
      delete process.env.OTEL_ENABLED;
      delete process.env.OTEL_SERVICE_NAME;
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

      const config = getTelemetryConfig();

      expect(config.enabled).toBe(false);
      expect(config.serviceName).toBe('bun-elysia-api');
      expect(config.otlpEndpoint).toBe('http://localhost:4318');
    });

    it('should return enabled config when OTEL_ENABLED is true', () => {
      process.env.OTEL_ENABLED = 'true';

      const config = getTelemetryConfig();

      expect(config.enabled).toBe(true);
    });

    it('should use custom service name from env', () => {
      process.env.OTEL_SERVICE_NAME = 'my-custom-service';

      const config = getTelemetryConfig();

      expect(config.serviceName).toBe('my-custom-service');
    });

    it('should use custom OTLP endpoint from env', () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://custom-endpoint:4318';

      const config = getTelemetryConfig();

      expect(config.otlpEndpoint).toBe('http://custom-endpoint:4318');
    });

    it('should parse trace flags correctly', () => {
      process.env.OTEL_TRACE_HTTP = 'false';
      process.env.OTEL_TRACE_DATABASE = 'true';
      process.env.OTEL_TRACE_REDIS = 'true';

      const config = getTelemetryConfig();

      expect(config.traceHTTP).toBe(false);
      expect(config.traceDatabase).toBe(true);
      expect(config.traceRedis).toBe(true);
    });

    it('should default traceHTTP to true', () => {
      delete process.env.OTEL_TRACE_HTTP;

      const config = getTelemetryConfig();

      expect(config.traceHTTP).toBe(true);
    });

    it('should default traceDatabase and traceRedis to false', () => {
      delete process.env.OTEL_TRACE_DATABASE;
      delete process.env.OTEL_TRACE_REDIS;

      const config = getTelemetryConfig();

      expect(config.traceDatabase).toBe(false);
      expect(config.traceRedis).toBe(false);
    });

    it('should parse sample rate correctly', () => {
      process.env.OTEL_SAMPLE_RATE = '0.5';

      const config = getTelemetryConfig();

      expect(config.sampleRate).toBe(0.5);
    });

    it('should clamp sample rate to valid range', () => {
      process.env.OTEL_SAMPLE_RATE = '2.0';
      expect(getTelemetryConfig().sampleRate).toBe(1);

      process.env.OTEL_SAMPLE_RATE = '-0.5';
      expect(getTelemetryConfig().sampleRate).toBe(0);
    });

    it('should default sample rate to 1.0', () => {
      delete process.env.OTEL_SAMPLE_RATE;

      const config = getTelemetryConfig();

      expect(config.sampleRate).toBe(1);
    });

    it('should parse log level correctly', () => {
      process.env.OTEL_LOG_LEVEL = 'debug';
      expect(getTelemetryConfig().logLevel).toBe('debug');

      process.env.OTEL_LOG_LEVEL = 'error';
      expect(getTelemetryConfig().logLevel).toBe('error');
    });

    it('should default log level to info', () => {
      delete process.env.OTEL_LOG_LEVEL;

      const config = getTelemetryConfig();

      expect(config.logLevel).toBe('info');
    });
  });

  describe('isTelemetryEnabled', () => {
    it('should return false by default', () => {
      delete process.env.OTEL_ENABLED;

      expect(isTelemetryEnabled()).toBe(false);
    });

    it('should return true when OTEL_ENABLED is true', () => {
      process.env.OTEL_ENABLED = 'true';

      expect(isTelemetryEnabled()).toBe(true);
    });

    it('should return false when OTEL_ENABLED is anything other than true', () => {
      process.env.OTEL_ENABLED = 'false';
      expect(isTelemetryEnabled()).toBe(false);

      process.env.OTEL_ENABLED = '1';
      expect(isTelemetryEnabled()).toBe(false);

      process.env.OTEL_ENABLED = 'yes';
      expect(isTelemetryEnabled()).toBe(false);
    });
  });
});
