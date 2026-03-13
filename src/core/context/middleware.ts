/**
 * Request Context Enhancer Middleware
 *
 * Elysia plugin for enhancing request context with metadata,
 * timing information, and user data.
 *
 * @example
 * ```typescript
 * import { requestContextPlugin } from './core/context';
 *
 * app.use(requestContextPlugin())
 *
 * // Access in routes
 * app.get('/test', ({ requestContext, requestId, user }) => {
 *   return { requestId, hasUser: !!user }
 * })
 * ```
 */

import type { Elysia } from 'elysia';
import type { ContextEnhancerOptions, RequestContext, AugmentedContext } from './types';
import { createContext, calculateDuration, finalizeMetrics, addPerformanceMarker, getTimeSince } from './request-context';
import { logger } from '../logging/logger';

/**
 * Default context enhancer options
 */
const DEFAULT_OPTIONS: Required<Omit<ContextEnhancerOptions, 'ipHeaders'>> & {
  ipHeaders: string[];
} = {
  requestIdHeader: 'X-Request-ID',
  ipHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'x-client-ip'],
  trustProxy: true,
  maxProxyDepth: 10,
};

/**
 * Request context enhancer plugin
 *
 * Enhances Elysia context with:
 * - Request metadata (ID, IP, user-agent, etc.)
 * - Performance timing (start time, duration)
 * - User information (from auth middleware)
 * - Convenience accessors
 *
 * @param options - Plugin configuration options
 * @returns Elysia plugin
 */
export function requestContextPlugin(options: Partial<ContextEnhancerOptions> = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (app: Elysia) =>
    app
      .derive(({ request }) => {
        // Create base request context
        const requestContext = createContext(request, opts);
        const requestStart = requestContext.performance.startTime;

        return {
          requestContext,
          requestId: requestContext.metadata.requestId,
          requestStart,
          clientIp: requestContext.metadata.clientIp,
          userAgent: requestContext.metadata.userAgent,
        } as const;
      })
      .onAfterHandle(({ requestContext, set }) => {
        // Finalize performance metrics
        const context = requestContext;
        const finalMetrics = finalizeMetrics(context.performance);

        // Log request completion
        const duration = finalMetrics.duration || calculateDuration(finalMetrics);
        const metadata = context.metadata;

        logger.info('Request completed', {
          requestId: metadata.requestId,
          method: metadata.method,
          path: metadata.path,
          status: set.status || 200,
          duration: `${duration.toFixed(2)}ms`,
          clientIp: metadata.clientIp,
        });

        // Set response headers
        set.headers[opts.requestIdHeader] = metadata.requestId;
        set.headers['X-Response-Time'] = `${duration.toFixed(2)}ms`;
      })
      .onError(({ requestContext, set, error }) => {
        // Finalize performance metrics
        const context = requestContext as RequestContext;
        const finalMetrics = finalizeMetrics(context.performance);

        // Log error
        const duration = finalMetrics.duration || calculateDuration(finalMetrics);
        const metadata = context.metadata;

        logger.error('Request failed', error, {
          requestId: metadata.requestId,
          method: metadata.method,
          path: metadata.path,
          status: set.status || 500,
          duration: `${duration.toFixed(2)}ms`,
          clientIp: metadata.clientIp,
        });

        // Ensure request ID header is set
        if (!set.headers[opts.requestIdHeader]) {
          set.headers[opts.requestIdHeader] = metadata.requestId;
        }
      })
      .derive(({ requestContext }) => {
        // Derive user context from auth middleware
        const context = requestContext;

        // Check if auth middleware has already set user
        // This will be populated when auth middleware runs before this plugin
        return {
          get user() {
            return (context as AugmentedContext).user;
          },
          get tokenId() {
            return (context as AugmentedContext).tokenId;
          },
        };
      });
}

/**
 * Convenience function to get request duration
 *
 * @param requestStart - Request start timestamp
 * @returns Duration in milliseconds
 */
export function getRequestDuration(requestStart: number): number {
  return performance.now() - requestStart;
}

/**
 * Convenience function to add performance marker to context
 *
 * @param requestContext - Request context
 * @param name - Marker name
 */
export function addMarker(requestContext: RequestContext, name: string): void {
  addPerformanceMarker(requestContext.performance, name);
}

/**
 * Convenience function to get time since marker or start
 *
 * @param requestContext - Request context
 * @param marker - Marker name (undefined for start)
 * @returns Time in milliseconds
 */
export function getTimeSinceMarker(requestContext: RequestContext, marker?: string): number {
  return getTimeSince(requestContext.performance, marker);
}

/**
 * Convenience function to check if request exceeds threshold
 *
 * @param requestContext - Request context
 * @param thresholdMs - Threshold in milliseconds
 * @returns True if exceeds threshold
 */
export function exceedsThreshold(requestContext: RequestContext, thresholdMs: number): boolean {
  return calculateDuration(requestContext.performance) > thresholdMs;
}
