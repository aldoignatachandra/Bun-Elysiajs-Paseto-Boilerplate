import { Elysia } from 'elysia';
import { healthPlugin } from './health.plugin';
import { metricsPlugin } from './metrics.plugin';
import { tracingPlugin } from './tracing.plugin';
import { compressionPlugin } from './compression.plugin';
import { cachingPlugin } from './caching.plugin';
import { versioningPlugin } from './versioning.plugin';
import { queuePlugin } from './queue.plugin';
import type { CachingPluginOptions } from './caching.plugin';
import type { VersioningPluginOptions } from './versioning.plugin';
import type { QueuePluginOptions } from './queue.plugin';

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /**
   * Enable health check plugin (default: true)
   */
  health?: boolean;

  /**
   * Enable metrics collection plugin (default: false)
   */
  metrics?: boolean;

  /**
   * Enable distributed tracing plugin (default: false)
   */
  tracing?: boolean;

  /**
   * Enable response compression plugin (default: false)
   */
  compression?: boolean;

  /**
   * Enable caching plugin (default: false)
   * Requires cachingOptions to be provided
   */
  caching?: boolean;

  /**
   * Enable versioning plugin (default: false)
   */
  versioning?: boolean;

  /**
   * Enable queue plugin (default: false)
   * Requires queueOptions to be provided
   */
  queue?: boolean;

  /**
   * Caching plugin options (required if caching is enabled)
   */
  cachingOptions?: CachingPluginOptions;

  /**
   * Versioning plugin options (optional)
   */
  versioningOptions?: VersioningPluginOptions;

  /**
   * Queue plugin options (required if queue is enabled)
   */
  queueOptions?: QueuePluginOptions;
}

/**
 * Register plugins with an Elysia application
 *
 * @param app - The Elysia application instance
 * @param config - Plugin configuration options
 * @returns The configured Elysia application instance
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { registerPlugins } from '@/plugins';
 *
 * const app = new Elysia();
 * registerPlugins(app, {
 *   health: true,
 *   metrics: true,
 *   tracing: false
 * });
 * ```
 */
export function registerPlugins(app: Elysia, config: PluginConfig = {}): Elysia {
  // Health check plugin is enabled by default
  if (config.health !== false) {
    app.use(healthPlugin());
  }

  // Metrics plugin is opt-in
  if (config.metrics) {
    app.use(metricsPlugin());
  }

  // Tracing plugin is opt-in
  if (config.tracing) {
    app.use(tracingPlugin());
  }

  // Compression plugin is opt-in
  if (config.compression) {
    app.use(compressionPlugin());
  }

  // Caching plugin is opt-in
  if (config.caching && config.cachingOptions) {
    app.use(cachingPlugin(config.cachingOptions));
  }

  // Versioning plugin is opt-in
  if (config.versioning) {
    app.use(versioningPlugin(config.versioningOptions));
  }

  // Queue plugin is opt-in
  if (config.queue && config.queueOptions) {
    app.use(queuePlugin(config.queueOptions));
  }

  return app;
}

// Export individual plugins
export * from './health.plugin';
export * from './metrics.plugin';
export * from './tracing.plugin';
export * from './security-headers.plugin';
export * from './compression.plugin';
export * from './caching.plugin';
export * from './versioning.plugin';
export * from './queue.plugin';
