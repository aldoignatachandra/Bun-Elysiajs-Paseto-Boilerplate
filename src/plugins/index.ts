import { Elysia } from 'elysia';
import { healthPlugin } from './health.plugin';
import { metricsPlugin } from './metrics.plugin';
import { tracingPlugin } from './tracing.plugin';

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

  return app;
}

// Export individual plugins
export * from './health.plugin';
export * from './metrics.plugin';
export * from './tracing.plugin';
