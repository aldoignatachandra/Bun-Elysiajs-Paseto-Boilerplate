import { describe, it, expect, beforeEach } from 'bun:test';
import { MetricsRegistry, getMetricsRegistry } from '@/core/metrics';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    // Create a fresh registry for each test
    registry = new MetricsRegistry();
  });

  describe('Counter metrics', () => {
    it('should register a counter metric', () => {
      registry.registerCounter('test_counter', 'A test counter');
      expect(registry.hasMetric('test_counter')).toBe(true);
    });

    it('should increment counter with default value', () => {
      registry.registerCounter('test_counter', 'A test counter');
      registry.incrementCounter('test_counter');

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter 1');
    });

    it('should increment counter with custom value', () => {
      registry.registerCounter('test_counter', 'A test counter');
      registry.incrementCounter('test_counter', 5);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter 5');
    });

    it('should handle counter with labels', () => {
      registry.registerCounter('test_counter', 'A test counter', ['method', 'status']);
      registry.incrementCounter('test_counter', 1, { method: 'GET', status: '200' });
      registry.incrementCounter('test_counter', 2, { method: 'POST', status: '201' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter{method="GET",status="200"} 1');
      expect(metrics).toContain('test_counter{method="POST",status="201"} 2');
    });

    it('should accumulate counter values with same labels', () => {
      registry.registerCounter('test_counter', 'A test counter', ['method']);
      registry.incrementCounter('test_counter', 1, { method: 'GET' });
      registry.incrementCounter('test_counter', 2, { method: 'GET' });
      registry.incrementCounter('test_counter', 3, { method: 'GET' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter{method="GET"} 6');
    });

    it('should throw error for unregistered counter', () => {
      expect(() => {
        registry.incrementCounter('unknown_counter', 1);
      }).toThrow("Counter 'unknown_counter' not registered");
    });

    it('should include HELP and TYPE comments', () => {
      registry.registerCounter('test_counter', 'A test counter for testing');
      registry.incrementCounter('test_counter', 1);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('# HELP test_counter A test counter for testing');
      expect(metrics).toContain('# TYPE test_counter counter');
    });
  });

  describe('Gauge metrics', () => {
    it('should register a gauge metric', () => {
      registry.registerGauge('test_gauge', 'A test gauge');
      expect(registry.hasMetric('test_gauge')).toBe(true);
    });

    it('should set gauge value', () => {
      registry.registerGauge('test_gauge', 'A test gauge');
      registry.setGauge('test_gauge', 42);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_gauge 42');
    });

    it('should update gauge value', () => {
      registry.registerGauge('test_gauge', 'A test gauge');
      registry.setGauge('test_gauge', 42);
      registry.setGauge('test_gauge', 100);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_gauge 100');
    });

    it('should handle gauge with labels', () => {
      registry.registerGauge('test_gauge', 'A test gauge', ['state']);
      registry.setGauge('test_gauge', 5, { state: 'active' });
      registry.setGauge('test_gauge', 10, { state: 'idle' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_gauge{state="active"} 5');
      expect(metrics).toContain('test_gauge{state="idle"} 10');
    });

    it('should increment gauge value', () => {
      registry.registerGauge('test_gauge', 'A test gauge');
      registry.incrementGauge('test_gauge', 10);
      registry.incrementGauge('test_gauge', 5);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_gauge 15');
    });

    it('should decrement gauge value with negative increment', () => {
      registry.registerGauge('test_gauge', 'A test gauge');
      registry.incrementGauge('test_gauge', 10);
      registry.incrementGauge('test_gauge', -3);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_gauge 7');
    });

    it('should throw error for unregistered gauge', () => {
      expect(() => {
        registry.setGauge('unknown_gauge', 42);
      }).toThrow("Gauge 'unknown_gauge' not registered");
    });
  });

  describe('Histogram metrics', () => {
    it('should register a histogram metric', () => {
      registry.registerHistogram('test_histogram', 'A test histogram', [0.1, 0.5, 1]);
      expect(registry.hasMetric('test_histogram')).toBe(true);
    });

    it('should observe histogram values', () => {
      registry.registerHistogram('test_histogram', 'A test histogram', [0.1, 0.5, 1]);
      registry.observeHistogram('test_histogram', 0.2);
      registry.observeHistogram('test_histogram', 0.6);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_histogram_bucket{le="0.1"} 0');
      expect(metrics).toContain('test_histogram_bucket{le="0.5"} 1');
      expect(metrics).toContain('test_histogram_bucket{le="+Inf"} 2');
      expect(metrics).toContain('test_histogram_sum 0.8');
      expect(metrics).toContain('test_histogram_count 2');
    });

    it('should calculate correct bucket distributions', () => {
      registry.registerHistogram('response_time', 'Response time', [0.01, 0.05, 0.1]);

      for (let i = 0; i < 10; i++) {
        registry.observeHistogram('response_time', 0.02);
      }

      const metrics = registry.getMetrics();
      expect(metrics).toContain('response_time_bucket{le="0.01"} 0');
      expect(metrics).toContain('response_time_bucket{le="0.05"} 10');
      expect(metrics).toContain('response_time_bucket{le="+Inf"} 10');
      expect(metrics).toContain('response_time_count 10');
    });

    it('should handle histogram with labels', () => {
      registry.registerHistogram('test_histogram', 'A test histogram', [0.1, 0.5, 1], ['method', 'status']);
      registry.observeHistogram('test_histogram', 0.2, { method: 'GET', status: '200' });
      registry.observeHistogram('test_histogram', 0.6, { method: 'POST', status: '201' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_histogram_bucket{method="GET",status="200",le="0.1"} 0');
      expect(metrics).toContain('test_histogram_bucket{method="GET",status="200",le="0.5"} 1');
      expect(metrics).toContain('test_histogram_bucket{method="POST",status="201",le="0.5"} 0');
      expect(metrics).toContain('test_histogram_bucket{method="POST",status="201",le="1"} 1');
    });

    it('should accumulate histogram values for same labels', () => {
      registry.registerHistogram('test_histogram', 'A test histogram', [0.1, 0.5, 1], ['method']);
      registry.observeHistogram('test_histogram', 0.2, { method: 'GET' });
      registry.observeHistogram('test_histogram', 0.3, { method: 'GET' });
      registry.observeHistogram('test_histogram', 0.4, { method: 'GET' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_histogram_sum{method="GET"} 0.9');
      expect(metrics).toContain('test_histogram_count{method="GET"} 3');
    });

    it('should throw error for unregistered histogram', () => {
      expect(() => {
        registry.observeHistogram('unknown_histogram', 0.5);
      }).toThrow("Histogram 'unknown_histogram' not registered");
    });
  });

  describe('Summary metrics', () => {
    it('should register a summary metric', () => {
      registry.registerSummary('test_summary', 'A test summary', [0.5, 0.9, 0.95]);
      expect(registry.hasMetric('test_summary')).toBe(true);
    });

    it('should observe summary values', () => {
      registry.registerSummary('test_summary', 'A test summary', [0.5, 0.9, 0.95]);
      registry.observeSummary('test_summary', 100);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_summary{quantile="0.5"}');
      expect(metrics).toContain('test_summary{quantile="0.9"}');
      expect(metrics).toContain('test_summary{quantile="0.95"}');
      expect(metrics).toContain('test_summary_sum 100');
      expect(metrics).toContain('test_summary_count 1');
    });

    it('should handle summary with labels', () => {
      registry.registerSummary('test_summary', 'A test summary', [0.5, 0.9], ['method']);
      registry.observeSummary('test_summary', 100, { method: 'GET' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_summary{method="GET",quantile="0.5"}');
    });

    it('should throw error for unregistered summary', () => {
      expect(() => {
        registry.observeSummary('unknown_summary', 100);
      }).toThrow("Summary 'unknown_summary' not registered");
    });
  });

  describe('Prometheus format', () => {
    it('should properly format label values', () => {
      registry.registerCounter('test_counter', 'A test counter', ['path']);
      registry.incrementCounter('test_counter', 1, { path: '/api/v1/users' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter{path="/api/v1/users"} 1');
    });

    it('should escape special characters in label values', () => {
      registry.registerCounter('test_counter', 'A test counter', ['message']);
      registry.incrementCounter('test_counter', 1, { message: 'hello "world"' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter{message="hello \\"world\\""} 1');
    });

    it('should handle empty label values', () => {
      registry.registerCounter('test_counter', 'A test counter');
      registry.incrementCounter('test_counter', 1);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter 1');
    });

    it('should separate metrics with blank lines', () => {
      registry.registerCounter('counter_a', 'Counter A');
      registry.registerCounter('counter_b', 'Counter B');
      registry.incrementCounter('counter_a', 1);
      registry.incrementCounter('counter_b', 2);

      const metrics = registry.getMetrics();
      const lines = metrics.split('\n');
      const blankLineAfterA = lines[lines.indexOf('# TYPE counter_a counter') + 2] === '';
      expect(blankLineAfterA).toBe(true);
    });
  });

  describe('Registry management', () => {
    it('should reset all metrics', () => {
      registry.registerCounter('test_counter', 'A test counter');
      registry.incrementCounter('test_counter', 5);
      registry.reset();

      const metrics = registry.getMetrics();
      // Metric definition should remain but value should be cleared
      expect(metrics).toContain('# HELP test_counter A test counter');
      expect(metrics).not.toContain('test_counter 5');
    });

    it('should maintain metric definitions after reset', () => {
      registry.registerCounter('test_counter', 'A test counter');
      registry.incrementCounter('test_counter', 5);
      registry.reset();

      // Definition should still exist
      expect(registry.hasMetric('test_counter')).toBe(true);
    });
  });

  describe('Singleton instance', () => {
    it('should return the same registry instance', () => {
      const instance1 = getMetricsRegistry();
      const instance2 = getMetricsRegistry();
      expect(instance1).toBe(instance2);
    });

    it('should have default metrics registered', () => {
      const registry = getMetricsRegistry();
      expect(registry.hasMetric('http_request_duration_seconds')).toBe(true);
      expect(registry.hasMetric('http_requests_total')).toBe(true);
      expect(registry.hasMetric('http_requests_in_flight')).toBe(true);
      expect(registry.hasMetric('http_errors_total')).toBe(true);
    });
  });
});
