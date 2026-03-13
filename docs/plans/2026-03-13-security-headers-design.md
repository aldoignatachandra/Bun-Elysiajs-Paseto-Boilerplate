# Security Headers Middleware - Design Document

> **Document Version:** 1.0.0
> **Last Updated:** 2026-03-13
> **Status:** Design Phase
> **Author:** Architecture Team

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Security Headers Catalog](#security-headers-catalog)
5. [Implementation Details](#implementation-details)
6. [CSP Policy Design](#csp-policy-design)
7. [Integration Points](#integration-points)
8. [Testing Strategy](#testing-strategy)
9. [Usage Examples](#usage-examples)
10. [Success Criteria](#success-criteria)

---

## 1. Overview

### 1.1 Purpose

This document outlines the design and implementation of a comprehensive Security Headers Middleware for the Bun + Elysia + PASETO REST API boilerplate. The middleware will automatically apply OWASP-recommended security headers to all HTTP responses, with particular emphasis on Content Security Policy (CSP) generation and environment-aware configuration.

### 1.2 Objectives

- Implement OWASP-recommended security headers
- Provide flexible CSP builder with directive management
- Support environment-specific policies (development vs production)
- Maintain zero-config defaults with extensibility options
- Ensure compliance with modern security standards
- Provide comprehensive testing coverage

### 1.3 Scope

**In Scope:**

- Security headers middleware implementation
- CSP builder and generator
- Environment-aware policy configuration
- Integration with Elysia framework
- Comprehensive unit and integration tests
- Documentation and usage examples

**Out of Scope:**

- Web Application Firewall (WAF) implementation
- DDoS mitigation strategies
- Intrusion detection systems
- SSL/TLS certificate management

### 1.4 Target Audience

- Backend developers implementing security features
- Security architects reviewing middleware design
- DevOps engineers configuring production environments
- QA engineers testing security features

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Request                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Elysia Application                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Security Headers Middleware                    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │  │
│  │  │   Header     │  │     CSP      │  │  Environment │  │  │
│  │  │   Builder    │  │   Builder    │  │   Detector   │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │  │
│  │         │                  │                  │          │  │
│  │         └──────────────────┴──────────────────┘          │  │
│  │                            │                               │  │
│  │                            ▼                               │  │
│  │                 ┌──────────────────┐                       │  │
│  │                 │  Header Merger   │                       │  │
│  │                 └────────┬─────────┘                       │  │
│  │                          │                                  │  │
│  └──────────────────────────┼──────────────────────────────────┘  │
│                             │                                     │
│                             ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Response Headers                       │  │
│  │  - Content-Security-Policy                               │  │
│  │  - X-Content-Type-Options                                │  │
│  │  - X-Frame-Options                                       │  │
│  │  - X-XSS-Protection                                      │  │
│  │  - Strict-Transport-Security                             │  │
│  │  - Referrer-Policy                                       │  │
│  │  - Permissions-Policy                                    │  │
│  │  - Cross-Origin-Opener-Policy                            │  │
│  │  - Cross-Origin-Resource-Policy                          │  │
│  │  - Cross-Origin-Embedder-Policy                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Client Response                            │
│              (with security headers applied)                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Architecture

```
Security Headers Middleware
├── Core Components
│   ├── SecurityHeadersMiddleware (main plugin)
│   ├── HeaderBuilder (constructs individual headers)
│   ├── CspBuilder (CSP-specific logic)
│   └── EnvironmentDetector (detects dev/prod environment)
├── Configuration
│   ├── SecurityHeadersConfig (main config interface)
│   ├── CspConfig (CSP-specific config)
│   ├── DefaultPolicies (pre-configured policies)
│   └── EnvironmentPolicies (environment-specific overrides)
├── Types
│   ├── SecurityHeader (header name/value pair)
│   ├── CspDirective (CSP directive structure)
│   ├── CspSource (CSP source expression)
│   └── SecurityLevel (security strictness level)
└── Utilities
    ├── HeaderValidator (validates header values)
    ├── CspValidator (validates CSP syntax)
    └── PolicyMerger (merges policy configurations)
```

### 2.3 Data Flow

```
Request arrives
    │
    ▼
Environment Detection
    │
    ├─▶ Development Mode
    │   └─▶ Load permissive CSP
    │       └─▶ Allow inline scripts
    │       └─▶ Enable eval()
    │       └─▶ Add debugging endpoints
    │
    └─▶ Production Mode
        └─▶ Load strict CSP
            └─▶ Block inline scripts
            └─▶ Disable eval()
            └─▶ Restrict sources
    │
    ▼
Build Security Headers
    │
    ├─▶ Static Headers (X-Frame-Options, etc.)
    ├─▶ CSP Headers (built dynamically)
    └─▶ Custom Headers (user-provided)
    │
    ▼
Merge and Validate
    │
    ├─▶ Combine all headers
    ├─▶ Validate header formats
    └─▶ Check for conflicts
    │
    ▼
Apply to Response
    │
    ▼
Response sent with headers
```

### 2.4 Design Principles

1. **Security by Default**: All headers enabled with secure defaults
2. **Environment Awareness**: Different policies for dev vs production
3. **Extensibility**: Easy to add custom headers or override defaults
4. **Validation**: Ensure all header values are properly formatted
5. **Performance**: Minimal overhead in request processing
6. **Testability**: Comprehensive unit and integration tests
7. **Documentation**: Clear examples and explanations

---

## 3. File Structure

### 3.1 Directory Layout

```
src/
├── middlewares/
│   ├── index.ts                          # Barrel export
│   ├── security-headers.middleware.ts    # Main middleware plugin
│   └── security/
│       ├── index.ts                      # Barrel export
│       ├── types.ts                      # Type definitions
│       ├── config.ts                     # Configuration interfaces
│       ├── builders/
│       │   ├── index.ts
│       │   ├── header.builder.ts         # Generic header builder
│       │   ├── csp.builder.ts            # CSP-specific builder
│       │   └── hsts.builder.ts           # HSTS-specific builder
│       ├── policies/
│       │   ├── index.ts
│       │   ├── default.ts                # Default security policies
│       │   ├── development.ts            # Development environment policies
│       │   ├── production.ts             # Production environment policies
│       │   └── csp/
│       │       ├── index.ts
│       │       ├── directives.ts         # CSP directive definitions
│       │       ├── sources.ts            # CSP source expressions
│       │       └── presets.ts            # Pre-configured CSP policies
│       ├── validators/
│       │   ├── index.ts
│       │   ├── header.validator.ts       # Header format validation
│       │   └── csp.validator.ts          # CSP syntax validation
│       └── utils/
│           ├── index.ts
│           ├── detector.ts               # Environment detection
│           └── merger.ts                 # Policy merging utilities

tests/
├── middlewares/
│   ├── security-headers.middleware.test.ts
│   └── security/
│       ├── builders/
│       │   ├── header.builder.test.ts
│       │   ├── csp.builder.test.ts
│       │   └── hsts.builder.test.ts
│       ├── policies/
│       │   ├── default.test.ts
│       │   ├── development.test.ts
│       │   ├── production.test.ts
│       │   └── csp/
│       │       ├── directives.test.ts
│       │       ├── sources.test.ts
│       │       └── presets.test.ts
│       └── validators/
│           ├── header.validator.test.ts
│           └── csp.validator.test.ts

docs/
└── plans/
    └── 2026-03-13-security-headers-design.md  # This document
```

### 3.2 File Responsibilities

| File                             | Responsibility                     | Lines (Est.) |
| -------------------------------- | ---------------------------------- | ------------ |
| `security-headers.middleware.ts` | Main Elysia plugin integration     | 150          |
| `types.ts`                       | TypeScript interfaces and types    | 200          |
| `config.ts`                      | Configuration schemas and defaults | 100          |
| `header.builder.ts`              | Generic header construction        | 150          |
| `csp.builder.ts`                 | CSP-specific header construction   | 300          |
| `hsts.builder.ts`                | HSTS-specific header construction  | 100          |
| `default.ts`                     | Default security policies          | 100          |
| `development.ts`                 | Development environment policies   | 80           |
| `production.ts`                  | Production environment policies    | 100          |
| `directives.ts`                  | CSP directive definitions          | 150          |
| `sources.ts`                     | CSP source expressions             | 100          |
| `presets.ts`                     | Pre-configured CSP policies        | 150          |
| `header.validator.ts`            | Header format validation           | 100          |
| `csp.validator.ts`               | CSP syntax validation              | 150          |
| `detector.ts`                    | Environment detection utilities    | 80           |
| `merger.ts`                      | Policy merging utilities           | 120          |

---

## 4. Security Headers Catalog

### 4.1 OWASP Recommended Headers

#### 4.1.1 Content-Security-Policy (CSP)

**Purpose**: Controls resources the user agent is allowed to load for a given page.

**Security Benefits**:

- Prevents Cross-Site Scripting (XSS) attacks
- Mitigates clickjacking attempts
- Controls resource loading (scripts, styles, images, etc.)
- Provides report-uri for violation monitoring

**OWASP Reference**: [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

**Header Format**:

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none';
```

**Directives**:
| Directive | Purpose | Recommended Value |
|-----------|---------|-------------------|
| `default-src` | Fallback for other directives | `'self'` |
| `script-src` | Valid script sources | `'self'` (no unsafe-inline) |
| `style-src` | Valid style sources | `'self' 'unsafe-inline'` |
| `img-src` | Valid image sources | `'self' data: https:`
| `connect-src` | Valid fetch/websocket sources | `'self'` |
| `font-src` | Valid font sources | `'self'` |
| `object-src` | Valid plugin sources | `'none'` |
| `media-src` | Valid media sources | `'self'` |
| `frame-src` | Valid frame sources | `'none'` |
| `base-uri` | Restricts document base URL | `'self'` |
| `form-action` | Restricts form submission targets | `'self'` |
| `frame-ancestors` | Restricts who can embed the page | `'none'` |
| `report-uri` | CSP violation reporting endpoint | `/api/v1/security/csp-report` |

#### 4.1.2 X-Content-Type-Options

**Purpose**: Prevents MIME-sniffing of response body away from the declared content-type.

**Security Benefits**:

- Prevents executable file masquerading
- Stops MIME-type confusion attacks
- Ensures content-type declarations are respected

**OWASP Reference**: [OWASP Secure Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)

**Header Format**:

```
X-Content-Type-Options: nosniff
```

#### 4.1.3 X-Frame-Options

**Purpose**: Prevents clickjacking attacks by controlling whether the page can be embedded in frames.

**Security Benefits**:

- Prevents clickjacking attacks
- Stops UI redress attacks
- Controls frame embedding permissions

**OWASP Reference**: [OWASP Clickjacking Defense](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)

**Header Format**:

```
X-Frame-Options: DENY
```

**Options**:

- `DENY`: No framing allowed
- `SAMEORIGIN`: Only same-origin framing allowed
- `ALLOW-FROM uri`: Only from specified URI (deprecated, use CSP)

#### 4.1.4 Strict-Transport-Security (HSTS)

**Purpose**: Enforces HTTPS connections and prevents SSL stripping attacks.

**Security Benefits**:

- Forces HTTPS for all future requests
- Prevents SSL/TLS stripping attacks
- Includes subdomains in security policy
- Enables preload list inclusion

**OWASP Reference**: [OWASP HSTS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)

**Header Format**:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Directives**:

- `max-age`: Time in seconds that browser should remember HSTS (31536000 = 1 year)
- `includeSubDomains`: Apply HSTS to all subdomains
- `preload`: Allow inclusion in browser preload lists

#### 4.1.5 Referrer-Policy

**Purpose**: Controls how much referrer information is sent with navigations.

**Security Benefits**:

- Prevents leakage of sensitive URLs
- Controls referrer information in cross-origin requests
- Protects user privacy and session tokens

**OWASP Reference**: [OWASP Referrer Policy](https://cheatsheetseries.owasp.org/cheatsheets/Referrer_Policy_Cheat_Sheet.html)

**Header Format**:

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Options**:
| Value | Description |
|-------|-------------|
| `no-referrer` | No referrer information sent |
| `no-referrer-when-downgrade` | Full URL on same-origin, no referrer on HTTPS→HTTP |
| `origin` | Only send origin (scheme, host, port) |
| `origin-when-cross-origin` | Full URL on same-origin, origin on cross-origin |
| `same-origin` | Full URL on same-origin only |
| `strict-origin` | Origin only when protocol security is equal |
| `strict-origin-when-cross-origin` | Origin when protocol security degrades |
| `unsafe-url` | Full URL always (least secure) |

#### 4.1.6 Permissions-Policy

**Purpose**: Controls which browser features and APIs can be used in the page.

**Security Benefits**:

- Restricts access to sensitive APIs
- Prevents unauthorized feature usage
- Granular control over browser capabilities

**OWASP Reference**: [OWASP Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy)

**Header Format**:

```
Permissions-Policy: geolocation=(), camera=(self), microphone=(), payment=()
```

**Common Features**:
| Feature | Recommended Value | Description |
|---------|-------------------|-------------|
| `geolocation` | `()` | Disable geolocation |
| `camera` | `()` | Disable camera access |
| `microphone` | `()` | Disable microphone access |
| `payment` | `()` | Disable payment API |
| `usb` | `()` | Disable USB access |
| `magnetometer` | `()` | Disable magnetometer |
| `gyroscope` | `()` | Disable gyroscope |
| `accelerometer` | `()` | Disable accelerometer |

#### 4.1.7 X-XSS-Protection

**Purpose**: Enables XSS filtering in browsers (legacy header, mostly superseded by CSP).

**Security Benefits**:

- Activates browser's XSS filter
- Stops page rendering on XSS detection
- Legacy support for older browsers

**OWASP Reference**: [OWASP XSS Protection](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

**Header Format**:

```
X-XSS-Protection: 1; mode=block
```

**Options**:

- `0`: Disable XSS filtering
- `1`: Enable XSS filtering
- `1; mode=block`: Enable and block page on XSS detection

#### 4.1.8 Cross-Origin-Opener-Policy (COOP)

**Purpose**: Allows control over sharing of browsing context group with cross-origin documents.

**Security Benefits**:

- Isolates top-level window from cross-origin windows
- Prevents cross-origin attacks
- Enables cross-origin isolation for advanced APIs

**OWASP Reference**: [MDN COOP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)

**Header Format**:

```
Cross-Origin-Opener-Policy: same-origin
```

**Options**:

- `same-origin`: Isolates the page from cross-origin windows
- `same-origin-allow-popups`: Keeps cross-origin opener references
- `unsafe-none`: No isolation (default)

#### 4.1.9 Cross-Origin-Resource-Policy (CORP)

**Purpose**: Controls who can load the resource.

**Security Benefits**:

- Prevents cross-origin data leakage
- Controls resource access permissions
- Protects sensitive resources from unauthorized loading

**OWASP Reference**: [MDN CORP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy)

**Header Format**:

```
Cross-Origin-Resource-Policy: same-origin
```

**Options**:

- `same-origin`: Only same-origin can load
- `same-site`: Only same-site can load
- `cross-origin`: Any origin can load (default)

#### 4.1.10 Cross-Origin-Embedder-Policy (COEP)

**Purpose**: Prevents cross-origin resources from being loaded without proper CORS headers.

**Security Benefits**:

- Enables cross-origin isolation
- Required for SharedArrayBuffer and high-resolution timers
- Enhances security through isolation

**OWASP Reference**: [MDN COEP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)

**Header Format**:

```
Cross-Origin-Embedder-Policy: require-corp
```

**Options**:

- `require-corp`: Requires cross-origin resources to have CORP header
- `unsafe-none`: No restriction (default)

### 4.2 Additional Security Headers

#### 4.2.1 Content-Type Options

**Purpose**: Additional MIME type protection.

**Header Format**:

```
X-Content-Type-Options: nosniff
```

#### 4.2.2 Download Options

**Purpose**: Controls file download behavior.

**Header Format**:

```
X-Download-Options: noopen
```

---

## 5. Implementation Details

### 5.1 Type Definitions

```typescript
// src/middlewares/security/types.ts

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
export type CspSource =
  | "'self'" // Current origin
  | "'none'" // No sources allowed
  | "'unsafe-inline'" // Allow inline scripts/styles (not recommended)
  | "'unsafe-eval'" // Allow eval() (not recommended)
  | "'unsafe-hashes'" // Allow specific unsafe hashes
  | "'strict-dynamic'" // Trust scripts from nonce/hash
  | "'report-sample'" // Include sample in violation reports
  | string; // URL or host source

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
   * Enable reporting to report-to endpoint
   */
  reportTo?: string;

  /**
   * Array of CSP directives
   */
  directives?: CspDirective[];

  /**
   * Use strict-dynamic for script-src
   * @default true
   */
  useStrictDynamic?: boolean;

  /**
   * Add nonce to script-src and style-src
   * @default false
   */
  useNonce?: boolean;

  /**
   * Add hash to inline scripts
   */
  scriptHashes?: string[];

  /**
   * Add hash to inline styles
   */
  styleHashes?: string[];
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
```

### 5.2 Main Middleware Implementation

````typescript
// src/middlewares/security-headers.middleware.ts

import type { Elysia } from 'elysia';
import { logger } from '../core/logging/logger';
import type { SecurityHeadersOptions, SecurityHeadersConfig, SecurityLevel } from './security/types';
import { SecurityLevel } from './security/types';
import { HeaderBuilder } from './security/builders/header.builder';
import { CspBuilder } from './security/builders/csp.builder';
import { HstsBuilder } from './security/builders/hsts.builder';
import { DefaultPolicies } from './security/policies/default';
import { DevelopmentPolicies } from './security/policies/development';
import { ProductionPolicies } from './security/policies/production';
import { detectEnvironment } from './security/utils/detector';
import { mergePolicies } from './security/utils/merger';

/**
 * Security Headers Middleware
 *
 * Applies OWASP-recommended security headers to all responses.
 * Supports environment-aware policies and custom configurations.
 *
 * @example
 * ```typescript
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
export function securityHeaders(options: SecurityHeadersOptions = {}) {
  // Detect environment
  const environment = options.overrideEnvironment || detectEnvironment();

  // Get base policy for environment
  const basePolicy = getBasePolicy(environment);

  // Merge with custom config
  const finalConfig = mergePolicies(basePolicy, options.config || {});

  // Initialize builders
  const headerBuilder = new HeaderBuilder(finalConfig);
  const cspBuilder = new CspBuilder(finalConfig.contentSecurityPolicy);
  const hstsBuilder = new HstsBuilder(finalConfig.strictTransportSecurity);

  // Build headers once at startup
  const builtHeaders = buildAllHeaders(headerBuilder, cspBuilder, hstsBuilder, finalConfig);

  // Log configuration in development
  if (environment === SecurityLevel.DEVELOPMENT) {
    logger.debug('Security Headers Configuration', {
      environment,
      headers: Object.keys(builtHeaders),
      cspEnabled: !!builtHeaders['Content-Security-Policy'],
    });
  }

  return (app: Elysia) =>
    app.onAfterHandle(({ set }) => {
      // Apply all built headers
      for (const [name, value] of Object.entries(builtHeaders)) {
        set.headers[name] = value;
      }
    });
}

/**
 * Get base policy for environment
 */
function getBasePolicy(environment: SecurityLevel): Partial<SecurityHeadersConfig> {
  switch (environment) {
    case SecurityLevel.DEVELOPMENT:
      return DevelopmentPolicies;
    case SecurityLevel.PRODUCTION:
      return ProductionPolicies;
    default:
      return DefaultPolicies;
  }
}

/**
 * Build all security headers
 */
function buildAllHeaders(
  headerBuilder: HeaderBuilder,
  cspBuilder: CspBuilder,
  hstsBuilder: HstsBuilder,
  config: SecurityHeadersConfig
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Build CSP header
  if (config.contentSecurityPolicy) {
    const cspHeader = cspBuilder.build();
    if (cspHeader) {
      headers[cspHeader.name] = cspHeader.value;
    }
  }

  // Build HSTS header
  if (config.strictTransportSecurity) {
    const hstsHeader = hstsBuilder.build();
    if (hstsHeader) {
      headers[hstsHeader.name] = hstsHeader.value;
    }
  }

  // Build standard headers
  const standardHeaders = headerBuilder.buildStandardHeaders();
  for (const header of standardHeaders) {
    if (header.enabled !== false) {
      headers[header.name] = header.value;
    }
  }

  // Build COOP/COEP headers
  const coopCoepHeaders = headerBuilder.buildCoopCoepHeaders();
  for (const header of coopCoepHeaders) {
    if (header.enabled !== false) {
      headers[header.name] = header.value;
    }
  }

  // Add custom headers last (allow overrides)
  if (config.customHeaders) {
    for (const [name, value] of Object.entries(config.customHeaders)) {
      headers[name] = value;
    }
  }

  return headers;
}

// Export types
export * from './security/types';
````

### 5.3 Header Builder Implementation

```typescript
// src/middlewares/security/builders/header.builder.ts

import type { SecurityHeadersConfig, SecurityHeader } from '../types';

/**
 * Generic Security Header Builder
 *
 * Builds standard security headers outside of CSP and HSTS.
 */
export class HeaderBuilder {
  constructor(private config: SecurityHeadersConfig) {}

  /**
   * Build standard security headers
   */
  buildStandardHeaders(): SecurityHeader[] {
    return [
      this.buildXContentTypeOptions(),
      this.buildXFrameOptions(),
      this.buildXXssProtection(),
      this.buildReferrerPolicy(),
      this.buildPermissionsPolicy(),
    ];
  }

  /**
   * Build Cross-Origin isolation headers
   */
  buildCoopCoepHeaders(): SecurityHeader[] {
    return [this.buildCrossOriginOpenerPolicy(), this.buildCrossOriginResourcePolicy(), this.buildCrossOriginEmbedderPolicy()];
  }

  /**
   * Build X-Content-Type-Options header
   */
  private buildXContentTypeOptions(): SecurityHeader {
    const value =
      typeof this.config.xContentTypeOptions === 'string'
        ? this.config.xContentTypeOptions
        : this.config.xContentTypeOptions === false
          ? ''
          : 'nosniff';

    return {
      name: 'X-Content-Type-Options',
      value,
      enabled: this.config.xContentTypeOptions !== false,
    };
  }

  /**
   * Build X-Frame-Options header
   */
  private buildXFrameOptions(): SecurityHeader {
    const value = typeof this.config.xFrameOptions === 'string' ? this.config.xFrameOptions : this.config.xFrameOptions === false ? '' : 'DENY';

    return {
      name: 'X-Frame-Options',
      value,
      enabled: this.config.xFrameOptions !== false,
    };
  }

  /**
   * Build X-XSS-Protection header
   */
  private buildXXssProtection(): SecurityHeader {
    const value =
      typeof this.config.xXssProtection === 'string' ? this.config.xXssProtection : this.config.xXssProtection === false ? '' : '1; mode=block';

    return {
      name: 'X-XSS-Protection',
      value,
      enabled: this.config.xXssProtection !== false,
    };
  }

  /**
   * Build Referrer-Policy header
   */
  private buildReferrerPolicy(): SecurityHeader {
    const value =
      typeof this.config.referrerPolicy === 'string'
        ? this.config.referrerPolicy
        : this.config.referrerPolicy === false
          ? ''
          : 'strict-origin-when-cross-origin';

    return {
      name: 'Referrer-Policy',
      value,
      enabled: this.config.referrerPolicy !== false,
    };
  }

  /**
   * Build Permissions-Policy header
   */
  private buildPermissionsPolicy(): SecurityHeader {
    const value =
      typeof this.config.permissionsPolicy === 'string'
        ? this.config.permissionsPolicy
        : this.config.permissionsPolicy === false
          ? ''
          : 'geolocation=(),camera=(),microphone=(),payment=(),usb=(),magnetometer=(),gyroscope=(),accelerometer=()';

    return {
      name: 'Permissions-Policy',
      value,
      enabled: this.config.permissionsPolicy !== false,
    };
  }

  /**
   * Build Cross-Origin-Opener-Policy header
   */
  private buildCrossOriginOpenerPolicy(): SecurityHeader {
    const value =
      typeof this.config.crossOriginOpenerPolicy === 'string'
        ? this.config.crossOriginOpenerPolicy
        : this.config.crossOriginOpenerPolicy === false
          ? ''
          : 'same-origin';

    return {
      name: 'Cross-Origin-Opener-Policy',
      value,
      enabled: this.config.crossOriginOpenerPolicy !== false,
    };
  }

  /**
   * Build Cross-Origin-Resource-Policy header
   */
  private buildCrossOriginResourcePolicy(): SecurityHeader {
    const value =
      typeof this.config.crossOriginResourcePolicy === 'string'
        ? this.config.crossOriginResourcePolicy
        : this.config.crossOriginResourcePolicy === false
          ? ''
          : 'same-origin';

    return {
      name: 'Cross-Origin-Resource-Policy',
      value,
      enabled: this.config.crossOriginResourcePolicy !== false,
    };
  }

  /**
   * Build Cross-Origin-Embedder-Policy header
   */
  private buildCrossOriginEmbedderPolicy(): SecurityHeader {
    const value =
      typeof this.config.crossOriginEmbedderPolicy === 'string'
        ? this.config.crossOriginEmbedderPolicy
        : this.config.crossOriginEmbedderPolicy === false
          ? ''
          : 'require-corp';

    return {
      name: 'Cross-Origin-Embedder-Policy',
      value,
      enabled: this.config.crossOriginEmbedderPolicy !== false,
    };
  }
}
```

### 5.4 CSP Builder Implementation

```typescript
// src/middlewares/security/builders/csp.builder.ts

import type { CspConfig, CspDirective, CspSource, SecurityHeader } from '../types';
import { DefaultCspDirectives } from '../policies/csp/directives';
import { validateCspDirective } from '../validators/csp.validator';

/**
 * Content Security Policy Builder
 *
 * Constructs CSP headers with directive management and validation.
 */
export class CspBuilder {
  private directives: CspDirective[] = [];

  constructor(private config: CspConfig | boolean | undefined) {
    if (!config || config === false) {
      return;
    }

    const cspConfig = typeof config === 'boolean' ? {} : config;

    // Initialize with default directives
    this.directives = DefaultCspDirectives;

    // Apply custom directives
    if (cspConfig.directives) {
      this.applyCustomDirectives(cspConfig.directives);
    }

    // Apply strict-dynamic if enabled
    if (cspConfig.useStrictDynamic !== false) {
      this.applyStrictDynamic();
    }

    // Apply nonce if enabled
    if (cspConfig.useNonce) {
      this.applyNonce();
    }

    // Apply hashes if provided
    if (cspConfig.scriptHashes || cspConfig.styleHashes) {
      this.applyHashes(cspConfig.scriptHashes, cspConfig.styleHashes);
    }

    // Add report-uri if provided
    if (cspConfig.reportUri) {
      this.addReportUri(cspConfig.reportUri);
    }

    // Add report-to if provided
    if (cspConfig.reportTo) {
      this.addReportTo(cspConfig.reportTo);
    }
  }

  /**
   * Build the CSP header
   */
  build(): SecurityHeader | null {
    if (this.directives.length === 0) {
      return null;
    }

    // Filter enabled directives
    const enabledDirectives = this.directives.filter(d => d.enabled !== false);

    if (enabledDirectives.length === 0) {
      return null;
    }

    // Build directive strings
    const directiveStrings = enabledDirectives.map(d => {
      const validated = validateCspDirective(d);
      if (!validated.valid) {
        throw new Error(`Invalid CSP directive: ${validated.error}`);
      }
      return `${d.name} ${d.sources.join(' ')}`;
    });

    const value = directiveStrings.join('; ');
    const headerName =
      typeof this.config !== 'boolean' && this.config?.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

    return {
      name: headerName,
      value,
    };
  }

  /**
   * Apply custom directives
   */
  private applyCustomDirectives(directives: CspDirective[]): void {
    for (const custom of directives) {
      const existing = this.directives.find(d => d.name === custom.name);

      if (existing) {
        // Merge sources for existing directive
        if (custom.sources) {
          existing.sources = [...new Set([...existing.sources, ...custom.sources])];
        }
        if (custom.enabled !== undefined) {
          existing.enabled = custom.enabled;
        }
      } else {
        // Add new directive
        this.directives.push({ ...custom });
      }
    }
  }

  /**
   * Apply strict-dynamic to script-src
   */
  private applyStrictDynamic(): void {
    const scriptSrc = this.directives.find(d => d.name === 'script-src');

    if (scriptSrc && !scriptSrc.sources.includes("'strict-dynamic'")) {
      // Remove 'unsafe-inline' when using strict-dynamic
      scriptSrc.sources = scriptSrc.sources.filter(s => s !== "'unsafe-inline'");

      // Add strict-dynamic
      scriptSrc.sources.unshift("'strict-dynamic'");

      // When using strict-dynamic, allow fallback to 'self' for older browsers
      if (!scriptSrc.sources.includes("'self'")) {
        scriptSrc.sources.push("'self'");
      }
    }
  }

  /**
   * Apply nonce to script-src and style-src
   */
  private applyNonce(): void {
    const nonce = this.generateNonce();

    ['script-src', 'style-src'].forEach(directiveName => {
      const directive = this.directives.find(d => d.name === directiveName);

      if (directive) {
        // Remove unsafe-inline when using nonce
        directive.sources = directive.sources.filter(s => s !== "'unsafe-inline'");

        // Add nonce
        directive.sources.unshift(`'nonce-${nonce}'`);
      }
    });
  }

  /**
   * Apply hashes to inline scripts and styles
   */
  private applyHashes(scriptHashes?: string[], styleHashes?: string[]): void {
    if (scriptHashes) {
      const scriptSrc = this.directives.find(d => d.name === 'script-src');
      if (scriptSrc) {
        scriptHashes.forEach(hash => {
          if (!scriptSrc.sources.includes(hash)) {
            scriptSrc.sources.push(hash);
          }
        });
      }
    }

    if (styleHashes) {
      const styleSrc = this.directives.find(d => d.name === 'style-src');
      if (styleSrc) {
        styleHashes.forEach(hash => {
          if (!styleSrc.sources.includes(hash)) {
            styleSrc.sources.push(hash);
          }
        });
      }
    }
  }

  /**
   * Add report-uri directive
   */
  private addReportUri(uri: string): void {
    const reportUri = this.directives.find(d => d.name === 'report-uri');

    if (reportUri) {
      reportUri.sources = [uri];
    } else {
      this.directives.push({
        name: 'report-uri',
        sources: [uri],
      });
    }
  }

  /**
   * Add report-to directive
   */
  private addReportTo(endpoint: string): void {
    const reportTo = this.directives.find(d => d.name === 'report-to');

    if (reportTo) {
      reportTo.sources = [endpoint];
    } else {
      this.directives.push({
        name: 'report-to',
        sources: [endpoint],
      });
    }
  }

  /**
   * Generate a nonce for inline scripts/styles
   * Note: In production, this should be per-request
   */
  private generateNonce(): string {
    return crypto.randomUUID().replace(/-/g, '');
  }
}
```

### 5.5 HSTS Builder Implementation

```typescript
// src/middlewares/security/builders/hsts.builder.ts

import type { HstsConfig, SecurityHeader } from '../types';
import { validateHstsConfig } from '../validators/header.validator';

/**
 * HTTP Strict Transport Security Builder
 *
 * Constructs HSTS headers with proper directives.
 */
export class HstsBuilder {
  constructor(private config: HstsConfig | boolean | undefined) {
    if (this.config && typeof this.config !== 'boolean') {
      validateHstsConfig(this.config);
    }
  }

  /**
   * Build the HSTS header
   */
  build(): SecurityHeader | null {
    if (!this.config || this.config === false) {
      return null;
    }

    const hstsConfig = typeof this.config === 'boolean' ? {} : this.config;

    // Only set HSTS in production
    if (process.env.NODE_ENV !== 'production' && !hstsConfig.force) {
      return null;
    }

    const maxAge = hstsConfig.maxAge ?? 31536000; // 1 year
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
}
```

### 5.6 Environment-Specific Policies

```typescript
// src/middlewares/security/policies/development.ts

import type { SecurityHeadersConfig } from '../types';
import { SecurityLevel } from '../types';

/**
 * Development environment security policies
 *
 * Permissive settings to facilitate development and debugging.
 */
export const DevelopmentPolicies: Partial<SecurityHeadersConfig> = {
  securityLevel: SecurityLevel.DEVELOPMENT,

  contentSecurityPolicy: {
    enabled: true,
    reportOnly: true, // Report violations without blocking
    directives: [
      {
        name: 'default-src',
        sources: ["'self'"],
      },
      {
        name: 'script-src',
        sources: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http://localhost:*', 'ws://localhost:*'],
      },
      {
        name: 'style-src',
        sources: ["'self'", "'unsafe-inline'"],
      },
      {
        name: 'img-src',
        sources: ["'self'", 'data:', 'https:', 'http:'],
      },
      {
        name: 'connect-src',
        sources: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
      },
      {
        name: 'font-src',
        sources: ["'self'", 'data:'],
      },
      {
        name: 'object-src',
        sources: ["'none'"],
      },
      {
        name: 'frame-src',
        sources: ["'self'"],
      },
      {
        name: 'base-uri',
        sources: ["'self'"],
      },
      {
        name: 'form-action',
        sources: ["'self'"],
      },
      {
        name: 'frame-ancestors',
        sources: ["'self'"],
      },
      {
        name: 'report-uri',
        sources: ['/api/v1/security/csp-report'],
      },
    ],
  },

  strictTransportSecurity: false, // Don't force HTTPS in dev

  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'SAMEORIGIN', // Allow framing for dev tools
  xXssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'geolocation=(self),camera=(self),microphone=(self),payment=()',
  crossOriginOpenerPolicy: 'unsafe-none',
  crossOriginResourcePolicy: 'cross-origin',
  crossOriginEmbedderPolicy: 'unsafe-none',
};
```

```typescript
// src/middlewares/security/policies/production.ts

import type { SecurityHeadersConfig } from '../types';
import { SecurityLevel } from '../types';

/**
 * Production environment security policies
 *
 * Strict settings for maximum security in production.
 */
export const ProductionPolicies: Partial<SecurityHeadersConfig> = {
  securityLevel: SecurityLevel.PRODUCTION,

  contentSecurityPolicy: {
    enabled: true,
    reportOnly: false,
    useStrictDynamic: true,
    useNonce: true,
    directives: [
      {
        name: 'default-src',
        sources: ["'self'"],
      },
      {
        name: 'script-src',
        sources: ["'self'", "'strict-dynamic'"],
      },
      {
        name: 'style-src',
        sources: ["'self'"],
      },
      {
        name: 'img-src',
        sources: ["'self'", 'data:', 'https:'],
      },
      {
        name: 'connect-src',
        sources: ["'self'"],
      },
      {
        name: 'font-src',
        sources: ["'self'"],
      },
      {
        name: 'object-src',
        sources: ["'none'"],
      },
      {
        name: 'frame-src',
        sources: ["'none'"],
      },
      {
        name: 'base-uri',
        sources: ["'self'"],
      },
      {
        name: 'form-action',
        sources: ["'self'"],
      },
      {
        name: 'frame-ancestors',
        sources: ["'none'"],
      },
      {
        name: 'upgrade-insecure-requests',
        sources: [],
      },
      {
        name: 'block-all-mixed-content',
        sources: [],
      },
    ],
  },

  strictTransportSecurity: {
    enabled: true,
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },

  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'DENY',
  xXssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'geolocation=(),camera=(),microphone=(),payment=(),usb=()',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
  crossOriginEmbedderPolicy: 'require-corp',
};
```

### 5.7 Utility Implementations

```typescript
// src/middlewares/security/utils/detector.ts

import type { SecurityLevel } from '../types';
import { SecurityLevel } from '../types';

/**
 * Detect the current environment
 */
export function detectEnvironment(): SecurityLevel {
  const nodeEnv = process.env.NODE_ENV?.toLowerCase();

  switch (nodeEnv) {
    case 'development':
    case 'dev':
      return SecurityLevel.DEVELOPMENT;
    case 'production':
    case 'prod':
      return SecurityLevel.PRODUCTION;
    case 'staging':
    case 'stage':
      return SecurityLevel.STAGING;
    default:
      // Default to production for security
      return SecurityLevel.PRODUCTION;
  }
}
```

```typescript
// src/middlewares/security/utils/merger.ts

import type { SecurityHeadersConfig } from '../types';

/**
 * Merge security policies
 * Custom config overrides base policy
 */
export function mergePolicies(base: Partial<SecurityHeadersConfig>, custom: Partial<SecurityHeadersConfig>): SecurityHeadersConfig {
  return {
    securityLevel: custom.securityLevel ?? base.securityLevel,
    contentSecurityPolicy: mergeDeep(base.contentSecurityPolicy, custom.contentSecurityPolicy),
    strictTransportSecurity: mergeDeep(base.strictTransportSecurity, custom.strictTransportSecurity),
    xContentTypeOptions: custom.xContentTypeOptions ?? base.xContentTypeOptions,
    xFrameOptions: custom.xFrameOptions ?? base.xFrameOptions,
    xXssProtection: custom.xXssProtection ?? base.xXssProtection,
    referrerPolicy: custom.referrerPolicy ?? base.referrerPolicy,
    permissionsPolicy: custom.permissionsPolicy ?? base.permissionsPolicy,
    crossOriginOpenerPolicy: custom.crossOriginOpenerPolicy ?? base.crossOriginOpenerPolicy,
    crossOriginResourcePolicy: custom.crossOriginResourcePolicy ?? base.crossOriginResourcePolicy,
    crossOriginEmbedderPolicy: custom.crossOriginEmbedderPolicy ?? base.crossOriginEmbedderPolicy,
    customHeaders: {
      ...base.customHeaders,
      ...custom.customHeaders,
    },
  };
}

/**
 * Deep merge objects
 */
function mergeDeep<T>(base: T | undefined, custom: T | undefined): T | undefined {
  if (!custom) return base;
  if (!base) return custom;

  if (typeof base === 'object' && typeof custom === 'object') {
    return { ...base, ...custom };
  }

  return custom;
}
```

---

## 6. CSP Policy Design

### 6.1 CSP Directive Structure

```typescript
// src/middlewares/security/policies/csp/directives.ts

import type { CspDirective } from '../../types';

/**
 * Default CSP directives
 * Applied as base for all environments
 */
export const DefaultCspDirectives: CspDirective[] = [
  {
    name: 'default-src',
    sources: ["'self'"],
  },
  {
    name: 'script-src',
    sources: ["'self'"],
  },
  {
    name: 'style-src',
    sources: ["'self'"],
  },
  {
    name: 'img-src',
    sources: ["'self'", 'data:', 'https:'],
  },
  {
    name: 'connect-src',
    sources: ["'self'"],
  },
  {
    name: 'font-src',
    sources: ["'self'"],
  },
  {
    name: 'object-src',
    sources: ["'none'"],
  },
  {
    name: 'frame-src',
    sources: ["'none'"],
  },
  {
    name: 'base-uri',
    sources: ["'self'"],
  },
  {
    name: 'form-action',
    sources: ["'self'"],
  },
  {
    name: 'frame-ancestors',
    sources: ["'none'"],
  },
  {
    name: 'upgrade-insecure-requests',
    sources: [],
  },
];
```

### 6.2 CSP Source Expressions

```typescript
// src/middlewares/security/policies/csp/sources.ts

import type { CspSource } from '../../types';

/**
 * CSP Source Expressions
 * Commonly used source values
 */
export const CspSources = {
  // Keyword sources
  SELF: "'self'" as CspSource,
  NONE: "'none'" as CspSource,
  UNSAFE_INLINE: "'unsafe-inline'" as CspSource,
  UNSAFE_EVAL: "'unsafe-eval'" as CspSource,
  STRICT_DYNAMIC: "'strict-dynamic'" as CspSource,
  REPORT_SAMPLE: "'report-sample'" as CspSource,

  // Scheme sources
  HTTP: 'http:' as CspSource,
  HTTPS: 'https:' as CspSource,
  DATA: 'data:' as CspSource,
  BLOB: 'blob:' as CspSource,
  FILESYSTEM: 'filesystem:' as CspSource,

  // Wildcard sources
  ANY: '*' as CspSource,

  // Common domains (customize as needed)
  LOCALHOST: 'http://localhost:*' as CspSource,
  LOCALHOST_WS: 'ws://localhost:*' as CspSource,

  // Helper methods
  domain: (domain: string): CspSource => domain,
  subdomain: (domain: string): CspSource => `*.${domain}`,
  path: (domain: string, path: string): CspSource => `${domain}${path}`,

  // Hash helpers
  sha256: (hash: string): CspSource => `'sha256-${hash}'`,
  sha384: (hash: string): CspSource => `'sha384-${hash}'`,
  sha512: (hash: string): CspSource => `'sha512-${hash}'`,

  // Nonce helper (placeholder, actual nonce generated per-request)
  nonce: (value: string): CspSource => `'nonce-${value}'`,
};
```

### 6.3 Pre-configured CSP Presets

```typescript
// src/middlewares/security/policies/csp/presets.ts

import type { CspDirective } from '../../types';

/**
 * Strict CSP preset for production APIs
 */
export function strictApiPreset(): CspDirective[] {
  return [
    {
      name: 'default-src',
      sources: ["'none'"],
    },
    {
      name: 'script-src',
      sources: ["'self'"],
    },
    {
      name: 'style-src',
      sources: ["'self'"],
    },
    {
      name: 'img-src',
      sources: ["'self'", 'data:'],
    },
    {
      name: 'connect-src',
      sources: ["'self'"],
    },
    {
      name: 'frame-ancestors',
      sources: ["'none'"],
    },
  ];
}

/**
 * Permissive CSP preset for development
 */
export function developmentPreset(): CspDirective[] {
  return [
    {
      name: 'default-src',
      sources: ["'self'"],
    },
    {
      name: 'script-src',
      sources: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http://localhost:*'],
    },
    {
      name: 'style-src',
      sources: ["'self'", "'unsafe-inline'"],
    },
    {
      name: 'img-src',
      sources: ["'self'", 'data:', 'https:', 'http:'],
    },
    {
      name: 'connect-src',
      sources: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
    },
    {
      name: 'frame-ancestors',
      sources: ["'self'"],
    },
  ];
}

/**
 * CSP preset for APIs serving web applications
 */
export function webAppPreset(cdnDomains: string[] = []): CspDirective[] {
  const scriptSources = ["'self'", "'strict-dynamic'", ...cdnDomains];

  return [
    {
      name: 'default-src',
      sources: ["'self'"],
    },
    {
      name: 'script-src',
      sources: scriptSources,
    },
    {
      name: 'style-src',
      sources: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for CSS
    },
    {
      name: 'img-src',
      sources: ["'self'", 'data:', 'https:', ...cdnDomains],
    },
    {
      name: 'connect-src',
      sources: ["'self'", ...cdnDomains],
    },
    {
      name: 'font-src',
      sources: ["'self'", 'data:', ...cdnDomains],
    },
    {
      name: 'frame-ancestors',
      sources: ["'none'"],
    },
    {
      name: 'base-uri',
      sources: ["'self'"],
    },
    {
      name: 'form-action',
      sources: ["'self'"],
    },
  ];
}
```

---

## 7. Integration Points

### 7.1 Application Integration

```typescript
// src/app.ts (existing file)

import { Elysia } from 'elysia';
import { securityHeaders } from './middlewares/security-headers.middleware';

export function createApp() {
  const app = new Elysia()
    // ... existing middleware

    // Add security headers middleware
    // Should be added before routes to ensure headers are set
    .use(securityHeaders());

  // ... existing configuration
  return app;
}
```

### 7.2 Custom Configuration

```typescript
// Example: Custom CSP configuration

import { securityHeaders } from './middlewares/security-headers.middleware';

const app = new Elysia().use(
  securityHeaders({
    config: {
      contentSecurityPolicy: {
        directives: [
          {
            name: 'script-src',
            sources: ["'self'", 'https://cdn.example.com'],
          },
          {
            name: 'img-src',
            sources: ["'self'", 'data:', 'https://images.example.com'],
          },
        ],
      },
      strictTransportSecurity: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
    },
  })
);
```

### 7.3 Environment-Specific Configuration

```typescript
// Example: Environment-based configuration

import { securityHeaders, SecurityLevel } from './middlewares/security-headers.middleware';

const isProduction = process.env.NODE_ENV === 'production';

const app = new Elysia().use(
  securityHeaders({
    overrideEnvironment: isProduction ? SecurityLevel.PRODUCTION : SecurityLevel.DEVELOPMENT,
    config: {
      // Custom overrides
      permissionsPolicy: isProduction ? 'geolocation=(),camera=(),microphone=()' : 'geolocation=(self),camera=(self),microphone=(self)',
    },
  })
);
```

### 7.4 Per-Route Overrides

```typescript
// Example: Route-specific header overrides

import { securityHeaders } from './middlewares/security-headers.middleware';

const app = new Elysia()
  .use(securityHeaders())
  .get('/api/v1/public', () => {
    // Default headers applied
    return { message: 'public endpoint' };
  })
  .get('/api/v1/webhook', ({ set }) => {
    // Override specific headers for webhooks
    set.headers['Content-Security-Policy'] = "default-src 'none';";
    set.headers['X-Frame-Options'] = 'ALLOW-FROM https://webhook.site';
    return { status: 'ok' };
  });
```

### 7.5 CSP Violation Reporting

```typescript
// Example: CSP violation reporting endpoint

import type { Elysia } from 'elysia';

export function createCspReportRoutes(app: Elysia): Elysia {
  return app.post(
    '/api/v1/security/csp-report',
    async ({ body, request }) => {
      // Log CSP violation
      logger.warn('CSP Violation Report', {
        userAgent: request.headers.get('user-agent'),
        report: body,
      });

      // Store in database for analysis
      // await cspViolationService.create({
      //   report: body,
      //   userAgent: request.headers.get('user-agent'),
      //   timestamp: new Date(),
      // });

      // Return 204 No Content (browser expects no response)
      return new Response(null, { status: 204 });
    },
    {
      type: 'application/csp-report',
    }
  );
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// tests/middlewares/security-headers.middleware.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { securityHeaders, SecurityLevel } from '../../src/middlewares/security-headers.middleware';

describe('Security Headers Middleware', () => {
  let app: Elysia;

  beforeEach(() => {
    app = new Elysia().use(securityHeaders());
  });

  describe('Default Configuration', () => {
    it('should set X-Content-Type-Options', async () => {
      const response = await app.handle(new Request('http://localhost/test')).then(r => r.headers);

      expect(response.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should set X-Frame-Options', async () => {
      const response = await app.handle(new Request('http://localhost/test')).then(r => r.headers);

      expect(response.get('X-Frame-Options')).toBe('DENY');
    });

    it('should set Referrer-Policy', async () => {
      const response = await app.handle(new Request('http://localhost/test')).then(r => r.headers);

      expect(response.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('CSP Configuration', () => {
    it('should set Content-Security-Policy header', async () => {
      const response = await app.handle(new Request('http://localhost/test')).then(r => r.headers);

      const csp = response.get('Content-Security-Policy');
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it('should use Report-Only mode in development', async () => {
      const devApp = new Elysia().use(
        securityHeaders({
          overrideEnvironment: SecurityLevel.DEVELOPMENT,
        })
      );

      const response = await devApp.handle(new Request('http://localhost/test')).then(r => r.headers);

      const reportOnly = response.get('Content-Security-Policy-Report-Only');
      expect(reportOnly).toBeTruthy();
    });
  });

  describe('HSTS Configuration', () => {
    it('should not set HSTS in development', async () => {
      const devApp = new Elysia().use(
        securityHeaders({
          overrideEnvironment: SecurityLevel.DEVELOPMENT,
        })
      );

      const response = await devApp.handle(new Request('http://localhost/test')).then(r => r.headers);

      expect(response.get('Strict-Transport-Security')).toBeNull();
    });

    it('should set HSTS in production', async () => {
      const prodApp = new Elysia().use(
        securityHeaders({
          overrideEnvironment: SecurityLevel.PRODUCTION,
        })
      );

      const response = await prodApp.handle(new Request('http://localhost/test')).then(r => r.headers);

      const hsts = response.get('Strict-Transport-Security');
      expect(hsts).toBeTruthy();
      expect(hsts).toContain('max-age=');
      expect(hsts).toContain('includeSubDomains');
    });
  });

  describe('Custom Configuration', () => {
    it('should merge custom directives', async () => {
      const customApp = new Elysia().use(
        securityHeaders({
          config: {
            contentSecurityPolicy: {
              directives: [
                {
                  name: 'script-src',
                  sources: ["'self'", 'https://cdn.example.com'],
                },
              ],
            },
          },
        })
      );

      const response = await customApp.handle(new Request('http://localhost/test')).then(r => r.headers);

      const csp = response.get('Content-Security-Policy');
      expect(csp).toContain('https://cdn.example.com');
    });

    it('should allow custom headers', async () => {
      const customApp = new Elysia().use(
        securityHeaders({
          config: {
            customHeaders: {
              'X-Custom-Header': 'custom-value',
            },
          },
        })
      );

      const response = await customApp.handle(new Request('http://localhost/test')).then(r => r.headers);

      expect(response.get('X-Custom-Header')).toBe('custom-value');
    });
  });
});
```

### 8.2 CSP Builder Tests

```typescript
// tests/middlewares/security/builders/csp.builder.test.ts

import { describe, it, expect } from 'bun:test';
import { CspBuilder } from '../../../../src/middlewares/security/builders/csp.builder';
import type { CspDirective } from '../../../../src/middlewares/security/types';

describe('CSP Builder', () => {
  describe('Basic Construction', () => {
    it('should build empty config', () => {
      const builder = new CspBuilder(false);
      const header = builder.build();
      expect(header).toBeNull();
    });

    it('should build default CSP', () => {
      const builder = new CspBuilder({});
      const header = builder.build();

      expect(header).toBeTruthy();
      expect(header?.name).toBe('Content-Security-Policy');
      expect(header?.value).toContain("default-src 'self'");
    });

    it('should build CSP with custom directives', () => {
      const config = {
        directives: [
          {
            name: 'script-src',
            sources: ["'self'", 'https://cdn.example.com'],
          },
        ],
      };

      const builder = new CspBuilder(config);
      const header = builder.build();

      expect(header?.value).toContain('https://cdn.example.com');
    });
  });

  describe('Report-Only Mode', () => {
    it('should use Report-Only header when configured', () => {
      const config = {
        reportOnly: true,
      };

      const builder = new CspBuilder(config);
      const header = builder.build();

      expect(header?.name).toBe('Content-Security-Policy-Report-Only');
    });
  });

  describe('Directives', () => {
    it('should handle multiple directives', () => {
      const config = {
        directives: [
          { name: 'default-src', sources: ["'none'"] },
          { name: 'script-src', sources: ["'self'"] },
          { name: 'style-src', sources: ["'self'"] },
        ],
      };

      const builder = new CspBuilder(config);
      const header = builder.build();

      const directives = header?.value.split('; ');
      expect(directives).toHaveLength(3);
      expect(directives).toContain("default-src 'none'");
      expect(directives).toContain("script-src 'self'");
      expect(directives).toContain("style-src 'self'");
    });

    it('should handle directive with no sources', () => {
      const config = {
        directives: [
          {
            name: 'upgrade-insecure-requests',
            sources: [],
          },
        ],
      };

      const builder = new CspBuilder(config);
      const header = builder.build();

      expect(header?.value).toContain('upgrade-insecure-requests');
    });
  });

  describe('Validation', () => {
    it('should throw on invalid directive', () => {
      const config = {
        directives: [
          {
            name: 'invalid-directive',
            sources: ["'self'"],
          },
        ],
      };

      const builder = new CspBuilder(config);

      expect(() => builder.build()).toThrow();
    });
  });
});
```

### 8.3 Integration Tests

```typescript
// tests/integration/security-headers.integration.test.ts

import { describe, it, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { securityHeaders, SecurityLevel } from '../../src/middlewares/security-headers.middleware';

describe('Security Headers Integration', () => {
  it('should apply all headers to successful response', async () => {
    const app = new Elysia().use(securityHeaders()).get('/test', () => ({ message: 'ok' }));

    const response = await app.handle(new Request('http://localhost/test'));
    const headers = response.headers;

    // Verify all security headers are present
    expect(headers.get('X-Content-Type-Options')).toBeTruthy();
    expect(headers.get('X-Frame-Options')).toBeTruthy();
    expect(headers.get('X-XSS-Protection')).toBeTruthy();
    expect(headers.get('Referrer-Policy')).toBeTruthy();
    expect(headers.get('Permissions-Policy')).toBeTruthy();
    expect(headers.get('Content-Security-Policy')).toBeTruthy();
  });

  it('should apply headers to error responses', async () => {
    const app = new Elysia()
      .use(securityHeaders())
      .get('/test', () => {
        throw new Error('Test error');
      })
      .onError(({ set }) => {
        set.status = 500;
        return { error: 'Internal error' };
      });

    const response = await app.handle(new Request('http://localhost/test'));
    const headers = response.headers;

    // Verify headers are still present on errors
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('should work with other middleware', async () => {
    const app = new Elysia()
      .use(securityHeaders())
      .use(app =>
        app.derive(() => ({
          customData: 'test',
        }))
      )
      .get('/test', ({ customData }) => ({ customData }));

    const response = await app.handle(new Request('http://localhost/test'));
    const headers = response.headers;

    expect(await response.json()).toEqual({ customData: 'test' });
    expect(headers.get('Content-Security-Policy')).toBeTruthy();
  });
});
```

### 8.4 Test Coverage Goals

| Component             | Coverage Target | Test Types        |
| --------------------- | --------------- | ----------------- |
| Middleware Plugin     | 100%            | Unit, Integration |
| Header Builder        | 100%            | Unit              |
| CSP Builder           | 100%            | Unit              |
| HSTS Builder          | 100%            | Unit              |
| Validators            | 100%            | Unit              |
| Environment Detection | 100%            | Unit              |
| Policy Merging        | 100%            | Unit              |
| Overall               | 95%+            | All Types         |

---

## 9. Usage Examples

### 9.1 Basic Usage

```bash
# Make a request to the API
curl -i http://localhost:3000/api/v1/health

# Expected Response Headers:
HTTP/1.1 200 OK
Content-Type: application/json
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(),camera=(),microphone=(),payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### 9.2 Development Mode

```bash
# Development mode (NODE_ENV=development)
curl -i http://localhost:3000/api/v1/health

# Expected Response Headers (Development):
HTTP/1.1 200 OK
Content-Type: application/json
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self),camera=(self),microphone=(self)
Cross-Origin-Opener-Policy: unsafe-none
Cross-Origin-Resource-Policy: cross-origin
Cross-Origin-Embedder-Policy: unsafe-none
```

### 9.3 Production Mode

```bash
# Production mode (NODE_ENV=production)
curl -i https://api.example.com/api/v1/health

# Expected Response Headers (Production):
HTTP/1.1 200 OK
Content-Type: application/json
Content-Security-Policy: default-src 'self'; script-src 'self' 'strict-dynamic'; style-src 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests;
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(),camera=(),microphone=(),payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### 9.4 Custom Configuration

```bash
# With custom CSP directives
curl -i http://localhost:3000/api/v1/health

# Expected Response Headers:
HTTP/1.1 200 OK
Content-Type: application/json
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com; img-src 'self' data: https://images.example.com;
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-Custom-Header: custom-value
```

### 9.5 Security Testing with curl

```bash
# Test all security headers
curl -i http://localhost:3000/api/v1/health \
  -H "User-Agent: Mozilla/5.0" \
  -o /dev/null \
  -w "HTTP Status: %{http_code}\n\
  Content-Security-Policy: %{header_content_security_policy}\n\
  X-Content-Type-Options: %{header_x_content_type_options}\n\
  X-Frame-Options: %{header_x_frame_options}\n\
  Strict-Transport-Security: %{header_strict_transport_security}\n\
  Referrer-Policy: %{header_referrer_policy}\n"

# Test CSP with a simple browser
curl -v http://localhost:3000/ \
  -H "Content-Type: text/html"

# Test HSTS preload requirements
curl -I https://api.example.com/ \
  | grep -i "strict-transport-security"
```

### 9.6 CSP Violation Reporting

```bash
# Send a test CSP violation report
curl -X POST http://localhost:3000/api/v1/security/csp-report \
  -H "Content-Type: application/csp-report" \
  -d '{
    "csp-report": {
      "document-uri": "http://example.com/signup.html",
      "referrer": "http://example.com/index.html",
      "violated-directive": "img-src",
      "effective-directive": "img-src",
      "original-policy": "default-src 'none'; img-src 'self'; report-uri /csp-report-endpoint",
      "disposition": "report",
      "blocked-uri": "http://example.com/logo.png",
      "line-number": 12,
      "column-number": 5,
      "source-file": "http://example.com/signup.js",
      "status-code": 200,
      "script-sample": ""
    }
  }'

# Expected Response:
HTTP/1.1 204 No Content
```

### 9.7 Security Scanner Examples

```bash
# Using securityheaders.com (CLI tool)
securityheaders https://api.example.com/

# Using nmap to check headers
nmap -p 443 --script http-headers api.example.com

# Using curl to check for missing headers
curl -I https://api.example.com/ | grep -E "(Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"

# Check SSL Labs compliance
curl -I https://api.example.com/ -k
```

---

## 10. Success Criteria

### 10.1 Functional Requirements

| Requirement               | Description                               | Success Metric               |
| ------------------------- | ----------------------------------------- | ---------------------------- |
| **Header Coverage**       | All OWASP-recommended headers implemented | 10/10 headers implemented    |
| **CSP Support**           | Full CSP generation with directives       | 12+ directives supported     |
| **Environment Awareness** | Different policies for dev/prod           | 3 environments supported     |
| **Custom Configuration**  | Allow override of all defaults            | 100% of headers configurable |
| **Validation**            | Validate all header values                | 100% validation coverage     |

### 10.2 Non-Functional Requirements

| Requirement       | Description                                   | Success Metric                  |
| ----------------- | --------------------------------------------- | ------------------------------- |
| **Performance**   | Minimal overhead to request processing        | <1ms additional latency         |
| **Reliability**   | No breaking changes to existing functionality | 100% backward compatible        |
| **Testability**   | Comprehensive test coverage                   | >95% code coverage              |
| **Documentation** | Clear documentation and examples              | 100% API documented             |
| **Security**      | No security vulnerabilities introduced        | 0 critical/high vulnerabilities |

### 10.3 Security Requirements

| Requirement            | Description                       | Success Metric                       |
| ---------------------- | --------------------------------- | ------------------------------------ |
| **OWASP Compliance**   | Follow OWASP security guidelines  | 100% of recommended headers          |
| **CSP Strictness**     | Production CSP blocks XSS vectors | Blocks unsafe-inline/eval            |
| **HSTS Compliance**    | Proper HSTS implementation        | Meets preload requirements           |
| **Default Secure**     | Secure defaults out of the box    | No configuration needed for security |
| **No Unsafe Defaults** | No unsafe defaults in production  | All headers secure by default        |

### 10.4 Quality Metrics

| Metric              | Target | Measurement              |
| ------------------- | ------ | ------------------------ |
| **Code Coverage**   | >95%   | `bun test --coverage`    |
| **Type Safety**     | 100%   | TypeScript strict mode   |
| **Lint Compliance** | 100%   | ESLint zero errors       |
| **Documentation**   | 100%   | All functions documented |
| **Performance**     | <1ms   | Benchmark overhead       |

### 10.5 Acceptance Criteria

**Story: As a developer, I want security headers automatically applied**

- [ ] All responses include X-Content-Type-Options: nosniff
- [ ] All responses include X-Frame-Options: DENY (or SAMEORIGIN in dev)
- [ ] All responses include Referrer-Policy header
- [ ] All responses include Permissions-Policy header
- [ ] Production responses include Strict-Transport-Security header
- [ ] All responses include Content-Security-Policy header
- [ ] Development uses CSP-Report-Only mode
- [ ] CSP can be customized via configuration
- [ ] Custom headers can be added via configuration
- [ ] Headers are applied to error responses
- [ ] Middleware doesn't break existing functionality

**Story: As a security auditor, I want comprehensive CSP policies**

- [ ] CSP includes all OWASP-recommended directives
- [ ] CSP blocks unsafe-inline in production
- [ ] CSP blocks unsafe-eval in production
- [ ] CSP includes frame-ancestors restriction
- [ ] CSP includes base-uri restriction
- [ ] CSP includes form-action restriction
- [ ] CSP violation reporting is configured
- [ ] CSP supports nonce-based policies
- [ ] CSP supports hash-based policies
- [ ] CSP policies are validated before application

**Story: As a DevOps engineer, I want environment-specific policies**

- [ ] Development uses permissive policies
- [ ] Production uses strict policies
- [ ] Staging uses balanced policies
- [ ] Environment can be overridden
- [ ] HSTS respects environment
- [ ] CSP mode respects environment
- [ ] COOP/COEP respect environment
- [ ] Configuration is validated per environment

**Story: As a tester, I want comprehensive test coverage**

- [ ] Unit tests for all builders
- [ ] Unit tests for all validators
- [ ] Unit tests for utilities
- [ ] Integration tests for middleware
- [ ] Tests cover edge cases
- [ ] Tests cover error conditions
- [ ] Performance benchmarks included
- [ ] Security test scenarios included

### 10.6 Validation Checklist

Before marking this feature as complete:

**Implementation**

- [ ] All security headers implemented
- [ ] CSP builder functional
- [ ] HSTS builder functional
- [ ] Environment detection working
- [ ] Policy merging working
- [ ] Validation logic implemented
- [ ] Error handling complete
- [ ] TypeScript types complete

**Testing**

- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Edge cases covered
- [ ] Performance benchmarks run
- [ ] Security tests passing
- [ ] Coverage targets met

**Documentation**

- [ ] Code documented with JSDoc
- [ ] Usage examples provided
- [ ] Configuration documented
- [ ] Security implications documented
- [ ] Troubleshooting guide included

**Security**

- [ ] No unsafe defaults in production
- [ ] All headers validated
- [ ] No information leakage
- [ ] OWASP guidelines followed
- [ ] Security review completed

**Quality**

- [ ] Code review completed
- [ ] Linting passes
- [ ] Type checking passes
- [ ] No deprecated APIs used
- [ ] Performance acceptable

---

## Appendix

### A. References

- [OWASP Security Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Google CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [HSTS Preload List](https://hstspreload.org/)

### B. Change Log

| Version | Date       | Changes                 |
| ------- | ---------- | ----------------------- |
| 1.0.0   | 2026-03-13 | Initial design document |

### C. Review History

| Date       | Reviewer          | Comments               | Status                 |
| ---------- | ----------------- | ---------------------- | ---------------------- |
| 2026-03-13 | Architecture Team | Initial draft approved | Pending Implementation |

### D. Open Questions

1. Should we support nonce generation per-request or per-application?
   - **Decision**: Start with per-request for production

2. Should CSP violation reports be stored in the database?
   - **Decision**: Yes, add CSP violation logging endpoint

3. Should we support CSP fallback to meta tags for HTML responses?
   - **Decision**: Out of scope (API-only)

4. Should we support different policies for different routes?
   - **Decision**: Support via custom headers in route handlers

---

**Document Status:** Ready for Implementation
**Next Steps:** Begin implementation following this design document
**Estimated Implementation Time:** 2-3 days
**Priority:** High (Security Feature)
