/**
 * Request Size Middleware
 *
 * Limits the size of incoming request bodies to prevent payload overflow attacks.
 *
 * Features:
 * - Configurable maximum request body size
 * - Checks Content-Length header before processing body
 * - Returns 413 Payload Too Large if exceeded
 * - Skips checks for GET/HEAD/OPTIONS requests
 *
 * @example
 * ```typescript
 * // Limit to 1MB (default)
 * app.use(requestSize())
 *
 * // Limit to 100KB
 * app.use(requestSize({ maxSize: 100 * 1024 }))
 *
 * // Limit to 5MB
 * app.use(requestSize({ maxSize: 5 * 1024 * 1024 }))
 * ```
 */

import type { Elysia } from 'elysia';
import { PayloadTooLargeError } from '@/core/errors/app-error';

/**
 * HTTP methods that should not have a request body
 */
const BODYLESS_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Request size middleware configuration options
 */
export interface RequestSizeOptions {
  /**
   * Maximum request body size in bytes
   * @default 1048576 (1MB)
   */
  maxSize?: number;
}

/**
 * Default request size options
 */
const DEFAULT_OPTIONS: Required<RequestSizeOptions> = {
  maxSize: 1048576, // 1MB
};

/**
 * Parse Content-Length header value
 *
 * @param value - Content-Length header string
 * @returns Parsed size or undefined if invalid
 */
function parseContentLength(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  // Check if NaN, negative, or not an integer
  if (Number.isNaN(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return undefined;
  }

  return parsed;
}

/**
 * Create request size middleware
 *
 * Checks the Content-Length header and rejects requests that exceed the configured size limit.
 * GET, HEAD, and OPTIONS requests are not checked as they should not have a request body.
 *
 * @param options - Middleware configuration options
 * @returns Elysia middleware plugin
 */
export function requestSize(options: RequestSizeOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (app: Elysia) =>
    app.onBeforeHandle(({ request }) => {
      const method = request.method;

      // Skip size check for methods that shouldn't have a body
      if (BODYLESS_METHODS.has(method)) {
        return;
      }

      // Get Content-Length header
      const contentLength = request.headers.get('Content-Length');

      // If no Content-Length header, allow the request (will be checked by body parser)
      if (!contentLength) {
        return;
      }

      // Parse Content-Length
      const size = parseContentLength(contentLength);

      // If Content-Length is invalid, reject the request
      if (size === undefined) {
        throw new PayloadTooLargeError('Invalid Content-Length header');
      }

      // Check if size exceeds limit
      if (size > opts.maxSize) {
        throw new PayloadTooLargeError(
          `Request body size ${size} bytes exceeds maximum allowed size of ${opts.maxSize} bytes`
        );
      }

      // Size is within limits, allow the request
    });
}
