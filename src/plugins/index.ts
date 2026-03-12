import { Elysia } from 'elysia';
import { healthPlugin } from './health.plugin';

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  /**
   * Enable health check plugin (default: true)
   */
  health?: boolean;
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

  return app;
}

// Export individual plugins
export * from './health.plugin';
