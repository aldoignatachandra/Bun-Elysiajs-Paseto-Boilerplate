import { describe, it, expect, beforeEach } from 'bun:test';
import { MetricsCollector } from '@/core/metrics/collector';

describe('Metrics Collector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
  });

  describe('counter', () => {
    it('should increment counter by value', () => {
      collector.counter('test_counter', 1);
      collector.counter('test_counter', 2);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('# HELP test_counter');
      expect(metrics).toContain('test_counter 3');
    });

    it('should increment counter with labels', () => {
      collector.counter('http_requests_total', 1, { method: 'GET', path: '/api/users' });

      const metrics = collector.getMetrics();
      expect(metrics).toContain('http_requests_total{method="GET",path="/api/users"} 1');
    });

    it('should handle multiple label sets for same counter', () => {
      collector.counter('cache_hits', 1, { cache: 'redis' });
      collector.counter('cache_hits', 2, { cache: 'memory' });

      const metrics = collector.getMetrics();
      expect(metrics).toContain('cache_hits{cache="redis"} 1');
      expect(metrics).toContain('cache_hits{cache="memory"} 2');
    });
  });

  describe('gauge', () => {
    it('should set gauge value', () => {
      collector.gauge('active_connections', 10);
      collector.gauge('active_connections', 15);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('active_connections 15');
    });

    it('should set gauge with labels', () => {
      collector.gauge('queue_size', 5, { queue: 'email' });

      const metrics = collector.getMetrics();
      expect(metrics).toContain('queue_size{queue="email"} 5');
    });

    it('should handle multiple label sets for same gauge', () => {
      collector.gauge('memory_usage', 100, { instance: 'app-1' });
      collector.gauge('memory_usage', 200, { instance: 'app-2' });

      const metrics = collector.getMetrics();
      expect(metrics).toContain('memory_usage{instance="app-1"} 100');
      expect(metrics).toContain('memory_usage{instance="app-2"} 200');
    });
  });

  describe('histogram', () => {
    it('should record histogram values with default buckets', () => {
      collector.histogram('request_duration', 0.1);
      collector.histogram('request_duration', 0.5);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('# HELP request_duration');
      expect(metrics).toContain('request_duration_bucket{le="0.1"}');
      expect(metrics).toContain('request_duration_bucket{le="+Inf"}');
      expect(metrics).toContain('request_duration_sum');
      expect(metrics).toContain('request_duration_count');
    });

    it('should record histogram with custom buckets', () => {
      collector.histogram('custom_metric', 5, undefined, [1, 5, 10]);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('custom_metric_bucket{le="1"}');
      expect(metrics).toContain('custom_metric_bucket{le="5"}');
      expect(metrics).toContain('custom_metric_bucket{le="10"}');
      expect(metrics).toContain('custom_metric_bucket{le="+Inf"}');
    });

    it('should record histogram with labels', () => {
      collector.histogram('api_latency', 0.25, { endpoint: '/api/users' });

      const metrics = collector.getMetrics();
      expect(metrics).toContain('api_latency_bucket{endpoint="/api/users",le=');
    });

    it('should track count and sum correctly', () => {
      collector.histogram('test_histogram', 1);
      collector.histogram('test_histogram', 2);
      collector.histogram('test_histogram', 3);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('test_histogram_count 3');
      expect(metrics).toContain('test_histogram_sum 6');
    });
  });

  describe('timing', () => {
    it('should record timing with default buckets', () => {
      collector.timing('db_query_duration', 0.05);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('db_query_duration_bucket');
      expect(metrics).toContain('db_query_duration_sum');
      expect(metrics).toContain('db_query_duration_count');
    });

    it('should record timing with labels', () => {
      collector.timing('response_time', 0.1, { status: '200' });

      const metrics = collector.getMetrics();
      expect(metrics).toContain('response_time_bucket{status="200",le=');
    });
  });

  describe('HTTP request metrics', () => {
    it('should increment HTTP requests counter', () => {
      collector.incrementHttpRequests('GET', '/api/users', 200);
      collector.incrementHttpRequests('POST', '/api/users', 201);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('http_requests_total{method="GET",path="/api/users",status="200"}');
      expect(metrics).toContain(
        'http_requests_total{method="POST",path="/api/users",status="201"}'
      );
    });

    it('should record HTTP request duration', () => {
      collector.recordHttpDuration('GET', '/api/users', 0.123);

      const metrics = collector.getMetrics();
      expect(metrics).toContain(
        'http_request_duration_seconds_bucket{method="GET",path="/api/users",le='
      );
      expect(metrics).toContain('http_request_duration_seconds_sum');
      expect(metrics).toContain('http_request_duration_seconds_count');
    });
  });

  describe('Database metrics', () => {
    it('should record database query duration', () => {
      collector.recordDatabaseQueryDuration('SELECT * FROM users', 0.045);

      const metrics = collector.getMetrics();
      expect(metrics).toContain(
        'database_query_duration_seconds_bucket{query="SELECT * FROM users",le='
      );
    });
  });

  describe('Cache metrics', () => {
    it('should record cache hits', () => {
      collector.recordCacheHit('redis', true);
      collector.recordCacheHit('redis', true);
      collector.recordCacheHit('redis', false);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('cache_hits_total{cache="redis"} 2');
      expect(metrics).toContain('cache_misses_total{cache="redis"} 1');
    });

    it('should track multiple caches', () => {
      collector.recordCacheHit('redis', true);
      collector.recordCacheHit('memory', true);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('cache_hits_total{cache="redis"} 1');
      expect(metrics).toContain('cache_hits_total{cache="memory"} 1');
    });
  });

  describe('Active connections', () => {
    it('should record active connections gauge', () => {
      collector.recordActiveConnections(42);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('active_connections 42');
    });
  });

  describe('Prometheus export format', () => {
    it('should export metrics in valid Prometheus text format', () => {
      collector.counter('test_metric', 5, { label: 'value' });
      const metrics = collector.getMetrics();

      // Check for basic Prometheus format requirements
      expect(metrics).toContain('# HELP test_metric');
      expect(metrics).toContain('# TYPE test_metric counter');
      expect(metrics).toContain('test_metric{label="value"} 5');
    });

    it('should include HELP and TYPE metadata for metrics', () => {
      collector.gauge('test_gauge', 10);
      collector.histogram('test_histogram', 1);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('# HELP test_gauge');
      expect(metrics).toContain('# TYPE test_gauge gauge');
      expect(metrics).toContain('# HELP test_histogram');
      expect(metrics).toContain('# TYPE test_histogram histogram');
    });

    it('should export multiple metrics', () => {
      collector.counter('metric1', 1);
      collector.gauge('metric2', 10);
      collector.histogram('metric3', 0.5);

      const metrics = collector.getMetrics();
      expect(metrics).toContain('metric1');
      expect(metrics).toContain('metric2');
      expect(metrics).toContain('metric3');
    });

    it('should handle special characters in label values', () => {
      collector.counter('test', 1, { path: '/api/users/123' });
      const metrics = collector.getMetrics();

      expect(metrics).toContain('test{path="/api/users/123"}');
    });
  });

  describe('Label handling', () => {
    it('should escape quotes in label values', () => {
      collector.counter('test', 1, { message: 'He said "hello"' });
      const metrics = collector.getMetrics();

      expect(metrics).toContain('test{message="He said \\"hello\\""}');
    });

    it('should handle backslashes in label values', () => {
      collector.counter('test', 1, { path: 'C:\\Users\\test' });
      const metrics = collector.getMetrics();

      expect(metrics).toContain('test{path="C:\\\\Users\\\\test"}');
    });

    it('should handle newlines in label values', () => {
      collector.counter('test', 1, { message: 'line1\nline2' });
      const metrics = collector.getMetrics();

      expect(metrics).toContain('test{message="line1\\nline2"}');
    });
  });
});
