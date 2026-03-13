# Request Context Enhancer - Design Document

**Date:** 2026-03-13
**Author:** System Architecture Team
**Status:** Design Phase
**Version:** 1.0.0

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [Interface Design](#4-interface-design)
5. [Implementation Details](#5-implementation-details)
6. [Integration Points](#6-integration-points)
7. [Testing Strategy](#7-testing-strategy)
8. [Usage Examples](#8-usage-examples)
9. [Success Criteria](#9-success-criteria)
10. [Performance Considerations](#10-performance-considerations)
11. [Security Considerations](#11-security-considerations)
12. [Migration Path](#12-migration-path)

---

## 1. Overview

### 1.1 Purpose

The Request Context Enhancer is a middleware and context derivation system designed to enrich each incoming HTTP request with comprehensive metadata, performance tracking, and type-safe context augmentation for the Bun + Elysia + PASETO REST API boilerplate.

### 1.2 Problem Statement

Currently, the application has basic context enhancement through the `request-id.middleware.ts` and `logging/middleware.ts` files, but these implementations:

- Lack comprehensive request metadata collection
- Don't provide unified context interface
- Have limited performance measurement capabilities
- Don't support extensible context derivation patterns
- Lack type-safe context augmentation across the application
- Have scattered implementation concerns

### 1.3 Solution Goals

The Request Context Enhancer will:

1. **Centralize Request Metadata**: Collect all relevant request information in one place
2. **Performance Tracking**: Provide accurate duration measurements for requests
3. **Type-Safe Context**: Ensure all context additions are type-safe and discoverable
4. **Extensible Design**: Allow easy addition of new context properties
5. **Zero Overhead**: Minimize performance impact through efficient derivation
6. **Developer Experience**: Provide clear APIs and autocomplete support
7. **Observability**: Enable better logging, monitoring, and debugging

### 1.4 Key Features

- Request metadata extraction (IP, User-Agent, headers, timing)
- Context derivation using Elysia's derive mechanism
- High-resolution performance tracking
- Type-safe context augmentation
- Extensible plugin architecture
- Integration with existing logging and authentication systems
- Request lifecycle hooks for custom logic

---

## 2. Architecture

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Incoming HTTP Request                    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CORS Middleware Layer                         │
│              (Cross-Origin Resource Sharing)                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Request Context Enhancer Plugin                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  1. Request ID Assignment                               │    │
│  │  2. Metadata Extraction (IP, User-Agent, etc.)          │    │
│  │  3. Performance Timer Initialization                    │    │
│  │  4. Context Derivation (derive())                        │    │
│  │  5. Logger Child Creation                               │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
┌──────────────────────────┐      ┌──────────────────────────┐
│   Logging Plugin         │      │   Authentication         │
│   (Enhanced Context)     │      │   Middleware             │
└──────────────────────────┘      └──────────────────────────┘
                  │                               │
                  └───────────────┬───────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Route Handlers                               │
│  (Access to enriched context: metadata, timing, logger, etc.)   │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              Response/Error Hooks                                │
│  - Finalize performance measurements                             │
│  - Log request completion with metrics                          │
│  - Set response headers                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Context Enhancement Flow

```
Request Arrival
        │
        ├─> Extract Base Headers (X-Request-ID, User-Agent, etc.)
        │
        ├─> Generate/Validate Request ID
        │
        ├─> Extract Client Information
        │   ├─> IP Address (X-Forwarded-For, X-Real-IP)
        │   ├─> User Agent
        │   └─> Geographic hints (optional)
        │
        ├─> Initialize Performance Tracking
        │   ├─> Start Time (performance.now())
        │   └─> Request-specific metrics store
        │
        ├─> Create Derived Context
        │   ├─> Request Metadata
        │   ├─> Performance Timers
        │   ├─> Child Logger with context
        │   └─> Utility functions
        │
        └─> Register Lifecycle Hooks
            ├─> onAfterHandle: Log metrics
            ├─> onError: Log errors with context
            └─> onResponse: Add headers
```

### 2.3 Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    Context Types Module                          │
│  (TypeScript interfaces for type-safe context)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Metadata Extractor                             │
│  (Responsible for extracting request metadata)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ provides data to
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Context Enhancer Plugin                            │
│  (Main Elysia plugin orchestrating context enhancement)          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ integrates with
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Performance Tracker                                │
│  (High-precision timing measurements)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. File Structure

```
src/
├── core/
│   └── context/
│       ├── index.ts                          # Barrel exports
│       ├── types.ts                          # TypeScript interfaces
│       ├── enhancer.plugin.ts                # Main Elysia plugin
│       ├── metadata.extractor.ts             # Request metadata extraction
│       ├── performance.tracker.ts            # Performance measurement
│       └── context-logger.factory.ts         # Logger creation utilities
│
├── middlewares/
│   └── request-context-enhancer.middleware.ts # Legacy middleware wrapper
│
└── types/
    └── context augmentations/
        └── elysia.context.d.ts              # Elysia context augmentation

tests/
└── unit/
    └── core/
        └── context/
            ├── metadata.extractor.test.ts
            ├── performance.tracker.test.ts
            ├── context-logger.factory.test.ts
            └── enhancer.plugin.test.ts
```

### File Descriptions

| File                                     | Purpose                                                   |
| ---------------------------------------- | --------------------------------------------------------- |
| `types.ts`                               | Defines all TypeScript interfaces for context enhancement |
| `enhancer.plugin.ts`                     | Main Elysia plugin implementing context enhancement       |
| `metadata.extractor.ts`                  | Extracts request metadata from headers and request object |
| `performance.tracker.ts`                 | Handles high-precision timing measurements                |
| `context-logger.factory.ts`              | Creates child loggers with request context                |
| `request-context-enhancer.middleware.ts` | Wrapper for backward compatibility                        |

---

## 4. Interface Design

### 4.1 Core Type Definitions

```typescript
/**
 * Request metadata extracted from incoming request
 */
export interface RequestMetadata {
  /** Unique identifier for this request */
  requestId: string;

  /** Client IP address (proxied or direct) */
  clientIp: string;

  /** Original client IP before proxies */
  originalIp?: string;

  /** Client user agent string */
  userAgent: string;

  /** Parsed user agent information (optional) */
  userAgentInfo?: {
    browser?: string;
    version?: string;
    os?: string;
    device?: string;
  };

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

  /** Custom metadata extensions */
  [key: string]: unknown;
}

/**
 * Performance metrics for request tracking
 */
export interface PerformanceMetrics {
  /** Request start time (high resolution) */
  startTime: number;

  /** Request end time (high resolution) */
  endTime?: number;

  /** Total duration in milliseconds */
  duration?: number;

  /** Individual phase timings */
  phases: {
    middleware?: number;
    validation?: number;
    handler?: number;
    response?: number;
  };

  /** Phase start times for tracking */
  phaseStartTimes: Map<string, number>;

  /** Custom performance markers */
  markers: Map<string, number>;
}

/**
 * Request-specific logger with context
 */
export interface RequestContextLogger {
  /** Log debug message with request context */
  debug(message: string, context?: Record<string, unknown>): void;

  /** Log info message with request context */
  info(message: string, context?: Record<string, unknown>): void;

  /** Log warning message with request context */
  warn(message: string, context?: Record<string, unknown>): void;

  /** Log error message with request context */
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;

  /** Create child logger with additional context */
  child(additionalContext: Record<string, unknown>): RequestContextLogger;
}

/**
 * Utility functions available in enhanced context
 */
export interface ContextUtilities {
  /** Check if request is from a known proxy/load balancer */
  isProxied: boolean;

  /** Get client IP considering proxies */
  getClientIp(): string;

  /** Get all IPs in proxy chain */
  getIpChain(): string[];

  /** Check if request has specific header */
  hasHeader(name: string): boolean;

  /** Get header value */
  getHeader(name: string): string | undefined;

  /** Get all header names */
  getHeaderNames(): string[];

  /** Add performance marker */
  addMarker(name: string): void;

  /** Get time since marker or start */
  getTimeSince(marker?: string): number;

  /** Check if duration exceeds threshold */
  exceedsThreshold(thresholdMs: number): boolean;
}

/**
 * Complete enhanced request context
 */
export interface EnhancedRequestContext {
  /** Extracted request metadata */
  metadata: RequestMetadata;

  /** Performance tracking utilities */
  performance: PerformanceMetrics;

  /** Request-specific logger */
  logger: RequestContextLogger;

  /** Context utility functions */
  utils: ContextUtilities;
}

/**
 * Configuration options for context enhancer
 */
export interface ContextEnhancerOptions {
  /** Header name for request ID */
  requestIdHeader?: string;

  /** Enable user agent parsing */
  parseUserAgent?: boolean;

  /** Enable geographic IP lookup (optional feature) */
  enableGeoIp?: boolean;

  /** Performance tracking configuration */
  performance?: {
    /** Enable phase-level tracking */
    trackPhases?: boolean;

    /** Enable custom markers */
    enableMarkers?: boolean;

    /** Log slow requests threshold (ms) */
    slowRequestThreshold?: number;
  };

  /** IP extraction configuration */
  ip?: {
    /** Headers to check for client IP (in order) */
    ipHeaders?: string[];

    /** Trust proxy headers */
    trustProxy?: boolean;

    /** Maximum number of proxies in chain */
    maxProxyDepth?: number;
  };

  /** Custom metadata extractors */
  customExtractors?: Array<(request: Request) => Record<string, unknown> | Promise<Record<string, unknown>>>;

  /** Custom context augmentation */
  augmentContext?: (baseContext: EnhancedRequestContext, request: Request) => Record<string, unknown> | Promise<Record<string, unknown>>;

  /** Lifecycle hooks */
  hooks?: {
    /** Called after context is created */
    afterCreate?: (context: EnhancedRequestContext) => void | Promise<void>;

    /** Called before request is handled */
    beforeHandle?: (context: EnhancedRequestContext) => void | Promise<void>;

    /** Called after request is handled */
    afterHandle?: (context: EnhancedRequestContext, response: unknown) => void | Promise<void>;

    /** Called on error */
    onError?: (context: EnhancedRequestContext, error: unknown) => void | Promise<void>;
  };
}
```

### 4.2 Elysia Context Augmentation

```typescript
// types/context-augmentations/elysia.context.d.ts
import 'elysia';

declare module 'elysia' {
  interface Context {
    /** Enhanced request context */
    requestContext: import('../../src/core/context/types').EnhancedRequestContext;
  }
}
```

### 4.3 Performance Tracker Interface

```typescript
/**
 * Performance tracker for request timing
 */
export interface PerformanceTracker {
  /** Initialize tracking for a request */
  start(): void;

  /** Mark the end of a phase */
  endPhase(phase: keyof PerformanceMetrics['phases']): void;

  /** Add a custom marker */
  addMarker(name: string): void;

  /** Get current duration */
  getDuration(): number;

  /** Get time since specific marker or start */
  getTimeSince(marker?: string): number;

  /** Get all phase timings */
  getPhases(): PerformanceMetrics['phases'];

  /** Get all markers */
  getMarkers(): Map<string, number>;

  /** Finalize tracking and return complete metrics */
  finalize(): PerformanceMetrics;

  /** Check if request exceeds slow threshold */
  isSlow(thresholdMs: number): boolean;
}
```

---

## 5. Implementation Details

### 5.1 Metadata Extractor Implementation

```typescript
// src/core/context/metadata.extractor.ts

import type { RequestMetadata } from './types';
import type { ContextEnhancerOptions } from './types';

/**
 * Default IP headers to check (in order of priority)
 */
const DEFAULT_IP_HEADERS = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'x-client-ip', 'x-forwarded', 'forwarded-for', 'forwarded'] as const;

/**
 * Default options for metadata extraction
 */
const DEFAULT_OPTIONS: Required<Pick<ContextEnhancerOptions, 'requestIdHeader' | 'ip'>> = {
  requestIdHeader: 'X-Request-ID',
  ip: {
    ipHeaders: [...DEFAULT_IP_HEADERS],
    trustProxy: true,
    maxProxyDepth: 10,
  },
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
  options: Required<ContextEnhancerOptions['ip']>
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

  // Get direct connection IP (if available)
  // Note: In serverless/edge environments, this may not be available
  const directIp = headers.get('x-bun-client-ip') || 'unknown';
  if (directIp !== 'unknown') {
    ipChain.push(directIp);
  }

  // Apply proxy depth limit
  const limitedChain = ipChain.slice(-options.maxProxyDepth);

  // The first IP is typically the original client (leftmost in X-Forwarded-For)
  const originalIp = limitedChain[0];
  // The last IP is typically the immediate connection
  const clientIp = options.trustProxy ? originalIp || directIp : directIp;

  return {
    clientIp,
    originalIp: options.trustProxy ? originalIp : undefined,
    ipChain: limitedChain,
  };
}

/**
 * Parse user agent string into components
 *
 * @param userAgent - User agent string
 * @returns Parsed user agent information
 */
function parseUserAgent(userAgent: string): RequestMetadata['userAgentInfo'] {
  if (!userAgent || userAgent === 'unknown') {
    return undefined;
  }

  // Basic parsing (can be extended with ua-parser-js for detailed parsing)
  const info: RequestMetadata['userAgentInfo'] = {};

  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    info.browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) info.version = match[1];
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    info.browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) info.version = match[1];
  } else if (userAgent.includes('Firefox')) {
    info.browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) info.version = match[1];
  } else if (userAgent.includes('Edg')) {
    info.browser = 'Edge';
    const match = userAgent.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
    if (match) info.version = match[1];
  }

  // Detect OS
  if (userAgent.includes('Windows')) {
    info.os = 'Windows';
  } else if (userAgent.includes('Mac OS X')) {
    info.os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    info.os = 'Linux';
  } else if (userAgent.includes('Android')) {
    info.os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    info.os = 'iOS';
  }

  // Detect device type
  if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
    info.device = 'mobile';
  } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    info.device = 'tablet';
  } else {
    info.device = 'desktop';
  }

  return Object.keys(info).length > 0 ? info : undefined;
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
 * @param options - Metadata extraction options
 * @returns Extracted request metadata
 */
export function extractRequestMetadata(request: Request, options: Partial<ContextEnhancerOptions> = {}): RequestMetadata {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const headers = request.headers;
  const url = new URL(request.url);

  // Get or generate request ID
  const requestIdHeader = headers.get(opts.requestIdHeader);
  const requestId = requestIdHeader?.trim() || crypto.randomUUID();

  // Extract IP information
  const ipInfo = extractClientIp(request, opts.ip!);

  // Get user agent
  const userAgent = headers.get('user-agent') || 'unknown';

  // Parse user agent if enabled
  const userAgentInfo = options.parseUserAgent ? parseUserAgent(userAgent) : undefined;

  // Extract query parameters
  const query = extractQueryParams(request.url);

  // Build metadata object
  const metadata: RequestMetadata = {
    requestId,
    clientIp: ipInfo.clientIp,
    originalIp: ipInfo.originalIp,
    userAgent,
    userAgentInfo,
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
    // Additional IP info
    ipChain: ipInfo.ipChain,
  };

  return metadata;
}

/**
 * Validate request ID format
 *
 * @param requestId - Request ID to validate
 * @returns True if valid
 */
export function isValidRequestId(requestId: string): boolean {
  // Accept UUID format or alphanumeric with hyphens/underscores
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const customRegex = /^[a-zA-Z0-9_-]{1,64}$/;

  return uuidRegex.test(requestId) || customRegex.test(requestId);
}
```

### 5.2 Performance Tracker Implementation

```typescript
// src/core/context/performance.tracker.ts

import type { PerformanceMetrics, PerformanceTracker } from './types';

/**
 * High-precision performance tracker for request timing
 */
export class RequestPerformanceTracker implements PerformanceTracker {
  private metrics: PerformanceMetrics;
  private startTime: number;
  private ended = false;

  constructor() {
    this.startTime = performance.now();
    this.metrics = {
      startTime: this.startTime,
      phases: {},
      phaseStartTimes: new Map(),
      markers: new Map(),
    };

    // Initialize phase start time
    this.metrics.phaseStartTimes.set('request', this.startTime);
  }

  /**
   * Start tracking (called in constructor, available for interface)
   */
  start(): void {
    // Already started in constructor
  }

  /**
   * Mark the end of a phase
   *
   * @param phase - Phase name
   */
  endPhase(phase: keyof PerformanceMetrics['phases']): void {
    if (this.ended) {
      return;
    }

    const now = performance.now();
    const phaseStart = this.metrics.phaseStartTimes.get(phase) || this.startTime;

    this.metrics.phases[phase] = now - phaseStart;
    this.metrics.phaseStartTimes.set(`${phase}_end`, now);
  }

  /**
   * Add a custom marker for specific timing points
   *
   * @param name - Marker name
   */
  addMarker(name: string): void {
    if (this.ended) {
      return;
    }

    this.metrics.markers.set(name, performance.now());
  }

  /**
   * Get current duration since start
   *
   * @returns Duration in milliseconds
   */
  getDuration(): number {
    const endTime = this.metrics.endTime || performance.now();
    return endTime - this.startTime;
  }

  /**
   * Get time since specific marker or start
   *
   * @param marker - Marker name (undefined for start)
   * @returns Time in milliseconds
   */
  getTimeSince(marker?: string): number {
    const now = performance.now();

    if (marker) {
      const markerTime = this.metrics.markers.get(marker);
      if (markerTime !== undefined) {
        return now - markerTime;
      }
      // Check for phase end times
      const phaseEndTime = this.metrics.phaseStartTimes.get(`${marker}_end`);
      if (phaseEndTime !== undefined) {
        return now - phaseEndTime;
      }
      // Check for phase start times
      const phaseStartTime = this.metrics.phaseStartTimes.get(marker);
      if (phaseStartTime !== undefined) {
        return now - phaseStartTime;
      }
    }

    return now - this.startTime;
  }

  /**
   * Get all phase timings
   *
   * @returns Phase timings object
   */
  getPhases(): PerformanceMetrics['phases'] {
    return { ...this.metrics.phases };
  }

  /**
   * Get all custom markers
   *
   * @returns Map of marker names to timestamps
   */
  getMarkers(): Map<string, number> {
    return new Map(this.metrics.markers);
  }

  /**
   * Finalize tracking and return complete metrics
   *
   * @returns Complete performance metrics
   */
  finalize(): PerformanceMetrics {
    if (this.ended) {
      return this.metrics;
    }

    this.ended = true;
    this.metrics.endTime = performance.now();
    this.metrics.duration = this.metrics.endTime - this.metrics.startTime;

    return this.metrics;
  }

  /**
   * Check if request duration exceeds slow threshold
   *
   * @param thresholdMs - Threshold in milliseconds
   * @returns True if slow
   */
  isSlow(thresholdMs: number): boolean {
    return this.getDuration() > thresholdMs;
  }

  /**
   * Get raw metrics object
   *
   * @returns Internal metrics object
   */
  getMetrics(): PerformanceMetrics {
    return this.metrics;
  }
}

/**
 * Create a performance tracker instance
 *
 * @returns New performance tracker
 */
export function createPerformanceTracker(): PerformanceTracker {
  return new RequestPerformanceTracker();
}
```

### 5.3 Context Logger Factory Implementation

```typescript
// src/core/context/context-logger.factory.ts

import type { Logger } from '../logging/types';
import type { RequestContextLogger, RequestMetadata } from './types';
import { logger as rootLogger } from '../logging/logger';

/**
 * Convert metadata to log context
 *
 * @param metadata - Request metadata
 * @returns Log context object
 */
function metadataToLogContext(metadata: RequestMetadata): Record<string, unknown> {
  return {
    requestId: metadata.requestId,
    clientIp: metadata.clientIp,
    method: metadata.method,
    path: metadata.path,
    userAgent: metadata.userAgent,
    // Include other relevant fields
    origin: metadata.origin,
    contentType: metadata.contentType,
  };
}

/**
 * Create a request-specific logger with context
 *
 * @param metadata - Request metadata
 * @returns Request context logger
 */
export function createRequestContextLogger(metadata: RequestMetadata): RequestContextLogger {
  const logContext = metadataToLogContext(metadata);
  const childLogger = rootLogger.child(logContext);

  return {
    debug(message: string, context?: Record<string, unknown>): void {
      childLogger.debug(message, context);
    },

    info(message: string, context?: Record<string, unknown>): void {
      childLogger.info(message, context);
    },

    warn(message: string, context?: Record<string, unknown>): void {
      childLogger.warn(message, context);
    },

    error(message: string, error?: unknown, context?: Record<string, unknown>): void {
      childLogger.error(message, error, context);
    },

    child(additionalContext: Record<string, unknown>): RequestContextLogger {
      const newContext = { ...logContext, ...additionalContext };
      const newChildLogger = rootLogger.child(newContext);

      return {
        debug(message: string, context?: Record<string, unknown>): void {
          newChildLogger.debug(message, context);
        },
        info(message: string, context?: Record<string, unknown>): void {
          newChildLogger.info(message, context);
        },
        warn(message: string, context?: Record<string, unknown>): void {
          newChildLogger.warn(message, context);
        },
        error(message: string, error?: unknown, context?: Record<string, unknown>): void {
          newChildLogger.error(message, error, context);
        },
        child(moreContext: Record<string, unknown>): RequestContextLogger {
          return createRequestContextLogger({
            ...metadata,
            ...newContext,
            ...moreContext,
          } as RequestMetadata);
        },
      };
    },
  };
}

/**
 * Create a logger for a specific phase of request processing
 *
 * @param baseLogger - Base request context logger
 * @param phase - Phase name
 * @returns Phase-specific logger
 */
export function createPhaseLogger(baseLogger: RequestContextLogger, phase: string): RequestContextLogger {
  return baseLogger.child({ phase });
}
```

### 5.4 Context Utilities Implementation

```typescript
// src/core/context/context.utils.ts

import type { ContextUtilities, RequestMetadata, PerformanceMetrics } from './types';

/**
 * Create context utility functions
 *
 * @param metadata - Request metadata
 * @param performance - Performance metrics
 * @param request - Original request object
 * @returns Context utilities
 */
export function createContextUtilities(metadata: RequestMetadata, performance: PerformanceMetrics, request: Request): ContextUtilities {
  const headers = request.headers;

  return {
    /**
     * Check if request is from a known proxy/load balancer
     */
    get isProxied(): boolean {
      return headers.has('x-forwarded-for') || headers.has('x-real-ip') || headers.has('x-forwarded-host') || headers.has('x-forwarded-proto');
    },

    /**
     * Get client IP considering proxies
     */
    getClientIp(): string {
      return metadata.clientIp;
    },

    /**
     * Get all IPs in proxy chain
     */
    getIpChain(): string[] {
      return (metadata.ipChain as string[]) || [metadata.clientIp];
    },

    /**
     * Check if request has specific header
     */
    hasHeader(name: string): boolean {
      return headers.has(name);
    },

    /**
     * Get header value
     */
    getHeader(name: string): string | undefined {
      return headers.get(name) || undefined;
    },

    /**
     * Get all header names
     */
    getHeaderNames(): string[] {
      return Array.from(headers.keys());
    },

    /**
     * Add performance marker
     */
    addMarker(name: string): void {
      performance.markers.set(name, performance.now());
    },

    /**
     * Get time since marker or start
     */
    getTimeSince(marker?: string): number {
      const now = performance.endTime || performance.now();

      if (marker) {
        const markerTime = performance.markers.get(marker);
        if (markerTime !== undefined) {
          return now - markerTime;
        }
      }

      return now - performance.startTime;
    },

    /**
     * Check if duration exceeds threshold
     */
    exceedsThreshold(thresholdMs: number): boolean {
      const duration = performance.endTime ? performance.endTime - performance.startTime : performance.now() - performance.startTime;

      return duration > thresholdMs;
    },
  };
}
```

### 5.5 Main Context Enhancer Plugin Implementation

````typescript
// src/core/context/enhancer.plugin.ts

import type { Elysia } from 'elysia';
import type { EnhancedRequestContext, ContextEnhancerOptions, RequestMetadata } from './types';
import { extractRequestMetadata } from './metadata.extractor';
import { createPerformanceTracker } from './performance.tracker';
import { createRequestContextLogger } from './context-logger.factory';
import { createContextUtilities } from './context.utils';

/**
 * Default context enhancer options
 */
const DEFAULT_ENHANCER_OPTIONS: Required<Pick<ContextEnhancerOptions, 'requestIdHeader' | 'parseUserAgent' | 'enableGeoIp' | 'performance' | 'ip'>> =
  {
    requestIdHeader: 'X-Request-ID',
    parseUserAgent: true,
    enableGeoIp: false,
    performance: {
      trackPhases: true,
      enableMarkers: true,
      slowRequestThreshold: 1000, // 1 second
    },
    ip: {
      ipHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
      trustProxy: true,
      maxProxyDepth: 10,
    },
  };

/**
 * Request Context Enhancer Plugin
 *
 * Enhances each request with comprehensive metadata, performance tracking,
 * and type-safe context augmentation.
 *
 * @example
 * ```typescript
 * import { contextEnhancer } from './core/context/enhancer.plugin'
 *
 * app.use(contextEnhancer({
 *   performance: { slowRequestThreshold: 500 }
 * }))
 *
 * // Access in routes
 * app.get('/test', ({ requestContext }) => {
 *   const { metadata, performance, logger } = requestContext
 *   logger.info('Processing request', { path: metadata.path })
 * })
 * ```
 */
export function contextEnhancer(options: Partial<ContextEnhancerOptions> = {}) {
  const opts = { ...DEFAULT_ENHANCER_OPTIONS, ...options };

  return (app: Elysia) =>
    app
      .derive(async ({ request }) => {
        // Extract request metadata
        const metadata = extractRequestMetadata(request, opts);

        // Create performance tracker
        const performanceTracker = createPerformanceTracker();

        // Create request-specific logger
        const logger = createRequestContextLogger(metadata);

        // Create context utilities
        const utils = createContextUtilities(metadata, performanceTracker.getMetrics(), request);

        // Build base context
        const baseContext: EnhancedRequestContext = {
          metadata,
          performance: performanceTracker.getMetrics(),
          logger,
          utils,
        };

        // Run custom extractors
        let customContext: Record<string, unknown> = {};
        if (opts.customExtractors) {
          for (const extractor of opts.customExtractors) {
            try {
              const extracted = await extractor(request);
              customContext = { ...customContext, ...extracted };
            } catch (error) {
              logger.warn('Custom extractor failed', { error });
            }
          }
        }

        // Run context augmentation
        let augmentedContext: Record<string, unknown> = {};
        if (opts.augmentContext) {
          try {
            augmentedContext = await opts.augmentContext(baseContext, request);
          } catch (error) {
            logger.warn('Context augmentation failed', { error });
          }
        }

        // Call afterCreate hook
        if (opts.hooks?.afterCreate) {
          try {
            await opts.hooks.afterCreate(baseContext);
          } catch (error) {
            logger.warn('AfterCreate hook failed', { error });
          }
        }

        // Return complete context
        return {
          requestContext: {
            ...baseContext,
            ...customContext,
            ...augmentedContext,
          },
          // Export individual properties for convenience
          _metadata: metadata,
          _performance: performanceTracker,
          _logger: logger,
        } as const;
      })
      .onBeforeHandle(async ({ requestContext }) => {
        const context = requestContext as EnhancedRequestContext;

        // Mark middleware phase complete
        if (opts.performance.trackPhases) {
          context.performance.phaseStartTimes.set('middleware', performance.now());
        }

        // Call beforeHandle hook
        if (opts.hooks?.beforeHandle) {
          try {
            await opts.hooks.beforeHandle(context);
          } catch (error) {
            context.logger.warn('BeforeHandle hook failed', { error });
          }
        }
      })
      .onAfterHandle(async ({ requestContext, response }) => {
        const context = requestContext as EnhancedRequestContext;

        // Mark handler phase complete
        if (opts.performance.trackPhases) {
          context.performance.phaseStartTimes.set('handler', performance.now());
        }

        // Finalize performance tracking
        const finalMetrics = context.performance.endTime
          ? context.performance
          : {
              ...context.performance,
              endTime: performance.now(),
              duration: performance.now() - context.performance.startTime,
            };

        // Check if request was slow
        const isSlow = finalMetrics.duration !== undefined && finalMetrics.duration > (opts.performance.slowRequestThreshold || 1000);

        // Log request completion
        const logLevel = isSlow ? 'warn' : 'info';
        context.logger[logLevel]('Request completed', {
          method: context.metadata.method,
          path: context.metadata.path,
          status: 200,
          duration: `${finalMetrics.duration?.toFixed(2)}ms`,
          phases: context.performance.phases,
        });

        // Call afterHandle hook
        if (opts.hooks?.afterHandle) {
          try {
            await opts.hooks.afterHandle(context, response);
          } catch (error) {
            context.logger.warn('AfterHandle hook failed', { error });
          }
        }
      })
      .onError(async ({ requestContext, error, set }) => {
        const context = requestContext as EnhancedRequestContext;

        // Finalize performance tracking
        const finalMetrics = {
          ...context.performance,
          endTime: performance.now(),
          duration: performance.now() - context.performance.startTime,
        };

        // Log error
        context.logger.error('Request failed', error, {
          method: context.metadata.method,
          path: context.metadata.path,
          status: set.status || 500,
          duration: `${finalMetrics.duration.toFixed(2)}ms`,
        });

        // Call onError hook
        if (opts.hooks?.onError) {
          try {
            await opts.hooks.onError(context, error);
          } catch (hookError) {
            context.logger.warn('OnError hook failed', { error: hookError });
          }
        }

        // Ensure request ID is set on error response
        if (!set.headers[opts.requestIdHeader]) {
          set.headers[opts.requestIdHeader] = context.metadata.requestId;
        }
      })
      .onResponse(({ requestContext, set }) => {
        const context = requestContext as EnhancedRequestContext;

        // Set response headers
        set.headers[opts.requestIdHeader] = context.metadata.requestId;

        if (context.performance.duration) {
          set.headers['X-Response-Time'] = `${context.performance.duration.toFixed(2)}ms`;
        }
      });
}
````

### 5.6 Barrel Export

```typescript
// src/core/context/index.ts

export * from './types';
export * from './enhancer.plugin';
export * from './metadata.extractor';
export * from './performance.tracker';
export * from './context-logger.factory';
export * from './context.utils';
```

---

## 6. Integration Points

### 6.1 Application Integration

```typescript
// src/app.ts

import { Elysia } from 'elysia';
import { contextEnhancer } from './core/context';

export function createApp() {
  const app = new Elysia()
    // Apply context enhancer early
    .use(
      contextEnhancer({
        performance: {
          trackPhases: true,
          enableMarkers: true,
          slowRequestThreshold: 500, // Alert on requests > 500ms
        },
        parseUserAgent: true,
      })
    )
    // ... other plugins and middleware
    .use(cors())
    .use(loggingPlugin)
    .use(authMiddleware);

  return app;
}
```

### 6.2 Integration with Existing Logging

```typescript
// src/core/logging/middleware.ts (updated)

import type { Elysia } from 'elysia';
import { contextEnhancer } from '../context/enhancer.plugin';

export function loggingPlugin<T extends Elysia>(app: T): T {
  return app.use(contextEnhancer()).onAfterHandle(({ requestContext }) => {
    const { metadata, performance, logger } = requestContext;

    // Access enriched context for logging
    logger.info('Request completed', {
      method: metadata.method,
      path: metadata.path,
      duration: performance.duration,
      clientIp: metadata.clientIp,
    });
  });
}
```

### 6.3 Integration with Authentication

```typescript
// src/middlewares/auth.middleware.ts (updated)

import type { EnhancedRequestContext } from '../core/context';

export function requireAuth(pasetoService: PasetoService, authService: AuthService) {
  return async ({ request, requestContext }: { request: Request; requestContext: EnhancedRequestContext }) => {
    const { logger, metadata } = requestContext;

    const authHeader = request.headers.get('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        path: metadata.path,
        clientIp: metadata.clientIp,
      });
      throw new UnauthorizedError('Authentication required');
    }

    // Add marker for auth timing
    requestContext.performance.markers.set('auth_start', performance.now());

    const result = await authService.validateAccessToken({ token });

    if (!result.valid || !result.userId || !result.payload) {
      logger.warn('Authentication failed: Invalid token', {
        error: result.error,
        path: metadata.path,
        clientIp: metadata.clientIp,
      });
      throw new InvalidTokenError(result.error || 'Invalid token');
    }

    // Mark auth complete
    requestContext.performance.markers.set('auth_end', performance.now());

    return {
      user: {
        id: result.userId,
        email: result.payload.email,
        // ... other user fields
      },
      tokenId: result.payload.jti,
    };
  };
}
```

### 6.4 Integration with Rate Limiting

```typescript
// src/middlewares/rate-limit.middleware.ts (updated)

import type { EnhancedRequestContext } from '../core/context';

export function enforceRateLimit(options: RateLimitOptions) {
  return async ({ request, requestContext }: { request: Request; requestContext: EnhancedRequestContext }) => {
    const { metadata, utils, logger } = requestContext;

    // Use client IP from context
    const identifier = options.strategy === 'ip' ? utils.getClientIp() : requestContext.user?.id || utils.getClientIp();

    logger.debug('Checking rate limit', {
      identifier,
      path: metadata.path,
      maxRequests: options.maxRequests,
    });

    // ... rate limit logic
  };
}
```

### 6.5 Route Handler Integration

```typescript
// src/routes/users.routes.ts (updated)

export function createUsersRoutes(app: Elysia, usersService: UsersService) {
  return app.group('/users', userApp =>
    userApp.get(
      '/',
      async ({ requestContext }) => {
        const { metadata, performance, logger } = requestContext;

        // Add custom marker
        performance.markers.set('query_start', performance.now());

        logger.info('Fetching users', {
          path: metadata.path,
          requestId: metadata.requestId,
        });

        const users = await usersService.findAll();

        performance.markers.set('query_end', performance.now());

        logger.info('Users fetched successfully', {
          count: users.length,
          queryTime: performance.markers.get('query_end')! - performance.markers.get('query_start')!,
        });

        return successResponse(users);
      },
      {
        beforeHandle: [requireAuth()],
      }
    )
  );
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// tests/unit/core/context/metadata.extractor.test.ts

import { describe, test, expect, beforeEach } from 'bun:test';
import { extractRequestMetadata, isValidRequestId } from '@/core/context/metadata.extractor';

describe('Metadata Extractor', () => {
  describe('extractRequestMetadata', () => {
    test('should extract basic request information', () => {
      const request = new Request('https://example.com/api/test?foo=bar', {
        method: 'POST',
        headers: {
          'user-agent': 'Test-Agent/1.0',
          'content-type': 'application/json',
        },
      });

      const metadata = extractRequestMetadata(request);

      expect(metadata.method).toBe('POST');
      expect(metadata.path).toBe('/api/test');
      expect(metadata.query).toEqual({ foo: 'bar' });
      expect(metadata.userAgent).toBe('Test-Agent/1.0');
      expect(metadata.contentType).toBe('application/json');
    });

    test('should use existing X-Request-ID header', () => {
      const requestId = 'existing-request-id-123';
      const request = new Request('https://example.com/test', {
        headers: {
          'X-Request-ID': requestId,
        },
      });

      const metadata = extractRequestMetadata(request);

      expect(metadata.requestId).toBe(requestId);
    });

    test('should generate UUID for missing request ID', () => {
      const request = new Request('https://example.com/test');
      const metadata = extractRequestMetadata(request);

      expect(isValidRequestId(metadata.requestId)).toBe(true);
    });

    test('should extract client IP from X-Forwarded-For', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'X-Forwarded-For': '203.0.113.1, 198.51.100.1',
        },
      });

      const metadata = extractRequestMetadata(request);

      expect(metadata.clientIp).toBe('203.0.113.1');
      expect(metadata.originalIp).toBe('203.0.113.1');
    });

    test('should parse user agent when enabled', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
      });

      const metadata = extractRequestMetadata(request, { parseUserAgent: true });

      expect(metadata.userAgentInfo).toBeDefined();
      expect(metadata.userAgentInfo?.browser).toBe('Chrome');
      expect(metadata.userAgentInfo?.os).toBe('Windows');
    });

    test('should detect proxied requests', () => {
      const request = new Request('https://example.com/test', {
        headers: {
          'X-Forwarded-For': '203.0.113.1',
        },
      });

      const metadata = extractRequestMetadata(request);

      expect(metadata.isProxied).toBe(true);
    });
  });

  describe('isValidRequestId', () => {
    test('should accept valid UUID format', () => {
      expect(isValidRequestId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    test('should accept custom format', () => {
      expect(isValidRequestId('req-123_abc')).toBe(true);
    });

    test('should reject invalid formats', () => {
      expect(isValidRequestId('')).toBe(false);
      expect(isValidRequestId('invalid format!')).toBe(false);
    });
  });
});
```

```typescript
// tests/unit/core/context/performance.tracker.test.ts

import { describe, test, expect, beforeEach } from 'bun:test';
import { createPerformanceTracker } from '@/core/context/performance.tracker';

describe('Performance Tracker', () => {
  test('should track request duration', () => {
    const tracker = createPerformanceTracker();

    expect(tracker.getDuration()).toBeGreaterThanOrEqual(0);

    // Simulate some work
    const start = performance.now();
    while (performance.now() - start < 10) {
      // Wait 10ms
    }

    tracker.finalize();

    expect(tracker.getDuration()).toBeGreaterThanOrEqual(10);
  });

  test('should track phase timings', () => {
    const tracker = createPerformanceTracker();

    tracker.endPhase('middleware');
    tracker.endPhase('handler');

    const phases = tracker.getPhases();

    expect(phases.middleware).toBeGreaterThanOrEqual(0);
    expect(phases.handler).toBeGreaterThanOrEqual(0);
  });

  test('should track custom markers', () => {
    const tracker = createPerformanceTracker();

    tracker.addMarker('db_query_start');
    tracker.addMarker('db_query_end');

    const markers = tracker.getMarkers();

    expect(markers.has('db_query_start')).toBe(true);
    expect(markers.has('db_query_end')).toBe(true);
  });

  test('should calculate time since marker', () => {
    const tracker = createPerformanceTracker();

    tracker.addMarker('marker1');

    // Simulate some work
    const start = performance.now();
    while (performance.now() - start < 5) {
      // Wait 5ms
    }

    const timeSince = tracker.getTimeSince('marker1');

    expect(timeSince).toBeGreaterThanOrEqual(5);
  });

  test('should detect slow requests', () => {
    const tracker = createPerformanceTracker();

    // Simulate fast request
    expect(tracker.isSlow(1000)).toBe(false);

    // Manually set metrics to simulate slow request
    tracker.finalize();
    (tracker as any).metrics.duration = 1500;

    expect(tracker.isSlow(1000)).toBe(true);
  });
});
```

```typescript
// tests/unit/core/context/enhancer.plugin.test.ts

import { describe, test, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { contextEnhancer } from '@/core/context/enhancer.plugin';

describe('Context Enhancer Plugin', () => {
  test('should enhance request context', async () => {
    const app = new Elysia().use(contextEnhancer()).get('/test', ({ requestContext }) => {
      return {
        requestId: requestContext.metadata.requestId,
        hasMetadata: !!requestContext.metadata,
        hasPerformance: !!requestContext.performance,
        hasLogger: !!requestContext.logger,
        hasUtils: !!requestContext.utils,
      };
    });

    const response = await app.handle(new Request('http://localhost/test')).then(r => r.json());

    expect(response.hasMetadata).toBe(true);
    expect(response.hasPerformance).toBe(true);
    expect(response.hasLogger).toBe(true);
    expect(response.hasUtils).toBe(true);
    expect(response.requestId).toBeDefined();
  });

  test('should track request duration', async () => {
    let capturedDuration: number | undefined;

    const app = new Elysia()
      .use(
        contextEnhancer({
          hooks: {
            afterHandle: ({ performance }) => {
              capturedDuration = performance.duration;
            },
          },
        })
      )
      .get('/test', () => ({ ok: true }));

    await app.handle(new Request('http://localhost/test'));

    expect(capturedDuration).toBeDefined();
    expect(capturedDuration).toBeGreaterThanOrEqual(0);
  });

  test('should call custom extractor', async () => {
    let extractorCalled = false;

    const app = new Elysia()
      .use(
        contextEnhancer({
          customExtractors: [
            async () => {
              extractorCalled = true;
              return { customField: 'custom-value' };
            },
          ],
        })
      )
      .get('/test', ({ requestContext }) => {
        return {
          customField: (requestContext as any).customField,
        };
      });

    const response = await app.handle(new Request('http://localhost/test')).then(r => r.json());

    expect(extractorCalled).toBe(true);
    expect(response.customField).toBe('custom-value');
  });

  test('should respect request ID header', async () => {
    const customRequestId = 'my-custom-request-id';

    const app = new Elysia().use(contextEnhancer()).get('/test', ({ requestContext }) => {
      return {
        requestId: requestContext.metadata.requestId,
      };
    });

    const response = await app
      .handle(
        new Request('http://localhost/test', {
          headers: {
            'X-Request-ID': customRequestId,
          },
        })
      )
      .then(r => r.json());

    expect(response.requestId).toBe(customRequestId);
  });
});
```

### 7.2 Integration Tests

```typescript
// tests/integration/context-enhancer.integration.test.ts

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createApp } from '@/app';

describe('Context Enhancer Integration', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  test('should enhance context across entire request lifecycle', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/me', {
        headers: {
          Authorization: 'Bearer valid-token',
          'X-Request-ID': 'integration-test-123',
        },
      })
    );

    expect(response.headers.get('X-Request-ID')).toBe('integration-test-123');
    expect(response.headers.get('X-Response-Time')).toMatch(/^\d+\.\d{2}ms$/);
  });

  test('should preserve context through error responses', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/v1/nonexistent', {
        headers: {
          'X-Request-ID': 'error-test-456',
        },
      })
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('X-Request-ID')).toBe('error-test-456');
  });
});
```

### 7.3 Performance Tests

```typescript
// tests/performance/context-enhancer.perf.test.ts

import { describe, test, expect } from 'bun:test';
import { Elysia } from 'elysia';
import { contextEnhancer } from '@/core/context/enhancer.plugin';

describe('Context Enhancer Performance', () => {
  test('should add minimal overhead', async () => {
    const appWithout = new Elysia().get('/test', () => ({ ok: true }));
    const appWith = new Elysia().use(contextEnhancer()).get('/test', () => ({ ok: true }));

    const iterations = 1000;

    // Test without enhancer
    const startWithout = performance.now();
    for (let i = 0; i < iterations; i++) {
      await appWithout.handle(new Request('http://localhost/test'));
    }
    const durationWithout = performance.now() - startWithout;

    // Test with enhancer
    const startWith = performance.now();
    for (let i = 0; i < iterations; i++) {
      await appWith.handle(new Request('http://localhost/test'));
    }
    const durationWith = performance.now() - startWith;

    const overhead = ((durationWith - durationWithout) / durationWithout) * 100;

    expect(overhead).toBeLessThan(20); // Less than 20% overhead
  });

  test('should handle high request rates', async () => {
    const app = new Elysia().use(contextEnhancer()).get('/test', () => ({ ok: true }));

    const requests = 100;
    const startTime = performance.now();

    const promises = Array.from({ length: requests }, () => app.handle(new Request('http://localhost/test')));

    await Promise.all(promises);

    const duration = performance.now() - startTime;
    const requestsPerSecond = (requests / duration) * 1000;

    expect(requestsPerSecond).toBeGreaterThan(100); // At least 100 req/s
  });
});
```

---

## 8. Usage Examples

### 8.1 Basic Usage

```typescript
import { Elysia } from 'elysia';
import { contextEnhancer } from './core/context';

const app = new Elysia().use(contextEnhancer()).get('/hello', ({ requestContext }) => {
  const { metadata, logger } = requestContext;

  logger.info('Processing hello request');

  return {
    message: 'Hello!',
    requestId: metadata.requestId,
    yourIp: metadata.clientIp,
  };
});
```

### 8.2 Performance Monitoring

```typescript
const app = new Elysia()
  .use(
    contextEnhancer({
      performance: {
        trackPhases: true,
        enableMarkers: true,
        slowRequestThreshold: 500,
      },
    })
  )
  .get('/data', async ({ requestContext }) => {
    const { performance, logger } = requestContext;

    // Add custom markers
    performance.markers.set('db_start', performance.now());

    const data = await database.query('SELECT * FROM users');

    performance.markers.set('db_end', performance.now());

    const dbTime = performance.markers.get('db_end')! - performance.markers.get('db_start')!;

    logger.info('Database query completed', { dbTime: `${dbTime.toFixed(2)}ms` });

    return { data, dbTime };
  });
```

### 8.3 Custom Context Augmentation

```typescript
const app = new Elysia()
  .use(
    contextEnhancer({
      customExtractors: [
        async request => {
          // Extract API key from headers
          const apiKey = request.headers.get('X-API-Key');
          return { apiKey: apiKey || null };
        },
      ],
      augmentContext: async (context, request) => {
        // Add computed properties
        return {
          isMobile: context.metadata.userAgentInfo?.device === 'mobile',
          timestamp: Date.now(),
        };
      },
    })
  )
  .get('/profile', ({ requestContext }) => {
    const augmentedContext = requestContext as EnhancedRequestContext & {
      apiKey: string | null;
      isMobile: boolean;
      timestamp: number;
    };

    return {
      profile: getUserProfile(),
      isMobile: augmentedContext.isMobile,
    };
  });
```

### 8.4 Lifecycle Hooks

```typescript
const app = new Elysia()
  .use(
    contextEnhancer({
      hooks: {
        afterCreate: ({ metadata, logger }) => {
          logger.debug('Request context created', {
            path: metadata.path,
            method: metadata.method,
          });
        },
        beforeHandle: ({ performance }) => {
          performance.markers.set('handler_start', performance.now());
        },
        afterHandle: ({ performance, logger, metadata }) => {
          const duration = performance.duration!;
          logger.info('Request completed', {
            path: metadata.path,
            duration: `${duration.toFixed(2)}ms`,
          });
        },
        onError: ({ metadata, logger, error }) => {
          logger.error('Request failed', error, {
            path: metadata.path,
            clientIp: metadata.clientIp,
          });
        },
      },
    })
  )
  .get('/test', () => ({ success: true }));
```

### 8.5 Integration with Services

```typescript
// In a service class
class ProductService {
  async findAll(context: EnhancedRequestContext) {
    const { metadata, performance, logger } = context;

    logger.info('Fetching products', {
      requestId: metadata.requestId,
      userIp: metadata.clientIp,
    });

    performance.markers.set('query_start', performance.now());

    const products = await this.repository.findAll();

    performance.markers.set('query_end', performance.now());

    const queryTime = performance.markers.get('query_end')! - performance.markers.get('query_start')!;

    logger.info('Products fetched', {
      count: products.length,
      queryTime: `${queryTime.toFixed(2)}ms`,
    });

    return products;
  }
}

// In route handler
app.get('/products', async ({ requestContext }) => {
  const service = new ProductService();
  return await service.findAll(requestContext);
});
```

### 8.6 Slow Request Alerting

```typescript
const app = new Elysia().use(
  contextEnhancer({
    performance: {
      slowRequestThreshold: 1000, // 1 second
    },
    hooks: {
      afterHandle: ({ performance, logger, metadata }) => {
        if (performance.duration! > 1000) {
          logger.warn('Slow request detected', {
            path: metadata.path,
            method: metadata.method,
            duration: `${performance.duration!.toFixed(2)}ms`,
            clientIp: metadata.clientIp,
          });

          // Send alert to monitoring system
          alerting.send({
            type: 'slow_request',
            path: metadata.path,
            duration: performance.duration,
          });
        }
      },
    },
  })
);
```

---

## 9. Success Criteria

### 9.1 Functional Requirements

- [ ] All request metadata is accurately extracted and typed
- [ ] Performance tracking provides sub-millisecond precision
- [ ] Context is properly derived using Elysia's derive mechanism
- [ ] Type-safe context augmentation works across the application
- [ ] Custom extractors can be registered and executed
- [ ] Lifecycle hooks are called at appropriate times
- [ ] Logger includes request context in all log messages
- [ ] Request ID is preserved across distributed systems
- [ ] Slow requests are detected and logged
- [ ] Error responses include request ID header

### 9.2 Performance Requirements

- [ ] Context enhancement adds less than 1ms overhead per request
- [ ] Memory overhead per request is less than 10KB
- [ ] Can handle 10,000+ requests per second
- [ ] No memory leaks over extended operation
- [ ] Performance tracking has minimal impact (< 5% CPU)

### 9.3 Quality Requirements

- [ ] 100% TypeScript type safety (no any types in implementation)
- [ ] All public APIs have JSDoc documentation
- [ ] Unit test coverage exceeds 90%
- [ ] Integration tests cover all integration points
- [ ] No ESLint or TypeScript compiler errors
- [ ] Compatible with existing middleware and plugins
- [ ] Backward compatible with existing request ID middleware

### 9.4 Developer Experience Requirements

- [ ] IntelliSense/autocomplete works for all context properties
- [ ] Clear error messages for misconfiguration
- [ ] Examples provided for all use cases
- [ ] Migration guide from existing implementation
- [ ] Debug logging available for troubleshooting

---

## 10. Performance Considerations

### 10.1 Optimization Strategies

1. **Lazy Evaluation**: Only parse user agent when enabled
2. **Object Reuse**: Reuse maps and objects where possible
3. **Efficient Header Access**: Cache header lookups
4. **Minimal Allocations**: Pre-allocate known-size collections
5. **Async Processing**: Run custom extractors in parallel

### 10.2 Performance Benchmarks

Target performance characteristics:

| Metric                   | Target     | Measured |
| ------------------------ | ---------- | -------- |
| Base overhead            | < 1ms      | TBD      |
| With user agent parsing  | < 2ms      | TBD      |
| With 3 custom extractors | < 5ms      | TBD      |
| Memory per request       | < 10KB     | TBD      |
| GC pressure              | Negligible | TBD      |

### 10.3 Monitoring Points

Key metrics to monitor:

- Average context creation time
- P95/P99 context creation time
- Memory usage per request
- Custom extractor execution time
- Phase timing accuracy
- Error rates in custom code

---

## 11. Security Considerations

### 11.1 IP Address Handling

- Sanitize IP addresses before logging
- Respect X-Forwarded-For only when configured
- Implement proxy depth limits
- Handle IPv6 addresses correctly

### 11.2 Request ID Security

- Validate request ID format
- Limit request ID length
- Prevent injection attacks through request ID
- Use crypto.randomUUID() for generation

### 11.3 User Agent Parsing

- Handle malformed user agents gracefully
- Don't expose raw user agent in error messages
- Sanitize parsed components before logging

### 11.4 Header Security

- Don't log sensitive headers (Authorization, Cookie)
- Validate header names before accessing
- Limit header size to prevent DoS

### 11.5 Custom Extractor Safety

- Run custom extractors in try-catch
- Limit extractor execution time
- Validate extractor output
- Prevent extractor from modifying base context inappropriately

---

## 12. Migration Path

### 12.1 Phase 1: Implementation

1. Create new context enhancement module
2. Implement all core functionality
3. Write comprehensive tests
4. Document APIs and usage

### 12.2 Phase 2: Parallel Operation

1. Deploy alongside existing middleware
2. Enable in test environment
3. Monitor performance and logs
4. Gather feedback from developers

### 12.3 Phase 3: Gradual Migration

1. Migrate non-critical routes first
2. Update documentation
3. Provide migration examples
4. Support both systems during transition

### 12.4 Phase 4: Complete Migration

1. Migrate all routes to new system
2. Deprecate old middleware
3. Remove old code after grace period
4. Update all documentation

### 12.5 Migration Example

Before:

```typescript
import { requestId } from './middlewares/request-id.middleware';
import { loggingPlugin } from './core/logging/middleware';

app.use(requestId()).use(loggingPlugin);

app.get('/test', ({ request, requestId, requestLogger }) => {
  requestLogger.info('Processing', { requestId });
  return { ok: true };
});
```

After:

```typescript
import { contextEnhancer } from './core/context';

app.use(contextEnhancer());

app.get('/test', ({ requestContext }) => {
  const { metadata, logger } = requestContext;
  logger.info('Processing', { requestId: metadata.requestId });
  return { ok: true };
});
```

---

## Appendix

### A. Configuration Reference

Complete reference for all configuration options:

```typescript
interface ContextEnhancerOptions {
  requestIdHeader?: string;           // Default: 'X-Request-ID'
  parseUserAgent?: boolean;            // Default: true
  enableGeoIp?: boolean;               // Default: false
  performance?: {
    trackPhases?: boolean;             // Default: true
    enableMarkers?: boolean;           // Default: true
    slowRequestThreshold?: number;     // Default: 1000
  };
  ip?: {
    ipHeaders?: string[];              // Default: ['x-forwarded-for', ...]
    trustProxy?: boolean;              // Default: true
    maxProxyDepth?: number;            // Default: 10
  };
  customExtractors?: Array<...>;
  augmentContext?: (baseContext, request) => {...};
  hooks?: {
    afterCreate?: (context) => {...};
    beforeHandle?: (context) => {...};
    afterHandle?: (context, response) => {...};
    onError?: (context, error) => {...};
  };
}
```

### B. API Reference

#### Functions

- `contextEnhancer(options?: Partial<ContextEnhancerOptions>): ElysiaPlugin`
- `extractRequestMetadata(request: Request, options?: Partial<ContextEnhancerOptions>): RequestMetadata`
- `createPerformanceTracker(): PerformanceTracker`
- `createRequestContextLogger(metadata: RequestMetadata): RequestContextLogger`

#### Types

- `RequestMetadata`
- `PerformanceMetrics`
- `RequestContextLogger`
- `ContextUtilities`
- `EnhancedRequestContext`
- `ContextEnhancerOptions`

### C. Troubleshooting

#### Common Issues

1. **Request ID not preserved**
   - Check CORS allowed headers include X-Request-ID
   - Verify request ID header name matches configuration

2. **Performance timing inaccurate**
   - Ensure performance.now() is available in runtime
   - Check for async operations not being tracked

3. **Type errors in routes**
   - Ensure context enhancer is applied before routes
   - Check that Elysia context augmentation is loaded

4. **Custom extractor not running**
   - Verify extractor function returns an object
   - Check for errors in extractor (logged to context logger)

### D. Future Enhancements

Potential future improvements:

1. **Distributed Tracing Integration**: OpenTelemetry support
2. **Geo IP Lookup**: Geographic location from IP
3. **Device Fingerprinting**: Advanced device detection
4. **Request Correlation**: Link related requests
5. **Context Propagation**: Forward context to downstream services
6. **Metrics Export**: Export to Prometheus/StatsD
7. **Request Sampling**: Sample requests for detailed logging
8. **Context Compression**: Compress context for logging
9. **Hot Reload**: Reload configuration without restart
10. **Context Visualization**: UI for viewing request context

---

**Document Version:** 1.0.0
**Last Updated:** 2026-03-13
**Status:** Ready for Implementation
