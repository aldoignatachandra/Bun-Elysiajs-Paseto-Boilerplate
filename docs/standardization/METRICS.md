# Metrics Collection

This document describes the Prometheus metrics collection system for the Bun + Elysia + PASETO boilerplate API.

## Overview

The metrics system provides real-time observability into application performance and health using Prometheus exposition format. It tracks HTTP request metrics including request duration, request counts, active requests, and error rates.

## Features

- **Pure TypeScript implementation** - No external dependencies for metrics collection
- **Prometheus compatible** - Standard exposition format for scraping
- **HTTP request tracking** - Automatic middleware for request metrics
- **Configurable** - Enable/disable via environment variables
- **Production ready** - Minimal performance overhead

## Configuration

### Environment Variables

| Variable          | Type    | Default                     | Description                                 |
| ----------------- | ------- | --------------------------- | ------------------------------------------- |
| `METRICS_ENABLED` | boolean | `NODE_ENV !== 'production'` | Enable/disable metrics collection           |
| `NODE_ENV`        | string  | `development`               | Environment (development, production, test) |

### Middleware Options

```typescript
interface MetricsMiddlewareConfig {
  trackHTTP?: boolean; // Enable HTTP tracking (default: true)
  excludePaths?: string[]; // Paths to exclude (default: ['/health', '/metrics'])
  includePaths?: string[]; // Only track these paths (optional)
  pathExtractor?: (path: string) => string; // Custom path normalization
}
```

## Usage

### Basic Setup

The metrics plugin is automatically registered when enabled via environment variables. No additional configuration is required.

```typescript
import { createApp } from './app';

const app = createApp();
app.listen(3000);
```

### Manual Plugin Registration

If you need to configure metrics behavior:

```typescript
import { Elysia } from 'elysia';
import { metricsPlugin } from '@/core/metrics';

const app = new Elysia().use(
  metricsPlugin({
    trackHTTP: true,
    excludePaths: ['/health', '/metrics', '/public'],
  })
);
```

### Manual Metrics Recording

You can also record metrics manually in your services:

```typescript
import { getMetricsRegistry } from '@/core/metrics';

const registry = getMetricsRegistry();

// Increment a counter
registry.incrementCounter('custom_events_total', 1, { event_type: 'user_login' });

// Set a gauge
registry.setGauge('active_sessions', 42);

// Observe a value
registry.observeHistogram('database_query_duration', 0.123, { table: 'users' });
```

## Available Metrics

### HTTP Request Duration

**Metric:** `http_request_duration_seconds`

**Type:** Histogram

**Labels:** `method`, `route`, `status_code`, `status_class`

**Description:** HTTP request latency in seconds

**Example:**

```
http_request_duration_seconds_bucket{method="GET",route="/api/v1/users",status_code="200",status_class="2xx",le="0.1"} 542
http_request_duration_seconds_sum{method="GET",route="/api/v1/users",status_code="200",status_class="2xx"} 89.456
http_request_duration_seconds_count{method="GET",route="/api/v1/users",status_code="200",status_class="2xx"} 542
```

### HTTP Requests Total

**Metric:** `http_requests_total`

**Type:** Counter

**Labels:** `method`, `route`, `status_code`, `status_class`

**Description:** Total HTTP requests processed

**Example:**

```
http_requests_total{method="GET",route="/api/v1/products",status_code="200",status_class="2xx"} 15234
http_requests_total{method="POST",route="/api/v1/auth/login",status_code="401",status_class="4xx"} 234
```

### HTTP Active Requests

**Metric:** `http_requests_in_flight`

**Type:** Gauge

**Labels:** None

**Description:** Current number of HTTP requests being processed

**Example:**

```
http_requests_in_flight 23
```

### HTTP Errors Total

**Metric:** `http_errors_total`

**Type:** Counter

**Labels:** `method`, `route`, `status_code`, `error_type`

**Description:** Total HTTP errors (4xx and 5xx status codes)

**Example:**

```
http_errors_total{method="POST",route="/api/v1/users",status_code="400",error_type="4xx"} 12
http_errors_total{method="GET",route="/api/v1/products",status_code="500",error_type="5xx"} 3
```

## Prometheus Configuration

### Scrape Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'bun-elysia-api'
    scrape_interval: 10s
    scrape_timeout: 5s
    metrics_path: '/metrics'
    static_configs:
      - targets:
          - 'localhost:3000'
        labels:
          service: 'api'
          environment: 'development'
```

### Recording Rules

```yaml
# prometheus/recording-rules.yml
groups:
  - name: api_http
    interval: 30s
    rules:
      # Request rate
      - record: job:http_requests_total:rate1m
        expr: sum(rate(http_requests_total[1m])) by (job, route)

      # P95 latency
      - record: job:http_request_duration_seconds:p95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job, route))

      # Error rate
      - record: job:http_errors_total:rate5m
        expr: sum(rate(http_errors_total[5m])) by (job, route)
```

### Alerting Rules

```yaml
# prometheus/alerting-rules.yml
groups:
  - name: api_alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: sum(rate(http_errors_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }} errors/sec'

      # High latency
      - alert: HighLatency
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High request latency detected'
          description: 'P95 latency is {{ $value }}s'
```

## Grafana Dashboard Queries

### Request Rate

```promql
sum(rate(http_requests_total[5m])) by (route, method)
```

### Request Latency (P95)

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route, method))
```

### Error Rate

```promql
sum(rate(http_errors_total[5m])) by (route)
```

### Active Requests

```promql
http_requests_in_flight
```

## Testing

Metrics are tested comprehensively with unit tests:

```bash
# Run all metrics tests
bun test tests/unit/core/metrics

# Run specific test file
bun test tests/unit/core/metrics/metrics.test.ts
bun test tests/unit/core/metrics/middleware.test.ts
```

## Best Practices

### Label Cardinality

Avoid high cardinality labels (e.g., user_id) to prevent memory issues. Use labels for:

- HTTP method
- Route pattern (not full path with IDs)
- Status code class (2xx, 3xx, 4xx, 5xx)
- Error types

### Path Normalization

Routes are automatically normalized to replace dynamic segments:

- Numeric IDs → `:id`
- UUIDs → `:uuid`
- MongoDB ObjectIds → `:mongoId`

### Excluding Paths

Exclude health checks and metrics endpoints from tracking:

```typescript
metricsPlugin({
  excludePaths: ['/health', '/metrics', '/ready', '/live'],
});
```

### Production Considerations

1. **Enable metrics explicitly** in production:

   ```bash
   METRICS_ENABLED=true NODE_ENV=production bun run start
   ```

2. **Protect the /metrics endpoint** behind authentication or network policies

3. **Configure scrape interval** appropriately (15s recommended)

4. **Monitor memory usage** if using many label combinations

## Troubleshooting

### Metrics Not Appearing

1. Check `METRICS_ENABLED` environment variable
2. Verify `/metrics` endpoint is accessible
3. Check application logs for errors
4. Ensure Prometheus scrape configuration is correct

### High Memory Usage

1. Reduce label cardinality
2. Filter excluded paths
3. Adjust histogram bucket configuration
4. Check for metric leaks (high cardinality labels)

### Missing Metrics

1. Verify plugin is registered correctly
2. Check `excludePaths` and `includePaths` configuration
3. Ensure middleware is applied before routes
4. Review application logs

## Performance Impact

The metrics system is designed for minimal performance overhead:

- **Per-request overhead:** < 1ms
- **Memory usage:** < 10MB for typical workloads
- **Metrics endpoint:** < 50ms response time
- **Non-blocking:** Uses async operations

## Security Considerations

1. **Endpoint Protection:** Consider adding authentication for `/metrics` in production
2. **Data Exposure:** Metrics may contain sensitive information in labels
3. **Rate Limiting:** Protect against scraping abuse
4. **Network Security:** Use TLS in production environments

## API Reference

### `getMetricsRegistry()`

Returns the singleton MetricsRegistry instance.

```typescript
import { getMetricsRegistry } from '@/core/metrics';

const registry = getMetricsRegistry();
```

### `metricsPlugin(config)`

Creates an Elysia plugin with middleware and /metrics endpoint.

```typescript
import { metricsPlugin } from '@/core/metrics';

app.use(
  metricsPlugin({
    trackHTTP: true,
    excludePaths: ['/health'],
  })
);
```

### `metricsMiddleware(config)`

Creates only the middleware without /metrics endpoint.

```typescript
import { metricsMiddleware } from '@/core/metrics';

app.use(metricsMiddleware());
```

### `getMetricsHandler()`

Returns a handler function for the /metrics endpoint.

```typescript
import { getMetricsHandler } from '@/core/metrics';

app.get('/metrics', getMetricsHandler());
```

### `isMetricsEnabled()`

Checks if metrics should be enabled based on environment.

```typescript
import { isMetricsEnabled } from '@/core/metrics';

if (isMetricsEnabled()) {
  // Register metrics
}
```

## Further Reading

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
- [Histograms vs Summaries](https://prometheus.io/docs/practices/histograms/)
- [Elysia Documentation](https://elysiajs.com/)
