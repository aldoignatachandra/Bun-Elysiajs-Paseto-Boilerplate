import { Elysia } from 'elysia';

/**
 * Security headers plugin configuration
 */
export interface SecurityHeadersConfig {
  /** Custom Content-Security-Policy header value. Overrides default strict policy. */
  contentSecurityPolicy?: string;
  /** Max-age for Strict-Transport-Security in seconds (default: 31536000 = 1 year) */
  hstsMaxAge?: number;
  /** Include subdomains in HSTS header (default: true) */
  hstsIncludeSubDomains?: boolean;
  /** Include preload directive in HSTS header (default: false) */
  hstsPreload?: boolean;
  /** X-Frame-Options header value (default: 'DENY') */
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  /** Enable X-Content-Type-Options header (default: true) */
  xContentTypeOptions?: boolean;
  /** Referrer-Policy header value (default: 'no-referrer') */
  referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'same-origin';
  /** Permissions-Policy header values as array (default: ['camera=()', 'microphone=()', 'geolocation=(self)', 'interest-cohort=()']) */
  permissionsPolicy?: string[];
  /** Enable Content-Security-Policy header (default: true) */
  enableCSP?: boolean;
  /** Enable Strict-Transport-Security header (default: true, only applies in production) */
  enableHSTS?: boolean;
}

/**
 * Default CSP policy for strict security
 */
const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';";

/**
 * Default Permissions-Policy for browser features
 */
const DEFAULT_PERMISSIONS_POLICY = [
  'camera=()',
  'microphone=()',
  'geolocation=(self)',
  'interest-cohort=()',
];

/**
 * Build HSTS header value from configuration
 */
function buildHSTSHeader(config: SecurityHeadersConfig): string {
  const maxAge = config.hstsMaxAge ?? 31536000;
  const includeSubDomains = config.hstsIncludeSubDomains ?? true;
  const preload = config.hstsPreload ?? false;

  let header = `max-age=${maxAge}`;

  if (includeSubDomains) {
    header += '; includeSubDomains';
  }

  if (preload) {
    header += '; preload';
  }

  return header;
}

/**
 * Build Permissions-Policy header from array
 */
function buildPermissionsPolicy(policy: string[]): string {
  return policy.join(', ');
}

/**
 * Apply security headers to the response
 */
function applySecurityHeaders(
  set: { headers: Record<string, string> },
  config: SecurityHeadersConfig,
  enableCSP: boolean,
  enableHSTS: boolean,
  xContentTypeOptions: boolean,
  cspHeader: string,
  permissionsPolicyHeader: string,
  xFrameOptionsHeader: string,
  referrerPolicyHeader: string
) {
  // Content-Security-Policy
  if (enableCSP) {
    set.headers['Content-Security-Policy'] = cspHeader;
  }

  // Strict-Transport-Security (HSTS) - only in production
  if (enableHSTS && process.env.NODE_ENV === 'production') {
    set.headers['Strict-Transport-Security'] = buildHSTSHeader(config);
  }

  // X-Frame-Options
  set.headers['X-Frame-Options'] = xFrameOptionsHeader;

  // X-Content-Type-Options
  if (xContentTypeOptions) {
    set.headers['X-Content-Type-Options'] = 'nosniff';
  }

  // Referrer-Policy
  set.headers['Referrer-Policy'] = referrerPolicyHeader;

  // Permissions-Policy
  set.headers['Permissions-Policy'] = permissionsPolicyHeader;

  // X-XSS-Protection (legacy but still useful)
  set.headers['X-XSS-Protection'] = '1; mode=block';

  // X-DNS-Prefetch-Control
  set.headers['X-DNS-Prefetch-Control'] = 'off';

  // X-Download-Options (IE)
  set.headers['X-Download-Options'] = 'noopen';

  // X-Permitted-Cross-Domain-Policies
  set.headers['X-Permitted-Cross-Domain-Policies'] = 'none';

  // Cross-Origin-Opener-Policy
  set.headers['Cross-Origin-Opener-Policy'] = 'same-origin';

  // Cross-Origin-Resource-Policy
  set.headers['Cross-Origin-Resource-Policy'] = 'same-origin';

  // Remove X-Powered-By if present
  delete set.headers['X-Powered-By'];
}

/**
 * Security headers plugin
 *
 * Adds comprehensive security headers to all responses:
 * - Content-Security-Policy (CSP) - Controls resource loading
 * - Strict-Transport-Security (HSTS) - Enforces HTTPS (production only)
 * - X-Frame-Options - Prevents clickjacking
 * - X-Content-Type-Options - Prevents MIME sniffing
 * - Referrer-Policy - Controls referrer information
 * - Permissions-Policy - Controls browser features
 * - X-XSS-Protection - Legacy XSS protection
 * - X-DNS-Prefetch-Control - Controls DNS prefetching
 * - X-Download-Options - IE security
 * - X-Permitted-Cross-Domain-Policies - Cross-domain policies
 * - Cross-Origin-Opener-Policy - Cross-origin opener control
 * - Cross-Origin-Resource-Policy - Cross-origin resource control
 * - Removes X-Powered-By - Hides server information
 *
 * @example
 * ```typescript
 * import { Elysia } from 'elysia';
 * import { securityHeadersPlugin } from '@/plugins/security-headers.plugin';
 *
 * // Use with defaults
 * const app = new Elysia().use(securityHeadersPlugin());
 *
 * // Use with custom configuration
 * const app = new Elysia().use(securityHeadersPlugin({
 *   contentSecurityPolicy: "default-src 'self'",
 *   hstsMaxAge: 86400,
 *   xFrameOptions: 'SAMEORIGIN',
 * }));
 * ```
 */
export function securityHeadersPlugin(config: SecurityHeadersConfig = {}) {
  const enableCSP = config.enableCSP ?? true;
  const enableHSTS = config.enableHSTS ?? true;
  const xContentTypeOptions = config.xContentTypeOptions ?? true;

  // Precompute headers that don't change
  const cspHeader = config.contentSecurityPolicy ?? DEFAULT_CSP;
  const permissionsPolicyHeader = buildPermissionsPolicy(
    config.permissionsPolicy ?? DEFAULT_PERMISSIONS_POLICY
  );
  const xFrameOptionsHeader = config.xFrameOptions ?? 'DENY';
  const referrerPolicyHeader = config.referrerPolicy ?? 'no-referrer';

  return new Elysia({ name: 'security-headers-plugin' })
    .onBeforeHandle({ as: 'global' }, ({ set }) => {
      applySecurityHeaders(
        set,
        config,
        enableCSP,
        enableHSTS,
        xContentTypeOptions,
        cspHeader,
        permissionsPolicyHeader,
        xFrameOptionsHeader,
        referrerPolicyHeader
      );
    })
    .onError({ as: 'global' }, ({ set }) => {
      applySecurityHeaders(
        set,
        config,
        enableCSP,
        enableHSTS,
        xContentTypeOptions,
        cspHeader,
        permissionsPolicyHeader,
        xFrameOptionsHeader,
        referrerPolicyHeader
      );
    });
}
