/**
 * Request Context Types
 *
 * Type definitions for the request context enhancer system.
 * Provides type-safe context augmentation for Elysia requests.
 */

/**
 * User information from authenticated request
 */
export interface RequestUser {
  /** Unique user identifier */
  id: string;

  /** User email address */
  email?: string;

  /** User role */
  role?: string;

  /** User permissions */
  permissions?: string[];

  /** User first name */
  firstName?: string;

  /** User last name */
  lastName?: string;

  /** Account active status */
  isActive?: boolean;

  /** Email verification status */
  emailVerified?: boolean;

  /** Account creation timestamp */
  createdAt?: Date;

  /** Last login timestamp */
  lastLoginAt?: Date | null;

  /** Last update timestamp */
  updatedAt?: Date;

  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * Request metadata extracted from incoming request
 */
export interface RequestMetadata {
  /** Unique identifier for this request */
  requestId: string;

  /** Client IP address */
  clientIp: string;

  /** Original client IP before proxies */
  originalIp?: string;

  /** Client user agent string */
  userAgent: string;

  /** HTTP request method */
  method: string;

  /** Request path (without query string) */
  path: string;

  /** Full request URL including query string */
  url: string;

  /** Query parameters */
  query: Record<string, string>;

  /** Request origin (scheme + host) */
  origin: string;

  /** Content type header */
  contentType?: string;

  /** Accept header */
  accept?: string;

  /** Accept language header */
  acceptLanguage?: string;

  /** Authorization header presence (boolean, not the actual value) */
  hasAuthorization: boolean;

  /** Request timestamp (ISO 8601) */
  timestamp: string;

  /** IP address chain from proxies */
  ipChain?: string[];
}

/**
 * Performance metrics for request tracking
 */
export interface PerformanceMetrics {
  /** Request start time (high resolution timestamp) */
  startTime: number;

  /** Request end time (high resolution timestamp) */
  endTime?: number;

  /** Total duration in milliseconds */
  duration?: number;

  /** Custom performance markers */
  markers: Map<string, number>;
}

/**
 * Enhanced request context
 */
export interface RequestContext {
  /** Extracted request metadata */
  metadata: RequestMetadata;

  /** Performance tracking utilities */
  performance: PerformanceMetrics;

  /** Authenticated user information (when available) */
  user?: RequestUser;

  /** Token ID from PASETO token (when authenticated) */
  tokenId?: string;
}

/**
 * Context enhancer plugin options
 */
export interface ContextEnhancerOptions {
  /** Header name for request ID */
  requestIdHeader?: string;

  /** IP headers to check (in order of priority) */
  ipHeaders?: string[];

  /** Trust proxy headers for IP extraction */
  trustProxy?: boolean;

  /** Maximum number of proxies in chain */
  maxProxyDepth?: number;
}

/**
 * Elysia context augmented with request context
 */
export interface AugmentedContext {
  /** Request context object */
  requestContext: RequestContext;

  /** Request ID (convenience accessor) */
  requestId: string;

  /** Request start time (for duration calculation) */
  requestStart: number;

  /** Client IP address */
  clientIp?: string;

  /** User agent string */
  userAgent?: string;

  /** Authenticated user (when available) */
  user?: RequestUser;

  /** Token ID (when authenticated) */
  tokenId?: string;
}
