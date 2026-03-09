import { Elysia } from 'elysia';
import { logger } from '@core/logging/logger';

/**
 * Tracing plugin
 *
 * Stub implementation for OpenTelemetry distributed tracing.
 * Full implementation will be provided in Task 26.
 *
 * This plugin will eventually:
 * - Set up OpenTelemetry tracing
 * - Create trace spans for HTTP requests
 * - Integrate with external tracing services (Jaeger, etc.)
 * - Provide distributed tracing context propagation
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { tracingPlugin } from '@/plugins/tracing.plugin';
 *
 * const app = new Elysia().use(tracingPlugin());
 * ```
 */
export function tracingPlugin() {
  return new Elysia({ name: 'tracing-plugin' }).onStart(() => {
    logger.info('Tracing plugin loaded (stub implementation)');
    // Full implementation will be added in Task 26
  });
}
