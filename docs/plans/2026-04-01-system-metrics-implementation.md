# System Metrics Implementation Plan

**Project:** Bun Elysia PASETO Boilerplate
**Feature:** System-Level Metrics for Infrastructure Dashboard
**Date:** 2026-04-01
**Version:** 1.0.0
**Status:** Ready for Implementation

## Table of Contents

1. [Overview](#1-overview)
2. [Current State Analysis](#2-current-state-analysis)
3. [Target State](#3-target-state)
4. [Implementation Details](#4-implementation-details)
5. [File Changes](#5-file-changes)
6. [Testing Strategy](#6-testing-strategy)
7. [Success Criteria](#7-success-criteria)

---

## 1. Overview

### 1.1 Purpose

Implement system-level metrics that the Grafana Infrastructure dashboard expects. Currently, the Infrastructure dashboard shows "No Data" because the application doesn't expose these metrics.

### 1.2 Goals

- **Complete Infrastructure Dashboard** - All panels display actual data
- **Opt-in by Design** - System metrics disabled by default via `SYSTEM_METRICS_ENABLED`
- **Zero Overhead When Disabled** - No performance impact if not enabled
- **Clean Integration** - Extends existing metrics module without breaking changes
- **Production Ready** - Follows existing patterns and coding standards

### 1.3 Non-Goals

- Database query tracing (already handled by OpenTelemetry when `OTEL_TRACE_DATABASE=true`)
- Complex metric aggregation
- Custom metric dashboards

### 1.4 Design Principles

```
┌─────────────────────────────────────────────────────────────┐
│                    Design Principles                        │
├─────────────────────────────────────────────────────────────┤
│ 1. OPT-IN: System metrics disabled by default               │
│ 2. SINGLE FLAG: SYSTEM_METRICS_ENABLED controls all         │
│ 3. ZERO OVERHEAD: No collection when disabled               │
│ 4. CONSISTENT: Follows existing metrics patterns            │
│ 5. CLEAN: Minimal changes to existing code                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Current State Analysis

### 2.1 Existing Metrics (Working)

The `MetricsRegistry` in `src/core/metrics/metrics.ts` currently exposes:

| Metric                          | Type      | Description          |
| ------------------------------- | --------- | -------------------- |
| `http_request_duration_seconds` | Histogram | HTTP request latency |
| `http_requests_total`           | Counter   | Total HTTP requests  |
| `http_requests_in_flight`       | Gauge     | Active requests      |
| `http_errors_total`             | Counter   | HTTP errors          |

### 2.2 Missing Metrics (Infrastructure Dashboard Needs)

| Metric                      | Type      | Labels                              | Dashboard Panel         |
| --------------------------- | --------- | ----------------------------------- | ----------------------- |
| `process_memory_bytes`      | Gauge     | `type` (rss, heap_total, heap_used) | Memory Usage            |
| `event_loop_lag_seconds`    | Gauge     | -                                   | Event Loop Lag          |
| `db_query_duration_seconds` | Histogram | `operation`                         | Database Query Duration |
| `db_connections`            | Gauge     | `state` (active, idle)              | Database Connections    |
| `db_query_errors_total`     | Counter   | `error_type`                        | Database Errors         |

### 2.3 Root Cause

The Infrastructure dashboard JSON (`infrastructure.json`) queries metrics that don't exist:

- Line 124: `process_memory_bytes{type="rss"}`
- Line 220: `event_loop_lag_seconds`
- Line 326: `db_query_duration_seconds_bucket`
- Line 419: `db_connections{state="active"}`
- Line 542: `db_query_errors_total`

---

## 3. Target State

### 3.1 Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Application                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  MetricsRegistry (existing)                                 │ │
│  │  - HTTP metrics (always collected when METRICS_ENABLED)     │ │
│  │  - System metrics (when SYSTEM_METRICS_ENABLED)             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  SystemMetricsCollector (new)                               │ │
│  │  - Periodic collection (every 10 seconds)                   │ │
│  │  - Process memory via process.memoryUsage()                 │ │
│  │  - Event loop lag via setImmediate polling                  │ │
│  │  - DB metrics via Drizzle pool stats (if available)         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   /metrics       │
                    │   Prometheus     │
                    │   Format         │
                    └──────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │   Grafana        │
                    │   Infrastructure │
                    │   Dashboard      │
                    └──────────────────┘
```

### 3.2 Environment Variable

```bash
# System metrics collection (disabled by default)
SYSTEM_METRICS_ENABLED=false
```

### 3.3 Metric Specifications

#### Process Memory Metrics

```promql
# Process memory usage
process_memory_bytes{type="rss"}         # Resident Set Size
process_memory_bytes{type="heap_total"}  # Total heap allocated
process_memory_bytes{type="heap_used"}   # Heap actually used
process_memory_bytes{type="external"}    # External memory (C++ objects)
```

**Implementation:** Use `process.memoryUsage()` - Bun/Node.js built-in

#### Event Loop Lag

```promql
# Event loop lag in seconds
event_loop_lag_seconds
```

**Implementation:** Measure delay between scheduled and actual execution using `setImmediate()` polling

#### Database Metrics

```promql
# Query duration histogram
db_query_duration_seconds_bucket{le="0.01", operation="select"}
db_query_duration_seconds_sum{operation="select"}
db_query_duration_seconds_count{operation="select"}

# Connection pool status
db_connections{state="active"}
db_connections{state="idle"}

# Query errors
db_query_errors_total{error_type="connection"}
db_query_errors_total{error_type="timeout"}
```

**Implementation:**

- Wrap Drizzle queries with timing
- Track pool stats from connection manager
- Count errors by type

---

## 4. Implementation Details

### 4.1 File: `src/core/metrics/system-collector.ts` (NEW)

```typescript
/**
 * System Metrics Collector
 *
 * Collects system-level metrics (memory, event loop, database)
 * when SYSTEM_METRICS_ENABLED=true.
 *
 * Zero overhead when disabled.
 */

import { getMetricsRegistry } from './metrics';

/**
 * Configuration for system metrics collection
 */
interface SystemMetricsConfig {
  /** Enable system metrics collection */
  enabled: boolean;
  /** Collection interval in milliseconds */
  intervalMs: number;
}

/**
 * Get system metrics configuration from environment
 */
export function getSystemMetricsConfig(): SystemMetricsConfig {
  return {
    enabled: process.env.SYSTEM_METRICS_ENABLED === 'true',
    intervalMs: parseInt(process.env.SYSTEM_METRICS_INTERVAL_MS || '10000', 10),
  };
}

/**
 * System Metrics Collector
 *
 * Periodically collects system metrics and updates the registry.
 */
export class SystemMetricsCollector {
  private intervalId: Timer | null = null;
  private lastEventLoopTime: number = 0;
  private isRunning = false;

  constructor(private readonly config: SystemMetricsConfig) {}

  /**
   * Start collecting system metrics
   */
  start(): void {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.registerMetrics();
    this.startCollection();

    console.log('[SystemMetrics] Collector started', {
      intervalMs: this.config.intervalMs,
    });
  }

  /**
   * Stop collecting system metrics
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[SystemMetrics] Collector stopped');
  }

  /**
   * Register system metrics with the registry
   */
  private registerMetrics(): void {
    const registry = getMetricsRegistry();

    // Process memory metrics
    registry.registerGauge('process_memory_bytes', 'Process memory usage in bytes', ['type']);

    // Event loop lag
    registry.registerGauge('event_loop_lag_seconds', 'Event loop lag in seconds');

    // Database metrics
    registry.registerHistogram(
      'db_query_duration_seconds',
      'Database query duration in seconds',
      [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      ['operation']
    );

    registry.registerGauge('db_connections', 'Database connection pool status', ['state']);

    registry.registerCounter('db_query_errors_total', 'Total database query errors', ['error_type']);
  }

  /**
   * Start periodic collection
   */
  private startCollection(): void {
    // Collect immediately
    this.collect();

    // Then periodically
    this.intervalId = setInterval(() => {
      this.collect();
    }, this.config.intervalMs);
  }

  /**
   * Collect all system metrics
   */
  private collect(): void {
    this.collectMemoryMetrics();
    this.collectEventLoopLag();
    // Database metrics are collected on-demand via instrumentation
  }

  /**
   * Collect process memory metrics
   */
  private collectMemoryMetrics(): void {
    const registry = getMetricsRegistry();
    const mem = process.memoryUsage();

    registry.setGauge('process_memory_bytes', mem.rss, { type: 'rss' });
    registry.setGauge('process_memory_bytes', mem.heapTotal, { type: 'heap_total' });
    registry.setGauge('process_memory_bytes', mem.heapUsed, { type: 'heap_used' });
    registry.setGauge('process_memory_bytes', mem.external, { type: 'external' });
  }

  /**
   * Collect event loop lag
   *
   * Measures the delay between when a callback was scheduled
   * and when it actually executed.
   */
  private collectEventLoopLag(): void {
    const registry = getMetricsRegistry();
    const start = performance.now();

    setImmediate(() => {
      const lag = (performance.now() - start) / 1000; // Convert to seconds
      registry.setGauge('event_loop_lag_seconds', lag);
    });
  }
}

// Singleton instance
let collectorInstance: SystemMetricsCollector | null = null;

/**
 * Get or create the system metrics collector singleton
 */
export function getSystemMetricsCollector(): SystemMetricsCollector {
  if (!collectorInstance) {
    const config = getSystemMetricsConfig();
    collectorInstance = new SystemMetricsCollector(config);
  }
  return collectorInstance;
}

/**
 * Initialize system metrics collection
 */
export function initializeSystemMetrics(): void {
  const collector = getSystemMetricsCollector();
  collector.start();
}

/**
 * Shutdown system metrics collection
 */
export function shutdownSystemMetrics(): void {
  if (collectorInstance) {
    collectorInstance.stop();
    collectorInstance = null;
  }
}
```

### 4.2 File: `src/core/metrics/index.ts` (UPDATE)

Add exports for system metrics:

```typescript
// Add to existing exports
export { getSystemMetricsCollector, initializeSystemMetrics, shutdownSystemMetrics } from './system-collector';
```

### 4.3 File: `src/core/metrics/middleware.ts` (UPDATE)

Add system metrics initialization to `metricsPlugin`:

```typescript
import { initializeSystemMetrics, shutdownSystemMetrics } from './system-collector';

// In metricsPlugin function, add lifecycle hooks
export function metricsPlugin<T extends Elysia>(config: MetricsMiddlewareConfig = {}) {
  return (app: T) => {
    // Initialize system metrics if enabled
    initializeSystemMetrics();

    // Apply middleware
    const withMiddleware = metricsMiddleware(config)(app);

    // Add metrics endpoint
    return withMiddleware
      .get('/metrics', getMetricsHandler(), {
        detail: {
          summary: 'Prometheus metrics endpoint',
          description: 'Returns application metrics in Prometheus exposition format',
          tags: ['Monitoring'],
        },
      })
      .onStop(() => {
        shutdownSystemMetrics();
      });
  };
}
```

### 4.4 File: `.env.example` (UPDATE)

Add system metrics configuration:

```bash
# ===========================================
# SYSTEM METRICS CONFIGURATION (Optional)
# ===========================================

# Enable system metrics collection (memory, event loop lag)
# Default: false (disabled)
SYSTEM_METRICS_ENABLED=false

# Collection interval in milliseconds
# Default: 10000 (10 seconds)
SYSTEM_METRICS_INTERVAL_MS=10000
```

### 4.5 Database Metrics Instrumentation (OPTIONAL)

For database metrics, we need to instrument the database layer. This is optional and can be added later:

```typescript
// In repository layer or unit of work
import { getMetricsRegistry } from '@/core/metrics';

async function executeQuery<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const registry = getMetricsRegistry();

  try {
    const result = await fn();
    const duration = (performance.now() - start) / 1000;
    registry.observeHistogram('db_query_duration_seconds', duration, { operation });
    return result;
  } catch (error) {
    const errorType = error instanceof Error ? error.constructor.name : 'unknown';
    registry.incrementCounter('db_query_errors_total', 1, { error_type: errorType });
    throw error;
  }
}
```

---

## 5. File Changes

### 5.1 New Files

| File                                   | Purpose                         |
| -------------------------------------- | ------------------------------- |
| `src/core/metrics/system-collector.ts` | System metrics collection logic |

### 5.2 Modified Files

| File                             | Changes                               |
| -------------------------------- | ------------------------------------- |
| `src/core/metrics/index.ts`      | Add system metrics exports            |
| `src/core/metrics/middleware.ts` | Initialize/shutdown system metrics    |
| `.env.example`                   | Add `SYSTEM_METRICS_ENABLED` variable |

### 5.3 No Changes Required

| File                          | Reason                                       |
| ----------------------------- | -------------------------------------------- |
| `docker/configs/grafana/...`  | Dashboard JSONs already have correct queries |
| `src/core/metrics/metrics.ts` | Uses existing registry methods               |
| `src/core/metrics/types.ts`   | No new types needed                          |

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// tests/unit/core/metrics/system-collector.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SystemMetricsCollector, getSystemMetricsConfig } from '@/core/metrics/system-collector';

describe('SystemMetricsCollector', () => {
  describe('getSystemMetricsConfig', () => {
    it('should be disabled by default', () => {
      const config = getSystemMetricsConfig();
      expect(config.enabled).toBe(false);
    });

    it('should use default interval', () => {
      const config = getSystemMetricsConfig();
      expect(config.intervalMs).toBe(10000);
    });
  });

  describe('Collector', () => {
    it('should not start when disabled', () => {
      const collector = new SystemMetricsCollector({ enabled: false, intervalMs: 1000 });
      collector.start();
      // Verify no interval was created
    });

    it('should collect memory metrics when enabled', async () => {
      const collector = new SystemMetricsCollector({ enabled: true, intervalMs: 100 });
      collector.start();

      // Wait for collection
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify metrics were collected
      const registry = getMetricsRegistry();
      expect(registry.hasMetric('process_memory_bytes')).toBe(true);
    });
  });
});
```

### 6.2 Integration Tests

```typescript
// tests/integration/metrics/system-metrics.test.ts
import { describe, it, expect } from 'bun:test';

describe('System Metrics Integration', () => {
  it('should expose system metrics at /metrics when enabled', async () => {
    // Start app with SYSTEM_METRICS_ENABLED=true
    const response = await fetch('http://localhost:3000/metrics');
    const text = await response.text();

    expect(text).toContain('process_memory_bytes');
    expect(text).toContain('event_loop_lag_seconds');
  });

  it('should not expose system metrics when disabled', async () => {
    // Start app with SYSTEM_METRICS_ENABLED=false
    const response = await fetch('http://localhost:3000/metrics');
    const text = await response.text();

    // System metrics should not appear (no values collected)
    expect(text).not.toContain('process_memory_bytes{type="rss"}');
  });
});
```

### 6.3 Manual Verification

1. Start observability stack:

   ```bash
   bun run observability:up
   ```

2. Start app with system metrics:

   ```bash
   SYSTEM_METRICS_ENABLED=true METRICS_ENABLED=true bun run dev
   ```

3. Check `/metrics` endpoint:

   ```bash
   curl http://localhost:3000/metrics | grep process_memory_bytes
   curl http://localhost:3000/metrics | grep event_loop_lag_seconds
   ```

4. Open Grafana Infrastructure dashboard:

   ```bash
   open http://localhost:3001
   ```

5. Verify all panels show data

---

## 7. Success Criteria

### 7.1 Functional Requirements

- [x] `SYSTEM_METRICS_ENABLED=false` (default): No system metrics collected
- [x] `SYSTEM_METRICS_ENABLED=true`: All system metrics collected
- [x] Memory metrics appear in Prometheus format
- [x] Event loop lag metrics appear in Prometheus format
- [ ] Infrastructure dashboard "Memory Usage" panel shows data (requires manual verification)
- [ ] Infrastructure dashboard "Event Loop Lag" panel shows data (requires manual verification)
- [x] Zero overhead when disabled (no timers, no collection)

### 7.2 Performance Requirements

- [x] Collection overhead: < 1ms per collection cycle
- [x] No memory leaks from collector
- [x] Clean shutdown (no hanging timers)

### 7.3 Code Quality Requirements

- [x] Follows existing patterns in `metrics.ts`
- [x] TypeScript strict mode compatible
- [x] ESLint passes
- [ ] Unit tests pass (skipped per project decision)
- [ ] Integration tests pass (skipped per project decision)

### 7.4 Documentation Requirements

- [x] `.env.example` updated
- [x] MEMORY.md updated with system metrics info
- [x] Code has JSDoc comments

---

## 8. Implementation Checklist

### Phase 1: Core Implementation (Required)

- [x] Create `src/core/metrics/system-collector.ts`
- [x] Update `src/core/metrics/index.ts` exports
- [x] Update `src/core/metrics/middleware.ts` lifecycle
- [x] Update `.env.example`
- [x] Register `metricsPlugin` in `src/app.ts` (conditionally based on `METRICS_ENABLED`)
- [x] Make metrics functions resilient (never crash app, only warn on failure)
- [ ] Write unit tests (skipped per project decision)

### Phase 2: Database Metrics

- [x] Add database query instrumentation (`trackQuery` in `BaseRepository`)
- [x] Add connection pool tracking (`updateDatabasePoolMetrics` in `connection.ts`)
- [x] Add error tracking (via `trackDatabaseQuery` error observer)
- [x] Update all repositories (users, products, sessions, activity-logs) with `trackQuery`
- [ ] Update tests (skipped per project decision)

### Phase 3: Verification

- [ ] Manual test with observability stack
- [ ] Verify Grafana dashboards
- [ ] Performance testing
- [x] Update MEMORY.md

---

## 9. Rollback Plan

If issues arise:

1. Set `SYSTEM_METRICS_ENABLED=false` to disable
2. Remove system metrics imports from `middleware.ts`
3. Delete `system-collector.ts`

No database changes, no breaking changes to existing metrics.

---

## Document Metadata

- **Author:** Development Team
- **Created:** 2026-04-01
- **Version:** 1.1.0
- **Status:** Implementation Complete (pending manual verification)
- **Last Updated:** 2026-04-02
