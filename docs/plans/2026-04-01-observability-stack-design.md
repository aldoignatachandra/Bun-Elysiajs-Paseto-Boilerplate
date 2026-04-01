# Observability Stack Design Document

**Project:** Bun Elysia PASETO Boilerplate
**Feature:** Prometheus, Grafana, and OpenTelemetry Integration
**Date:** 2026-04-01
**Version:** 1.0.0
**Status:** Design

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [Implementation Details](#4-implementation-details)
5. [Docker Configuration](#5-docker-configuration)
6. [OpenTelemetry Integration](#6-opentelemetry-integration)
7. [Environment Configuration](#7-environment-configuration)
8. [Grafana Dashboards](#8-grafana-dashboards)
9. [Testing Strategy](#9-testing-strategy)
10. [Usage Examples](#10-usage-examples)
11. [Success Criteria](#11-success-criteria)
12. [Migration Guide](#12-migration-guide)

---

## 1. Overview

### 1.1 Purpose

This design document outlines the implementation of a complete observability stack for the Bun Elysia PASETO boilerplate. The stack includes Prometheus for metrics collection, Grafana for visualization, and OpenTelemetry for distributed tracing - all designed as **optional, non-mandatory components** that users can enable or disable based on their needs.

### 1.2 Goals

- **Optional by Design:** All observability components are opt-in via environment variables
- **Zero Dependency:** Project works perfectly without any observability components
- **Production Ready:** Docker configurations follow best practices for production deployments
- **Easy Setup:** Single command to spin up the entire observability stack
- **Educational:** Clear documentation for learning observability patterns
- **Vendor Neutral:** OpenTelemetry allows switching backends without code changes

### 1.3 Non-Goals

- Replacing the existing metrics implementation (already Prometheus-compatible)
- Mandating any specific observability vendor
- Complex alerting rules (basic examples only)
- Log aggregation (Loki integration is future work)

### 1.4 Key Principles

```
┌─────────────────────────────────────────────────────────────┐
│                    Design Principles                        │
├─────────────────────────────────────────────────────────────┤
│ 1. OPT-IN: All services disabled by default                 │
│ 2. ISOLATED: Observability in separate compose file         │
│ 3. CONFIGURABLE: Environment variable control               │
│ 4. LIGHTWEIGHT: No performance impact when disabled         │
│ 5. PRODUCTION-READY: Security and best practices            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture

### 2.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Your Application                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Existing Metrics (/metrics)                    │  │
│  │                    Prometheus-compatible format                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                    │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              NEW: OpenTelemetry SDK (Optional)                    │  │
│  │         Enabled via: OTEL_ENABLED=true                            │  │
│  │         - Traces (distributed tracing)                            │  │
│  │         - Metrics (alternative to existing)                       │  │
│  │         - Logs (structured logging)                               │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ OTLP (OpenTelemetry Protocol)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK (Optional)                       │
│                    docker-compose.observability.yaml                    │
│                                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │
│  │   Prometheus   │  │     Grafana    │  │     Jaeger     │             │
│  │                │  │                │  │   (Tracing)    │             │
│  │  - Scrapes     │  │  - Dashboards  │  │                │             │
│  │    /metrics    │  │  - Alerts      │  │  - Trace       │             │
│  │  - Stores      │  │  - Explore     │  │    Storage     │             │
│  │    metrics     │  │                │  │  - Trace       │             │
│  │  - Alerting    │  │                │  │    Viewing     │             │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘             │
│          │                   │                   │                      │
│          └───────────────────┼───────────────────┘                      │
│                              │                                          │
│                              ▼                                          │
│                    ┌──────────────────┐                                 │
│                    │  Shared Network  │                                 │
│                    │  (observability) │                                 │
│                    └──────────────────┘                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          METRICS FLOW                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Application                                                            │
│       │                                                                  │
│       │ HTTP GET /metrics (every 15s)                                    │
│       ▼                                                                  │
│   Prometheus ──────────────► PromQL Queries ──────────────► Grafana      │
│       │                                                           │      │
│       │                                                           │      │
│       ▼                                                           ▼      │
│   Time Series DB                                            Dashboards   │
│   (15d retention)                                           Alerts       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                          TRACES FLOW                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Application                                                            │
│       │                                                                  │
│       │ OTLP (gRPC/HTTP) - push based                                    │
│       ▼                                                                  │
│   OTel Collector (optional) ─────► Jaeger Collector ─────► Jaeger UI     │
│       │                                                           │      │
│       │                                                           │      │
│       ▼                                                           ▼      │
│   Processing/                                                 Trace View │
│   Batching                                                    Service Map│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Component Responsibilities

| Component      | Role                         | Data Type           | Access                 |
| -------------- | ---------------------------- | ------------------- | ---------------------- |
| **Prometheus** | Metrics collection & storage | Time-series metrics | http://localhost:9090  |
| **Grafana**    | Visualization & dashboards   | All data sources    | http://localhost:3001  |
| **Jaeger**     | Distributed tracing          | Spans & traces      | http://localhost:16686 |

### 2.4 Network Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Networks                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  app-network (existing)                                         │
│  ├── API                                                        │
│  ├── PostgreSQL                                                 │
│  ├── Redis                                                      │
│  ├── pgAdmin                                                    │
│  └── Redis Commander                                            │
│                                                                 │
│  observability-network (new)                                    │
│  ├── Prometheus                                                 │
│  ├── Grafana                                                    │
│  └── Jaeger                                                     │
│                                                                 │
│  Cross-network communication:                                   │
│  └── Prometheus scrapes API via app-network                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. File Structure

### 3.1 New Files

```
bun-elysia-paseto-boilerplate/
├── docker/
│   └── compose/
│       ├── docker-compose.dev.yaml          # Development stack
│       └── docker-compose.observability.yaml # Observability stack
├── infra/
│   └── observability/
│       ├── prometheus/
│       │   ├── prometheus.yml           # Prometheus configuration
│       │   ├── alerting-rules.yml       # Alerting rules
│       │   └── recording-rules.yml      # Recording rules
│       ├── grafana/
│       │   ├── provisioning/
│       │   │   ├── datasources/
│       │   │   │   └── datasources.yml  # Auto-configure Prometheus
│       │   │   └── dashboards/
│       │   │       ├── dashboard.yml    # Dashboard provisioning config
│       │   │       └── dashboards/
│       │   │           ├── api-overview.json      # Main API dashboard
│       │   │           └── infrastructure.json    # Infrastructure dashboard
│       │   └── grafana.ini              # Grafana configuration
│       └── jaeger/
│           └── jaeger.yml               # Jaeger configuration
├── src/
│   └── core/
│       └── telemetry/                   # OpenTelemetry integration
│           ├── index.ts                 # Main telemetry module
│           ├── tracer.ts                # Tracer setup
│           ├── meter.ts                 # Meter setup (optional)
│           ├── logger.ts                # OTel logger (optional)
│           ├── middleware.ts            # Elysia middleware for tracing
│           ├── types.ts                 # TypeScript types
│           └── config.ts                # Telemetry configuration
├── .env.example                         # Updated with observability vars
└── docs/
    └── plans/
        └── 2026-04-01-observability-stack-design.md (this file)
```

### 3.2 Modified Files

```
bun-elysia-paseto-boilerplate/
├── src/app.ts                           # Add telemetry middleware
├── package.json                         # Add @opentelemetry dependencies
└── .env.example                         # Add observability variables
```

---

## 4. Implementation Details

### 4.1 Task Breakdown

#### Phase 1: Docker Compose Observability Stack (Priority: High)

**Task 1.1: Create docker-compose.observability.yaml**

- Separate compose file for observability services
- Uses profile-based activation
- Production-ready resource limits
- Health checks for all services

**Task 1.2: Prometheus Configuration**

- Scrape configuration for API
- 15-day data retention
- Recording rules for common queries
- Basic alerting rules

**Task 1.3: Grafana Configuration**

- Pre-configured datasources
- Dashboard provisioning
- Pre-built dashboards for API metrics
- Anonymous access for development

**Task 1.4: Jaeger Configuration**

- All-in-one deployment for simplicity
- Memory storage for development
- OTLP receiver enabled

#### Phase 2: OpenTelemetry SDK Integration (Priority: Medium)

**Task 2.1: Install OpenTelemetry Dependencies**

```bash
bun add @opentelemetry/api \
        @opentelemetry/sdk-node \
        @opentelemetry/exporter-trace-otlp-http \
        @opentelemetry/instrumentation-http \
        @opentelemetry/instrumentation-bun \
        @opentelemetry/resources \
        @opentelemetry/semantic-conventions
```

**Task 2.2: Create Telemetry Module**

- Conditional initialization based on OTEL_ENABLED
- Graceful fallback when disabled
- Zero overhead when disabled

**Task 2.3: Create Tracing Middleware**

- Automatic span creation for HTTP requests
- Database query tracing
- Redis operation tracing

**Task 2.4: Integrate with Existing App**

- Add middleware to app.ts
- Ensure no breaking changes
- Environment-based activation

#### Phase 3: Grafana Dashboards (Priority: Medium)

**Task 3.1: API Overview Dashboard**

- Request rate, latency, error rate (RED metrics)
- Top endpoints by traffic
- Response time percentiles (P50, P95, P99)
- Active requests gauge

**Task 3.2: Infrastructure Dashboard**

- Memory usage over time
- CPU usage
- Database connection pool
- Redis metrics (future)

**Task 3.3: Business Metrics Dashboard**

- User registrations
- Login success/failure rate
- Product operations

#### Phase 4: Documentation & Testing (Priority: Low)

**Task 4.1: Update Documentation**

- README with observability section
- Usage examples
- Troubleshooting guide

**Task 4.2: Integration Tests**

- Test telemetry initialization
- Test with/without observability stack
- Verify no performance regression

### 4.2 Dependencies

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.57.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.57.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.57.0",
    "@opentelemetry/instrumentation-http": "^0.57.0",
    "@opentelemetry/instrumentation-redis-4": "^0.45.0",
    "@opentelemetry/instrumentation-pg": "^0.48.0",
    "@opentelemetry/resources": "^1.28.0",
    "@opentelemetry/semantic-conventions": "^1.28.0"
  }
}
```

---

## 5. Docker Configuration

### 5.1 docker-compose.observability.yaml

```yaml
# Docker Compose Observability Configuration
# Purpose: Optional observability stack with Prometheus, Grafana, and Jaeger
# Usage: docker-compose -f docker/compose/docker-compose.observability.yaml up -d
# Or with main stack: docker-compose -f docker/compose/docker-compose.dev.yaml -f docker/compose/docker-compose.observability.yaml up -d

version: '3.9'

# Network configuration
networks:
  observability-network:
    name: bun-elysia-observability
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.21.0.0/16

# Volume configuration
volumes:
  prometheus_data:
    name: bun-elysia-prometheus-data
    driver: local
  grafana_data:
    name: bun-elysia-grafana-data
    driver: local
  jaeger_data:
    name: bun-elysia-jaeger-data
    driver: local

# Service definitions
services:
  # ===========================================
  # PROMETHEUS - Metrics Collection & Storage
  # ===========================================
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: bun-elysia-prometheus
    restart: unless-stopped
    ports:
      - '${PROMETHEUS_PORT:-9090}:9090'
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--storage.tsdb.retention.size=10GB'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
      - '--web.external-url=http://localhost:9090'
    volumes:
      - ./infra/observability/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./infra/observability/prometheus/alerting-rules.yml:/etc/prometheus/alerting-rules.yml:ro
      - ./infra/observability/prometheus/recording-rules.yml:/etc/prometheus/recording-rules.yml:ro
      - prometheus_data:/prometheus
    networks:
      - observability-network
      - bun-elysia-paseto-dev # Connect to app network for scraping
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:9090/-/healthy']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 256M
    labels:
      - 'prometheus.io/scrape=false'

  # ===========================================
  # GRAFANA - Visualization & Dashboards
  # ===========================================
  grafana:
    image: grafana/grafana:10.4.0
    container_name: bun-elysia-grafana
    restart: unless-stopped
    ports:
      - '${GRAFANA_PORT:-3001}:3000'
    environment:
      # Server settings
      - GF_SERVER_ROOT_URL=http://localhost:3001
      - GF_SERVER_DOMAIN=localhost

      # Security settings
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
      - GF_SECURITY_DISABLE_INITIAL_ADMIN_CREATION=false

      # Anonymous access (for development)
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer

      # Plugin settings
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-piechart-panel

      # Dashboard settings
      - GF_DASHBOARDS_DEFAULT_HOME_DASHBOARD_PATH=/etc/grafana/provisioning/dashboards/dashboards/api-overview.json

      # Database (use embedded SQLite for simplicity)
      - GF_DATABASE_TYPE=sqlite3
      - GF_DATABASE_PATH=/var/lib/grafana/grafana.db

      # Logging
      - GF_LOG_MODE=console
      - GF_LOG_LEVEL=${GRAFANA_LOG_LEVEL:-info}
    volumes:
      - ./infra/observability/grafana/provisioning:/etc/grafana/provisioning:ro
      - grafana_data:/var/lib/grafana
    networks:
      - observability-network
    depends_on:
      prometheus:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M

  # ===========================================
  # JAEGER - Distributed Tracing
  # ===========================================
  jaeger:
    image: jaegertracing/all-in-one:1.57
    container_name: bun-elysia-jaeger
    restart: unless-stopped
    ports:
      # Jaeger UI
      - '${JAEGER_UI_PORT:-16686}:16686'
      # OTLP gRPC receiver
      - '${JAEGER_OTLP_GRPC_PORT:-4317}:4317'
      # OTLP HTTP receiver
      - '${JAEGER_OTLP_HTTP_PORT:-4318}:4318'
    environment:
      # Memory storage for development (use Badger/Cassandra/Elasticsearch for production)
      - SPAN_STORAGE_TYPE=memory
      - MEMORY_MAX_TRACES=100000

      # OTLP enabled
      - COLLECTOR_OTLP_ENABLED=true

      # Logging
      - LOG_LEVEL=${JAEGER_LOG_LEVEL:-info}
    volumes:
      - jaeger_data:/tmp
    networks:
      - observability-network
      - bun-elysia-paseto-dev # Connect to app network for receiving traces
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:16687']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 128M
```

### 5.2 Prometheus Configuration

#### prometheus.yml

```yaml
# Prometheus Configuration
# Purpose: Scrape configuration for Bun Elysia PASETO API

global:
  scrape_interval: 15s
  scrape_timeout: 10s
  evaluation_interval: 15s
  external_labels:
    monitor: 'bun-elysia-monitor'
    environment: 'development'

# Alertmanager configuration (future)
alerting:
  alertmanagers:
    - static_configs:
        - targets: []
      # - alertmanager:9093

# Rule files
rule_files:
  - '/etc/prometheus/recording-rules.yml'
  - '/etc/prometheus/alerting-rules.yml'

# Scrape configurations
scrape_configs:
  # ===========================================
  # PROMETHEUS SELF-MONITORING
  # ===========================================
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          service: 'prometheus'

  # ===========================================
  # BUN ELYSIA API
  # ===========================================
  - job_name: 'bun-elysia-api'
    scrape_interval: 10s
    scrape_timeout: 5s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api:3000']
        labels:
          service: 'api'
          application: 'bun-elysia-paseto'
    relabel_configs:
      # Add environment label
      - target_label: environment
        replacement: development
```

#### recording-rules.yml

```yaml
# Recording Rules
# Purpose: Pre-compute frequently used queries for better performance

groups:
  - name: api_http_recording_rules
    interval: 30s
    rules:
      # Request rate per second (1m window)
      - record: api:http_requests:rate1m
        expr: sum(rate(http_requests_total[1m])) by (method, route, status_class)

      # Request rate per second (5m window)
      - record: api:http_requests:rate5m
        expr: sum(rate(http_requests_total[5m])) by (method, route, status_class)

      # P95 latency
      - record: api:http_request_duration:p95
        expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, method, route))

      # P99 latency
      - record: api:http_request_duration:p99
        expr: histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, method, route))

      # Error rate
      - record: api:http_errors:rate5m
        expr: sum(rate(http_requests_total{status_class="5xx"}[5m])) by (method, route)

  - name: api_availability_recording_rules
    interval: 30s
    rules:
      # Availability percentage
      - record: api:availability:ratio5m
        expr: |
          sum(rate(http_requests_total{status_class!~"5.."}[5m])) by (method, route)
          /
          sum(rate(http_requests_total[5m])) by (method, route)
```

#### alerting-rules.yml

```yaml
# Alerting Rules
# Purpose: Basic alerts for API health monitoring

groups:
  - name: api_alerts
    interval: 30s
    rules:
      # High error rate alert
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_class="5xx"}[5m])) by (method, route)
          /
          sum(rate(http_requests_total[5m])) by (method, route) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate on {{ $labels.method }} {{ $labels.route }}'
          description: 'Error rate is {{ $value | humanizePercentage }} for the last 5 minutes'

      # High latency alert
      - alert: HighLatency
        expr: api:http_request_duration:p95 > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'High latency on {{ $labels.method }} {{ $labels.route }}'
          description: 'P95 latency is {{ $value | humanizeDuration }} for the last 10 minutes'

      # API down alert
      - alert: APIDown
        expr: up{job="bun-elysia-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'API is down'
          description: 'The Bun Elysia API has been unreachable for more than 1 minute'

      # Low availability alert
      - alert: LowAvailability
        expr: api:availability:ratio5m < 0.99
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Low availability on {{ $labels.method }} {{ $labels.route }}'
          description: 'Availability is {{ $value | humanizePercentage }} for the last 5 minutes'
```

### 5.3 Grafana Configuration

#### datasources.yml

```yaml
# Grafana Datasource Provisioning
# Purpose: Auto-configure Prometheus as a data source

apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
    jsonData:
      httpMethod: POST
      manageAlerts: true
      prometheusType: Prometheus
      prometheusVersion: '2.51.0'
```

#### dashboard.yml

```yaml
# Grafana Dashboard Provisioning
# Purpose: Auto-load dashboards from filesystem

apiVersion: 1

providers:
  - name: 'Bun Elysia Dashboards'
    orgId: 1
    folder: 'Bun Elysia'
    folderUid: 'bun-elysia'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards/dashboards
```

---

## 6. OpenTelemetry Integration

### 6.1 Telemetry Module Structure

```
src/core/telemetry/
├── index.ts           # Main entry point
├── tracer.ts          # Tracer provider setup
├── meter.ts           # Meter provider setup (optional)
├── logger.ts          # OTel logger (optional)
├── middleware.ts      # Elysia middleware
├── config.ts          # Configuration
└── types.ts           # TypeScript types
```

### 6.2 Core Implementation

#### config.ts

```typescript
/**
 * Telemetry configuration
 */

export interface TelemetryConfig {
  /** Enable OpenTelemetry (default: false) */
  enabled: boolean;

  /** Service name for traces */
  serviceName: string;

  /** Service version */
  serviceVersion: string;

  /** OTLP endpoint (default: http://localhost:4318) */
  otlpEndpoint: string;

  /** Enable HTTP tracing */
  traceHTTP: boolean;

  /** Enable database tracing */
  traceDatabase: boolean;

  /** Enable Redis tracing */
  traceRedis: boolean;

  /** Sample rate (0.0 to 1.0) */
  sampleRate: number;
}

export function getTelemetryConfig(): TelemetryConfig {
  return {
    enabled: process.env.OTEL_ENABLED === 'true',
    serviceName: process.env.OTEL_SERVICE_NAME || 'bun-elysia-api',
    serviceVersion: process.env.npm_package_version || '1.0.0',
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    traceHTTP: process.env.OTEL_TRACE_HTTP !== 'false',
    traceDatabase: process.env.OTEL_TRACE_DATABASE === 'true',
    traceRedis: process.env.OTEL_TRACE_REDIS === 'true',
    sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
  };
}
```

#### index.ts

```typescript
/**
 * OpenTelemetry Integration
 *
 * This module provides optional distributed tracing via OpenTelemetry.
 * When disabled (default), it adds zero overhead to the application.
 */

import { getTelemetryConfig } from './config';
import { initializeTracer, shutdownTracer, getTracer } from './tracer';

let isInitialized = false;

/**
 * Initialize OpenTelemetry (call once at application startup)
 */
export async function initializeTelemetry(): Promise<void> {
  const config = getTelemetryConfig();

  if (!config.enabled) {
    return;
  }

  if (isInitialized) {
    return;
  }

  await initializeTracer(config);
  isInitialized = true;
}

/**
 * Shutdown OpenTelemetry (call on application shutdown)
 */
export async function shutdownTelemetry(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  await shutdownTracer();
  isInitialized = false;
}

/**
 * Check if telemetry is enabled
 */
export function isTelemetryEnabled(): boolean {
  return isInitialized;
}

/**
 * Get the tracer (returns no-op tracer if disabled)
 */
export { getTracer };

/**
 * Telemetry middleware for Elysia
 */
export { telemetryMiddleware } from './middleware';

/**
 * Configuration helpers
 */
export { getTelemetryConfig } from './config';

/**
 * Types
 */
export type { TelemetryConfig } from './config';
```

#### tracer.ts

```typescript
/**
 * OpenTelemetry Tracer Setup
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, Tracer, SpanStatusCode } from '@opentelemetry/api';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import type { TelemetryConfig } from './config';

let sdk: NodeSDK | null = null;
let tracer: Tracer | null = null;

/**
 * Initialize the tracer provider
 */
export async function initializeTracer(config: TelemetryConfig): Promise<void> {
  // Create resource with service information
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  });

  // Create OTLP exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${config.otlpEndpoint}/v1/traces`,
    headers: {},
  });

  // Create SDK
  sdk = new NodeSDK({
    resource,
    spanProcessor: new BatchSpanProcessor(traceExporter),
    instrumentations: [
      // Auto-instrumentation will be added based on config
    ],
  });

  // Start SDK
  await sdk.start();

  // Get tracer
  tracer = trace.getTracer(config.serviceName, config.serviceVersion);
}

/**
 * Shutdown the tracer provider
 */
export async function shutdownTracer(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    tracer = null;
  }
}

/**
 * Get the tracer instance
 */
export function getTracer(): Tracer {
  if (!tracer) {
    // Return no-op tracer
    return trace.getTracer('noop');
  }
  return tracer;
}

/**
 * Helper to record span error
 */
export function recordSpanError(span: Span, error: Error): void {
  span.recordException(error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
}

// Import Span type
import { Span } from '@opentelemetry/api';
```

#### middleware.ts

```typescript
/**
 * OpenTelemetry Middleware for Elysia
 */

import { context, trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import type { Context, MiddlewareHandler } from 'elysia';
import { getTelemetryConfig } from './config';
import { getTracer } from './tracer';

/**
 * Elysia middleware for automatic request tracing
 */
export function telemetryMiddleware(): MiddlewareHandler {
  const config = getTelemetryConfig();

  // Return no-op middleware if disabled
  if (!config.enabled) {
    return async () => {};
  }

  const tracer = getTracer();

  return async (ctx: Context) => {
    const { request, path, method } = ctx;

    // Skip tracing for health and metrics endpoints
    if (path === '/health' || path === '/metrics' || path.startsWith('/health/')) {
      return;
    }

    // Create span
    const spanName = `${method} ${path}`;
    const span = tracer.startSpan(spanName, {
      kind: SpanKind.SERVER,
      attributes: {
        'http.method': method,
        'http.target': path,
        'http.scheme': 'http',
        'http.host': request.headers.get('host') || 'localhost',
        'http.flavor': '1.1',
      },
    });

    // Set span in context
    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        // Wait for response
        const result = await ctx.next();

        // Set response attributes
        span.setAttributes({
          'http.status_code': ctx.set.status || 200,
        });

        // Set OK status
        span.setStatus({ code: SpanStatusCode.OK });

        return result;
      } catch (error) {
        // Record error
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });

        throw error;
      } finally {
        span.end();
      }
    });
  };
}

/**
 * Helper to create child spans for database operations
 */
export function traceDatabaseOperation<T>(operation: string, table: string, fn: () => Promise<T>): Promise<T> {
  const config = getTelemetryConfig();

  if (!config.enabled || !config.traceDatabase) {
    return fn();
  }

  const tracer = getTracer();
  const span = tracer.startSpan(`db.${operation} ${table}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.operation': operation,
      'db.table': table,
      'db.system': 'postgresql',
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Helper to create child spans for Redis operations
 */
export function traceRedisOperation<T>(operation: string, key: string, fn: () => Promise<T>): Promise<T> {
  const config = getTelemetryConfig();

  if (!config.enabled || !config.traceRedis) {
    return fn();
  }

  const tracer = getTracer();
  const span = tracer.startSpan(`redis.${operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.operation': operation,
      'db.statement': operation,
      'db.system': 'redis',
      'net.peer.name': 'redis',
    },
  });

  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## 7. Environment Configuration

### 7.1 Environment Variables

Add to `.env.example`:

```bash
# ===========================================
# OBSERVABILITY CONFIGURATION (Optional)
# ===========================================

# Enable OpenTelemetry (default: false)
OTEL_ENABLED=false

# Service name for traces
OTEL_SERVICE_NAME=bun-elysia-api

# OTLP endpoint for traces and metrics
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Sample rate (1.0 = 100%, 0.1 = 10%)
OTEL_SAMPLE_RATE=1.0

# Feature flags for tracing
OTEL_TRACE_HTTP=true
OTEL_TRACE_DATABASE=false
OTEL_TRACE_REDIS=false

# ===========================================
# OBSERVABILITY STACK PORTS
# ===========================================

PROMETHEUS_PORT=9090
GRAFANA_PORT=3001
JAEGER_UI_PORT=16686
JAEGER_OTLP_GRPC_PORT=4317
JAEGER_OTLP_HTTP_PORT=4318

# ===========================================
# GRAFANA CONFIGURATION
# ===========================================

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
GRAFANA_LOG_LEVEL=info
```

### 7.2 Quick Start Commands

```bash
# Start without observability (default)
docker-compose -f docker/compose/docker-compose.dev.yaml up -d

# Start with observability stack
docker-compose -f docker/compose/docker-compose.dev.yaml -f docker/compose/docker-compose.observability.yaml up -d

# Or start observability separately
docker-compose -f docker/compose/docker-compose.observability.yaml up -d

# Enable OpenTelemetry in app
OTEL_ENABLED=true bun run dev

# View Grafana
open http://localhost:3001

# View Prometheus
open http://localhost:9090

# View Jaeger traces
open http://localhost:16686
```

---

## 8. Grafana Dashboards

### 8.1 API Overview Dashboard

The main dashboard includes:

**Row 1: Request Rate**

- Requests per second (5m window)
- Grouped by HTTP method

**Row 2: Latency**

- P50, P95, P99 latency
- Grouped by route

**Row 3: Error Rate**

- 5xx errors per second
- Error percentage by route

**Row 4: Traffic**

- Top 10 endpoints by request count
- Request distribution by status code

### 8.2 Key PromQL Queries

```promql
# Request rate (requests per second)
sum(rate(http_requests_total[5m])) by (method)

# P95 latency
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# Error rate (5xx)
sum(rate(http_requests_total{status_class="5xx"}[5m])) by (route)

# Active requests
http_requests_in_flight

# Availability (non-5xx percentage)
sum(rate(http_requests_total{status_class!="5xx"}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// tests/unit/core/telemetry/config.test.ts
import { describe, it, expect } from 'bun:test';
import { getTelemetryConfig } from '@/core/telemetry/config';

describe('TelemetryConfig', () => {
  it('should be disabled by default', () => {
    const config = getTelemetryConfig();
    expect(config.enabled).toBe(false);
  });

  it('should use default values', () => {
    const config = getTelemetryConfig();
    expect(config.serviceName).toBe('bun-elysia-api');
    expect(config.sampleRate).toBe(1.0);
  });
});
```

### 9.2 Integration Tests

```typescript
// tests/integration/observability.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';

describe('Observability Stack', () => {
  it('should work without observability enabled', async () => {
    // App should start and work fine
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(200);
  });

  it('should expose metrics endpoint', async () => {
    const response = await fetch('http://localhost:3000/metrics');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
  });
});
```

### 9.3 Performance Tests

Verify that:

- With OTEL_ENABLED=false: No measurable overhead
- With OTEL_ENABLED=true: < 5ms overhead per request
- Metrics endpoint: < 100ms response time

---

## 10. Usage Examples

### 10.1 Basic Setup (No Observability)

```bash
# Just run the app - observability is opt-in
bun run dev
```

### 10.2 With Observability Stack

```bash
# Terminal 1: Start app with OpenTelemetry
OTEL_ENABLED=true bun run dev

# Terminal 2: Start observability stack
docker-compose -f docker/compose/docker-compose.observability.yaml up -d

# Open Grafana
open http://localhost:3001

# Open Jaeger
open http://localhost:16686
```

### 10.3 Manual Tracing in Code

```typescript
import { getTracer } from '@/core/telemetry';
import { trace } from '@opentelemetry/api';

// Create a custom span
const tracer = getTracer();
const span = tracer.startSpan('custom-operation');

try {
  // Your operation
  await doSomething();
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
} finally {
  span.end();
}
```

### 10.4 Database Tracing Helper

```typescript
import { traceDatabaseOperation } from '@/core/telemetry';

// Wrap database operations
const user = await traceDatabaseOperation('select', 'users', async () => {
  return db.select().from(users).where(eq(users.id, userId));
});
```

---

## 11. Success Criteria

### 11.1 Functional Requirements

- [ ] Docker Compose observability stack starts successfully
- [ ] Prometheus scrapes metrics from `/metrics` endpoint
- [ ] Grafana displays pre-configured dashboards
- [ ] Jaeger receives traces when OTEL_ENABLED=true
- [ ] Application works normally when observability is disabled
- [ ] No errors when observability stack is not running

### 11.2 Performance Requirements

- [ ] Zero overhead when OTEL_ENABLED=false
- [ ] < 5ms overhead per request when OTEL_ENABLED=true
- [ ] Prometheus scrape completes in < 100ms
- [ ] Grafana dashboards load in < 2 seconds

### 11.3 Developer Experience Requirements

- [ ] Single command to start observability stack
- [ ] Clear documentation in README
- [ ] Environment variables documented in .env.example
- [ ] No breaking changes to existing functionality

### 11.4 Production Readiness

- [ ] Resource limits configured for all services
- [ ] Health checks for all services
- [ ] Data retention configured (15 days for Prometheus)
- [ ] Security best practices (non-root, minimal permissions)

---

## 12. Migration Guide

### 12.1 For Existing Users

1. **No changes required**: The project works exactly as before
2. **Opt-in**: Add observability when needed
3. **Gradual adoption**: Start with metrics, add tracing later

### 12.2 Upgrade Steps

```bash
# 1. Pull latest changes
git pull

# 2. Install new dependencies (if using OpenTelemetry)
bun install

# 3. (Optional) Start observability stack
docker-compose -f docker/compose/docker-compose.observability.yaml up -d

# 4. (Optional) Enable OpenTelemetry
OTEL_ENABLED=true bun run dev
```

---

## Appendix A: Troubleshooting

### Common Issues

**Prometheus can't scrape metrics**

- Check API is running and accessible
- Verify network connectivity
- Check Prometheus logs: `docker-compose -f docker/compose/docker-compose.observability.yaml logs prometheus`

**Traces not appearing in Jaeger**

- Verify OTEL_ENABLED=true
- Check OTLP endpoint is correct
- Verify Jaeger is running: `docker-compose -f docker/compose/docker-compose.observability.yaml logs jaeger`

**Grafana dashboards empty**

- Wait for data to accumulate (5+ minutes)
- Check Prometheus is receiving data
- Verify datasource configuration

---

## Appendix B: Learning Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)

---

## Document Metadata

- **Author**: Development Team
- **Last Updated**: 2026-04-01
- **Version**: 1.0.0
- **Status**: Design
- **Review Date**: 2026-04-15
