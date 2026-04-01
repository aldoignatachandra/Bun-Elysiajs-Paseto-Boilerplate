/**
 * Graceful Shutdown Manager
 *
 * Handles clean application termination on SIGTERM/SIGINT signals.
 * Ensures active requests complete before closing connections.
 *
 * Features:
 * - Signal handling (SIGTERM, SIGINT)
 * - Active request draining with timeout
 * - Database and Redis connection cleanup
 * - 503 Service Unavailable response during shutdown
 *
 * @module Shutdown
 */

import { logger } from '../logging/logger';
import { closeConnection as closeDatabaseConnection } from '@database/connection';
import { closeRedisConnection } from '@core/redis/connection';
import { shutdownTracer } from '@core/telemetry';

/**
 * Shutdown configuration options
 */
export interface ShutdownConfig {
  /** Maximum time to wait for active requests to complete (ms) */
  timeoutMs: number;
  /** Grace period before forcefully closing connections (ms) */
  gracePeriodMs: number;
}

/**
 * Current shutdown state
 */
interface ShutdownState {
  /** Whether shutdown has been initiated */
  isShuttingDown: boolean;
  /** Number of currently active requests */
  activeRequests: number;
}

/**
 * Creates a new shutdown configuration with defaults
 */
export function createShutdownConfig(overrides?: Partial<ShutdownConfig>): ShutdownConfig {
  return {
    timeoutMs: 30000, // 30 seconds default
    gracePeriodMs: 5000, // 5 seconds default
    ...overrides,
  };
}

/**
 * Graceful shutdown manager for clean application termination.
 *
 * Handles SIGTERM/SIGINT signals, drains active requests,
 * and closes database and Redis connections gracefully.
 *
 * @example
 * ```typescript
 * const shutdownManager = new ShutdownManager({ timeoutMs: 30000 });
 * shutdownManager.initialize();
 *
 * // Track requests
 * shutdownManager.incrementRequest();
 * await handleRequest();
 * shutdownManager.decrementRequest();
 * ```
 */
export class ShutdownManager {
  private state: ShutdownState = {
    isShuttingDown: false,
    activeRequests: 0,
  };

  constructor(private config: ShutdownConfig = createShutdownConfig()) {}

  /**
   * Initialize signal handlers for graceful shutdown
   *
   * Registers handlers for SIGTERM (docker stop, kubernetes termination)
   * and SIGINT (Ctrl+C) signals.
   */
  initialize(): void {
    // Handle SIGTERM (docker stop, kubernetes termination)
    process.on('SIGTERM', () => {
      void this.shutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      void this.shutdown('SIGINT');
    });

    logger.info('Shutdown signal handlers registered', {
      timeout: this.config.timeoutMs,
      gracePeriod: this.config.gracePeriodMs,
    });
  }

  /**
   * Increment active request counter
   *
   * Should be called when a new request starts processing.
   */
  incrementRequest(): void {
    this.state.activeRequests++;
  }

  /**
   * Decrement active request counter
   *
   * Should be called when a request finishes processing.
   */
  decrementRequest(): void {
    this.state.activeRequests = Math.max(0, this.state.activeRequests - 1);
  }

  /**
   * Check if application is currently shutting down
   *
   * @returns true if shutdown has been initiated
   */
  isShuttingDown(): boolean {
    return this.state.isShuttingDown;
  }

  /**
   * Get current number of active requests
   *
   * @returns Number of currently active requests
   */
  getActiveRequestCount(): number {
    return this.state.activeRequests;
  }

  /**
   * Main shutdown sequence
   *
   * Orchestrates the graceful shutdown process:
   * 1. Stop accepting new requests (set flag)
   * 2. Wait for active requests to complete
   * 3. Close database and Redis connections
   * 4. Exit process
   *
   * @param signal - The signal that triggered shutdown
   */
  private async shutdown(signal: string): Promise<void> {
    // Prevent duplicate shutdown attempts
    if (this.state.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring duplicate signal');
      return;
    }

    logger.info(`${signal} received, starting graceful shutdown...`);
    this.state.isShuttingDown = true;

    // Step 1: Stop accepting new requests (flag is already set)
    logger.info('Stopped accepting new requests');

    // Step 2: Wait for active requests to complete
    await this.drainRequests();

    // Step 3: Close connections
    await this.closeConnections();

    // Step 4: Complete
    logger.info('Graceful shutdown complete');

    // Small delay to ensure logs are flushed
    await Bun.sleep(100);

    process.exit(0);
  }

  /**
   * Wait for active requests to complete
   *
   * Waits up to the configured timeout for all active requests
   * to finish. Logs progress every 5 seconds.
   */
  private async drainRequests(): Promise<void> {
    const startTime = Date.now();
    const timeout = this.config.timeoutMs;

    logger.info(`Draining active requests (${this.state.activeRequests} in flight)`);

    while (this.state.activeRequests > 0) {
      const elapsed = Date.now() - startTime;

      // Check for timeout
      if (elapsed > timeout) {
        logger.warn(`Timeout reached, ${this.state.activeRequests} requests still active`);
        break;
      }

      // Log progress every 5 seconds
      if (elapsed > 0 && elapsed % 5000 < 100) {
        logger.info(`Waiting... ${this.state.activeRequests} requests remaining`);
      }

      // Wait a bit before checking again
      await Bun.sleep(100);
    }

    logger.info('All requests drained or timeout reached');
  }

  /**
   * Close database, Redis, and telemetry connections
   *
   * Attempts to gracefully close all connections.
   * Logs any errors but continues to ensure best-effort cleanup.
   */
  private async closeConnections(): Promise<void> {
    logger.info('Closing connections...');

    // Close database
    try {
      await closeDatabaseConnection();
      logger.info('Database closed');
    } catch (error) {
      logger.error('Error closing database', error);
    }

    // Close Redis
    try {
      await closeRedisConnection();
      logger.info('Redis closed');
    } catch (error) {
      logger.error('Error closing Redis', error);
    }

    // Shutdown OpenTelemetry tracer
    try {
      await shutdownTracer();
      logger.info('Telemetry shutdown complete');
    } catch (error) {
      logger.error('Error shutting down telemetry', error);
    }
  }

  /**
   * Create a 503 Service Unavailable response
   *
   * Returns a standard JSON response indicating the server
   * is shutting down. Used when new requests arrive during
   * the shutdown process.
   *
   * @returns HTTP Response with 503 status
   */
  createServiceUnavailableResponse(): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Server is shutting down, please try again later',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          Connection: 'close',
        },
      }
    );
  }
}
