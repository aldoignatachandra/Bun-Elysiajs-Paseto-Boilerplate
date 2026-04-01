# Observability Quickstart Guide

This guide explains how to set up and use the observability stack (Prometheus, Grafana, Jaeger) with OpenTelemetry tracing.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Environment Variables](#environment-variables)
- [Verifying Services](#verifying-services)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Docker and Docker Compose installed
- Bun runtime installed
- Environment variables configured (copy from `.env.example`)

---

## Quick Start

```bash
# 1. Start the observability stack (Prometheus, Grafana, Jaeger)
bun run observability:up

# 2. Start the API with BOTH metrics AND tracing enabled
METRICS_ENABLED=true OTEL_ENABLED=true bun run dev

# 3. Access the services:
# - API:            http://localhost:3000
# - Grafana:        http://localhost:3001  (admin/admin)
# - Prometheus:     http://localhost:9090
# - Jaeger UI:      http://localhost:16686
```

> **Important:** You need BOTH `METRICS_ENABLED=true` (for Prometheus/Grafana dashboards) AND `OTEL_ENABLED=true` (for Jaeger distributed tracing). These are separate features.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Your Application                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  API (Port 3000)                                            │ │
│  │  - /metrics → Prometheus format                             │ │
│  │  - OpenTelemetry SDK → OTLP traces                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│      Prometheus         │     │        Jaeger           │
│      (Port 9090)        │     │    (OTLP Port 4318)     │
│                         │     │    (UI Port 16686)      │
│  - Pulls /metrics       │     │  - Receives traces      │
│    every 10s            │     │    via OTLP             │
│  - Stores time series   │     │  - Displays traces      │
└───────────┬─────────────┘     └─────────────────────────┘
            │                                │
            │                                │
            │                                ▼
            │                   ┌─────────────────────────┐
            │                   │        Grafana          │
            │                   │      (Port 3001)        │
            │                   │                         │
            │                   │  - Queries Prometheus   │
            │                   │  - Displays dashboards  │
            │                   └─────────────────────────┘
            └────────────────────────────────┘
```

---

## Environment Variables

| Variable                      | Purpose                      | Default                       |
| ----------------------------- | ---------------------------- | ----------------------------- |
| `METRICS_ENABLED`             | Expose `/metrics` endpoint   | `true` (dev) / `false` (prod) |
| `OTEL_ENABLED`                | Enable OpenTelemetry tracing | `false`                       |
| `OTEL_SERVICE_NAME`           | Service name in traces       | `bun-elysia-api`              |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Jaeger OTLP endpoint         | `http://localhost:4318`       |
| `OTEL_TRACE_HTTP`             | Trace HTTP requests          | `true`                        |
| `OTEL_TRACE_DATABASE`         | Trace database queries       | `false`                       |
| `OTEL_TRACE_REDIS`            | Trace Redis operations       | `false`                       |
| `OTEL_SAMPLE_RATE`            | Sample rate (1.0 = 100%)     | `1.0`                         |

---

## Verifying Services

### 1. Check Prometheus (Metrics)

**URL:** http://localhost:9090

**Steps to verify:**

1. Open http://localhost:9090 in your browser
2. Go to **Status → Targets**
3. You should see `bun-elysia-api` target with status **UP**

**Test a query:**

```
# In the query box, type:
up{job="bun-elysia-api"}

# Or check HTTP requests:
rate(http_requests_total[5m])
```

**Health check via CLI:**

```bash
curl http://localhost:9090/-/healthy
# Should return: Prometheus is Healthy.
```

### 2. Check Grafana (Dashboards)

**URL:** http://localhost:3001

**Default credentials:**

- Username: `admin`
- Password: `admin`

**Steps to verify:**

1. Open http://localhost:3001 in your browser
2. Login with admin/admin
3. Go to **Dashboards**
4. You should see pre-configured dashboards:
   - **API Overview** - Request rates, latencies, errors
   - **Infrastructure** - System resources

**Verify datasource:**

1. Go to **Configuration → Data Sources**
2. Click on **Prometheus**
3. Click **Test** - should show "Data source is working"

### 3. Check Jaeger (Traces)

**URL:** http://localhost:16686

**Steps to verify:**

1. Open http://localhost:16686 in your browser
2. In the **Service** dropdown, you should see `bun-elysia-api`
3. If you don't see it yet:
   - Make some API requests first
   - Wait a few seconds for traces to be exported
   - Click **Refresh** in the service dropdown

**View traces:**

1. Select `bun-elysia-api` from the Service dropdown
2. Click **Find Traces**
3. You should see traces for your API requests
4. Click on a trace to see the detailed span breakdown

**Health check via CLI:**

```bash
# Check Jaeger is running
curl http://localhost:16686/api/services
# Should return JSON with service names
```

### 4. Quick Health Check Commands

```bash
# Check API is running
curl http://localhost:3000/health

# Check metrics endpoint (should return Prometheus-formatted data)
curl http://localhost:3000/metrics

# Check Prometheus is healthy
curl http://localhost:9090/-/healthy

# Check Jaeger is running
curl http://localhost:16686/api/services
```

---

## Service URLs Summary

| Service    | URL                    | Username | Password |
| ---------- | ---------------------- | -------- | -------- |
| API        | http://localhost:3000  | -        | -        |
| Prometheus | http://localhost:9090  | -        | -        |
| Grafana    | http://localhost:3001  | admin    | admin    |
| Jaeger UI  | http://localhost:16686 | -        | -        |

---

## Troubleshooting

### Prometheus shows target as DOWN

**Cause:** API is not running or not accessible.

**Solution:**

```bash
# Check if API is running
curl http://localhost:3000/health

# Check if metrics endpoint works
curl http://localhost:3000/metrics
```

### Jaeger doesn't show my service

**Cause:** OpenTelemetry is not enabled or traces aren't being sent.

**Solution:**

```bash
# Make sure OTEL_ENABLED=true
OTEL_ENABLED=true bun run dev

# Check for initialization log
# Should see: [Telemetry] OpenTelemetry initialized successfully

# Generate some traffic
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/...
```

### Grafana dashboards show "No Data"

**Cause:** No metrics data yet, Prometheus isn't scraping, or time range is wrong.

**Solution:**

1. **Make sure metrics are enabled:** `METRICS_ENABLED=true`
2. **Verify the `/metrics` endpoint returns data:**
   ```bash
   curl http://localhost:3000/metrics
   # Should return Prometheus-formatted metrics like:
   # HELP http_requests_total Total HTTP requests
   # TYPE http_requests_total counter
   http_requests_total{method="GET",route="/health",status="2xx"} 1
   ```
3. **Check Prometheus targets are UP:** Go to http://localhost:9090 → Status → Targets
4. **Check the time range** in Grafana (top-right corner) - set to "Last 5 minutes"
5. **Wait for data:** Prometheus scrapes every 10 seconds, so wait at least 30 seconds
6. **Generate traffic:** Make some API requests after starting everything

### Port conflicts

If you get port conflicts, change the ports in `.env`:

```bash
# In .env file
PROMETHEUS_PORT=9091
GRAFANA_PORT=3002
JAEGER_UI_PORT=16687
JAEGER_OTLP_HTTP_PORT=4319
```

### Container won't start

```bash
# Check logs
bun run observability:logs

# Or specific service
docker compose -f docker/compose/docker-compose.observability.yaml logs prometheus
docker compose -f docker/compose/docker-compose.observability.yaml logs grafana
docker compose -f docker/compose/docker-compose.observability.yaml logs jaeger
```

---

## Disabling Observability

To run without any observability overhead:

```bash
# Just run the API normally (OTEL_ENABLED defaults to false)
bun run dev

# Or explicitly disable
OTEL_ENABLED=false bun run dev
```

This application works perfectly without the observability stack. Zero overhead when disabled.

---

## Next Steps

- Explore the pre-built Grafana dashboards
- Create custom dashboards for your specific metrics
- Set up alerting rules in Prometheus
- Integrate traceDatabaseOperation() in your repositories
- Add custom spans for business-critical operations

For more details, see the full design document:
`docs/plans/2026-04-01-observability-stack-design.md`
