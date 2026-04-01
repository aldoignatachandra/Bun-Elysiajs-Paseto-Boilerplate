/**
 * Server Bootstrap
 *
 * Entry point for the application server.
 * Initializes and starts the Elysia server with Bun's native HTTP server.
 * Implements graceful shutdown handling for clean termination.
 *
 * Startup sequence:
 * 1. Load configuration
 * 2. Initialize shutdown manager
 * 3. Create application (initializes database connection)
 * 4. Initialize Redis connection (with timeout)
 * 5. Start HTTP server
 *
 * @module Server
 */

import { createApp } from './app';
import { logger } from './core/logging/logger';
import { getConfig } from './config';
import { ShutdownManager, createShutdownConfig } from './core/shutdown';
import { connectRedis, getRedisConnectionInfo, stopRedisReconnection } from './core/redis/connection';
import { initializeTracer, getTelemetryConfig } from './core/telemetry';

// Get configuration
const config = getConfig();

// Create shutdown manager with configured timeouts
const shutdownManager = new ShutdownManager(
  createShutdownConfig({
    timeoutMs: config.SHUTDOWN_TIMEOUT_MS,
    gracePeriodMs: config.SHUTDOWN_GRACE_PERIOD_MS,
  })
);

// Initialize signal handlers (SIGTERM, SIGINT)
shutdownManager.initialize();

// Initialize OpenTelemetry tracer (optional - only if enabled)
const telemetryConfig = getTelemetryConfig();
try {
  initializeTracer(telemetryConfig);
} catch (error) {
  logger.warn('OpenTelemetry initialization failed (non-fatal)', {
    error: error instanceof Error ? error.message : String(error),
  });
}

// Create and configure the application (initializes database)
const app = createApp();

/**
 * Initialize and verify Redis connection before starting the server
 *
 * Uses a short timeout (2 seconds) to avoid delaying server startup.
 * If Redis is unavailable, stops reconnection attempts and proceeds
 * with in-memory fallback for rate limiting.
 */
async function initializeRedis(): Promise<boolean> {
  // Short timeout for startup - Redis should be fast
  const REDIS_STARTUP_TIMEOUT_MS = 5000;

  try {
    const connected = await connectRedis(REDIS_STARTUP_TIMEOUT_MS);

    if (connected) {
      const info = getRedisConnectionInfo();
      logger.info('🔴 Redis connected successfully', {
        host: info.host,
        port: info.port,
        db: info.db,
      });
      return true;
    }

    // Connection failed - stop reconnection and proceed with fallback
    stopRedisReconnection();
    const info = getRedisConnectionInfo();
    logger.warn('🔴 Redis connection unavailable - using in-memory fallback for rate limiting', {
      host: info.host,
      port: info.port,
      db: info.db,
    });
    return false;
  } catch (error) {
    stopRedisReconnection();
    logger.warn('🔴 Redis initialization failed - using in-memory fallback for rate limiting', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Main startup function - initializes all services before starting the server
 */
async function startServer(): Promise<void> {
  // Initialize Redis connection before starting server
  await initializeRedis();

  // Wrap the app fetch handler to integrate shutdown logic
  const fetchHandler = async (request: Request): Promise<Response> => {
    // Check if server is shutting down
    if (shutdownManager.isShuttingDown()) {
      return shutdownManager.createServiceUnavailableResponse();
    }

    // Track active request
    shutdownManager.incrementRequest();

    try {
      // Process the request (Bun.serve only passes Request)
      return await app.fetch(request);
    } finally {
      // Always decrement request count, even if request fails
      shutdownManager.decrementRequest();
    }
  };

  // Start the server (only after Redis is initialized)
  const server = Bun.serve({
    fetch: fetchHandler,
    port: config.PORT,
    hostname: config.HOST,
  });

  // Log server startup info
  logger.info(`🚀 Server started on http://${server.hostname}:${server.port}`);
  logger.info(`📚 OpenAPI documentation available at http://${server.hostname}:${server.port}/openapi`);
  logger.info(`💚 Health check available at http://${server.hostname}:${server.port}/health`);
}

// Start the server
startServer().catch(error => {
  logger.error('Failed to start server', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

// Export for potential testing or module usage
export { app, shutdownManager };
