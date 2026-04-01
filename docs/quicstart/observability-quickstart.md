# Observability Quickstart Guide

This guide explains how to set up and use the observability stack (Prometheus, Grafana, Jaeger) with OpenTelemetry tracing.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Step-by-Step Setup](#step-by-step-setup)
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

# 2. Start the API with OpenTelemetry enabled
OTEL_ENABLED=true bun run dev

# 3. Access the services:
# - API:            http://localhost:3000
# - Grafana:        http://localhost:3001
# - Prometheus:     http://localhost:9090
# - Jaeger UI:      http://localhost:16686
```

---

## Step-by-Step Setup

### Step 1: Start the Observability Stack

The observability stack runs separately from your application. Start it first:

```bash
# Start Prometheus, Grafana, and Jaeger
bun run observability:up

# Or using docker-compose directly:
docker-compose -f docker/compose/docker-compose.observability.yaml up -d
```

**What this starts:**
| Service | Port | Purpose |
|---------|------|---------|
| Prometheus | 9090 | Metrics collection and storage |
| Grafana | 3001 | Visualization and dashboards |
| Jaeger | 16686 | Distributed tracing UI |
| Jaeger OTLP | 4318 | OpenTelemetry trace receiver |

### Step 2: Start the API with OpenTelemetry

Enable OpenTelemetry in your application:

```bash
# Enable OpenTelemetry and start the dev server
OTEL_ENABLED=true bun run dev
```

**Environment Variables:**

```bash
# Required
OTEL_ENABLED=true                    # Enable OpenTelemetry

# Optional (defaults shown)
OTEL_SERVICE_NAME=bun-elysia-api     # Service name in traces
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318  # Jaeger OTLP endpoint
OTEL_TRACE_HTTP=true                 # Trace HTTP requests
OTEL_TRACE_DATABASE=false            # Trace database queries
OTEL_TRACE_REDIS=false               # Trace Redis operations
OTEL_SAMPLE_RATE=1.0                 # Sample rate (1.0 = 100%)
```

### Step 3: Generate Some Traffic

Make some API requests to generate traces and metrics:

```bash
# Health check
curl http://localhost:3000/health

# API endpoints (requires authentication for most)
curl http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","name":"Test User"}'

# Check metrics endpoint
curl http://localhost:3000/metrics
```

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

### 4. Check OpenTelemetry Connection

**Verify traces are being sent:**

```bash
# Start the app with OTEL_ENABLED=true
OTEL_ENABLED=true bun run dev

# You should see this log message:
# [Telemetry] OpenTelemetry initialized successfully
```

**Make a request and check Jaeger:**

```bash
# Make a request
curl http://localhost:3000/health

# Check Jaeger for the trace
curl http://localhost:16686/api/traces?service=bun-elysia-api
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

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  API (Port 3000)                                            │ │
│  │  - /metrics → Prometheus format                             │ │
│  │  - OpenTelemetry SDK → OTLP traces                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
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
            │
            ▼
┌─────────────────────────┐
│        Grafana          │
│      (Port 3001)        │
│                         │
│  - Queries Prometheus   │
│  - Displays dashboards  │
└─────────────────────────┘
```

---

## Common Commands

```bash
# Start observability stack
bun run observability:up

# View observability logs
bun run observability:logs

# Stop observability stack
bun run observability:down

# Start API with tracing
OTEL_ENABLED=true bun run dev

# Start API without tracing (default)
bun run dev

# Start everything together (separate terminals)
# Terminal 1:
bun run observability:up

# Terminal 2:
OTEL_ENABLED=true bun run dev
```

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

### Grafana dashboards are empty

**Cause:** No data yet or Prometheus isn't scraping.

**Solution:**

1. Wait 1-2 minutes for data to accumulate
2. Generate some API traffic
3. Check Prometheus targets are UP
4. Verify time range in Grafana (top-right corner)

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
docker-compose -f docker/compose/docker-compose.observability.yaml logs prometheus
docker-compose -f docker/compose/docker-compose.observability.yaml logs grafana
docker-compose -f docker/compose/docker-compose.observability.yaml logs jaeger
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

The application works perfectly without the observability stack. Zero overhead when disabled.

---

## Next Steps

- Explore the pre-built Grafana dashboards
- Create custom dashboards for your specific metrics
- Set up alerting rules in Prometheus
- Integrate traceDatabaseOperation() in your repositories
- Add custom spans for business-critical operations

For more details, see the full design document:
`docs/plans/2026-04-01-observability-stack-design.md`
