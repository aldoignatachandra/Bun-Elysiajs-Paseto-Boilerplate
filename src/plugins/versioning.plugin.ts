import { Elysia } from 'elysia';
import { versionManager } from '@core/versioning/version-manager';
import type { ApiVersion, VersionErrorResponse } from '@core/versioning/types';
import { logger } from '@core/logging/logger';

/**
 * Versioning Plugin Options
 */
interface VersioningPluginOptions {
  /** Path prefix for API routes (default: '/api') */
  apiPrefix?: string;
  /** Whether to enable Accept header version negotiation (default: true) */
  enableAcceptHeader?: boolean;
  /** Custom vendor prefix for Accept header (default: 'application/vnd.api') */
  vendorPrefix?: string;
  /** Whether to add apiVersion to all responses (default: true) */
  enhanceResponses?: boolean;
}

/**
 * Extract version from Accept header.
 * @param acceptHeader The Accept header value
 * @param vendorPrefix The vendor prefix to match
 * @returns The extracted version or null
 */
function extractVersionFromAcceptHeader(
  acceptHeader: string | null,
  vendorPrefix: string
): ApiVersion | null {
  if (!acceptHeader) {
    return null;
  }

  // Match patterns like: application/vnd.api.v1+json
  const pattern = new RegExp(`${vendorPrefix.replace(/\./g, '\\.')}\\.(v\\d+)`);
  const match = acceptHeader.match(pattern);

  if (match && match[1]) {
    return match[1] as ApiVersion;
  }

  return null;
}

/**
 * Check if the request path is an API path.
 * @param path The request path
 * @param apiPrefix The API prefix
 * @returns true if it's an API path
 */
function isApiPath(path: string, apiPrefix: string): boolean {
  return path.startsWith(apiPrefix);
}

/**
 * Versioning context stored in the store
 */
interface VersioningStore {
  apiVersion?: string;
  deprecationWarning?: string;
  versionError?: VersionErrorResponse;
}

/**
 * Versioning Plugin
 *
 * Provides API versioning support with the following features:
 * - URL-based versioning (/api/v1/, /api/v2/, etc.)
 * - Accept header-based version negotiation
 * - Automatic API-Version header injection
 * - Deprecation header for deprecated versions
 * - Response enhancement with version information
 * - Unsupported version detection and error responses
 *
 * @example
 * ```ts
 * import { Elysia } from 'elysia';
 * import { versioningPlugin } from '@/plugins/versioning.plugin';
 *
 * const app = new Elysia()
 *   .use(versioningPlugin())
 *   .get('/api/v1/users', () => ({ users: [] }))
 *   .get('/api/v2/users', () => ({ users: [], metadata: {} }));
 * ```
 *
 * @example
 * ```ts
 * // Custom configuration
 * const app = new Elysia()
 *   .use(versioningPlugin({
 *     apiPrefix: '/api',
 *     enableAcceptHeader: true,
 *     vendorPrefix: 'application/vnd.myapp',
 *   }));
 * ```
 */
export const versioningPlugin = (options: VersioningPluginOptions = {}) => {
  const {
    apiPrefix = '/api',
    enableAcceptHeader = true,
    vendorPrefix = 'application/vnd.api',
    enhanceResponses = true,
  } = options;

  return new Elysia({
    name: 'versioning-plugin',
  })
    .onBeforeHandle({ as: 'global' }, ({ request, path, set, store }) => {
      // Only process API paths
      if (!isApiPath(path, apiPrefix)) {
        return;
      }

      const versioningStore = store as VersioningStore;

      // Extract version from URL path first
      let apiVersion = versionManager.parseVersionFromPath(path);

      // If no version in path, try Accept header (if enabled)
      if (!apiVersion && enableAcceptHeader) {
        const acceptHeader = request.headers.get('Accept');
        const headerVersion = extractVersionFromAcceptHeader(acceptHeader, vendorPrefix);
        if (headerVersion) {
          apiVersion = headerVersion;
        }
      }

      // Use default version if no version specified
      const resolvedVersion = apiVersion || versionManager.getDefaultVersion();

      // Check if version is supported
      if (apiVersion && !versionManager.isVersionSupported(resolvedVersion)) {
        const errorResponse: VersionErrorResponse = {
          error: `unsupported API version: '${apiVersion}'. This version is not supported.`,
          supportedVersions: versionManager.getActiveVersions(),
          suggestedVersion: versionManager.getDefaultVersion(),
          details: `Please use one of the supported versions: ${versionManager.getActiveVersions().join(', ')}`,
        };

        versioningStore.versionError = errorResponse;
        set.status = 400;
        set.headers['Content-Type'] = 'application/json';
        // Return the error response immediately
        return errorResponse;
      }

      // Set API-Version header
      set.headers['API-Version'] = resolvedVersion;

      // Check for deprecation
      const isDeprecated = versionManager.isVersionDeprecated(resolvedVersion);
      let deprecationWarning: string | null = null;

      if (isDeprecated) {
        const deprecationInfo = versionManager.getDeprecationInfo(resolvedVersion);
        if (deprecationInfo) {
          // Set Deprecation header (RFC 8594)
          set.headers['Deprecation'] = `version=${resolvedVersion}`;
          set.headers['Sunset'] = deprecationInfo.sunsetAt.toISOString();

          // Generate warning message
          deprecationWarning = versionManager.warnDeprecatedVersion(resolvedVersion);

          // Log deprecated version usage
          logger.warn({
            message: 'Deprecated API version accessed',
            version: resolvedVersion,
            path: path,
            deprecationDate: deprecationInfo.since,
            sunsetDate: deprecationInfo.sunsetAt,
            userAgent: request.headers.get('User-Agent'),
          });
        }
      }

      // Store versioning info for later use
      versioningStore.apiVersion = resolvedVersion;
      if (deprecationWarning) {
        versioningStore.deprecationWarning = deprecationWarning;
      }

      return;
    })
    .onAfterHandle({ as: 'global' }, ({ response, store, path }) => {
      // Skip if not an API path or if responses shouldn't be enhanced
      if (!isApiPath(path, apiPrefix) || !enhanceResponses) {
        return response;
      }

      const versioningStore = store as VersioningStore;

      // If there's a version error, don't modify the response
      if (versioningStore.versionError) {
        return response;
      }

      const apiVersion = versioningStore.apiVersion;
      const deprecationWarning = versioningStore.deprecationWarning;

      if (!apiVersion) {
        return response;
      }

      // Only enhance object responses (not arrays, strings, numbers, etc.)
      if (typeof response === 'object' && response !== null && !Array.isArray(response)) {
        // Check if response already has apiVersion
        if ('apiVersion' in response) {
          return response;
        }

        // Add apiVersion to response
        const enhanced = {
          ...response,
          apiVersion,
        } as Record<string, unknown>;

        if (deprecationWarning) {
          enhanced.deprecationWarning = deprecationWarning;
        }

        return enhanced;
      }

      return response;
    })
    .onError({ as: 'global' }, ({ set }) => {
      // Set content type for error responses
      if (!set.headers['Content-Type']) {
        set.headers['Content-Type'] = 'application/json';
      }
      return;
    });
};

export type { VersioningPluginOptions };
