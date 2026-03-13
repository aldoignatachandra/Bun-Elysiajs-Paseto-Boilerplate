/**
 * RequestContext Class
 *
 * Main class for managing enhanced request context.
 * Provides methods for creating and manipulating request context.
 */

import type { RequestMetadata, PerformanceMetrics, RequestContext } from './types';

/**
 * Default options for context enhancement
 */
const DEFAULT_OPTIONS = {
  requestIdHeader: 'X-Request-ID',
  ipHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'x-client-ip'],
  trustProxy: true,
  maxProxyDepth: 10,
};

/**
 * Extract client IP from request headers
 *
 * Handles proxy chains and X-Forwarded-For format
 *
 * @param request - Incoming request
 * @param options - IP extraction options
 * @returns Client IP information
 */
function extractClientIp(
  request: Request,
  options: {
    ipHeaders: string[];
    trustProxy: boolean;
    maxProxyDepth: number;
  }
): { clientIp: string; originalIp?: string; ipChain: string[] } {
  const headers = request.headers;
  const ipChain: string[] = [];

  // Check each IP header
  for (const headerName of options.ipHeaders) {
    const headerValue = headers.get(headerName);
    if (headerValue) {
      // Handle X-Forwarded-For format: "client, proxy1, proxy2"
      const ips = headerValue
        .split(',')
        .map(ip => ip.trim())
        .filter(ip => ip.length > 0);
      ipChain.push(...ips);
    }
  }

  // Apply proxy depth limit
  const limitedChain = ipChain.slice(-options.maxProxyDepth);

  // The first IP is typically the original client (leftmost in X-Forwarded-For)
  const originalIp = limitedChain[0];
  // The last IP is typically the immediate connection
  const directIp = 'unknown';

  const clientIp = options.trustProxy ? originalIp || directIp : directIp;

  return {
    clientIp,
    originalIp: options.trustProxy ? originalIp : undefined,
    ipChain: limitedChain,
  };
}

/**
 * Extract query parameters from URL
 *
 * @param url - Full URL string
 * @returns Query parameters as object
 */
function extractQueryParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  } catch {
    return {};
  }
}

/**
 * Extract request metadata from incoming request
 *
 * @param request - Incoming HTTP request
 * @param options - Context enhancer options
 * @returns Extracted request metadata
 */
export function extractRequestMetadata(
  request: Request,
  options: Partial<{
    requestIdHeader: string;
    ipHeaders: string[];
    trustProxy: boolean;
    maxProxyDepth: number;
  }> = {}
): RequestMetadata {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const headers = request.headers;
  const url = new URL(request.url);

  // Get or generate request ID
  const requestIdHeader = headers.get(opts.requestIdHeader);
  const requestId = requestIdHeader?.trim() || crypto.randomUUID();

  // Extract IP information
  const ipInfo = extractClientIp(request, {
    ipHeaders: opts.ipHeaders || DEFAULT_OPTIONS.ipHeaders,
    trustProxy: opts.trustProxy ?? DEFAULT_OPTIONS.trustProxy,
    maxProxyDepth: opts.maxProxyDepth ?? DEFAULT_OPTIONS.maxProxyDepth,
  });

  // Get user agent
  const userAgent = headers.get('user-agent') || 'unknown';

  // Extract query parameters
  const query = extractQueryParams(request.url);

  // Build metadata object
  const metadata: RequestMetadata = {
    requestId,
    clientIp: ipInfo.clientIp,
    originalIp: ipInfo.originalIp,
    userAgent,
    method: request.method,
    path: url.pathname,
    url: request.url,
    query,
    origin: `${url.protocol}//${url.host}`,
    contentType: headers.get('content-type') || undefined,
    accept: headers.get('accept') || undefined,
    acceptLanguage: headers.get('accept-language') || undefined,
    hasAuthorization: headers.has('authorization'),
    timestamp: new Date().toISOString(),
    ipChain: ipInfo.ipChain,
  };

  return metadata;
}

/**
 * Create initial performance metrics
 *
 * @returns Performance metrics object
 */
export function createInitialMetrics(): PerformanceMetrics {
  const startTime = performance.now();

  return {
    startTime,
    markers: new Map(),
  };
}

/**
 * Calculate request duration
 *
 * @param metrics - Performance metrics
 * @returns Duration in milliseconds
 */
export function calculateDuration(metrics: PerformanceMetrics): number {
  const endTime = metrics.endTime || performance.now();
  return endTime - metrics.startTime;
}

/**
 * Add performance marker
 *
 * @param metrics - Performance metrics
 * @param name - Marker name
 */
export function addPerformanceMarker(metrics: PerformanceMetrics, name: string): void {
  metrics.markers.set(name, performance.now());
}

/**
 * Get time since marker or start
 *
 * @param metrics - Performance metrics
 * @param marker - Marker name (undefined for start)
 * @returns Time in milliseconds
 */
export function getTimeSince(metrics: PerformanceMetrics, marker?: string): number {
  const now = performance.now();

  if (marker) {
    const markerTime = metrics.markers.get(marker);
    if (markerTime !== undefined) {
      return now - markerTime;
    }
  }

  return now - metrics.startTime;
}

/**
 * Finalize performance metrics
 *
 * @param metrics - Performance metrics
 * @returns Finalized metrics
 */
export function finalizeMetrics(metrics: PerformanceMetrics): PerformanceMetrics {
  if (metrics.endTime !== undefined) {
    return metrics;
  }

  return {
    ...metrics,
    endTime: performance.now(),
    duration: performance.now() - metrics.startTime,
  };
}

/**
 * Create request context object
 *
 * @param request - Incoming HTTP request
 * @param options - Context enhancer options
 * @returns Request context object
 */
export function createContext(
  request: Request,
  options: Partial<{
    requestIdHeader: string;
    ipHeaders: string[];
    trustProxy: boolean;
    maxProxyDepth: number;
  }> = {}
): RequestContext {
  const metadata = extractRequestMetadata(request, options);
  const performance = createInitialMetrics();

  return {
    metadata,
    performance,
  };
}
