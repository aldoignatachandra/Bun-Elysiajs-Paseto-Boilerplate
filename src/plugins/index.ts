import { Elysia } from 'elysia';
import { healthPlugin } from './health.plugin';
import { metricsPlugin, isMetricsEnabled, type MetricsMiddlewareConfig } from '@/core/metrics';

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /**
   * Enable health check plugin (default: true)
   */
  health?: boolean;

  /**
   * Enable metrics plugin (default: based on METRICS_ENABLED env var or NODE_ENV)
   * Pass an object to configure metrics behavior
   */
  metrics?: boolean | MetricsMiddlewareConfig;
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
 *   health: true
 * });
 * ```
 */
export function registerPlugins(app: Elysia, config: PluginConfig = {}): Elysia {
  // Health check plugin is enabled by default
  if (config.health !== false) {
    app.use(healthPlugin());
  }

  // Metrics plugin - check if enabled
  if (config.metrics !== false && isMetricsEnabled()) {
    const metricsConfig = typeof config.metrics === 'object' ? config.metrics : undefined;
    app.use(metricsPlugin(metricsConfig));
  }

  return app;
}

// Export individual plugins
export * from './health.plugin';

// Re-export metrics types for convenience
export type { MetricsMiddlewareConfig } from '@/core/metrics';
