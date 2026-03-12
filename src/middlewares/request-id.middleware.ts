/**
 * Request ID Middleware
 *
 * Generates and tracks unique request IDs for distributed tracing and logging.
 *
 * Features:
 * - Generates unique request IDs using crypto.randomUUID()
 * - Preserves existing X-Request-ID header for distributed tracing
 * - Sets X-Request-ID header on all responses
 * - Adds request ID to context for logging
 *
 * @example
 * ```typescript
 * app.use(requestId())
 *
 * // Access in routes
 * app.get('/test', ({ requestId }) => {
 *   return { requestId }
 * })
 * ```
 */

import type { Elysia } from 'elysia';

/**
 * Request ID middleware configuration options
 */
export interface RequestIdOptions {
  /**
   * Header name to use for request ID
   * @default "X-Request-ID"
   */
  headerName?: string;
}

/**
 * Default request ID options
 */
const DEFAULT_OPTIONS: Required<RequestIdOptions> = {
  headerName: 'X-Request-ID',
};

/**
 * Trim and validate a request ID
 *
 * @param value - Request ID to validate
 * @returns Trimmed request ID or undefined if invalid
 */
function validateRequestId(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Create request ID middleware
 *
 * Generates a unique request ID for each incoming request and adds it to the context.
 * If an X-Request-ID header is present, it will be used instead of generating a new one.
 *
 * @param options - Middleware configuration options
 * @returns Elysia middleware plugin
 */
export function requestId(options: RequestIdOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (app: Elysia) =>
    app
      .derive(({ request }) => {
        // Check for existing request ID in headers
        const existingRequestId = request.headers.get(opts.headerName);
        const validatedRequestId = validateRequestId(existingRequestId);

        // Generate new request ID if not present
        const requestId = validatedRequestId || crypto.randomUUID();

        // Return request ID for use in context
        return {
          requestId,
        };
      })
      .onAfterHandle(({ requestId, set }) => {
        // Set request ID header on response
        const headerValue = typeof requestId === 'string' ? requestId : crypto.randomUUID();
        set.headers[opts.headerName] = headerValue;
      })
      .onError(({ requestId, set }) => {
        // Ensure request ID is set even on error responses
        if (!set.headers[opts.headerName]) {
          const headerValue = typeof requestId === 'string' ? requestId : crypto.randomUUID();
          set.headers[opts.headerName] = headerValue;
        }
      });
}
