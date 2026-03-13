/**
 * Server Bootstrap
 *
 * Entry point for the application server.
 * Initializes and starts the Elysia server with Bun's native HTTP server.
 * Implements graceful shutdown handling for clean termination.
 *
 * @module Server
 */

import { createApp } from './app';
import { logger } from './core/logging/logger';
import { getConfig } from './config';
import { ShutdownManager, createShutdownConfig } from './core/shutdown';

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

// Create and configure the application
const app = createApp();

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

// Start the server
const server = Bun.serve({
  fetch: fetchHandler,
  port: config.PORT,
  hostname: config.HOST,
});

logger.info(`🚀 Server started on http://${server.hostname}:${server.port}`);
logger.info(`📚 Swagger documentation available at http://${server.hostname}:${server.port}/swagger`);
logger.info(`💚 Health check available at http://${server.hostname}:${server.port}/health`);

// Export for potential testing or module usage
export { app, server, shutdownManager };
