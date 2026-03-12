/**
 * Server Bootstrap
 *
 * Entry point for the application server.
 * Initializes and starts the Elysia server with Bun's native HTTP server.
 *
 * @module Server
 */

import { createApp } from './app';
import { logger } from './core/logging/logger';
import { getConfig } from './config';

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

logger.info(`🚀 Server started on http://${server.hostname}:${server.port}`);
logger.info(`📚 Swagger documentation available at http://${server.hostname}:${server.port}/swagger`);
logger.info(`💚 Health check available at http://${server.hostname}:${server.port}/health`);

// Export for potential testing or module usage
export { app, server };
