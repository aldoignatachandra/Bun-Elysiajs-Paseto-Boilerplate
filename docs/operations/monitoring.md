# Monitoring Guide

This guide covers monitoring, metrics, alerting, and performance baselines for the Bun Elysia PASETO Boilerplate.

## Table of Contents

- [Overview](#overview)
- [Metrics Endpoint](#metrics-endpoint)
- [Key Metrics](#key-metrics)
- [Dashboard Setup](#dashboard-setup)
- [Alerting](#alerting)
- [Performance Baselines](#performance-baselines)
- [Monitoring Tools](#monitoring-tools)
- [Troubleshooting](#troubleshooting)

## Overview

The application exposes comprehensive metrics through Prometheus, allowing you to monitor:

- **HTTP Performance** - Request rates, response times, error rates
- **Database Performance** - Query performance, connection pool usage
- **Cache Performance** - Hit rates, latency, eviction rates
- **System Resources** - Memory, CPU, event loop lag
- **Business Metrics** - Custom application metrics

## Metrics Endpoint

### Endpoint Details

```
GET /metrics
```

Returns Prometheus-formatted metrics in plain text.

### Example Response

```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/users/:id",status="200"} 1234

# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/v1/users/:id",status="200",le="0.1"} 500
http_request_duration_seconds_bucket{method="GET",route="/api/v1/users/:id",status="200",le="0.5"} 950
http_request_duration_seconds_sum{method="GET",route="/api/v1/users/:id",status="200"} 245.5
http_request_duration_seconds_count{method="GET",route="/api/v1/users/:id",status="200"} 1000

# HELP db_query_duration_seconds Database query duration
# TYPE db_query_duration_seconds histogram
db_query_duration_seconds_bucket{operation="SELECT",table="users",le="0.01"} 800
db_query_duration_seconds_sum{operation="SELECT",table="users"} 4.2
db_query_duration_seconds_count{operation="SELECT",table="users"} 1000

# HELP cache_hits_total Cache hits
# TYPE cache_hits_total counter
cache_hits_total{cache="user_sessions"} 850

# HELP cache_misses_total Cache misses
# TYPE cache_misses_total counter
cache_misses_total{cache="user_sessions"} 150

# HELP cache_hit_ratio Cache hit ratio
# TYPE cache_hit_ratio gauge
cache_hit_ratio{cache="user_sessions"} 0.85

# HELP db_pool_active_connections Active database connections
# TYPE db_pool_active_connections gauge
db_pool_active_connections{pool="default"} 5

# HELP db_pool_idle_connections Idle database connections
# TYPE db_pool_idle_connections gauge
db_pool_idle_connections{pool="default"} 3

# HELP process_resident_memory_bytes Resident memory size
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 134217728

# HELP nodejs_heap_size_total_bytes Total heap size
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 67108864

# HELP eventloop_lag_seconds Event loop lag
# TYPE eventloop_lag_seconds gauge
eventloop_lag_seconds 0.045
```

## Key Metrics

### HTTP Metrics

#### Request Rate

```promql
# Requests per second by route
rate(http_requests_total{route=~"/api/v1/.*"}[5m])

# Total requests per second
sum(rate(http_requests_total[5m]))

# Requests by status code
sum(rate(http_requests_total[5m])) by (status)
```

#### Response Time

```promql
# Average response time
rate(http_request_duration_seconds_sum[5m]) /
rate(http_request_duration_seconds_count[5m])

# 95th percentile response time
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
)

# 99th percentile response time
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
)
```

#### Error Rate

```promql
# Error percentage (5xx errors)
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100

# 4xx error rate
sum(rate(http_requests_total{status=~"4.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100

# Errors by route
sum(rate(http_requests_total{status=~"5.."}[5m])) by (route)
```

### Database Metrics

#### Query Performance

```promql
# Average query duration
rate(db_query_duration_seconds_sum[5m]) /
rate(db_query_duration_seconds_count[5m])

# Slow queries (> 100ms)
rate(db_query_duration_seconds_sum[5m]) /
rate(db_query_duration_seconds_count[5m]) > 0.1

# Query duration by table
rate(db_query_duration_seconds_sum[5m]) by (table) /
rate(db_query_duration_seconds_count[5m]) by (table)
```

#### Connection Pool

```promql
# Active connections
db_pool_active_connections

# Connection pool utilization
db_pool_active_connections / db_pool_max_connections

# Idle connections
db_pool_idle_connections

# Waiting connections (queue length)
db_pool_waiting_connections
```

#### Query Volume

```promql
# Queries per second by operation
sum(rate(db_queries_total[5m])) by (operation)

# Queries per second by table
sum(rate(db_queries_total[5m])) by (table)
```

### Cache Metrics

#### Cache Performance

```promql
# Cache hit ratio
cache_hit_ratio

# Cache hits per second
rate(cache_hits_total[5m])

# Cache misses per second
rate(cache_misses_total[5m])

# Cache effectiveness
rate(cache_hits_total[5m]) /
  (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

#### Cache Operations

```promql
# Cache sets per second
rate(cache_sets_total[5m])

# Cache deletes per second
rate(cache_deletes_total[5m])

# Cache evictions per second
rate(cache_evictions_total[5m])
```

### System Metrics

#### Memory

```promql
# Resident memory usage
process_resident_memory_bytes

# Heap memory usage
nodejs_heap_size_used_bytes

# Heap usage percentage
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100

# External memory usage
nodejs_heap_size_external_bytes
```

#### CPU

```promql
# Event loop lag (indicates CPU saturation)
eventloop_lag_seconds

# Event loop utilization
eventloop_utilization
```

### Business Metrics

#### Authentication

```promql
# Login attempts per second
rate(auth_login_attempts_total[5m])

# Failed login rate
rate(auth_login_failures_total[5m])

# Successful login rate
rate(auth_login_successes_total[5m])

# Token refresh rate
rate(auth_token_refreshes_total[5m])
```

#### Users

```promql
# User registration rate
rate(user_registrations_total[5m])

# Active users (with sessions)
active_users_total
```

## Dashboard Setup

### Grafana Dashboard

Import this JSON to create a comprehensive Grafana dashboard:

```json
{
  "dashboard": {
    "title": "Bun Elysia API Dashboard",
    "tags": ["bun", "elysia", "api"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{route=~\"/api/v1/.*\"}[5m]))"
          }
        ]
      },
      {
        "id": 2,
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100"
          }
        ]
      },
      {
        "id": 4,
        "title": "Database Query Duration",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(db_query_duration_seconds_sum[5m]) / rate(db_query_duration_seconds_count[5m])"
          }
        ]
      },
      {
        "id": 5,
        "title": "Cache Hit Ratio",
        "type": "graph",
        "targets": [
          {
            "expr": "cache_hit_ratio"
          }
        ]
      },
      {
        "id": 6,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1024 / 1024"
          }
        ]
      },
      {
        "id": 7,
        "title": "Event Loop Lag",
        "type": "graph",
        "targets": [
          {
            "expr": "eventloop_lag_seconds"
          }
        ]
      },
      {
        "id": 8,
        "title": "Database Connection Pool",
        "type": "graph",
        "targets": [
          {
            "expr": "db_pool_active_connections"
          },
          {
            "expr": "db_pool_idle_connections"
          }
        ]
      }
    ]
  }
}
```

### Quick Dashboard Setup

```bash
# Using Grafana CLI
grafana-cli \
  --url http://localhost:3000 \
  --key admin \
  --secret admin \
  import dashboard.json

# Or manually import through Grafana UI
# 1. Go to Dashboards > Import
# 2. Paste the JSON above
# 3. Select Prometheus data source
# 4. Click Import
```

## Alerting

### AlertManager Configuration

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical'
    - match:
        severity: warning
      receiver: 'warning'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://localhost:5001/'

  - name: 'critical'
    webhook_configs:
      - url: 'http://localhost:5001/critical'
    email_configs:
      - to: 'oncall@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alerts@example.com'
        auth_password: 'password'

  - name: 'warning'
    webhook_configs:
      - url: 'http://localhost:5001/warning'
    email_configs:
      - to: 'team@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.example.com:587'
```

### Critical Alerts

```yaml
# critical_alerts.yml
groups:
  - name: critical_alerts
    interval: 30s
    rules:
      # Application Down
      - alert: ApplicationDown
        expr: up{job="bun-elysia-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Application is down'
          description: '{{ $labels.instance }} has been down for more than 1 minute.'

      # High Error Rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value | humanizePercentage }} for the last 5 minutes.'

      # Database Connection Pool Exhausted
      - alert: DatabasePoolExhausted
        expr: |
          db_pool_active_connections / db_pool_max_connections > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Database connection pool nearly exhausted'
          description: 'Pool usage is {{ $value | humanizePercentage }}'

      # Out of Memory
      - alert: OutOfMemory
        expr: |
          nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Application running out of memory'
          description: 'Heap usage is {{ $value | humanizePercentage }}'

      # Event Loop Saturation
      - alert: EventLoopSaturation
        expr: eventloop_lag_seconds > 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Event loop saturated'
          description: 'Event loop lag is {{ $value }}s'
```

### Warning Alerts

```yaml
# warning_alerts.yml
groups:
  - name: warning_alerts
    interval: 1m
    rules:
      # High Response Time
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High response time detected'
          description: '95th percentile response time is {{ $value }}s'

      # Slow Database Queries
      - alert: SlowDatabaseQueries
        expr: |
          rate(db_query_duration_seconds_sum[5m]) /
          rate(db_query_duration_seconds_count[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Slow database queries detected'
          description: 'Average query duration is {{ $value }}s'

      # Low Cache Hit Ratio
      - alert: LowCacheHitRatio
        expr: cache_hit_ratio < 0.8
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: 'Low cache hit ratio'
          description: 'Cache hit ratio is {{ $value | humanizePercentage }}'

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: |
          nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage'
          description: 'Heap usage is {{ $value | humanizePercentage }}'

      # Too Many 4xx Errors
      - alert: HighClientErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"4.."}[5m])) /
          sum(rate(http_requests_total[5m])) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High client error rate'
          description: '4xx error rate is {{ $value | humanizePercentage }}'
```

### Apply Alert Rules

```bash
# Apply Prometheus rules
kubectl create configmap prometheus-rules \
  --from-file=critical_alerts.yml \
  --from-file=warning_alerts.yml \
  --dry-run=client -o yaml | kubectl apply -f -

# Or reload Prometheus
curl -X POST http://prometheus:9090/-/reload
```

## Performance Baselines

### Target Performance Metrics

| Metric                  | Target  | Warning | Critical |
| ----------------------- | ------- | ------- | -------- |
| **Response Time (p95)** | < 100ms | > 200ms | > 500ms  |
| **Response Time (p99)** | < 200ms | > 500ms | > 1000ms |
| **Error Rate**          | < 0.1%  | > 1%    | > 5%     |
| **Database Query Time** | < 10ms  | > 50ms  | > 100ms  |
| **Cache Hit Ratio**     | > 90%   | < 80%   | < 70%    |
| **Event Loop Lag**      | < 10ms  | > 50ms  | > 100ms  |
| **Memory Usage**        | < 70%   | > 80%   | > 90%    |
| **DB Pool Usage**       | < 70%   | > 80%   | > 90%    |

### Endpoint-Specific Baselines

| Endpoint                  | Target p95 | Max Rate   |
| ------------------------- | ---------- | ---------- |
| GET /api/v1/auth/me       | 50ms       | 1000 req/s |
| POST /api/v1/auth/login   | 100ms      | 100 req/s  |
| POST /api/v1/auth/refresh | 50ms       | 200 req/s  |
| GET /api/v1/users/:id     | 50ms       | 500 req/s  |
| PUT /api/v1/users/:id     | 100ms      | 200 req/s  |

### Load Testing Results

Based on load testing with `k6`:

```bash
# Typical results (single instance, 4 vCPU, 4GB RAM)
# Authentication endpoints
k6 run --vus 100 --duration 30s tests/load/auth-load-test.js

# Expected results:
# - 1000+ req/s for GET requests
# - 200+ req/s for POST requests
# - p95 latency < 100ms
# - 0% errors
```

## Monitoring Tools

### Prometheus

**Scrape Configuration:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'bun-elysia-api'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: /metrics
    static_configs:
      - targets:
          - 'api:3000'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

**Query Examples:**

```bash
# Using promtool
promtool query instant 'http_requests_total'

# Using HTTP API
curl 'http://prometheus:9090/api/v1/query?query=up'
```

### Grafana

**Data Source Configuration:**

```json
{
  "name": "Prometheus",
  "type": "prometheus",
  "url": "http://prometheus:9090",
  "access": "proxy",
  "isDefault": true
}
```

### Loki (Log Aggregation)

**Promtail Configuration:**

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: bun-elysia-api
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: bun-elysia-paseto-api
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
```

### Jaeger (Tracing)

**Collector Configuration:**

```yaml
# jaeger-config.yml
collector:
  zipkin:
    host-port: :9411
```

Access UI at: `http://localhost:16686`

## Troubleshooting

### High Response Times

**Symptoms:** p95/p99 latency above thresholds

**Diagnosis:**

```promql
# Find slow routes
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
)

# Check database queries
rate(db_query_duration_seconds_sum[5m]) by (table) /
rate(db_query_duration_seconds_count[5m]) by (table)

# Check event loop lag
eventloop_lag_seconds
```

**Solutions:**

1. Add database indexes for slow queries
2. Increase database connection pool size
3. Enable caching for frequently accessed data
4. Scale horizontally (add more instances)
5. Optimize N+1 queries

### Memory Leaks

**Symptoms:** Memory usage increasing over time

**Diagnosis:**

```promql
# Memory trend
nodejs_heap_size_used_bytes

# Heap usage trend
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes
```

**Solutions:**

1. Identify memory leaks with heap snapshots
2. Check for unintended closures
3. Verify proper cleanup of resources
4. Restart pods periodically if needed
5. Increase memory limits

### Database Pool Exhaustion

**Symptoms:** High pool usage, connection timeouts

**Diagnosis:**

```promql
# Pool utilization
db_pool_active_connections / db_pool_max_connections

# Waiting connections
db_pool_waiting_connections
```

**Solutions:**

1. Increase pool size
2. Reduce query execution time
3. Add read replicas
4. Implement connection draining
5. Scale database resources

### Cache Stampede

**Symptoms:** Low cache hit ratio, high database load

**Diagnosis:**

```promql
# Cache hit ratio
cache_hit_ratio

# Cache miss rate
rate(cache_misses_total[5m])
```

**Solutions:**

1. Implement cache warming
2. Use cache-aside pattern with locks
3. Increase TTL for cached items
4. Add more cache layers
5. Implement request coalescing

### Event Loop Saturation

**Symptoms:** High event loop lag, slow response times

**Diagnosis:**

```promql
# Event loop lag
eventloop_lag_seconds

# CPU usage
rate(process_cpu_seconds_total[5m])
```

**Solutions:**

1. Offload CPU-intensive work to worker threads
2. Reduce synchronous operations
3. Optimize complex computations
4. Use streaming for large payloads
5. Scale horizontally

## Best Practices

### Alerting

1. **Set meaningful thresholds** based on actual usage patterns
2. **Avoid alert fatigue** by combining related alerts
3. **Use severity levels** appropriately
4. **Include actionable information** in alert annotations
5. **Test alerts regularly** to ensure they work

### Monitoring

1. **Monitor the right metrics** - focus on user-impacting metrics
2. **Use percentiles** (p95, p99) not just averages
3. **Set up dashboards** for different audiences (devs, ops, business)
4. **Review baselines regularly** and adjust as needed
5. **Monitor monitoring systems** to ensure they're working

### Performance

1. **Profile before optimizing** - identify actual bottlenecks
2. **Measure impact** of optimizations
3. **Consider trade-offs** between performance and complexity
4. **Document performance characteristics** of the system
5. **Set up synthetic monitoring** for critical paths

## Next Steps

- Set up synthetic monitoring (Pingdom, Uptrends)
- Configure SLO/SLI tracking
- Implement error tracking (Sentry, Bugsnag)
- Set up anomaly detection
- Create runbooks for common issues

For operational procedures, see the [Operations Runbook](runbook.md).
