/**
 * Security Headers Types
 *
 * Type definitions for security headers middleware including
 * Content Security Policy (CSP) configuration and security header options.
 */

/**
 * Security levels for header policies
 */
export enum SecurityLevel {
  /**
   * Permissive settings for development
   */
  DEVELOPMENT = 'development',

  /**
   * Balanced security for staging
   */
  STAGING = 'staging',

  /**
   * Strict security for production
   */
  PRODUCTION = 'production',
}

/**
 * CSP source types
 */
export type CspSource = string; // URL or host source, including CSP keywords like 'self', 'none', etc.

/**
 * CSP directive structure
 */
export interface CspDirective {
  /**
   * Directive name (e.g., 'script-src', 'style-src')
   */
  name: string;

  /**
   * Array of sources for this directive
   */
  sources: CspSource[];

  /**
   * Whether to enable this directive
   */
  enabled?: boolean;
}

/**
 * CSP configuration interface
 */
export interface CspConfig {
  /**
   * Enable or disable CSP header
   * @default true
   */
  enabled?: boolean;

  /**
   * Use Report-Only mode for testing
   * @default false
   */
  reportOnly?: boolean;

  /**
   * Endpoint for CSP violation reports
   */
  reportUri?: string;

  /**
   * Array of CSP directives
   */
  directives?: CspDirective[];

  /**
   * Add nonce to script-src and style-src
   * @default false
   */
  useNonce?: boolean;
}

/**
 * HSTS configuration
 */
export interface HstsConfig {
  /**
   * Enable or disable HSTS header
   * @default true
   */
  enabled?: boolean;

  /**
   * Max-age in seconds
   * @default 31536000 (1 year)
   */
  maxAge?: number;

  /**
   * Include subdomains in HSTS policy
   * @default true
   */
  includeSubDomains?: boolean;

  /**
   * Allow inclusion in browser preload lists
   * @default false
   */
  preload?: boolean;

  /**
   * Force HSTS even in non-production environments
   * @default false
   */
  force?: boolean;
}

/**
 * Security header structure
 */
export interface SecurityHeader {
  /**
   * Header name
   */
  name: string;

  /**
   * Header value
   */
  value: string;

  /**
   * Whether to include this header
   */
  enabled?: boolean;
}

/**
 * Complete security headers configuration
 */
export interface SecurityHeadersConfig {
  /**
   * Security level preset
   * Overrides specific settings if provided
   */
  securityLevel?: SecurityLevel;

  /**
   * Content Security Policy configuration
   */
  contentSecurityPolicy?: CspConfig | boolean;

  /**
   * HTTP Strict Transport Security configuration
   */
  strictTransportSecurity?: HstsConfig | boolean;

  /**
   * X-Content-Type-Options
   * @default 'nosniff'
   */
  xContentTypeOptions?: string | boolean;

  /**
   * X-Frame-Options
   * @default 'DENY'
   */
  xFrameOptions?: string | boolean;

  /**
   * X-XSS-Protection
   * @default '1; mode=block'
   */
  xXssProtection?: string | boolean;

  /**
   * Referrer-Policy
   * @default 'strict-origin-when-cross-origin'
   */
  referrerPolicy?: string | boolean;

  /**
   * Permissions-Policy
   * Format: 'feature1=(self), feature2=()'
   */
  permissionsPolicy?: string | boolean;

  /**
   * Cross-Origin-Opener-Policy
   * @default 'same-origin'
   */
  crossOriginOpenerPolicy?: string | boolean;

  /**
   * Cross-Origin-Resource-Policy
   * @default 'same-origin'
   */
  crossOriginResourcePolicy?: string | boolean;

  /**
   * Cross-Origin-Embedder-Policy
   * @default 'require-corp'
   */
  crossOriginEmbedderPolicy?: string | boolean;

  /**
   * Additional custom headers
   */
  customHeaders?: Record<string, string>;
}

/**
 * Middleware options
 */
export interface SecurityHeadersOptions {
  /**
   * Main configuration object
   */
  config?: Partial<SecurityHeadersConfig>;

  /**
   * Override environment detection
   */
  overrideEnvironment?: SecurityLevel;
}
