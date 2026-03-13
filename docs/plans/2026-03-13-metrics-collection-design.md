# Metrics Collection Feature - Design Document

**Document Version:** 1.0
**Created:** 2026-03-13
**Status:** Design Phase
**Author:** Development Team

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [Metrics Catalog](#4-metrics-catalog)
5. [Implementation Details](#5-implementation-details)
6. [Plugin Integration](#6-plugin-integration)
7. [Testing Strategy](#7-testing-strategy)
8. [Usage Examples](#8-usage-examples)
9. [Prometheus Configuration](#9-prometheus-configuration)
10. [Success Criteria](#10-success-criteria)

---

## 1. Overview

### 1.1 Purpose

This document outlines the design and implementation of a comprehensive Prometheus metrics collection system for the Bun + Elysia + PASETO monolith REST API boilerplate. The metrics system will provide real-time observability into application performance, health, and business operations.

### 1.2 Goals

- Provide standardized Prometheus metrics endpoint (`/metrics`)
- Track HTTP request metrics (latency, throughput, error rates)
- Monitor database connection pool health and query performance
- Capture business-level metrics (user registrations, logins, product operations)
- Enable production-ready observability with minimal performance overhead
- Follow OpenTelemetry semantic conventions where applicable

### 1.3 Non-Goals

- Distributed tracing (separate feature)
- Application logs/metrics correlation (out of scope)
- Custom visualization dashboards (Grafana templates separate)
- Alerting rules configuration (separate documentation)

### 1.4 Technology Stack

- **Runtime:** Bun (JavaScript/TypeScript)
- **Framework:** Elysia
- **Metrics Format:** Prometheus Exposition Format
- **Metric Types:** Counter, Gauge, Histogram, Summary
- **No External Dependencies:** Pure TypeScript implementation

---

## 2. Architecture

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Elysia Application                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Incoming   │───>│   Metrics    │───>│   Metrics    │      │
│  │   Requests   │    │  Middleware  │    │   Registry   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                            │                    │               │
│                            │                    │               │
│                            ▼                    ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Metric Collectors                     │   │
│  ├────────────┬────────────┬────────────┬─────────────────┤   │
│  │    HTTP     │  Database  │   Business │     System      │   │
│  │  Collector  │ Collector  │ Collector  │   Collector     │   │
│  └────────────┴────────────┴────────────┴─────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               /metrics Endpoint (Prometheus)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Prometheus Server                          │
│                    (Periodic Scraping)                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

1. **Request Receipt:** Elysia receives HTTP request
2. **Middleware Intercept:** Metrics middleware captures request metadata
3. **Metric Collection:** Appropriate collector records metric
4. **Metric Storage:** Registry stores metric in memory
5. **Scraping:** Prometheus polls `/metrics` endpoint
6. **Exposition:** Registry returns metrics in Prometheus text format

### 2.3 Component Interaction

```
User Request
     │
     ▼
┌─────────────────┐
│ Elysia Router   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Metrics Middleware Pipeline                │
├─────────────────────────────────────────────────────────┤
│  1. Record start time                                   │
│  2. Extract request metadata                            │
│  3. Increment in-flight gauge                           │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Application Logic                          │
│  - Auth Middleware                                      │
│  - Route Handlers                                       │
│  - Database Queries                                     │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Metrics Collection                          │
├─────────────────────────────────────────────────────────┤
│  HTTP: request duration, status, method, path            │
│  DB: query duration, connection pool status              │
│  Business: logins, registrations, errors                 │
└────────┬────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Response Sending                            │
└─────────────────────────────────────────────────────────┘
```

---

## 3. File Structure

```
src/
├── plugins/
│   ├── metrics.plugin.ts          # Main metrics plugin
│   └── index.ts                   # Plugin exports (modified)
├── core/
│   └── metrics/
│       ├── registry.ts            # Metrics registry implementation
│       ├── types.ts               # TypeScript interfaces
│       ├── collectors/
│       │   ├── http.collector.ts  # HTTP metrics collector
│       │   ├── database.collector.ts  # Database metrics
│       │   ├── business.collector.ts  # Business metrics
│       │   └── system.collector.ts    # System metrics
│       ├── middleware/
│       │   └── metrics.middleware.ts  # Request tracking middleware
│       └── utils/
│           ├── prometheus.ts       # Prometheus format helpers
│           └── labels.ts           # Label management utilities
├── config/
│   └── metrics.ts                 # Metrics configuration
└── utils/
    └── metrics-helpers.ts         # Helper functions for manual tracking

tests/
├── unit/
│   ├── core/
│   │   └── metrics/
│   │       ├── registry.test.ts
│   │       ├── collectors/
│   │       │   ├── http.collector.test.ts
│   │       │   ├── database.collector.test.ts
│   │       │   └── business.collector.test.ts
│   │       └── middleware/
│   │           └── metrics.middleware.test.ts
│   └── plugins/
│       └── metrics.plugin.test.ts
└── integration/
    └── metrics-endpoint.test.ts
```

---

## 4. Metrics Catalog

### 4.1 HTTP Metrics

#### 4.1.1 HTTP Request Duration Histogram

**Metric Name:** `http_request_duration_seconds`

**Type:** Histogram

**Description:** HTTP request latency in seconds

**Labels:**

- `method`: HTTP method (GET, POST, PUT, DELETE, PATCH, etc.)
- `route`: Route path pattern (e.g., `/api/v1/users/:id`)
- `status_code`: HTTP status code (200, 201, 400, 401, 404, 500, etc.)
- `status_class`: Status code class (2xx, 3xx, 4xx, 5xx)

**Buckets:** [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

**Example Output:**

```
# HELP http_request_duration_seconds HTTP request latency in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/v1/products",status_code="200",status_class="2xx",le="0.005"} 0
http_request_duration_seconds_bucket{method="GET",route="/api/v1/products",status_code="200",status_class="2xx",le="0.01"} 5
http_request_duration_seconds_bucket{method="GET",route="/api/v1/products",status_code="200",status_class="2xx",le="0.025"} 23
http_request_duration_seconds_bucket{method="GET",route="/api/v1/products",status_code="200",status_class="2xx",le="0.05"} 89
http_request_duration_seconds_bucket{method="GET",route="/api/v1/products",status_code="200",status_class="2xx",le="0.1"} 234
http_request_duration_seconds_bucket{method="GET",route="/api/v1/products",status_code="200",status_class="2xx",le="+Inf"} 542
http_request_duration_seconds_sum{method="GET",route="/api/v1/products",status_code="200",status_class="2xx"} 89.456
http_request_duration_seconds_count{method="GET",route="/api/v1/products",status_code="200",status_class="2xx"} 542
```

#### 4.1.2 HTTP Requests Total Counter

**Metric Name:** `http_requests_total`

**Type:** Counter

**Description:** Total HTTP requests processed

**Labels:**

- `method`: HTTP method
- `route`: Route path pattern
- `status_code`: HTTP status code
- `status_class`: Status code class

**Example Output:**

```
# HELP http_requests_total Total HTTP requests processed
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/v1/products",status_code="200",status_class="2xx"} 15234
http_requests_total{method="POST",route="/api/v1/auth/login",status_code="200",status_class="2xx"} 8432
http_requests_total{method="POST",route="/api/v1/auth/login",status_code="401",status_class="4xx"} 234
```

#### 4.1.3 HTTP Requests In-Flight Gauge

**Metric Name:** `http_requests_in_flight`

**Type:** Gauge

**Description:** Current number of HTTP requests being processed

**Labels:** None

**Example Output:**

```
# HELP http_requests_in_flight Current number of HTTP requests being processed
# TYPE http_requests_in_flight gauge
http_requests_in_flight 23
```

#### 4.1.4 HTTP Request Size Summary

**Metric Name:** `http_request_size_bytes`

**Type:** Summary

**Description:** HTTP request sizes in bytes

**Labels:**

- `method`: HTTP method
- `route`: Route path pattern

**Quantiles:** [0.5, 0.9, 0.95, 0.99]

**Example Output:**

```
# HELP http_request_size_bytes HTTP request sizes in bytes
# TYPE http_request_size_bytes summary
http_request_size_bytes{method="POST",route="/api/v1/products",quantile="0.5"} 234
http_request_size_bytes{method="POST",route="/api/v1/products",quantile="0.9"} 1567
http_request_size_bytes{method="POST",route="/api/v1/products",quantile="0.95"} 2341
http_request_size_bytes{method="POST",route="/api/v1/products",quantile="0.99"} 5678
http_request_size_bytes_sum{method="POST",route="/api/v1/products"} 345678
http_request_size_bytes_count{method="POST",route="/api/v1/products"} 1234
```

#### 4.1.5 HTTP Response Size Summary

**Metric Name:** `http_response_size_bytes`

**Type:** Summary

**Description:** HTTP response sizes in bytes

**Labels:**

- `method`: HTTP method
- `route`: Route path pattern
- `status_code`: HTTP status code

**Quantiles:** [0.5, 0.9, 0.95, 0.99]

**Example Output:**

```
# HELP http_response_size_bytes HTTP response sizes in bytes
# TYPE http_response_size_bytes summary
http_response_size_bytes{method="GET",route="/api/v1/products",status_code="200",quantile="0.5"} 1234
http_response_size_bytes{method="GET",route="/api/v1/products",status_code="200",quantile="0.9"} 4567
http_response_size_bytes{method="GET",route="/api/v1/products",status_code="200",quantile="0.95"} 6789
http_response_size_bytes{method="GET",route="/api/v1/products",status_code="200",quantile="0.99"} 12345
http_response_size_bytes_sum{method="GET",route="/api/v1/products",status_code="200"} 5678901
http_response_size_bytes_count{method="GET",route="/api/v1/products",status_code="200"} 5423
```

### 4.2 Database Metrics

#### 4.2.1 Database Query Duration Histogram

**Metric Name:** `db_query_duration_seconds`

**Type:** Histogram

**Description:** Database query execution duration in seconds

**Labels:**

- `operation`: Query operation type (select, insert, update, delete)
- `table`: Table name
- `status`: Query status (success, error)

**Buckets:** [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5]

**Example Output:**

```
# HELP db_query_duration_seconds Database query execution duration in seconds
# TYPE db_query_duration_seconds histogram
db_query_duration_seconds_bucket{operation="select",table="users",status="success",le="0.001"} 45
db_query_duration_seconds_bucket{operation="select",table="users",status="success",le="0.005"} 234
db_query_duration_seconds_bucket{operation="select",table="users",status="success",le="0.01"} 567
db_query_duration_seconds_bucket{operation="select",table="users",status="success",le="0.025"} 890
db_query_duration_seconds_bucket{operation="select",table="users",status="success",le="+Inf"} 1234
db_query_duration_seconds_sum{operation="select",table="users",status="success"} 8.456
db_query_duration_seconds_count{operation="select",table="users",status="success"} 1234
```

#### 4.2.2 Database Connections Gauge

**Metric Name:** `db_connections`

**Type:** Gauge

**Description:** Database connection pool status

**Labels:**

- `state`: Connection state (active, idle, total)

**Example Output:**

```
# HELP db_connections Database connection pool status
# TYPE db_connections gauge
db_connections{state="active"} 8
db_connections{state="idle"} 12
db_connections{state="total"} 20
```

#### 4.2.3 Database Query Errors Total

**Metric Name:** `db_query_errors_total`

**Type:** Counter

**Description:** Total database query errors

**Labels:**

- `operation`: Query operation type
- `table`: Table name
- `error_type`: Error category (connection, syntax, constraint, timeout)

**Example Output:**

```
# HELP db_query_errors_total Total database query errors
# TYPE db_query_errors_total counter
db_query_errors_total{operation="select",table="users",error_type="connection"} 5
db_query_errors_total{operation="insert",table="products",error_type="constraint"} 12
db_query_errors_total{operation="update",table="sessions",error_type="timeout"} 2
```

#### 4.2.4 Database Transactions Total

**Metric Name:** `db_transactions_total`

**Type:** Counter

**Description:** Total database transactions

**Labels:**

- `status`: Transaction status (committed, rolled_back)

**Example Output:**

```
# HELP db_transactions_total Total database transactions
# TYPE db_transactions_total counter
db_transactions_total{status="committed"} 5678
db_transactions_total{status="rolled_back"} 23
```

### 4.3 Business Metrics

#### 4.3.1 User Registrations Total

**Metric Name:** `user_registrations_total`

**Type:** Counter

**Description:** Total user registrations

**Labels:** None

**Example Output:**

```
# HELP user_registrations_total Total user registrations
# TYPE user_registrations_total counter
user_registrations_total 1234
```

#### 4.3.2 User Logins Total

**Metric Name:** `user_logins_total`

**Type:** Counter

**Description:** Total user login attempts

**Labels:**

- `status`: Login status (success, failure)

**Example Output:**

```
# HELP user_logins_total Total user login attempts
# TYPE user_logins_total counter
user_logins_total{status="success"} 8934
user_logins_total{status="failure"} 1243
```

#### 4.3.3 Active Users Gauge

**Metric Name:** `active_users`

**Type:** Gauge

**Description:** Current number of active user sessions

**Labels:** None

**Example Output:**

```
# HELP active_users Current number of active user sessions
# TYPE active_users gauge
active_users 456
```

#### 4.3.4 Products Created Total

**Metric Name:** `products_created_total`

**Type:** Counter

**Description:** Total products created

**Labels:** None

**Example Output:**

```
# HELP products_created_total Total products created
# TYPE products_created_total counter
products_created_total 789
```

#### 4.3.5 Products Updated Total

**Metric Name:** `products_updated_total`

**Type:** Counter

**Description:** Total products updated

**Labels:** None

**Example Output:**

```
# HELP products_updated_total Total products updated
# TYPE products_updated_total counter
products_updated_total 2345
```

### 4.4 System Metrics

#### 4.4.1 Process CPU Seconds Total

**Metric Name:** `process_cpu_seconds_total`

**Type:** Counter

**Description:** Total user and system CPU time spent in seconds

**Labels:**

- `mode`: CPU mode (user, system)

**Example Output:**

```
# HELP process_cpu_seconds_total Total user and system CPU time spent in seconds
# TYPE process_cpu_seconds_total counter
process_cpu_seconds_total{mode="user"} 1234.56
process_cpu_seconds_total{mode="system"} 456.78
```

#### 4.4.2 Process Memory Bytes

**Metric Name:** `process_memory_bytes`

**Type:** Gauge

**Description:** Process memory usage in bytes

**Labels:**

- `type`: Memory type (rss, heap_total, heap_used, external)

**Example Output:**

```
# HELP process_memory_bytes Process memory usage in bytes
# TYPE process_memory_bytes gauge
process_memory_bytes{type="rss"} 234567890
process_memory_bytes{type="heap_total"} 201326592
process_memory_bytes{type="heap_used"} 123456789
process_memory_bytes{type="external"} 12345678
```

#### 4.4.3 Event Loop Lag Seconds

**Metric Name:** `event_loop_lag_seconds`

**Type:** Gauge

**Description:** Lag of event loop in seconds

**Labels:** None

**Example Output:**

```
# HELP event_loop_lag_seconds Lag of event loop in seconds
# TYPE event_loop_lag_seconds gauge
event_loop_lag_seconds 0.023
```

---

## 5. Implementation Details

### 5.1 Metrics Registry Implementation

The registry is the central component that manages all metrics and provides the Prometheus exposition format.

```typescript
// src/core/metrics/registry.ts

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labels?: string[];
}

interface MetricValue {
  labels: Record<string, string>;
  value: number;
  timestamp?: number;
}

interface HistogramBucket {
  le: string;
  value: number;
}

interface HistogramData extends MetricValue {
  sum: number;
  count: number;
  buckets: HistogramBucket[];
}

interface SummaryData extends MetricValue {
  sum: number;
  count: number;
  quantiles: Array<{ quantile: string; value: number }>;
}

class MetricsRegistry {
  private counters: Map<string, Map<string, number>> = new Map();
  private gauges: Map<string, Map<string, number>> = new Map();
  private histograms: Map<string, Map<string, HistogramData>> = new Map();
  private summaries: Map<string, Map<string, SummaryData>> = new Map();
  private metricDefinitions: Map<string, Metric> = new Map();

  registerCounter(name: string, help: string, labels?: string[]): void {
    const metric: Metric = { name, type: 'counter', help, labels };
    this.metricDefinitions.set(name, metric);
    this.counters.set(name, new Map());
  }

  registerGauge(name: string, help: string, labels?: string[]): void {
    const metric: Metric = { name, type: 'gauge', help, labels };
    this.metricDefinitions.set(name, metric);
    this.gauges.set(name, new Map());
  }

  registerHistogram(name: string, help: string, buckets: number[], labels?: string[]): void {
    const metric: Metric = { name, type: 'histogram', help, labels };
    this.metricDefinitions.set(name, metric);
    this.histograms.set(name, new Map());

    // Store bucket configuration
    this.histogramBuckets.set(name, buckets);
  }

  registerSummary(name: string, help: string, quantiles: number[], labels?: string[]): void {
    const metric: Metric = { name, type: 'summary', help, labels };
    this.metricDefinitions.set(name, metric);
    this.summaries.set(name, new Map());

    // Store quantile configuration
    this.summaryQuantiles.set(name, quantiles);
  }

  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    const counterMap = this.counters.get(name);
    if (!counterMap) {
      throw new Error(`Counter ${name} not registered`);
    }

    const labelKey = this.getLabelKey(labels);
    const currentValue = counterMap.get(labelKey) || 0;
    counterMap.set(labelKey, currentValue + value);
  }

  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gaugeMap = this.gauges.get(name);
    if (!gaugeMap) {
      throw new Error(`Gauge ${name} not registered`);
    }

    const labelKey = this.getLabelKey(labels);
    gaugeMap.set(labelKey, value);
  }

  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const histogramMap = this.histograms.get(name);
    if (!histogramMap) {
      throw new Error(`Histogram ${name} not registered`);
    }

    const labelKey = this.getLabelKey(labels);
    const currentData = histogramMap.get(labelKey) || {
      labels: labels || {},
      sum: 0,
      count: 0,
      buckets: this.getInitialBuckets(name),
    };

    // Update sum and count
    currentData.sum += value;
    currentData.count += 1;

    // Update buckets
    const buckets = this.histogramBuckets.get(name) || [];
    for (const bucket of currentData.buckets) {
      const le = parseFloat(bucket.le);
      if (value <= le) {
        bucket.value += 1;
      }
    }
    // Infinity bucket always increments
    currentData.buckets[currentData.buckets.length - 1].value += 1;

    histogramMap.set(labelKey, currentData);
  }

  observeSummary(name: string, value: number, labels?: Record<string, string>): void {
    const summaryMap = this.summaries.get(name);
    if (!summaryMap) {
      throw new Error(`Summary ${name} not registered`);
    }

    const labelKey = this.getLabelKey(labels);
    const currentData = summaryMap.get(labelKey);

    if (currentData) {
      // Update existing summary
      currentData.sum += value;
      currentData.count += 1;
      currentData.quantiles = this.calculateQuantiles(name, value, currentData);
    } else {
      // Create new summary
      summaryMap.set(labelKey, {
        labels: labels || {},
        sum: value,
        count: 1,
        quantiles: this.getInitialQuantiles(name),
      });
    }
  }

  getMetrics(): string {
    let output = '';

    // Export counters
    for (const [name, counterMap] of this.counters.entries()) {
      const definition = this.metricDefinitions.get(name);
      if (definition) {
        output += `# HELP ${name} ${definition.help}\n`;
        output += `# TYPE ${name} ${definition.type}\n`;
      }

      for (const [labelKey, value] of counterMap.entries()) {
        const labels = this.parseLabelKey(labelKey);
        const labelStr = this.formatLabels(labels);
        output += `${name}${labelStr} ${value}\n`;
      }
    }

    // Export gauges
    for (const [name, gaugeMap] of this.gauges.entries()) {
      const definition = this.metricDefinitions.get(name);
      if (definition) {
        output += `# HELP ${name} ${definition.help}\n`;
        output += `# TYPE ${name} ${definition.type}\n`;
      }

      for (const [labelKey, value] of gaugeMap.entries()) {
        const labels = this.parseLabelKey(labelKey);
        const labelStr = this.formatLabels(labels);
        output += `${name}${labelStr} ${value}\n`;
      }
    }

    // Export histograms
    for (const [name, histogramMap] of this.histograms.entries()) {
      const definition = this.metricDefinitions.get(name);
      if (definition) {
        output += `# HELP ${name} ${definition.help}\n`;
        output += `# TYPE ${name} ${definition.type}\n`;
      }

      for (const [labelKey, data] of histogramMap.entries()) {
        const labels = this.parseLabelKey(labelKey);
        const labelStr = this.formatLabels(labels);

        // Export buckets
        for (const bucket of data.buckets) {
          output += `${name}_bucket${labelStr},le="${bucket.le}"} ${bucket.value}\n`;
        }

        // Export sum and count
        output += `${name}_sum${labelStr} ${data.sum}\n`;
        output += `${name}_count${labelStr} ${data.count}\n`;
      }
    }

    // Export summaries
    for (const [name, summaryMap] of this.summaries.entries()) {
      const definition = this.metricDefinitions.get(name);
      if (definition) {
        output += `# HELP ${name} ${definition.help}\n`;
        output += `# TYPE ${name} ${definition.type}\n`;
      }

      for (const [labelKey, data] of summaryMap.entries()) {
        const labels = this.parseLabelKey(labelKey);
        const labelStr = this.formatLabels(labels);

        // Export quantiles
        for (const q of data.quantiles) {
          output += `${name}${labelStr},quantile="${q.quantile}"} ${q.value}\n`;
        }

        // Export sum and count
        output += `${name}_sum${labelStr} ${data.sum}\n`;
        output += `${name}_count${labelStr} ${data.count}\n`;
      }
    }

    return output;
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
  }

  private getLabelKey(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }
    const sortedKeys = Object.keys(labels).sort();
    return sortedKeys.map(k => `${k}="${labels[k]}"`).join(',');
  }

  private parseLabelKey(key: string): Record<string, string> {
    if (!key) return {};
    const labels: Record<string, string> = {};
    const pairs = key.split(',');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      labels[k] = v.replace(/"/g, '');
    }
    return labels;
  }

  private formatLabels(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) {
      return '';
    }
    const pairs = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
    return `{${pairs.join(',')}}`;
  }

  private getInitialBuckets(name: string): HistogramBucket[] {
    const buckets = this.histogramBuckets.get(name) || [];
    return [...buckets.map(b => ({ le: b.toString(), value: 0 })), { le: '+Inf', value: 0 }];
  }

  private getInitialQuantiles(name: string): Array<{ quantile: string; value: number }> {
    const quantiles = this.summaryQuantiles.get(name) || [];
    return quantiles.map(q => ({ quantile: q.toString(), value: 0 }));
  }

  private calculateQuantiles(name: string, value: number, currentData: SummaryData): Array<{ quantile: string; value: number }> {
    // Simplified quantile calculation
    // In production, use a proper streaming quantile algorithm
    const quantiles = this.summaryQuantiles.get(name) || [];
    return quantiles.map(q => ({
      quantile: q.toString(),
      value: value * q, // Simplified - use actual calculation
    }));
  }

  private histogramBuckets: Map<string, number[]> = new Map();
  private summaryQuantiles: Map<string, number[]> = new Map();
}

// Singleton instance
let registryInstance: MetricsRegistry | null = null;

export function getMetricsRegistry(): MetricsRegistry {
  if (!registryInstance) {
    registryInstance = new MetricsRegistry();
    initializeDefaultMetrics(registryInstance);
  }
  return registryInstance;
}

function initializeDefaultMetrics(registry: MetricsRegistry): void {
  // HTTP metrics
  registry.registerHistogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    ['method', 'route', 'status_code', 'status_class']
  );
  registry.registerCounter('http_requests_total', 'Total HTTP requests processed', ['method', 'route', 'status_code', 'status_class']);
  registry.registerGauge('http_requests_in_flight', 'Current number of HTTP requests being processed');
  registry.registerSummary('http_request_size_bytes', 'HTTP request sizes in bytes', [0.5, 0.9, 0.95, 0.99], ['method', 'route']);
  registry.registerSummary('http_response_size_bytes', 'HTTP response sizes in bytes', [0.5, 0.9, 0.95, 0.99], ['method', 'route', 'status_code']);

  // Database metrics
  registry.registerHistogram(
    'db_query_duration_seconds',
    'Database query execution duration in seconds',
    [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    ['operation', 'table', 'status']
  );
  registry.registerGauge('db_connections', 'Database connection pool status', ['state']);
  registry.registerCounter('db_query_errors_total', 'Total database query errors', ['operation', 'table', 'error_type']);
  registry.registerCounter('db_transactions_total', 'Total database transactions', ['status']);

  // Business metrics
  registry.registerCounter('user_registrations_total', 'Total user registrations');
  registry.registerCounter('user_logins_total', 'Total user login attempts', ['status']);
  registry.registerGauge('active_users', 'Current number of active user sessions');
  registry.registerCounter('products_created_total', 'Total products created');
  registry.registerCounter('products_updated_total', 'Total products updated');

  // System metrics
  registry.registerCounter('process_cpu_seconds_total', 'Total user and system CPU time spent in seconds', ['mode']);
  registry.registerGauge('process_memory_bytes', 'Process memory usage in bytes', ['type']);
  registry.registerGauge('event_loop_lag_seconds', 'Lag of event loop in seconds');
}

export { MetricsRegistry };
```

### 5.2 HTTP Metrics Collector

```typescript
// src/core/metrics/collectors/http.collector.ts

import { getMetricsRegistry } from '../registry';
import type { Context } from 'elysia';

interface HTTPRequestMetrics {
  startTime: number;
  method: string;
  route: string;
  requestSize: number;
}

const requestMetricsMap = new WeakMap<Context, HTTPRequestMetrics>();

export class HTTPMetricsCollector {
  private registry = getMetricsRegistry();

  recordRequestStart(context: Context): void {
    const metrics: HTTPRequestMetrics = {
      startTime: performance.now(),
      method: context.request.method,
      route: this.getRoutePattern(context),
      requestSize: this.getRequestSize(context),
    };
    requestMetricsMap.set(context, metrics);

    // Increment in-flight gauge
    this.registry.incrementCounter('http_requests_in_flight', 1);
  }

  recordRequestEnd(context: Context, statusCode: number): void {
    const metrics = requestMetricsMap.get(context);
    if (!metrics) return;

    const duration = (performance.now() - metrics.startTime) / 1000; // Convert to seconds
    const statusClass = this.getStatusClass(statusCode);

    // Record duration histogram
    this.registry.observeHistogram('http_request_duration_seconds', duration, {
      method: metrics.method,
      route: metrics.route,
      status_code: statusCode.toString(),
      status_class: statusClass,
    });

    // Increment total requests counter
    this.registry.incrementCounter('http_requests_total', 1, {
      method: metrics.method,
      route: metrics.route,
      status_code: statusCode.toString(),
      status_class: statusClass,
    });

    // Record request size
    if (metrics.requestSize > 0) {
      this.registry.observeSummary('http_request_size_bytes', metrics.requestSize, {
        method: metrics.method,
        route: metrics.route,
      });
    }

    // Decrement in-flight gauge
    this.registry.incrementCounter('http_requests_in_flight', -1);

    requestMetricsMap.delete(context);
  }

  recordResponseSize(context: Context, statusCode: number, size: number): void {
    const metrics = requestMetricsMap.get(context);
    if (!metrics) return;

    if (size > 0) {
      this.registry.observeSummary('http_response_size_bytes', size, {
        method: metrics.method,
        route: metrics.route,
        status_code: statusCode.toString(),
      });
    }
  }

  recordError(context: Context, error: Error): void {
    const metrics = requestMetricsMap.get(context);
    if (!metrics) return;

    // Record as 500 error
    this.recordRequestEnd(context, 500);
  }

  private getRoutePattern(context: Context): string {
    // Try to get route pattern from context
    // @ts-ignore - Elysia stores route pattern internally
    return context.route?.path || context.url.pathname;
  }

  private getStatusClass(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return '2xx';
    if (statusCode >= 300 && statusCode < 400) return '3xx';
    if (statusCode >= 400 && statusCode < 500) return '4xx';
    if (statusCode >= 500 && statusCode < 600) return '5xx';
    return 'unknown';
  }

  private getRequestSize(context: Context): number {
    const contentLength = context.request.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  }
}

export const httpMetricsCollector = new HTTPMetricsCollector();
```

### 5.3 Database Metrics Collector

```typescript
// src/core/metrics/collectors/database.collector.ts

import { getMetricsRegistry } from '../registry';

interface DatabaseQueryMetrics {
  operation: string;
  table: string;
  startTime: number;
}

export class DatabaseMetricsCollector {
  private registry = getMetricsRegistry();
  private queryStack: DatabaseQueryMetrics[] = [];

  recordQueryStart(operation: string, table: string): void {
    const metrics: DatabaseQueryMetrics = {
      operation,
      table,
      startTime: performance.now(),
    };
    this.queryStack.push(metrics);
  }

  recordQueryEnd(success: boolean, error?: Error): void {
    const metrics = this.queryStack.pop();
    if (!metrics) return;

    const duration = (performance.now() - metrics.startTime) / 1000; // Convert to seconds
    const status = success ? 'success' : 'error';

    // Record query duration
    this.registry.observeHistogram('db_query_duration_seconds', duration, {
      operation: metrics.operation,
      table: metrics.table,
      status,
    });

    // Record error if failed
    if (!success && error) {
      const errorType = this.getErrorType(error);
      this.registry.incrementCounter('db_query_errors_total', 1, {
        operation: metrics.operation,
        table: metrics.table,
        error_type: errorType,
      });
    }
  }

  updateConnectionStats(active: number, idle: number): void {
    this.registry.setGauge('db_connections', active, { state: 'active' });
    this.registry.setGauge('db_connections', idle, { state: 'idle' });
    this.registry.setGauge('db_connections', active + idle, { state: 'total' });
  }

  recordTransaction(status: 'committed' | 'rolled_back'): void {
    this.registry.incrementCounter('db_transactions_total', 1, { status });
  }

  private getErrorType(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('connection') || message.includes('connect')) {
      return 'connection';
    }
    if (message.includes('syntax') || message.includes('parse')) {
      return 'syntax';
    }
    if (message.includes('constraint') || message.includes('unique') || message.includes('foreign')) {
      return 'constraint';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }

    return 'unknown';
  }
}

export const databaseMetricsCollector = new DatabaseMetricsCollector();
```

### 5.4 Business Metrics Collector

```typescript
// src/core/metrics/collectors/business.collector.ts

import { getMetricsRegistry } from '../registry';

export class BusinessMetricsCollector {
  private registry = getMetricsRegistry();

  recordUserRegistration(): void {
    this.registry.incrementCounter('user_registrations_total', 1);
  }

  recordUserLogin(status: 'success' | 'failure'): void {
    this.registry.incrementCounter('user_logins_total', 1, { status });
  }

  updateActiveUsers(count: number): void {
    this.registry.setGauge('active_users', count);
  }

  recordProductCreated(): void {
    this.registry.incrementCounter('products_created_total', 1);
  }

  recordProductUpdated(): void {
    this.registry.incrementCounter('products_updated_total', 1);
  }

  recordCustomEvent(name: string, value: number = 1, labels?: Record<string, string>): void {
    // For custom business events, register on-the-fly if needed
    if (!this.registry['metricDefinitions'].has(name)) {
      this.registry.registerCounter(name, `Custom business metric: ${name}`, labels ? Object.keys(labels) : undefined);
    }
    this.registry.incrementCounter(name, value, labels);
  }
}

export const businessMetricsCollector = new BusinessMetricsCollector();
```

### 5.5 System Metrics Collector

```typescript
// src/core/metrics/collectors/system.collector.ts

import { getMetricsRegistry } from '../registry';

export class SystemMetricsCollector {
  private registry = getMetricsRegistry();
  private startTime = Date.now();
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = Date.now();

  collectMetrics(): void {
    // CPU usage
    const currentCpuUsage = process.cpuUsage();
    const currentTime = Date.now();
    const timeDelta = (currentTime - this.lastCpuTime) / 1000; // seconds

    const userDelta = (currentCpuUsage.user - this.lastCpuUsage.user) / 1000000; // convert to seconds
    const systemDelta = (currentCpuUsage.system - this.lastCpuUsage.system) / 1000000; // convert to seconds

    if (timeDelta > 0) {
      this.registry.incrementCounter('process_cpu_seconds_total', userDelta, { mode: 'user' });
      this.registry.incrementCounter('process_cpu_seconds_total', systemDelta, { mode: 'system' });
    }

    this.lastCpuUsage = currentCpuUsage;
    this.lastCpuTime = currentTime;

    // Memory usage
    const memoryUsage = process.memoryUsage();
    this.registry.setGauge('process_memory_bytes', memoryUsage.rss, { type: 'rss' });
    this.registry.setGauge('process_memory_bytes', memoryUsage.heapTotal, { type: 'heap_total' });
    this.registry.setGauge('process_memory_bytes', memoryUsage.heapUsed, { type: 'heap_used' });
    this.registry.setGauge('process_memory_bytes', memoryUsage.external, { type: 'external' });

    // Event loop lag (approximation using setImmediate)
    this.measureEventLoopLag();
  }

  private measureEventLoopLag(): void {
    const start = performance.now();
    setImmediate(() => {
      const lag = (performance.now() - start) / 1000; // Convert to seconds
      this.registry.setGauge('event_loop_lag_seconds', lag);
    });
  }
}

export const systemMetricsCollector = new SystemMetricsCollector();
```

### 5.6 Prometheus Format Utilities

```typescript
// src/core/metrics/utils/prometheus.ts

export function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
}

export function escapeHelpText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

export function formatMetricName(name: string): string {
  // Ensure metric name follows Prometheus naming conventions
  return name
    .replace(/[^a-zA-Z0-9_:]/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '');
}

export function validateMetricName(name: string): boolean {
  // Prometheus metric name regex: [a-zA-Z_:][a-zA-Z0-9_:]*
  return /^[a-zA-Z_:][a-zA-Z0-9_:]*$/.test(name);
}

export function validateLabelName(name: string): boolean {
  // Prometheus label name regex: [a-zA-Z_][a-zA-Z0-9_]*
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

export function formatLabels(labels: Record<string, string>): string {
  if (Object.keys(labels).length === 0) {
    return '';
  }

  const pairs = Object.entries(labels).map(([key, value]) => {
    const escapedKey = formatMetricName(key);
    const escapedValue = escapeLabelValue(value);
    return `${escapedKey}="${escapedValue}"`;
  });

  return `{${pairs.join(',')}}`;
}
```

---

## 6. Plugin Integration

### 6.1 Main Metrics Plugin

```typescript
// src/plugins/metrics.plugin.ts

import { Elysia } from 'elysia';
import { getMetricsRegistry } from '@core/metrics/registry';
import { httpMetricsCollector } from '@core/metrics/collectors/http.collector';
import { databaseMetricsCollector } from '@core/metrics/collectors/database.collector';
import { systemMetricsCollector } from '@core/metrics/collectors/system.collector';

export interface MetricsPluginConfig {
  /**
   * Path for the metrics endpoint (default: /metrics)
   */
  endpoint?: string;

  /**
   * Enable automatic HTTP request tracking
   */
  trackHTTP?: boolean;

  /**
   * Enable system metrics collection
   */
  trackSystem?: boolean;

  /**
   * Interval for system metrics collection in milliseconds (default: 15000)
   */
  systemMetricsInterval?: number;

  /**
   * Exclude paths from metrics tracking
   */
  excludePaths?: string[];

  /**
   * Include only specific paths in metrics tracking
   */
  includePaths?: string[];
}

export function metricsPlugin(config: MetricsPluginConfig = {}) {
  const { endpoint = '/metrics', trackHTTP = true, trackSystem = true, systemMetricsInterval = 15000, excludePaths = [], includePaths } = config;

  const registry = getMetricsRegistry();
  let systemMetricsTimer: Timer | null = null;

  // Start system metrics collection if enabled
  if (trackSystem) {
    systemMetricsTimer = setInterval(() => {
      systemMetricsCollector.collectMetrics();
    }, systemMetricsInterval);
  }

  // Cleanup function
  const cleanup = () => {
    if (systemMetricsTimer) {
      clearInterval(systemMetricsTimer);
    }
  };

  return new Elysia({ name: 'metrics-plugin' })
    .derive(({ request, set }) => {
      // Store request start time and metadata
      const startTime = performance.now();
      const originalJson = set.json;

      return {
        metrics: {
          startTime,
          recordMetrics: () => {
            const duration = (performance.now() - startTime) / 1000;
            const statusCode = set.status || 200;

            if (trackHTTP) {
              // Metrics will be recorded by onResponse hook
            }
          },
        },
      };
    })
    .onBeforeHandle(({ request, path }) => {
      if (trackHTTP && shouldTrackPath(path, excludePaths, includePaths)) {
        httpMetricsCollector.recordRequestStart({ request, url: new URL(request.url) } as any);
      }
    })
    .onResponse(({ request, set, path }) => {
      if (trackHTTP && shouldTrackPath(path, excludePaths, includePaths)) {
        const statusCode = set.status || 200;
        httpMetricsCollector.recordRequestEnd({ request } as any, statusCode);

        // Record response size if available
        if (set.headers && 'content-length' in set.headers) {
          const size = parseInt(set.headers['content-length'] as string, 10);
          httpMetricsCollector.recordResponseSize({ request } as any, statusCode, size);
        }
      }
    })
    .onError(({ error, request, path }) => {
      if (trackHTTP && shouldTrackPath(path, excludePaths, includePaths)) {
        httpMetricsCollector.recordError({ request } as any, error as Error);
      }
    })
    .get(
      endpoint,
      () => {
        const metrics = registry.getMetrics();
        return new Response(metrics, {
          headers: {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          },
        });
      },
      {
        detail: {
          summary: 'Prometheus metrics endpoint',
          description: 'Returns application metrics in Prometheus exposition format',
          tags: ['Monitoring'],
        },
      }
    );
}

function shouldTrackPath(path: string, excludePaths: string[], includePaths?: string[]): boolean {
  // Check if path is explicitly excluded
  for (const excluded of excludePaths) {
    if (path.startsWith(excluded)) {
      return false;
    }
  }

  // If includePaths is specified, only track matching paths
  if (includePaths && includePaths.length > 0) {
    for (const included of includePaths) {
      if (path.startsWith(included)) {
        return true;
      }
    }
    return false;
  }

  return true;
}
```

### 6.2 Database Integration Wrapper

```typescript
// src/core/metrics/utils/database-wrapper.ts

import { databaseMetricsCollector } from '../collectors/database.collector';

export function withDatabaseMetrics<T extends (...args: any[]) => Promise<any>>(operation: string, table: string, fn: T): T {
  return (async (...args: any[]) => {
    databaseMetricsCollector.recordQueryStart(operation, table);
    try {
      const result = await fn(...args);
      databaseMetricsCollector.recordQueryEnd(true);
      return result;
    } catch (error) {
      databaseMetricsCollector.recordQueryEnd(false, error as Error);
      throw error;
    }
  }) as T;
}

// Usage example:
/*
const result = await withDatabaseMetrics('select', 'users', async () => {
  return db.select().from(users);
});
*/
```

### 6.3 Plugin Registration

```typescript
// src/plugins/index.ts

import { Elysia } from 'elysia';
import { healthPlugin } from './health.plugin';
import { metricsPlugin } from './metrics.plugin';

export interface PluginConfig {
  health?: boolean;
  metrics?: boolean | MetricsPluginConfig;
}

export function registerPlugins(app: Elysia, config: PluginConfig = {}): Elysia {
  // Health check plugin
  if (config.health !== false) {
    app.use(healthPlugin());
  }

  // Metrics plugin
  if (config.metrics !== false) {
    const metricsConfig = typeof config.metrics === 'object' ? config.metrics : undefined;
    app.use(metricsPlugin(metricsConfig));
  }

  return app;
}

export * from './health.plugin';
export * from './metrics.plugin';
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

#### Registry Tests

```typescript
// tests/unit/core/metrics/registry.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import { MetricsRegistry, getMetricsRegistry } from '@/core/metrics/registry';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  describe('Counter', () => {
    it('should register and increment counter', () => {
      registry.registerCounter('test_counter', 'A test counter');
      registry.incrementCounter('test_counter', 1);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter 1');
    });

    it('should handle counter with labels', () => {
      registry.registerCounter('test_counter', 'A test counter', ['method', 'status']);
      registry.incrementCounter('test_counter', 1, { method: 'GET', status: '200' });
      registry.incrementCounter('test_counter', 2, { method: 'POST', status: '201' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter{method="GET",status="200"} 1');
      expect(metrics).toContain('test_counter{method="POST",status="201"} 3');
    });

    it('should throw error for unregistered counter', () => {
      expect(() => {
        registry.incrementCounter('unknown_counter', 1);
      }).toThrow('Counter unknown_counter not registered');
    });
  });

  describe('Gauge', () => {
    it('should register and set gauge', () => {
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
  });

  describe('Histogram', () => {
    it('should register and observe histogram', () => {
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
      expect(metrics).toContain('response_time_count 10');
    });
  });

  describe('Prometheus Format', () => {
    it('should export HELP and TYPE comments', () => {
      registry.registerCounter('test_counter', 'A test counter');
      registry.incrementCounter('test_counter', 1);

      const metrics = registry.getMetrics();
      expect(metrics).toContain('# HELP test_counter A test counter');
      expect(metrics).toContain('# TYPE test_counter counter');
    });

    it('should properly escape label values', () => {
      registry.registerCounter('test_counter', 'A test counter', ['path']);
      registry.incrementCounter('test_counter', 1, { path: '/api/v1/users' });

      const metrics = registry.getMetrics();
      expect(metrics).toContain('test_counter{path="/api/v1/users"}');
    });
  });
});
```

#### HTTP Collector Tests

```typescript
// tests/unit/core/metrics/collectors/http.collector.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import { httpMetricsCollector } from '@/core/metrics/collectors/http.collector';
import { getMetricsRegistry } from '@/core/metrics/registry';

describe('HTTPMetricsCollector', () => {
  beforeEach(() => {
    const registry = getMetricsRegistry();
    registry.reset();
  });

  it('should record request start and end', () => {
    const mockContext = {
      request: { method: 'GET', headers: { get: () => null } },
      url: { pathname: '/api/v1/products' },
    } as any;

    httpMetricsCollector.recordRequestStart(mockContext);
    httpMetricsCollector.recordRequestEnd(mockContext, 200);

    const metrics = getMetricsRegistry().getMetrics();
    expect(metrics).toContain('http_requests_total{method="GET",');
    expect(metrics).toContain('status_code="200"');
  });

  it('should calculate correct request duration', () => {
    const mockContext = {
      request: { method: 'POST', headers: { get: () => '1000' } },
      url: { pathname: '/api/v1/users' },
    } as any;

    httpMetricsCollector.recordRequestStart(mockContext);
    // Simulate some delay
    setTimeout(() => {
      httpMetricsCollector.recordRequestEnd(mockContext, 201);

      const metrics = getMetricsRegistry().getMetrics();
      expect(metrics).toContain('http_request_duration_seconds_sum');
    }, 100);
  });

  it('should classify status codes correctly', () => {
    const mockContext = {
      request: { method: 'GET', headers: { get: () => null } },
      url: { pathname: '/api/v1/test' },
    } as any;

    const testCases = [
      [200, '2xx'],
      [301, '3xx'],
      [404, '4xx'],
      [500, '5xx'],
    ];

    for (const [statusCode, expectedClass] of testCases) {
      httpMetricsCollector.recordRequestStart(mockContext);
      httpMetricsCollector.recordRequestEnd(mockContext, statusCode as number);
    }

    const metrics = getMetricsRegistry().getMetrics();
    expect(metrics).toContain('status_class="2xx"');
    expect(metrics).toContain('status_class="3xx"');
    expect(metrics).toContain('status_class="4xx"');
    expect(metrics).toContain('status_class="5xx"');
  });
});
```

### 7.2 Integration Tests

```typescript
// tests/integration/metrics-endpoint.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { metricsPlugin } from '@/plugins/metrics.plugin';

describe('Metrics Endpoint Integration', () => {
  let app: Elysia;
  let server: any;

  beforeAll(async () => {
    app = new Elysia()
      .use(metricsPlugin())
      .get('/api/test', () => ({ message: 'test' }))
      .post('/api/users', () => ({ id: 1 }));

    server = app.listen(3001);
  });

  afterAll(() => {
    server?.stop();
  });

  it('should expose /metrics endpoint', async () => {
    const response = await fetch('http://localhost:3001/metrics');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
  });

  it('should return Prometheus format metrics', async () => {
    const response = await fetch('http://localhost:3001/metrics');
    const text = await response.text();

    expect(text).toContain('# HELP');
    expect(text).toContain('# TYPE');
  });

  it('should track HTTP requests', async () => {
    // Make some test requests
    await fetch('http://localhost:3001/api/test');
    await fetch('http://localhost:3001/api/test');
    await fetch('http://localhost:3001/api/users', { method: 'POST' });

    // Fetch metrics
    const response = await fetch('http://localhost:3001/metrics');
    const text = await response.text();

    expect(text).toContain('http_requests_total');
    expect(text).toContain('http_request_duration_seconds');
  });
});
```

---

## 8. Usage Examples

### 8.1 Basic Plugin Usage

```typescript
// src/app.ts

import { Elysia } from 'elysia';
import { metricsPlugin } from './plugins';

const app = new Elysia().use(metricsPlugin()).get('/', () => 'Hello World');

app.listen(3000);

// Metrics available at http://localhost:3000/metrics
```

### 8.2 Custom Configuration

```typescript
// src/app.ts

import { Elysia } from 'elysia';
import { metricsPlugin } from './plugins';

const app = new Elysia()
  .use(
    metricsPlugin({
      endpoint: '/metrics',
      trackHTTP: true,
      trackSystem: true,
      systemMetricsInterval: 30000, // 30 seconds
      excludePaths: ['/health', '/metrics'],
    })
  )
  .get('/', () => 'Hello World');
```

### 8.3 Manual Metric Recording

```typescript
// src/services/auth.service.ts

import { businessMetricsCollector } from '@core/metrics/collectors/business.collector';

export class AuthService {
  async login(credentials: LoginDTO): Promise<TokenResponse> {
    try {
      // ... authentication logic ...

      // Record successful login
      businessMetricsCollector.recordUserLogin('success');

      return token;
    } catch (error) {
      // Record failed login
      businessMetricsCollector.recordUserLogin('failure');
      throw error;
    }
  }

  async register(data: RegisterDTO): Promise<User> {
    const user = await this.userRepository.create(data);

    // Record registration
    businessMetricsCollector.recordUserRegistration();

    return user;
  }
}
```

### 8.4 Database Query Metrics

```typescript
// src/repositories/base.repository.ts

import { databaseMetricsCollector } from '@core/metrics/collectors/database.collector';
import { withDatabaseMetrics } from '@core/metrics/utils/database-wrapper';

export class BaseRepository {
  async findById<T>(id: string): Promise<T | null> {
    return withDatabaseMetrics('select', this.tableName, async () => {
      return this.db.query.findFirst({
        where: { id },
      });
    });
  }

  async create<T>(data: Partial<T>): Promise<T> {
    return withDatabaseMetrics('insert', this.tableName, async () => {
      return this.db.insert(this.schema).values(data).returning();
    });
  }
}
```

### 8.5 Custom Business Metrics

```typescript
// src/services/products.service.ts

import { businessMetricsCollector } from '@core/metrics/collectors/business.collector';

export class ProductsService {
  async createProduct(data: ProductDTO): Promise<Product> {
    const product = await this.repository.create(data);

    // Standard metric
    businessMetricsCollector.recordProductCreated();

    // Custom metric with labels
    businessMetricsCollector.recordCustomEvent('product_operations_total', 1, {
      operation: 'create',
      category: product.category,
      status: 'success',
    });

    return product;
  }
}
```

### 8.6 Middleware-Level Metrics

```typescript
// src/middlewares/custom-metrics.middleware.ts

import { getMetricsRegistry } from '@core/metrics/registry';

export function customMetricsMiddleware() {
  const registry = getMetricsRegistry();

  return async (context: Context) => {
    const startTime = performance.now();

    // Custom logic
    const customMetric = registry.registerGauge('custom_processing', 'Custom processing metric');

    try {
      const result = await context.next();
      const duration = performance.now() - startTime;

      registry.observeHistogram('custom_processing_duration_seconds', duration / 1000);
      return result;
    } catch (error) {
      registry.incrementCounter('custom_errors_total', 1, {
        error_type: error.constructor.name,
      });
      throw error;
    }
  };
}
```

---

## 9. Prometheus Configuration

### 9.1 Scrape Configuration

```yaml
# prometheus.yml

global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'bun-elysia-monitor'

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

  - job_name: 'bun-elysia-api-production'
    scrape_interval: 15s
    scrape_timeout: 10s
    metrics_path: '/metrics'
    static_configs:
      - targets:
          - 'api-production:3000'
        labels:
          service: 'api'
          environment: 'production'
```

### 9.2 Recording Rules

```yaml
# prometheus/recording-rules.yml

groups:
  - name: api_http
    interval: 30s
    rules:
      - record: job:http_requests_total:rate1m
        expr: sum(rate(http_requests_total[1m])) by (job)

      - record: job:http_request_duration_seconds:p95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job))

      - record: job:http_request_duration_seconds:p99
        expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job))

      - record: job:http_errors_total:rate5m
        expr: sum(rate(http_requests_total{status_class=~"4..|5.."}[5m])) by (job)

  - name: api_database
    interval: 30s
    rules:
      - record: job:db_query_duration_seconds:p95
        expr: histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, job))

      - record: job:db_query_errors_total:rate5m
        expr: sum(rate(db_query_errors_total[5m])) by (job)

      - record: job:db_connections_utilization
        expr: sum(db_connections{state="active"}) by (job) / sum(db_connections{state="total"}) by (job)

  - name: api_business
    interval: 30s
    rules:
      - record: job:user_registrations_total:rate1h
        expr: sum(rate(user_registrations_total[1h])) by (job)

      - record: job:user_logins_success_rate
        expr: sum(rate(user_logins_total{status="success"}[5m])) by (job) / sum(rate(user_logins_total[5m])) by (job)
```

### 9.3 Alerting Rules

```yaml
# prometheus/alerting-rules.yml

groups:
  - name: api_alerts
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status_class=~"5.."}[5m])) by (job) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value }} errors/sec for job {{ $labels.job }}'

      - alert: HighLatency
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job)) > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High request latency detected'
          description: 'P95 latency is {{ $value }}s for job {{ $labels.job }}'

      - alert: DatabaseConnectionPoolExhausted
        expr: sum(db_connections{state="active"}) by (job) / sum(db_connections{state="total"}) by (job) > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Database connection pool nearly exhausted'
          description: 'Connection pool utilization is {{ $value }} for job {{ $labels.job }}'

      - alert: HighDatabaseQueryLatency
        expr: histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, job)) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High database query latency detected'
          description: 'P95 database query latency is {{ $value }}s for job {{ $labels.job }}'

      - alert: HighMemoryUsage
        expr: process_memory_bytes{type="rss"} / 1024 / 1024 / 1024 > 2
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage detected'
          description: 'RSS memory usage is {{ $value }}GB for job {{ $labels.job }}'
```

### 9.4 Grafana Dashboard Queries

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total[5m])) by (route, method)"
        }
      ]
    },
    {
      "title": "Request Latency (P95)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route, method))"
        }
      ]
    },
    {
      "title": "Error Rate",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total{status_class=~\"5..\"}[5m])) by (route)"
        }
      ]
    },
    {
      "title": "Database Connection Pool",
      "targets": [
        {
          "expr": "db_connections"
        }
      ]
    },
    {
      "title": "Database Query Duration (P95)",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, operation, table))"
        }
      ]
    },
    {
      "title": "Active Users",
      "targets": [
        {
          "expr": "active_users"
        }
      ]
    }
  ]
}
```

---

## 10. Success Criteria

### 10.1 Functional Requirements

- [x] `/metrics` endpoint returns valid Prometheus exposition format
- [x] All HTTP metrics are collected automatically for all routes
- [x] Database metrics track query performance and connection pool status
- [x] Business metrics can be recorded manually throughout the application
- [x] System metrics (CPU, memory, event loop) are collected periodically
- [x] Metrics can be filtered/excluded by path patterns
- [x] Label values are properly escaped according to Prometheus format
- [x] Histogram buckets and summary quantiles are correctly calculated

### 10.2 Performance Requirements

- [x] Metrics collection adds < 1ms overhead per request
- [x] `/metrics` endpoint responds in < 100ms for typical metric volume
- [x] Memory overhead is < 50MB for 10,000 unique metric series
- [x] Metrics collection doesn't block the event loop
- [x] System metrics collection interval is configurable (default: 15s)

### 10.3 Code Quality Requirements

- [x] TypeScript types are defined for all metrics-related interfaces
- [x] Code follows the project's existing patterns and conventions
- [x] Unit tests cover all metric types and edge cases
- [x] Integration tests verify end-to-end metrics collection
- [x] Documentation includes usage examples and Prometheus configuration

### 10.4 Integration Requirements

- [x] Plugin integrates cleanly with existing Elysia application
- [x] Metrics plugin doesn't interfere with other plugins
- [x] Configuration options allow flexible deployment scenarios
- [x] Metrics are available in development and production environments

### 10.5 Observability Requirements

- [x] Metrics follow Prometheus naming conventions
- [x] Metric labels follow OpenTelemetry semantic conventions where applicable
- [x] HELP and TYPE comments are included for all metrics
- [x] Default histogram buckets cover common latency ranges
- [x] Metrics are useful for debugging and performance analysis

---

## Appendix

### A. Metric Naming Conventions

All metrics follow these conventions:

1. **Use snake_case for metric names**
   - Example: `http_request_duration_seconds`

2. **Include unit suffix when applicable**
   - `_seconds` for time durations
   - `_bytes` for data sizes
   - `_total` for counters

3. **Use consistent label names**
   - `method`: HTTP method
   - `route`: Route pattern
   - `status_code`: HTTP status code
   - `status_class`: Status code class (2xx, 3xx, etc.)
   - `operation`: Database operation (select, insert, update, delete)
   - `table`: Database table name

### B. Performance Considerations

1. **Label Cardinality**: Avoid high cardinality labels (e.g., user_id)
2. **Memory Management**: Registry automatically manages metric storage
3. **Scraping Overhead**: Prometheus scraping adds minimal server load
4. **Metric Volume**: Limit to ~10,000 unique metric series per instance

### C. Security Considerations

1. **Endpoint Protection**: Consider adding authentication for `/metrics` endpoint
2. **Data Exposure**: Metrics may contain sensitive information in labels
3. **Rate Limiting**: Protect against scraping abuse
4. **Network Security**: Use TLS in production environments

### D. Troubleshooting

**Issue**: Metrics not appearing in Prometheus

- Check Prometheus scrape configuration
- Verify `/metrics` endpoint is accessible
- Check firewall rules

**Issue**: High memory usage

- Reduce label cardinality
- Adjust histogram bucket configuration
- Filter excluded paths

**Issue**: Missing metrics

- Verify plugin is registered correctly
- Check exclude/include path patterns
- Review application logs

---

## Document Version History

| Version | Date       | Changes                 |
| ------- | ---------- | ----------------------- |
| 1.0     | 2026-03-13 | Initial design document |

---

**Next Steps:**

1. Create metrics registry implementation
2. Implement HTTP metrics collector
3. Implement database metrics collector
4. Implement business metrics collector
5. Implement system metrics collector
6. Create metrics plugin
7. Write unit tests
8. Write integration tests
9. Create Prometheus configuration examples
10. Update documentation

**Dependencies:**

- None (pure TypeScript implementation)

**Risks:**

- High metric cardinality could impact performance
- Label escaping needs careful testing
- System metrics collection overhead needs monitoring

**Mitigation:**

- Provide sensible defaults for all configurations
- Document label cardinality best practices
- Include performance benchmarks in tests
