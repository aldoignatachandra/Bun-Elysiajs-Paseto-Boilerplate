import { Elysia } from 'elysia';

/**
 * Compression plugin configuration
 */
export interface CompressionConfig {
  /**
   * Minimum size in bytes to compress (default: 1024)
   */
  threshold?: number;

  /**
   * Compression level (default: 6)
   * Range: 0-9 (0 = no compression, 9 = maximum compression)
   */
  level?: number;

  /**
   * Compressible content types (default: common text-based types)
   */
  types?: string[];
}

/**
 * Default compressible content types
 */
const DEFAULT_COMPRESSIBLE_TYPES = [
  'text/*',
  'application/json',
  'application/javascript',
  'application/xml',
  'text/html',
  'text/css',
  'text/plain',
  'text/javascript',
];

/**
 * Default threshold in bytes (1KB)
 */
const DEFAULT_THRESHOLD = 1024;

/**
 * Default compression level
 */
const DEFAULT_LEVEL = 6;

/**
 * Check if a content type is compressible
 */
function isCompressibleType(
  contentType: string | null | undefined,
  compressibleTypes: string[]
): boolean {
  if (!contentType) {
    return false;
  }

  const normalizedContentType = contentType.toLowerCase().split(';')[0].trim();

  return compressibleTypes.some(type => {
    if (type.endsWith('/*')) {
      const prefix = type.slice(0, -2);
      return normalizedContentType.startsWith(prefix);
    }
    return normalizedContentType === type;
  });
}

/**
 * Check if client accepts gzip encoding
 */
function acceptsGzip(acceptEncoding: string | null): boolean {
  if (!acceptEncoding) {
    return false;
  }

  // Parse Accept-Encoding header
  const encodings = acceptEncoding.split(',').map(e => e.trim().toLowerCase());

  // Check for gzip or */* (wildcard)
  for (const encoding of encodings) {
    const [encodingType, qValue] = encoding.split(';q=');

    // Parse q-value (default to 1 if not specified)
    const q = qValue ? parseFloat(qValue) : 1.0;

    // Accept if gzip is present with q-value > 0
    if (encodingType === 'gzip' && q > 0) {
      return true;
    }

    // Accept wildcard if q-value > 0
    if (encodingType === '*' && q > 0) {
      return true;
    }

    // Also check for identity (which means no transformation preferred)
    // If only identity is specified, don't compress
    if (encodingType === 'identity' && q === 1.0 && encodings.length === 1) {
      return false;
    }
  }

  return false;
}

/**
 * Get the request's Accept-Encoding header
 */
function getAcceptEncoding(request: Request): string | null {
  return request.headers.get('Accept-Encoding');
}

/**
 * Response compression plugin
 *
 * Compresses responses based on Content-Type and size threshold.
 * Uses gzip compression for text-based content types.
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { compressionPlugin } from '@/plugins/compression.plugin';
 *
 * const app = new Elysia().use(compressionPlugin());
 * ```
 *
 * @example
 * ```typescript
 * // With custom configuration
 * const app = new Elysia().use(
 *   compressionPlugin({
 *     threshold: 500,        // 500 bytes
 *     level: 9,              // Maximum compression
 *     types: ['application/json', 'text/html'],
 *   })
 * );
 * ```
 */
export function compressionPlugin(config: CompressionConfig = {}) {
  const threshold = config.threshold ?? DEFAULT_THRESHOLD;
  const level = config.level ?? DEFAULT_LEVEL;
  const compressibleTypes = config.types ?? DEFAULT_COMPRESSIBLE_TYPES;
  const encoder = new TextEncoder();

  return new Elysia({ name: 'compression-plugin' }).onAfterHandle(
    { as: 'global' },
    async ({ request, response, set }) => {
      // Check if client accepts gzip
      const acceptEncoding = getAcceptEncoding(request);
      if (!acceptsGzip(acceptEncoding)) {
        return;
      }

      // Skip if response is already a Response object with Content-Encoding
      if (response instanceof Response) {
        const existingEncoding = response.headers.get('Content-Encoding');
        if (existingEncoding) {
          return;
        }

        // Get content type
        const contentType = response.headers.get('Content-Type');

        // Skip if content type is not compressible
        if (!isCompressibleType(contentType, compressibleTypes)) {
          return;
        }

        // Get response body
        const body = response.body;
        if (!body) {
          return;
        }

        // Read the body to check size and compress
        const arrayBuffer = await response.arrayBuffer();

        // Skip if below threshold
        if (arrayBuffer.byteLength < threshold) {
          return;
        }

        // Compress the body
        const compressed = Bun.gzipSync(new Uint8Array(arrayBuffer), { level });

        // Update headers
        set.headers['Content-Encoding'] = 'gzip';
        set.headers['Content-Length'] = compressed.byteLength.toString();

        // Return new compressed response
        return new Response(compressed, {
          status: response.status,
          headers: response.headers,
        });
      }

      // Handle non-Response responses (objects, strings, etc.)
      // Skip null/undefined responses
      if (response === null || response === undefined) {
        return;
      }

      // Convert response to string and check size
      const responseString = typeof response === 'string' ? response : JSON.stringify(response);
      const responseBytes = encoder.encode(responseString);

      // Skip if below threshold
      if (responseBytes.byteLength < threshold) {
        return;
      }

      // Compress the response
      const compressed = Bun.gzipSync(responseBytes, { level });

      // Set appropriate headers
      const contentType = set.headers['Content-Type'] || 'application/json';
      set.headers['Content-Encoding'] = 'gzip';
      set.headers['Content-Length'] = compressed.byteLength.toString();

      return new Response(compressed, {
        headers: {
          'Content-Type': contentType,
        },
      });
    }
  );
}
