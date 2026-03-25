/**
 * Security Headers Middleware
 *
 * Provides OWASP-recommended security headers for Elysia applications.
 * Includes Content Security Policy (CSP) with nonce support and configurable policies.
 *
 * Features:
 * - Content Security Policy with nonce generation
 * - HTTP Strict Transport Security (HSTS)
 * - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
 * - Referrer-Policy, Permissions-Policy
 * - Cross-Origin isolation headers (COOP, CORP, COEP)
 * - Environment-aware configuration (dev vs production)
 *
 * @example
 * ```typescript
 * import { securityHeaders } from '@/core/security';
 *
 * app.use(securityHeaders())
 * ```
 *
 * @example with custom config
 * ```typescript
 * app.use(securityHeaders({
 *   config: {
 *     contentSecurityPolicy: {
 *       directives: [
 *         { name: 'script-src', sources: ["'self'", 'https://cdn.example.com'] }
 *       ]
 *     }
 *   }
 * }))
 * ```
 */

import type { Elysia } from 'elysia';
import type { SecurityHeadersOptions, SecurityHeadersConfig, SecurityLevel, CspConfig, HstsConfig, CspDirective } from './types';
import { SecurityLevel as SecurityLevelEnum } from './types';
import { generateNonce } from './nonce';

/**
 * Default CSP directives for production
 */
const DEFAULT_CSP_DIRECTIVES: CspDirective[] = [
  { name: 'default-src', sources: ["'self'"] },
  { name: 'script-src', sources: ["'self'"] },
  { name: 'style-src', sources: ["'self'", "'unsafe-inline'"] },
  { name: 'img-src', sources: ["'self'", 'data:', 'https:'] },
  { name: 'connect-src', sources: ["'self'"] },
  { name: 'font-src', sources: ["'self'"] },
  { name: 'object-src', sources: ["'none'"] },
  { name: 'frame-src', sources: ["'none'"] },
  { name: 'base-uri', sources: ["'self'"] },
  { name: 'form-action', sources: ["'self'"] },
  { name: 'frame-ancestors', sources: ["'none'"] },
];

/**
 * Development CSP directives (more permissive)
 */
const DEVELOPMENT_CSP_DIRECTIVES: CspDirective[] = [
  { name: 'default-src', sources: ["'self'"] },
  { name: 'script-src', sources: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http://localhost:*', 'ws://localhost:*'] },
  { name: 'style-src', sources: ["'self'", "'unsafe-inline'"] },
  { name: 'img-src', sources: ["'self'", 'data:', 'https:', 'http:'] },
  { name: 'connect-src', sources: ["'self'", 'http://localhost:*', 'ws://localhost:*'] },
  { name: 'font-src', sources: ["'self'", 'data:'] },
  { name: 'object-src', sources: ["'none'"] },
  { name: 'frame-src', sources: ["'self'"] },
  { name: 'base-uri', sources: ["'self'"] },
  { name: 'form-action', sources: ["'self'"] },
  { name: 'frame-ancestors', sources: ["'self'"] },
];

/**
 * Detect the current environment
 */
function detectEnvironment(): SecurityLevel {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();

  switch (nodeEnv) {
    case 'development':
    case 'dev':
      return SecurityLevelEnum.DEVELOPMENT;
    case 'production':
    case 'prod':
      return SecurityLevelEnum.PRODUCTION;
    case 'staging':
    case 'stage':
      return SecurityLevelEnum.STAGING;
    default:
      // Default to production for security
      return SecurityLevelEnum.PRODUCTION;
  }
}

/**
 * Get default configuration for environment
 */
function getDefaultConfig(environment: SecurityLevel): SecurityHeadersConfig {
  const isDevelopment = environment === SecurityLevelEnum.DEVELOPMENT;
  const isProduction = environment === SecurityLevelEnum.PRODUCTION;

  return {
    securityLevel: environment,
    contentSecurityPolicy: {
      enabled: true,
      reportOnly: isDevelopment,
      directives: isDevelopment ? DEVELOPMENT_CSP_DIRECTIVES : DEFAULT_CSP_DIRECTIVES,
    },
    strictTransportSecurity: isProduction
      ? {
          enabled: true,
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: false,
        }
      : false,
    xContentTypeOptions: 'nosniff',
    xFrameOptions: isDevelopment ? 'SAMEORIGIN' : 'DENY',
    xXssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: isDevelopment
      ? 'geolocation=(self),camera=(self),microphone=(self),payment=()'
      : 'geolocation=(),camera=(),microphone=(),payment=(),usb=()',
    crossOriginOpenerPolicy: isDevelopment ? 'unsafe-none' : 'same-origin',
    crossOriginResourcePolicy: isDevelopment ? 'cross-origin' : 'same-origin',
    crossOriginEmbedderPolicy: isDevelopment ? 'unsafe-none' : 'require-corp',
  };
}

/**
 * Merge user config with defaults
 */
function mergeConfig(defaults: SecurityHeadersConfig, userConfig?: Partial<SecurityHeadersConfig>): SecurityHeadersConfig {
  if (!userConfig) {
    return defaults;
  }

  return {
    ...defaults,
    ...userConfig,
    contentSecurityPolicy: mergeCspConfig(defaults.contentSecurityPolicy, userConfig.contentSecurityPolicy),
    strictTransportSecurity: mergeHstsConfig(defaults.strictTransportSecurity, userConfig.strictTransportSecurity),
    customHeaders: {
      ...defaults.customHeaders,
      ...userConfig.customHeaders,
    },
  };
}

/**
 * Merge CSP configuration
 */
function mergeCspConfig(defaults: CspConfig | boolean | undefined, user: CspConfig | boolean | undefined): CspConfig | boolean | undefined {
  if (user === false) return false;
  if (user === true) return defaults || true;
  if (!user) return defaults;

  const defaultConfig = defaults === true || !defaults ? {} : defaults;

  return {
    ...defaultConfig,
    ...user,
    directives: user.directives || defaultConfig.directives,
  };
}

/**
 * Merge HSTS configuration
 */
function mergeHstsConfig(defaults: HstsConfig | boolean | undefined, user: HstsConfig | boolean | undefined): HstsConfig | boolean | undefined {
  if (user === false) return false;
  if (user === true) return defaults || true;
  if (!user) return defaults;

  const defaultConfig = defaults === true || !defaults ? {} : defaults;

  return {
    ...defaultConfig,
    ...user,
  };
}

/**
 * Build CSP header value
 */
function buildCspHeaderValue(config: CspConfig | boolean | undefined): { name: string; value: string } | null {
  if (config === false || config === undefined) {
    return null;
  }

  const cspConfig = typeof config === 'boolean' ? {} : config;

  if (!cspConfig.enabled && cspConfig.enabled !== undefined) {
    return null;
  }

  let directives = cspConfig.directives || DEFAULT_CSP_DIRECTIVES;

  // Apply nonce if enabled
  if (cspConfig.useNonce) {
    const nonce = generateNonce();
    directives = directives.map(d => {
      if (d.name === 'script-src' || d.name === 'style-src') {
        return {
          ...d,
          sources: [`'nonce-${nonce}'`, ...d.sources.filter(s => s !== "'unsafe-inline'")],
        };
      }
      return d;
    });
  }

  // Filter enabled directives
  const enabledDirectives = directives.filter(d => d.enabled !== false);

  if (enabledDirectives.length === 0) {
    return null;
  }

  // Build directive strings
  const directiveStrings = enabledDirectives.map(d => {
    if (d.sources.length === 0) {
      return d.name;
    }
    return `${d.name} ${d.sources.join(' ')}`;
  });

  // Add report-uri if specified
  if (cspConfig.reportUri) {
    directiveStrings.push(`report-uri ${cspConfig.reportUri}`);
  }

  const value = directiveStrings.join('; ');
  const headerName = cspConfig.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

  return { name: headerName, value };
}

/**
 * Build HSTS header value
 */
function buildHstsHeaderValue(config: HstsConfig | boolean | undefined): { name: string; value: string } | null {
  if (config === false || config === undefined) {
    return null;
  }

  const hstsConfig = typeof config === 'boolean' ? {} : config;

  if (hstsConfig.enabled === false) {
    return null;
  }

  // Only set HSTS in production or if explicitly enabled
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction && !hstsConfig.force) {
    return null;
  }

  const maxAge = hstsConfig.maxAge ?? 31536000;
  const includeSubDomains = hstsConfig.includeSubDomains !== false;
  const preload = hstsConfig.preload || false;

  const directives = [`max-age=${maxAge}`];

  if (includeSubDomains) {
    directives.push('includeSubDomains');
  }

  if (preload) {
    directives.push('preload');
  }

  return {
    name: 'Strict-Transport-Security',
    value: directives.join('; '),
  };
}

/**
 * Build all security headers
 */
function buildSecurityHeaders(config: SecurityHeadersConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  // CSP header
  const cspHeader = buildCspHeaderValue(config.contentSecurityPolicy);
  if (cspHeader) {
    headers[cspHeader.name] = cspHeader.value;
  }

  // HSTS header
  const hstsHeader = buildHstsHeaderValue(config.strictTransportSecurity);
  if (hstsHeader) {
    headers[hstsHeader.name] = hstsHeader.value;
  }

  // Standard security headers
  if (config.xContentTypeOptions !== false) {
    headers['X-Content-Type-Options'] = typeof config.xContentTypeOptions === 'string' ? config.xContentTypeOptions : 'nosniff';
  }

  if (config.xFrameOptions !== false) {
    headers['X-Frame-Options'] = typeof config.xFrameOptions === 'string' ? config.xFrameOptions : 'DENY';
  }

  if (config.xXssProtection !== false) {
    headers['X-XSS-Protection'] = typeof config.xXssProtection === 'string' ? config.xXssProtection : '1; mode=block';
  }

  if (config.referrerPolicy !== false) {
    headers['Referrer-Policy'] = typeof config.referrerPolicy === 'string' ? config.referrerPolicy : 'strict-origin-when-cross-origin';
  }

  if (config.permissionsPolicy !== false) {
    headers['Permissions-Policy'] =
      typeof config.permissionsPolicy === 'string' ? config.permissionsPolicy : 'geolocation=(),camera=(),microphone=(),payment=()';
  }

  if (config.crossOriginOpenerPolicy !== false) {
    headers['Cross-Origin-Opener-Policy'] = typeof config.crossOriginOpenerPolicy === 'string' ? config.crossOriginOpenerPolicy : 'same-origin';
  }

  if (config.crossOriginResourcePolicy !== false) {
    headers['Cross-Origin-Resource-Policy'] = typeof config.crossOriginResourcePolicy === 'string' ? config.crossOriginResourcePolicy : 'same-origin';
  }

  if (config.crossOriginEmbedderPolicy !== false) {
    headers['Cross-Origin-Embedder-Policy'] =
      typeof config.crossOriginEmbedderPolicy === 'string' ? config.crossOriginEmbedderPolicy : 'require-corp';
  }

  // Custom headers
  if (config.customHeaders) {
    for (const [name, value] of Object.entries(config.customHeaders)) {
      headers[name] = value;
    }
  }

  return headers;
}

/**
 * Security Headers Middleware
 *
 * Applies OWASP-recommended security headers to all HTTP responses.
 * Supports environment-aware policies and custom configurations.
 *
 * @param options - Middleware configuration options
 * @returns Elysia middleware plugin
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * app.use(securityHeaders())
 *
 * // Custom CSP configuration
 * app.use(securityHeaders({
 *   config: {
 *     contentSecurityPolicy: {
 *       directives: [
 *         { name: 'script-src', sources: ["'self'", 'https://cdn.example.com'] }
 *       ]
 *     }
 *   }
 * }))
 *
 * // Override environment
 * app.use(securityHeaders({
 *   overrideEnvironment: SecurityLevel.PRODUCTION
 * }))
 * ```
 */
export function securityHeaders(options: SecurityHeadersOptions = {}) {
  // Detect environment
  const environment = options.overrideEnvironment || detectEnvironment();

  // Get default config for environment
  const defaultConfig = getDefaultConfig(environment);

  // Merge with user config
  const finalConfig = mergeConfig(defaultConfig, options.config);

  // Build headers once at startup (unless using nonce, then per-request)
  const useNonce = typeof finalConfig.contentSecurityPolicy !== 'boolean' && finalConfig.contentSecurityPolicy?.useNonce;

  let builtHeaders: Record<string, string>;

  if (!useNonce) {
    builtHeaders = buildSecurityHeaders(finalConfig);
  } else {
    // Headers will be built per-request for nonce support
    builtHeaders = {};
  }

  return (app: Elysia) =>
    app
      .onAfterHandle(({ set }) => {
        // Apply headers
        const headersToApply = useNonce ? buildSecurityHeaders(finalConfig) : builtHeaders;

        for (const [name, value] of Object.entries(headersToApply)) {
          set.headers[name] = value;
        }
      })
      .onError(({ set }) => {
        // Ensure headers are set even on error responses
        const headersToApply = useNonce ? buildSecurityHeaders(finalConfig) : builtHeaders;

        for (const [name, value] of Object.entries(headersToApply)) {
          if (!set.headers[name]) {
            set.headers[name] = value;
          }
        }
      });
}

// Export types
export * from './types';
export * from './nonce';
