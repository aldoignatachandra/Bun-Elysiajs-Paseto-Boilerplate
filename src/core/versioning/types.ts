/**
 * API Version Type
 * Represents the supported API versions in the system.
 * 'latest' is a special type that resolves to the current default version.
 */
export type ApiVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'latest';

/**
 * Deprecation Information
 * Contains details about a deprecated API version.
 */
export interface DeprecationInfo {
  /** Date when the version was deprecated */
  since: Date;
  /** Date when the version will be sunset (removed) */
  sunsetAt: Date;
  /** Version that clients should migrate to */
  migrateTo: string;
}

/**
 * Version Configuration
 * Configuration for API versioning behavior.
 */
export interface VersionConfig {
  /** Default version to use when no version is specified */
  defaultVersion: ApiVersion;
  /** List of currently supported API versions */
  supportedVersions: ApiVersion[];
  /** List of deprecated API versions (still supported but will be removed) */
  deprecatedVersions: ApiVersion[];
  /** Optional date when deprecated versions were marked as deprecated */
  deprecationDate?: Date;
}

/**
 * Versioned Response Wrapper
 * Standard response format that includes API version information.
 * @template T The type of data being returned
 */
export interface VersionedResponse<T> {
  /** The API version that served this response */
  apiVersion: string;
  /** The response data */
  data: T;
  /** Optional deprecation warning if using a deprecated version */
  deprecationWarning?: string;
}

/**
 * Version Negotiation Options
 * Options for how API versioning should be negotiated.
 */
export interface VersionNegotiationOptions {
  /** Whether to enable version negotiation via Accept header */
  enableAcceptHeader?: boolean;
  /** The default format for Accept header versioning */
  acceptHeaderFormat?: 'vendor' | 'version';
  /** Custom vendor prefix for Accept header (default: 'application/vnd.api') */
  vendorPrefix?: string;
}

/**
 * Version Error Response
 * Response structure for version-related errors.
 */
export interface VersionErrorResponse {
  /** Error message */
  error: string;
  /** List of supported versions */
  supportedVersions: ApiVersion[];
  /** Suggested version to use */
  suggestedVersion: ApiVersion;
  /** Additional information about the error */
  details?: string;
}
