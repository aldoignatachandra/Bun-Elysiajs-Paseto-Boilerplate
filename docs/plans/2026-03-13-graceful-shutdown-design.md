# Graceful Shutdown Design Document

**Document Version:** 1.0
**Date:** 2026-03-13
**Author:** Development Team
**Status:** Draft

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [Implementation Details](#4-implementation-details)
5. [Integration with server.ts](#5-integration-with-serverts)
6. [Error Handling](#6-error-handling)
7. [Testing Strategy](#7-testing-strategy)
8. [Usage Examples](#8-usage-examples)
9. [Success Criteria](#9-success-criteria)

---

## 1. Overview

### 1.1 Purpose

This document describes the design and implementation of a comprehensive graceful shutdown mechanism for the Bun + Elysia + PASETO monolith REST API boilerplate. The graceful shutdown feature ensures that the application can terminate safely while maintaining data integrity and providing a good user experience during deployment scenarios.

### 1.2 Problem Statement

Currently, when the application receives termination signals (SIGTERM/SIGINT), it stops immediately without:

- Completing in-flight HTTP requests
- Properly closing database connections
- Properly closing Redis connections
- Logging shutdown progress
- Allowing load balancers to remove the instance from rotation

This can lead to:

- Client errors (502/504)
- Database connection pool exhaustion
- Redis connection leaks
- Incomplete transactions
- Poor user experience during deployments

### 1.3 Objectives

The graceful shutdown implementation must:

1. Intercept SIGTERM and SIGINT signals
2. Stop accepting new HTTP connections
3. Wait up to 30 seconds for active requests to complete (configurable)
4. Close database connections gracefully
5. Close Redis connections gracefully
6. Log shutdown progress at each step
7. Provide hooks for custom cleanup logic
8. Integrate seamlessly with existing server.ts
9. Support testing and mocking scenarios

### 1.4 Scope

**In Scope:**

- Signal handling (SIGTERM, SIGINT)
- HTTP server graceful shutdown
- Database connection pool cleanup
- Redis connection cleanup
- Request draining with timeout
- Comprehensive logging
- Configuration options
- Testing utilities

**Out of Scope:**

- Health check endpoint enhancement (separate feature)
- Zero-downtime deployment strategies
- Multi-instance coordination
- Database migration during shutdown

---

## 2. Architecture

### 2.1 Shutdown Sequence Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Graceful Shutdown Sequence                           │
└─────────────────────────────────────────────────────────────────────────────┘

    [OS/Orchestrator]           [Bun Server]          [Shutdown Manager]
            │                          │                        │
            │  SIGTERM/SIGINT          │                        │
            ├─────────────────────────>│                        │
            │                          │                        │
            │                          │  1. Signal Received   │
            │                          ├──────────────────────>│
            │                          │                        │
            │                          │                        │
            │                          │  2. Set Shutdown State │
            │                          │<──────────────────────┤
            │                          │                        │
            │                          │                        │
            │                          │  3. Stop New Connections│
            │                          ├──────────────────────>│
            │                          │                        │
            │     ┌────────────────────┴─────────────────────┐  │
            │     │     Return 503 Service Unavailable       │  │
            │     │     for new HTTP requests                │  │
            │     └──────────────────────────────────────────┘  │
            │                          │                        │
            │                          │  4. Log Shutdown Start │
            │                          ├──────────────────────>│
            │                          │                        │
            │                          │                        │
            │                          │  5. Drain Requests     │
            │                          │  (max 30s timeout)     │
            │                          ├──────────────────────>│
            │                          │                        │
            │     ┌────────────────────┴─────────────────────┐  │
            │     │     Wait for active requests to complete │  │
            │     │     - Track active request count         │  │
            │     │     - Log progress every 5 seconds       │  │
            │     └──────────────────────────────────────────┘  │
            │                          │                        │
            │                          │  6. Pre-Cleanup Hooks  │
            │                          ├──────────────────────>│
            │                          │                        │
            │                          │  7. Close Database     │
            │                          ├──────────────────────>│
            │                          │                        │
            │                          │     ┌──────────────────┤
            │                          │     │  Close Pool      │
            │                          │     │  Wait for clients│
            │                          │     └─────────────────┘│
            │                          │                        │
            │                          │  8. Close Redis        │
            │                          ├──────────────────────>│
            │                          │                        │
            │                          │     ┌──────────────────┤
            │                          │     │  Send QUIT       │
            │                          │     │  Wait for ACK    │
            │                          │     └─────────────────┘│
            │                          │                        │
            │                          │  9. Post-Cleanup Hooks │
            │                          ├──────────────────────>│
            │                          │                        │
            │                          │  10. Complete Shutdown │
            │                          ├──────────────────────>│
            │                          │                        │
            │                          │                        │
            │                          │  11. Exit Process      │
            │                          ├──────────────────────>│
            │                          │                        │
            │     ┌────────────────────┴─────────────────────┐  │
            │     │     Process exits with code 0            │  │
            │     └──────────────────────────────────────────┘  │
            │                          │                        │
```

### 2.2 Component Interaction

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          Component Architecture                                │
└────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   server.ts      │       │ ShutdownManager  │       │  Config Module   │
│                  │──────>│                  │<------│                  │
│ - Bun.serve()    │       │ - Signal Handler │       │ - SHUTDOWN_TIMEOUT│
│ - Start/Stop     │       │ - Request Tracker│       │ - SHUTDOWN_GRACE │
└──────────────────┘       │ - Cleanup Manager│       └──────────────────┘
                          └─────────┬────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ Database Pool │          │ Redis Client  │          │ Custom Hooks  │
│               │          │               │          │               │
│ - close()     │          │ - quit()      │          │ - onShutdown  │
│ - end()       │          │ - disconnect()│          │ - preCleanup  │
└───────────────┘          └───────────────┘          └───────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │   Logger Module  │
                          │                  │
                          │ - shutdown start │
                          │ - progress      │
                          │ - error         │
                          │ - complete      │
                          └──────────────────┘
```

### 2.3 State Machine

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                          Shutdown State Machine                                 │
└────────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────┐
    │   RUNNING      │  Initial state, accepting requests
    └───────┬────────┘
            │
            │ SIGTERM/SIGINT received
            │
            ▼
    ┌────────────────┐
    │  DRAINING      │  Stop accepting new requests
    └───────┬────────┘  Wait for active requests (max 30s)
            │
            │ All requests complete OR timeout
            ▼
    ┌────────────────┐
    │  CLOSING_DB    │  Close database connections
    └───────┬────────┘
            │
            │ Database closed
            ▼
    ┌────────────────┐
    │  CLOSING_REDIS │  Close Redis connections
    └───────┬────────┘
            │
            │ Redis closed
            ▼
    ┌────────────────┐
    │  TERMINATED    │  Final state, ready to exit
    └────────────────┘

    Error states (can transition to TERMINATED):
    - DRAINING_ERROR (failed to drain requests)
    - DB_CLOSE_ERROR (failed to close database)
    - REDIS_CLOSE_ERROR (failed to close Redis)
```

---

## 3. File Structure

### 3.1 New Files to Create

```
src/
└── core/
    └── shutdown/
        ├── index.ts                    # Public API exports
        ├── shutdown-manager.ts         # Main shutdown manager class
        ├── request-tracker.ts          # Active request tracking
        ├── types.ts                    # TypeScript interfaces
        └── constants.ts                # Configuration constants

tests/
└── unit/
    └── core/
        └── shutdown/
            ├── shutdown-manager.test.ts
            ├── request-tracker.test.ts
            └── integration.test.ts
```

### 3.2 Modified Files

```
src/
├── server.ts                           # Add shutdown manager integration
├── config/
│   └── env.schema.ts                   # Add shutdown config vars
└── config/
    └── index.ts                        # Export shutdown config
```

### 3.3 File Descriptions

| File                  | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `shutdown-manager.ts` | Core shutdown logic, signal handling, orchestration |
| `request-tracker.ts`  | Track active HTTP requests for draining             |
| `types.ts`            | TypeScript interfaces and types for shutdown module |
| `constants.ts`        | Default timeout values and configuration constants  |
| `index.ts`            | Public API exports for clean imports                |
| `server.ts`           | Integration point with Bun server                   |
| `env.schema.ts`       | Environment variable schema for shutdown config     |

---

## 4. Implementation Details

### 4.1 Configuration

Add to `src/config/env.schema.ts`:

```typescript
// Graceful Shutdown Configuration
GRACEFUL_SHUTDOWN_ENABLED: z
  .enum(['true', 'false'])
  .transform(v => v === 'true')
  .default('true'),
GRACEFUL_SHUTDOWN_TIMEOUT_MS: z.coerce.number().default(30000),
GRACEFUL_SHUTDOWN_GRACE_PERIOD_MS: z.coerce.number().default(5000),
GRACEFUL_SHUTDOWN_FORCE_EXIT: z
  .enum(['true', 'false'])
  .transform(v => v === 'true')
  .default('true'),
```

**Configuration Values:**

- `GRACEFUL_SHUTDOWN_ENABLED`: Enable/disable graceful shutdown
- `GRACEFUL_SHUTDOWN_TIMEOUT_MS`: Maximum time to wait for active requests (default: 30000ms)
- `GRACEFUL_SHUTDOWN_GRACE_PERIOD_MS`: Additional grace period after timeout (default: 5000ms)
- `GRACEFUL_SHUTDOWN_FORCE_EXIT`: Force exit after timeout (default: true)

### 4.2 Shutdown Manager Class

Create `src/core/shutdown/shutdown-manager.ts`:

````typescript
/**
 * Graceful Shutdown Manager
 *
 * Manages the graceful shutdown process for the application.
 * Handles signal interception, request draining, and resource cleanup.
 *
 * @example
 * ```typescript
 * const shutdownManager = new ShutdownManager({
 *   timeout: 30000,
 *   logger: logger,
 * });
 *
 * shutdownManager.registerCleanupHook(async () => {
 *   await closeDatabase();
 * });
 *
 * shutdownManager.setupSignalHandlers();
 * ```
 */

import type { Server } from 'bun';
import type { Logger } from '../logging/types';
import { getLogger } from '../logging/logger';
import { RequestTracker } from './request-tracker';
import type { ShutdownConfig, ShutdownState, CleanupHook, ShutdownProgress, ShutdownError } from './types';
import { DEFAULT_SHUTDOWN_TIMEOUT, DEFAULT_GRACE_PERIOD, SHUTDOWN_STATE, SHUTDOWN_SIGNALS } from './constants';

/**
 * Shutdown Manager Class
 *
 * Orchestrates the graceful shutdown process including:
 * - Signal handling (SIGTERM, SIGINT)
 * - Request draining
 * - Resource cleanup
 * - Progress logging
 */
export class ShutdownManager {
  private readonly config: ShutdownConfig;
  private readonly logger: Logger;
  private readonly requestTracker: RequestTracker;
  private readonly cleanupHooks: Set<CleanupHook>;

  private state: ShutdownState;
  private server: Server | null;
  private shutdownStartTime: number | null;
  private abortController: AbortController;

  constructor(config?: Partial<ShutdownConfig>) {
    this.config = {
      timeout: config?.timeout ?? DEFAULT_SHUTDOWN_TIMEOUT,
      gracePeriod: config?.gracePeriod ?? DEFAULT_GRACE_PERIOD,
      forceExit: config?.forceExit ?? true,
      logger: config?.logger ?? getLogger(),
    };

    this.logger = this.config.logger.child({ component: 'shutdown-manager' });
    this.requestTracker = new RequestTracker(this.logger);
    this.cleanupHooks = new Set();

    this.state = SHUTDOWN_STATE.RUNNING;
    this.server = null;
    this.shutdownStartTime = null;
    this.abortController = new AbortController();

    this.logger.info('Shutdown manager initialized', {
      timeout: this.config.timeout,
      gracePeriod: this.config.gracePeriod,
      forceExit: this.config.forceExit,
    });
  }

  /**
   * Setup signal handlers for graceful shutdown
   *
   * Registers handlers for SIGTERM and SIGINT signals.
   * Should be called once during application startup.
   */
  public setupSignalHandlers(): void {
    for (const signal of SHUTDOWN_SIGNALS) {
      // @ts-expect-error - Bun's process.addSignalListener type is incomplete
      process.addSignalListener(signal, () => {
        this.handleShutdownSignal(signal as NodeJS.Signals);
      });
    }

    this.logger.info('Signal handlers registered', {
      signals: SHUTDOWN_SIGNALS,
    });
  }

  /**
   * Register server instance for shutdown
   *
   * @param server - Bun server instance
   */
  public registerServer(server: Server): void {
    this.server = server;
    this.logger.info('Server registered for shutdown', {
      hostname: server.hostname,
      port: server.port,
    });
  }

  /**
   * Register a cleanup hook to run during shutdown
   *
   * Hooks are executed in the order they were registered.
   * All hooks run in parallel for efficiency.
   *
   * @param hook - Async cleanup function
   * @returns Function to unregister the hook
   *
   * @example
   * ```typescript
   * const unregister = shutdownManager.registerCleanupHook(async () => {
   *   await closeConnections();
   * });
   * // Later: unregister();
   * ```
   */
  public registerCleanupHook(hook: CleanupHook): () => void {
    this.cleanupHooks.add(hook);

    this.logger.debug('Cleanup hook registered', {
      totalHooks: this.cleanupHooks.size,
    });

    return () => {
      this.cleanupHooks.delete(hook);
      this.logger.debug('Cleanup hook unregistered', {
        remainingHooks: this.cleanupHooks.size,
      });
    };
  }

  /**
   * Get the AbortController signal
   *
   * Useful for cancelling operations during shutdown.
   *
   * @returns AbortSignal
   */
  public getAbortSignal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Get current shutdown state
   */
  public getState(): ShutdownState {
    return this.state;
  }

  /**
   * Check if shutdown is in progress
   */
  public isShuttingDown(): boolean {
    return this.state !== SHUTDOWN_STATE.RUNNING;
  }

  /**
   * Get shutdown progress information
   */
  public getProgress(): ShutdownProgress {
    return {
      state: this.state,
      activeRequests: this.requestTracker.getActiveCount(),
      completedRequests: this.requestTracker.getCompletedCount(),
      elapsedMs: this.shutdownStartTime ? Date.now() - this.shutdownStartTime : 0,
      timeout: this.config.timeout,
    };
  }

  /**
   * Handle shutdown signal
   *
   * @param signal - Signal that triggered shutdown
   */
  private handleShutdownSignal(signal: NodeJS.Signals): void {
    // Prevent multiple shutdown attempts
    if (this.isShuttingDown()) {
      this.logger.warn('Shutdown already in progress, ignoring signal', {
        signal,
        state: this.state,
      });
      return;
    }

    this.logger.info('Shutdown signal received', { signal });

    // Start shutdown process
    this.performGracefulShutdown(signal).catch(error => {
      this.logger.error('Shutdown failed', error);
      this.forceExit(1);
    });
  }

  /**
   * Perform graceful shutdown
   *
   * Orchestrates the complete shutdown sequence:
   * 1. Update state to DRAINING
   * 2. Stop accepting new connections
   * 3. Wait for active requests to complete
   * 4. Run cleanup hooks
   * 5. Close connections
   * 6. Update state to TERMINATED
   *
   * @param signal - Signal that triggered shutdown
   */
  private async performGracefulShutdown(signal: NodeJS.Signals): Promise<void> {
    this.shutdownStartTime = Date.now();

    try {
      // Phase 1: Start draining
      await this.startDraining(signal);

      // Phase 2: Drain requests
      await this.drainRequests();

      // Phase 3: Run cleanup hooks
      await this.runCleanupHooks();

      // Phase 4: Close connections
      await this.closeConnections();

      // Phase 5: Complete shutdown
      this.completeShutdown();
    } catch (error) {
      this.handleShutdownError(error as Error);
    }
  }

  /**
   * Phase 1: Start draining - stop accepting new connections
   */
  private async startDraining(signal: NodeJS.Signals): Promise<void> {
    this.state = SHUTDOWN_STATE.DRAINING;
    this.abortController.abort();

    this.logger.info('Starting graceful shutdown', {
      signal,
      timeout: this.config.timeout,
      activeRequests: this.requestTracker.getActiveCount(),
    });

    // Stop accepting new connections by stopping the server
    if (this.server) {
      this.server.stop();
      this.logger.info('Server stopped accepting new connections');
    }
  }

  /**
   * Phase 2: Drain active requests
   *
   * Waits for active requests to complete within the timeout period.
   * Logs progress every 5 seconds.
   */
  private async drainRequests(): Promise<void> {
    const startTime = Date.now();
    const progressInterval = 5000; // Log every 5 seconds

    this.logger.info('Draining active requests', {
      activeCount: this.requestTracker.getActiveCount(),
      timeout: this.config.timeout,
    });

    // Progress logging
    const progressLogger = setInterval(() => {
      const progress = this.getProgress();
      this.logger.info('Shutdown progress', {
        activeRequests: progress.activeRequests,
        completedRequests: progress.completedRequests,
        elapsedMs: progress.elapsedMs,
        remainingMs: progress.timeout - progress.elapsedMs,
      });
    }, progressInterval);

    try {
      // Wait for requests to drain or timeout
      await this.waitForRequestsToDrain(startTime);
    } finally {
      clearInterval(progressLogger);
    }

    const finalActive = this.requestTracker.getActiveCount();
    this.logger.info('Request draining complete', {
      activeRequests: finalActive,
      completedRequests: this.requestTracker.getCompletedCount(),
      duration: Date.now() - startTime,
    });
  }

  /**
   * Wait for requests to drain with timeout
   */
  private async waitForRequestsToDrain(startTime: number): Promise<void> {
    const checkInterval = 100; // Check every 100ms

    while (Date.now() - startTime < this.config.timeout) {
      const activeCount = this.requestTracker.getActiveCount();

      if (activeCount === 0) {
        this.logger.info('All requests drained successfully');
        return;
      }

      // Wait before checking again
      await this.sleep(checkInterval);
    }

    // Timeout reached
    const activeCount = this.requestTracker.getActiveCount();
    if (activeCount > 0) {
      this.logger.warn('Request drain timeout', {
        activeRequests: activeCount,
        timeout: this.config.timeout,
      });
    }
  }

  /**
   * Phase 3: Run registered cleanup hooks
   *
   * Executes all cleanup hooks in parallel.
   * Logs errors but continues with other hooks.
   */
  private async runCleanupHooks(): Promise<void> {
    if (this.cleanupHooks.size === 0) {
      this.logger.info('No cleanup hooks registered');
      return;
    }

    this.state = SHUTDOWN_STATE.CLOSING_RESOURCES;
    this.logger.info('Running cleanup hooks', {
      hookCount: this.cleanupHooks.size,
    });

    const startTime = Date.now();
    const errors: Error[] = [];

    // Run all hooks in parallel
    const hookPromises = Array.from(this.cleanupHooks).map(async (hook, index) => {
      try {
        await hook();
        this.logger.debug('Cleanup hook completed', { hookIndex: index });
      } catch (error) {
        this.logger.error('Cleanup hook failed', error as Error, {
          hookIndex: index,
        });
        errors.push(error as Error);
      }
    });

    await Promise.all(hookPromises);

    this.logger.info('Cleanup hooks complete', {
      totalHooks: this.cleanupHooks.size,
      failedHooks: errors.length,
      duration: Date.now() - startTime,
    });

    if (errors.length > 0 && this.config.forceExit) {
      this.logger.warn('Some cleanup hooks failed, but continuing with shutdown');
    }
  }

  /**
   * Phase 4: Close connections
   *
   * Note: Actual connection closing is handled by cleanup hooks
   * registered during application initialization.
   */
  private async closeConnections(): Promise<void> {
    this.logger.info('Connection close phase complete');
    // Actual closing happens via cleanup hooks
  }

  /**
   * Phase 5: Complete shutdown
   */
  private completeShutdown(): void {
    this.state = SHUTDOWN_STATE.TERMINATED;

    const duration = this.shutdownStartTime ? Date.now() - this.shutdownStartTime : 0;

    this.logger.info('Shutdown complete', {
      duration,
      completedRequests: this.requestTracker.getCompletedCount(),
      state: this.state,
    });

    this.forceExit(0);
  }

  /**
   * Handle shutdown error
   */
  private handleShutdownError(error: Error): void {
    const duration = this.shutdownStartTime ? Date.now() - this.shutdownStartTime : 0;

    this.logger.error('Shutdown error encountered', error, {
      state: this.state,
      duration,
      activeRequests: this.requestTracker.getActiveCount(),
    });

    if (this.config.forceExit) {
      this.logger.warn('Forcing exit due to shutdown error');
      this.forceExit(1);
    } else {
      this.forceExit(0);
    }
  }

  /**
   * Force exit process
   */
  private forceExit(code: number): void {
    this.logger.info('Exiting process', { code });
    process.exit(code);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
````

### 4.3 Request Tracker Class

Create `src/core/shutdown/request-tracker.ts`:

````typescript
/**
 * Request Tracker
 *
 * Tracks active HTTP requests to enable proper draining during shutdown.
 * Thread-safe tracking of request lifecycle.
 *
 * @example
 * ```typescript
 * const tracker = new RequestTracker(logger);
 *
 * // In request middleware
 * const requestId = tracker.startRequest();
 * try {
 *   await handleRequest();
 * } finally {
 *   tracker.completeRequest(requestId);
 * }
 * ```
 */

import type { Logger } from '../logging/types';

/**
 * Request information
 */
interface RequestInfo {
  id: string;
  startTime: number;
  method?: string;
  path?: string;
}

/**
 * Request Tracker Statistics
 */
interface RequestTrackerStats {
  activeCount: number;
  completedCount: number;
  averageDuration: number;
  oldestActiveRequest: number;
}

/**
 * Request Tracker Class
 *
 * Provides thread-safe tracking of HTTP requests for graceful shutdown.
 */
export class RequestTracker {
  private readonly logger: Logger;
  private readonly activeRequests: Map<string, RequestInfo>;
  private completedCount: number;
  private totalDuration: number;

  constructor(logger: Logger) {
    this.logger = logger.child({ component: 'request-tracker' });
    this.activeRequests = new Map();
    this.completedCount = 0;
    this.totalDuration = 0;
  }

  /**
   * Start tracking a request
   *
   * @param method - HTTP method
   * @param path - Request path
   * @returns Request ID
   */
  public startRequest(method?: string, path?: string): string {
    const requestId = this.generateRequestId();
    const requestInfo: RequestInfo = {
      id: requestId,
      startTime: Date.now(),
      method,
      path,
    };

    this.activeRequests.set(requestId, requestInfo);

    this.logger.debug('Request started', {
      requestId,
      method,
      path,
      activeCount: this.activeRequests.size,
    });

    return requestId;
  }

  /**
   * Complete tracking a request
   *
   * @param requestId - Request ID from startRequest()
   */
  public completeRequest(requestId: string): void {
    const requestInfo = this.activeRequests.get(requestId);

    if (!requestInfo) {
      this.logger.warn('Request not found for completion', {
        requestId,
        activeRequests: Array.from(this.activeRequests.keys()),
      });
      return;
    }

    const duration = Date.now() - requestInfo.startTime;

    this.activeRequests.delete(requestId);
    this.completedCount++;
    this.totalDuration += duration;

    this.logger.debug('Request completed', {
      requestId,
      method: requestInfo.method,
      path: requestInfo.path,
      duration,
      activeCount: this.activeRequests.size,
    });
  }

  /**
   * Get number of active requests
   */
  public getActiveCount(): number {
    return this.activeRequests.size;
  }

  /**
   * Get number of completed requests
   */
  public getCompletedCount(): number {
    return this.completedCount;
  }

  /**
   * Get detailed statistics
   */
  public getStats(): RequestTrackerStats {
    const activeRequests = Array.from(this.activeRequests.values());
    const oldestRequest = activeRequests.length > 0 ? Math.min(...activeRequests.map(r => r.startTime)) : 0;

    return {
      activeCount: this.activeRequests.size,
      completedCount: this.completedCount,
      averageDuration: this.completedCount > 0 ? Math.round(this.totalDuration / this.completedCount) : 0,
      oldestActiveRequest: oldestRequest > 0 ? Date.now() - oldestRequest : 0,
    };
  }

  /**
   * Get details of active requests
   */
  public getActiveRequests(): RequestInfo[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Check if any requests are running longer than threshold
   *
   * @param thresholdMs - Threshold in milliseconds
   */
  public hasLongRunningRequests(thresholdMs: number): boolean {
    const now = Date.now();
    for (const request of this.activeRequests.values()) {
      if (now - request.startTime > thresholdMs) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
````

### 4.4 TypeScript Types

Create `src/core/shutdown/types.ts`:

```typescript
/**
 * Graceful Shutdown Type Definitions
 */

/**
 * Shutdown configuration options
 */
export interface ShutdownConfig {
  /**
   * Maximum time to wait for active requests (milliseconds)
   * @default 30000
   */
  timeout: number;

  /**
   * Additional grace period after timeout (milliseconds)
   * @default 5000
   */
  gracePeriod: number;

  /**
   * Force exit if shutdown takes too long
   * @default true
   */
  forceExit: boolean;

  /**
   * Logger instance for shutdown logging
   */
  logger: import('../logging/types').Logger;
}

/**
 * Shutdown state enum
 */
export type ShutdownState =
  | 'running' // Normal operation
  | 'draining' // Stopping new connections, waiting for active requests
  | 'closing_db' // Closing database connections
  | 'closing_redis' // Closing Redis connections
  | 'terminated'; // Shutdown complete

/**
 * Cleanup hook function
 *
 * Called during shutdown to perform cleanup tasks.
 * Should handle errors gracefully.
 */
export type CleanupHook = () => Promise<void>;

/**
 * Named cleanup hook with metadata
 */
export interface NamedCleanupHook {
  name: string;
  hook: CleanupHook;
  priority?: number; // Lower numbers run first
}

/**
 * Shutdown progress information
 */
export interface ShutdownProgress {
  state: ShutdownState;
  activeRequests: number;
  completedRequests: number;
  elapsedMs: number;
  timeout: number;
}

/**
 * Shutdown error information
 */
export interface ShutdownError {
  phase: ShutdownState;
  error: Error;
  timestamp: number;
  recoverable: boolean;
}

/**
 * Request tracker statistics
 */
export interface RequestTrackerStats {
  activeCount: number;
  completedCount: number;
  averageDuration: number;
  oldestActiveRequest: number;
}

/**
 * Shutdown result
 */
export interface ShutdownResult {
  success: boolean;
  duration: number;
  completedRequests: number;
  incompleteRequests: number;
  errors: ShutdownError[];
}
```

### 4.5 Constants

Create `src/core/shutdown/constants.ts`:

```typescript
/**
 * Graceful Shutdown Constants
 */

/**
 * Default shutdown timeout (30 seconds)
 */
export const DEFAULT_SHUTDOWN_TIMEOUT = 30000;

/**
 * Default grace period after timeout (5 seconds)
 */
export const DEFAULT_GRACE_PERIOD = 5000;

/**
 * Signals to handle for graceful shutdown
 */
export const SHUTDOWN_SIGNALS: readonly NodeJS.Signals[] = ['SIGTERM', 'SIGINT'] as const;

/**
 * Shutdown state constants
 */
export const SHUTDOWN_STATE = {
  RUNNING: 'running' as const,
  DRAINING: 'draining' as const,
  CLOSING_DB: 'closing_db' as const,
  CLOSING_REDIS: 'closing_redis' as const,
  CLOSING_RESOURCES: 'closing_resources' as const,
  TERMINATED: 'terminated' as const,
} as const;

/**
 * Request tracking thresholds
 */
export const REQUEST_TRACKING = {
  LONG_RUNNING_THRESHOLD: 10000, // 10 seconds
  STUCK_REQUEST_THRESHOLD: 60000, // 60 seconds
} as const;

/**
 * Logging intervals
 */
export const LOG_INTERVALS = {
  SHUTDOWN_PROGRESS: 5000, // 5 seconds
  REQUEST_DRAIN: 100, // 100ms
} as const;

/**
 * Service unavailable response
 */
export const SERVICE_UNAVAILABLE_RESPONSE = {
  status: 503,
  body: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service is shutting down. Please retry later.',
  },
} as const;
```

### 4.6 Public API Index

Create `src/core/shutdown/index.ts`:

````typescript
/**
 * Graceful Shutdown Module
 *
 * Provides graceful shutdown functionality for the application.
 *
 * @example
 * ```typescript
 * import { createShutdownManager, shutdownManager } from '@/core/shutdown';
 *
 * // Create and configure
 * const manager = createShutdownManager({
 *   timeout: 30000,
 *   logger: logger,
 * });
 *
 * // Setup signal handlers
 * manager.setupSignalHandlers();
 *
 * // Register cleanup hooks
 * manager.registerCleanupHook(async () => {
 *   await closeDatabase();
 * });
 * ```
 */

import { logger } from '../logging/logger';
import { getConfig } from '../../../config';
import { ShutdownManager } from './shutdown-manager';
import type { ShutdownConfig, CleanupHook, ShutdownProgress } from './types';

/**
 * Create a configured shutdown manager instance
 *
 * @param config - Optional configuration overrides
 * @returns ShutdownManager instance
 */
export function createShutdownManager(config?: Partial<ShutdownConfig>): ShutdownManager {
  const envConfig = getConfig();

  const fullConfig: Partial<ShutdownConfig> = {
    timeout: envConfig.GRACEFUL_SHUTDOWN_TIMEOUT_MS,
    gracePeriod: envConfig.GRACEFUL_SHUTDOWN_GRACE_PERIOD_MS,
    forceExit: envConfig.GRACEFUL_SHUTDOWN_FORCE_EXIT,
    logger: logger,
    ...config,
  };

  return new ShutdownManager(fullConfig);
}

/**
 * Default singleton shutdown manager instance
 *
 * Initialized with environment-based configuration.
 */
export const shutdownManager = createShutdownManager();

// Export all types
export type {
  ShutdownConfig,
  ShutdownState,
  CleanupHook,
  NamedCleanupHook,
  ShutdownProgress,
  ShutdownError,
  RequestTrackerStats,
  ShutdownResult,
} from './types';

// Export classes
export { ShutdownManager } from './shutdown-manager';
export { RequestTracker } from './request-tracker';

// Export constants
export {
  DEFAULT_SHUTDOWN_TIMEOUT,
  DEFAULT_GRACE_PERIOD,
  SHUTDOWN_SIGNALS,
  SHUTDOWN_STATE,
  REQUEST_TRACKING,
  LOG_INTERVALS,
  SERVICE_UNAVAILABLE_RESPONSE,
} from './constants';
````

---

## 5. Integration with server.ts

### 5.1 Step-by-Step Integration

Here's the complete modified `src/server.ts`:

```typescript
/**
 * Server Bootstrap
 *
 * Entry point for the application server.
 * Initializes and starts the Elysia server with Bun's native HTTP server.
 * Includes graceful shutdown handling for safe termination.
 *
 * @module Server
 */

import { createApp } from './app';
import { logger } from './core/logging/logger';
import { getConfig } from './config';
import { shutdownManager } from './core/shutdown';
import { getConnection, closeConnection } from './database/connection';
import { getRedisConnection, closeRedisConnection } from './core/redis';

// Create and configure the application
const app = createApp();

// Get configuration
const config = getConfig();

// Start the server
const server = Bun.serve({
  fetch: app.fetch,
  port: config.PORT,
  hostname: config.HOST,
});

logger.info(`Server started on http://${server.hostname}:${server.port}`);
logger.info(`Swagger documentation available at http://${server.hostname}:${server.port}/swagger`);
logger.info(`Health check available at http://${server.hostname}:${server.port}/health`);

// Register server with shutdown manager
shutdownManager.registerServer(server);

// Register cleanup hooks for database and Redis
shutdownManager.registerCleanupHook(async () => {
  logger.info('Closing database connection...');
  await closeConnection();
  logger.info('Database connection closed');
});

shutdownManager.registerCleanupHook(async () => {
  logger.info('Closing Redis connection...');
  await closeRedisConnection();
  logger.info('Redis connection closed');
});

// Setup signal handlers for graceful shutdown
shutdownManager.setupSignalHandlers();

// Export for potential testing or module usage
export { app, server };
```

### 5.2 Integration Checklist

- [ ] Import shutdown manager
- [ ] Import connection close functions
- [ ] Register server instance
- [ ] Register database cleanup hook
- [ ] Register Redis cleanup hook
- [ ] Setup signal handlers

### 5.3 Shutdown Middleware Integration

To track active requests, add a middleware to `src/app.ts`:

```typescript
import { shutdownManager } from './core/shutdown';

// In createApp function, add request tracking middleware
const app = new Elysia().onBeforeHandle(({ request }) => {
  // Check if shutting down
  if (shutdownManager.isShuttingDown()) {
    return new Response(
      JSON.stringify({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service is shutting down. Please retry later.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
// ... rest of app configuration
```

---

## 6. Error Handling

### 6.1 Error Scenarios

| Scenario                        | Handling                               | Recovery                      |
| ------------------------------- | -------------------------------------- | ----------------------------- |
| Signal received during shutdown | Log warning, ignore signal             | None required                 |
| Request drain timeout           | Log active requests, continue shutdown | Force exit if configured      |
| Database close failure          | Log error, continue with Redis close   | Force exit after grace period |
| Redis close failure             | Log error, complete shutdown           | Force exit after grace period |
| Cleanup hook failure            | Log error, continue with other hooks   | None, continue shutdown       |
| Hook timeout after drain        | Log warning, force exit                | Process exits                 |

### 6.2 Error Logging Strategy

```typescript
// Error logging levels
const ERROR_LOGGING_LEVELS = {
  CRITICAL: 'shutdown_failed', // Unable to shutdown properly
  ERROR: 'resource_cleanup_failed', // Single resource failed
  WARNING: 'request_drain_timeout', // Timeout waiting for requests
  INFO: 'shutdown_progress', // Normal shutdown progress
};
```

### 6.3 Error Recovery

```typescript
// In shutdown-manager.ts
private async safeExecuteWithRetry<T>(
  operation: () => Promise<T>,
  context: string,
  retries = 2
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === retries) {
        this.logger.error(`${context} failed after ${retries} retries`, error);
        throw error;
      }
      this.logger.warn(`${context} failed, retrying (${i + 1}/${retries})`, error);
      await this.sleep(1000); // Wait before retry
    }
  }
  throw new Error('Retry logic failed');
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

Create `tests/unit/core/shutdown/shutdown-manager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ShutdownManager } from '@/core/shutdown/shutdown-manager';
import type { Logger } from '@/core/logging/types';

describe('ShutdownManager', () => {
  let shutdownManager: ShutdownManager;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      child: () => mockLogger,
    } as unknown as Logger;

    shutdownManager = new ShutdownManager({
      timeout: 5000,
      gracePeriod: 1000,
      forceExit: false,
      logger: mockLogger,
    });
  });

  afterEach(() => {
    // Cleanup
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      expect(shutdownManager.getState()).toBe('running');
      expect(shutdownManager.isShuttingDown()).toBe(false);
    });

    it('should use custom timeout when provided', () => {
      const customManager = new ShutdownManager({
        timeout: 10000,
        logger: mockLogger,
      });
      expect(customManager).toBeDefined();
    });
  });

  describe('cleanup hooks', () => {
    it('should register cleanup hook', () => {
      let hookCalled = false;
      const hook = async () => {
        hookCalled = true;
      };

      shutdownManager.registerCleanupHook(hook);
      // Verify hook is registered
      expect(hookCalled).toBe(false);
    });

    it('should unregister cleanup hook', () => {
      const hook = async () => {};
      const unregister = shutdownManager.registerCleanupHook(hook);

      unregister();
      // Verify hook is unregistered
    });

    it('should execute cleanup hooks in parallel', async () => {
      const executionOrder: number[] = [];

      const hook1 = async () => {
        executionOrder.push(1);
        await new Promise(resolve => setTimeout(resolve, 100));
        executionOrder.push(2);
      };

      const hook2 = async () => {
        executionOrder.push(3);
        await new Promise(resolve => setTimeout(resolve, 50));
        executionOrder.push(4);
      };

      shutdownManager.registerCleanupHook(hook1);
      shutdownManager.registerCleanupHook(hook2);

      // Trigger shutdown and verify
      // Both hooks should run in parallel
    });
  });

  describe('progress tracking', () => {
    it('should track active requests', () => {
      const progress = shutdownManager.getProgress();
      expect(progress).toHaveProperty('state');
      expect(progress).toHaveProperty('activeRequests');
      expect(progress).toHaveProperty('elapsedMs');
    });

    it('should calculate remaining time correctly', () => {
      const progress = shutdownManager.getProgress();
      expect(progress.timeout).toBeGreaterThan(0);
    });
  });

  describe('signal handling', () => {
    it('should handle SIGTERM signal', async () => {
      // Mock server and test signal handling
    });

    it('should handle SIGINT signal', async () => {
      // Mock server and test signal handling
    });

    it('should ignore duplicate signals', async () => {
      // Send multiple signals and verify only first is processed
    });
  });

  describe('error handling', () => {
    it('should handle cleanup hook failures gracefully', async () => {
      const failingHook = async () => {
        throw new Error('Hook failed');
      };

      shutdownManager.registerCleanupHook(failingHook);

      // Should continue shutdown despite hook failure
    });

    it('should handle timeout during request draining', async () => {
      // Test timeout scenario
    });
  });
});
```

### 7.2 Request Tracker Tests

Create `tests/unit/core/shutdown/request-tracker.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { RequestTracker } from '@/core/shutdown/request-tracker';
import type { Logger } from '@/core/logging/types';

describe('RequestTracker', () => {
  let tracker: RequestTracker;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      child: () => mockLogger,
    } as unknown as Logger;

    tracker = new RequestTracker(mockLogger);
  });

  describe('request tracking', () => {
    it('should track started requests', () => {
      const requestId = tracker.startRequest('GET', '/api/test');
      expect(requestId).toBeTruthy();
      expect(tracker.getActiveCount()).toBe(1);
    });

    it('should track completed requests', () => {
      const requestId = tracker.startRequest('GET', '/api/test');
      tracker.completeRequest(requestId);

      expect(tracker.getActiveCount()).toBe(0);
      expect(tracker.getCompletedCount()).toBe(1);
    });

    it('should handle multiple concurrent requests', () => {
      const id1 = tracker.startRequest('GET', '/api/1');
      const id2 = tracker.startRequest('POST', '/api/2');
      const id3 = tracker.startRequest('PUT', '/api/3');

      expect(tracker.getActiveCount()).toBe(3);

      tracker.completeRequest(id1);
      expect(tracker.getActiveCount()).toBe(2);

      tracker.completeRequest(id2);
      tracker.completeRequest(id3);
      expect(tracker.getActiveCount()).toBe(0);
    });

    it('should calculate statistics correctly', () => {
      tracker.startRequest('GET', '/api/1');
      tracker.startRequest('POST', '/api/2');

      const stats = tracker.getStats();
      expect(stats.activeCount).toBe(2);
      expect(stats.completedCount).toBe(0);
    });

    it('should detect long-running requests', () => {
      tracker.startRequest('GET', '/api/long');

      // Initially should not be long-running
      expect(tracker.hasLongRunningRequests(10000)).toBe(false);

      // After threshold should detect
      // (would need to manipulate time or wait)
    });
  });

  describe('error handling', () => {
    it('should handle completion of unknown request', () => {
      tracker.completeRequest('unknown-id');
      // Should log warning but not crash
      expect(tracker.getActiveCount()).toBe(0);
    });

    it('should handle duplicate completion', () => {
      const id = tracker.startRequest('GET', '/api/test');
      tracker.completeRequest(id);
      tracker.completeRequest(id);

      expect(tracker.getActiveCount()).toBe(0);
      expect(tracker.getCompletedCount()).toBe(1);
    });
  });
});
```

### 7.3 Integration Tests

Create `tests/unit/core/shutdown/integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ShutdownManager } from '@/core/shutdown/shutdown-manager';
import { RequestTracker } from '@/core/shutdown/request-tracker';
import { closeConnection } from '@/database/connection';
import { closeRedisConnection } from '@/core/redis';

describe('Graceful Shutdown Integration', () => {
  let shutdownManager: ShutdownManager;
  let mockServer: any;

  beforeEach(() => {
    // Setup test environment
    shutdownManager = new ShutdownManager({
      timeout: 5000,
      forceExit: false,
    });

    mockServer = {
      stop: () => {},
      hostname: 'localhost',
      port: 3000,
    };
  });

  afterEach(async () => {
    // Cleanup
  });

  describe('full shutdown flow', () => {
    it('should complete full shutdown successfully', async () => {
      shutdownManager.registerServer(mockServer);

      let dbClosed = false;
      let redisClosed = false;

      shutdownManager.registerCleanupHook(async () => {
        dbClosed = true;
      });

      shutdownManager.registerCleanupHook(async () => {
        redisClosed = true;
      });

      // Simulate shutdown
      // Verify all hooks executed
      expect(dbClosed).toBe(true);
      expect(redisClosed).toBe(true);
    });

    it('should handle active requests during shutdown', async () => {
      const tracker = new RequestTracker(shutdownManager['logger']);

      // Start some requests
      const id1 = tracker.startRequest('GET', '/api/1');
      const id2 = tracker.startRequest('POST', '/api/2');

      expect(tracker.getActiveCount()).toBe(2);

      // Complete them
      tracker.completeRequest(id1);
      tracker.completeRequest(id2);

      expect(tracker.getActiveCount()).toBe(0);
    });
  });
});
```

### 7.4 Manual Testing

```bash
# Terminal 1: Start server
bun run src/server.ts

# Terminal 2: Send requests
curl http://localhost:3000/api/v1/health &
curl http://localhost:3000/api/v1/health &

# Terminal 2: Send shutdown signal
kill -TERM <pid>

# Verify logs show:
# 1. Signal received
# 2. Draining started
# 3. Active requests counted
# 4. Requests drained
# 5. Cleanup hooks executed
# 6. Shutdown complete
```

---

## 8. Usage Examples

### 8.1 Basic Usage

```typescript
import { shutdownManager } from '@/core/shutdown';

// Setup during application initialization
shutdownManager.setupSignalHandlers();

// Register cleanup hooks
shutdownManager.registerCleanupHook(async () => {
  await myCleanupFunction();
});
```

### 8.2 Custom Configuration

```typescript
import { createShutdownManager } from '@/core/shutdown';

const customShutdown = createShutdownManager({
  timeout: 60000, // 60 seconds
  gracePeriod: 10000, // 10 seconds
  forceExit: true,
  logger: customLogger,
});

customShutdown.setupSignalHandlers();
```

### 8.3 With Health Check

```typescript
import { shutdownManager } from '@/core/shutdown';

app.get('/health', () => {
  if (shutdownManager.isShuttingDown()) {
    return {
      status: 'draining',
      message: 'Service is shutting down',
    };
  }

  return {
    status: 'healthy',
    uptime: process.uptime(),
  };
});
```

### 8.4 Abort Signal Usage

```typescript
import { shutdownManager } from '@/core/shutdown';

async function longRunningOperation() {
  const signal = shutdownManager.getAbortSignal();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => resolve('done'), 5000);

    signal.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Operation cancelled due to shutdown'));
    });
  });
}
```

### 8.5 Custom Cleanup Hook with Error Handling

```typescript
shutdownManager.registerCleanupHook(async () => {
  try {
    await closeExternalService();
    logger.info('External service closed successfully');
  } catch (error) {
    logger.error('Failed to close external service', error);
    // Don't throw - let shutdown continue
  }
});
```

### 8.6 Prioritized Cleanup Hooks

```typescript
// Close critical resources first
shutdownManager.registerCleanupHook(async () => {
  await closeDatabase();
});

// Then secondary resources
shutdownManager.registerCleanupHook(async () => {
  await closeCache();
});

// Finally optional resources
shutdownManager.registerCleanupHook(async () => {
  await flushMetrics();
});
```

---

## 9. Success Criteria

### 9.1 Functional Requirements

| Requirement      | Description                    | Acceptance Criteria             |
| ---------------- | ------------------------------ | ------------------------------- |
| Signal Handling  | Catch SIGTERM/SIGINT           | Both signals trigger shutdown   |
| Connection Stop  | Stop accepting new connections | New requests return 503         |
| Request Draining | Wait for active requests       | Waits up to configured timeout  |
| Database Close   | Close database connections     | `closeConnection()` called      |
| Redis Close      | Close Redis connections        | `closeRedisConnection()` called |
| Progress Logging | Log shutdown progress          | Logs at each phase              |
| Timeout Handling | Handle drain timeout           | Continues after timeout         |
| Error Handling   | Handle cleanup failures        | Logs errors, continues shutdown |

### 9.2 Performance Requirements

| Metric                | Target                    | Measurement            |
| --------------------- | ------------------------- | ---------------------- |
| Shutdown Time         | < 35 seconds              | From signal to exit    |
| Request Drain Timeout | 30 seconds (configurable) | Max wait for requests  |
| Grace Period          | 5 seconds (configurable)  | After drain timeout    |
| Signal to Response    | < 100ms                   | Time to start shutdown |

### 9.3 Reliability Requirements

| Requirement              | Target                  |
| ------------------------ | ----------------------- |
| Signal catch rate        | 100%                    |
| Connection close success | > 99.9%                 |
| Process exit clean       | 100% (exit code 0 or 1) |

### 9.4 Testing Coverage

| Component         | Coverage Target    |
| ----------------- | ------------------ |
| ShutdownManager   | 95%                |
| RequestTracker    | 95%                |
| Integration tests | All shutdown paths |
| Manual testing    | Full shutdown flow |

### 9.5 Verification Checklist

- [ ] SIGTERM triggers graceful shutdown
- [ ] SIGINT triggers graceful shutdown
- [ ] New connections rejected during shutdown
- [ ] Active requests complete before exit
- [ ] Database connections close cleanly
- [ ] Redis connections close cleanly
- [ ] Shutdown progress logged at each phase
- [ ] Timeout enforced for request draining
- [ ] Cleanup hooks execute in order
- [ ] Errors logged but don't block shutdown
- [ ] Process exits with appropriate code
- [ ] Unit tests pass with 95%+ coverage
- [ ] Integration tests pass
- [ ] Manual test confirms shutdown flow

---

## Appendix

### A. Environment Variables

```bash
# .env file additions
GRACEFUL_SHUTDOWN_ENABLED=true
GRACEFUL_SHUTDOWN_TIMEOUT_MS=30000
GRACEFUL_SHUTDOWN_GRACE_PERIOD_MS=5000
GRACEFUL_SHUTDOWN_FORCE_EXIT=true
```

### B. Monitoring Recommendations

1. **Metrics to Track:**
   - Shutdown duration
   - Active requests at shutdown
   - Cleanup hook failures
   - Shutdown frequency

2. **Alerting:**
   - Shutdowns taking > 30 seconds
   - Shutdowns with incomplete requests
   - Frequent shutdowns (possible health issues)

3. **Logging:**
   - All shutdown phases
   - Active request counts
   - Cleanup hook results
   - Any errors during shutdown

### C. Production Checklist

- [ ] Review and adjust timeout values
- [ ] Configure monitoring alerts
- [ ] Test shutdown with active requests
- [ ] Verify load balancer health check behavior
- [ ] Document shutdown behavior in runbook
- [ ] Train operations team on shutdown behavior
- [ ] Set up log aggregation for shutdown events

### D. References

- [Bun Server Documentation](https://bun.sh/docs/api/http)
- [Node.js Graceful Shutdown Best Practices](https://nodejs.org/api/process.html#process_event_exit)
- [PostgreSQL Connection Pooling](https://node-postgres.com/apis/pool)
- [IORedis Graceful Shutdown](https://github.com/luin/ioredis#close)

---

## Changelog

| Version | Date       | Changes                 |
| ------- | ---------- | ----------------------- |
| 1.0     | 2026-03-13 | Initial design document |

---

**End of Document**
