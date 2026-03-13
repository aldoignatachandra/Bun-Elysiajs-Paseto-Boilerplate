# Request Context Enhancer

## Overview

The Request Context Enhancer is a middleware plugin for Elysia that enriches each incoming HTTP request with comprehensive metadata, performance tracking, and user information.

## Features

- **Request Metadata**: Extracts request ID, client IP, user-agent, and other relevant information
- **Performance Tracking**: Tracks request start time, duration, and custom markers
- **User Integration**: Integrates with authentication middleware to provide user context
- **Response Headers**: Automatically sets `X-Request-ID` and `X-Response-Time` headers
- **Type Safety**: Fully typed with TypeScript for excellent IDE support

## Installation

The module is located in `src/core/context/` and is exported as an Elysia plugin.

## Usage

### Basic Usage

```typescript
import { Elysia } from 'elysia';
import { requestContextPlugin } from '@core/context';

const app = new Elysia().use(requestContextPlugin()).get('/test', ({ requestContext, requestId }) => {
  return {
    requestId,
    clientIp: requestContext.metadata.clientIp,
    userAgent: requestContext.metadata.userAgent,
  };
});
```

### Accessing Request Metadata

```typescript
app.get('/info', ({ requestContext }) => {
  const { metadata } = requestContext;

  return {
    requestId: metadata.requestId,
    method: metadata.method,
    path: metadata.path,
    query: metadata.query,
    clientIp: metadata.clientIp,
    userAgent: metadata.userAgent,
    hasAuth: metadata.hasAuthorization,
  };
});
```

### Performance Tracking

```typescript
import { addMarker, getTimeSinceMarker } from '@core/context';

app.get('/data', async ({ requestContext }) => {
  // Add custom marker
  addMarker(requestContext, 'db_query_start');

  const data = await database.query('SELECT * FROM users');

  addMarker(requestContext, 'db_query_end');

  const queryTime = getTimeSinceMarker(requestContext, 'db_query_start');

  return { data, queryTime };
});
```

### With Authentication

```typescript
import { requestContextPlugin } from '@core/context';
import { requireAuth } from '@middlewares/auth.middleware';

const app = new Elysia().use(requestContextPlugin()).get('/profile', {
  beforeHandle: [requireAuth(pasetoService, authService)],
  handler: ({ user, requestContext }) => {
    // user is populated by auth middleware
    return {
      userId: user?.id,
      email: user?.email,
      requestId: requestContext.metadata.requestId,
    };
  },
});
```

### Custom Configuration

```typescript
app.use(
  requestContextPlugin({
    requestIdHeader: 'X-Correlation-ID',
    ipHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
    trustProxy: true,
    maxProxyDepth: 10,
  })
);
```

## API Reference

### Plugin Options

```typescript
interface ContextEnhancerOptions {
  /** Header name for request ID (default: 'X-Request-ID') */
  requestIdHeader?: string;

  /** IP headers to check in order (default: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'x-client-ip']) */
  ipHeaders?: string[];

  /** Trust proxy headers for IP extraction (default: true) */
  trustProxy?: boolean;

  /** Maximum number of proxies in chain (default: 10) */
  maxProxyDepth?: number;
}
```

### Request Metadata

```typescript
interface RequestMetadata {
  requestId: string;
  clientIp: string;
  originalIp?: string;
  userAgent: string;
  method: string;
  path: string;
  url: string;
  query: Record<string, string>;
  origin: string;
  contentType?: string;
  accept?: string;
  acceptLanguage?: string;
  hasAuthorization: boolean;
  timestamp: string;
  ipChain?: string[];
}
```

### Performance Metrics

```typescript
interface PerformanceMetrics {
  startTime: number;
  endTime?: number;
  duration?: number;
  markers: Map<string, number>;
}
```

### Request Context

```typescript
interface RequestContext {
  metadata: RequestMetadata;
  performance: PerformanceMetrics;
  user?: RequestUser;
  tokenId?: string;
}
```

### Helper Functions

```typescript
// Add a performance marker
addMarker(requestContext: RequestContext, name: string): void

// Get time since marker or start
getTimeSinceMarker(requestContext: RequestContext, marker?: string): number

// Check if request exceeds threshold
exceedsThreshold(requestContext: RequestContext, thresholdMs: number): boolean
```

## Context Augmentation

The plugin augments the Elysia context with the following properties:

```typescript
interface AugmentedContext {
  /** Complete request context object */
  requestContext: RequestContext;

  /** Request ID (convenience accessor) */
  requestId: string;

  /** Request start time */
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
```

## Response Headers

The plugin automatically adds the following headers to all responses:

- `X-Request-ID`: The unique identifier for the request
- `X-Response-Time`: The total request duration in milliseconds (e.g., "45.23ms")

## Logging

The plugin integrates with the existing logging system and automatically logs:

- Request completion with duration and status
- Request failures with error details and duration

## Best Practices

1. **Use Request ID for Tracing**: Include the `requestId` in all logs for distributed tracing
2. **Track Custom Markers**: Use `addMarker()` to track specific operations (DB queries, API calls)
3. **Monitor Slow Requests**: Use `exceedsThreshold()` to detect and log slow requests
4. **Respect Proxy Configuration**: Set `trustProxy: false` if not behind a trusted proxy

## Examples

### Error Handling

```typescript
app.get('/error', ({ requestContext }) => {
  requestContext.performance.markers.set('error_start', performance.now());

  try {
    // ... operation that might fail
  } catch (error) {
    requestContext.performance.markers.set('error_end', performance.now());
    throw error;
  }
});
```

### Conditional Logic Based on Client

```typescript
app.get('/content', ({ requestContext }) => {
  const isMobile = requestContext.metadata.userAgent.includes('Mobile');

  if (isMobile) {
    return { view: 'mobile' };
  }

  return { view: 'desktop' };
});
```

### Rate Limiting with Context

```typescript
app.get('/api/data', async ({ requestContext }) => {
  const clientId = requestContext.metadata.clientIp;

  const rateLimitStatus = await rateLimiter.check(clientId);

  if (!rateLimitStatus.allowed) {
    throw new RateLimitError('Too many requests');
  }

  return { data: await fetchData() };
});
```

## Testing

```typescript
import { requestContextPlugin } from '@core/context';

describe('My Route', () => {
  it('should include request context', async () => {
    const app = new Elysia().use(requestContextPlugin()).get('/test', ({ requestContext }) => {
      return {
        requestId: requestContext.metadata.requestId,
      };
    });

    const response = await app.handle(
      new Request('http://localhost/test', {
        headers: {
          'X-Request-ID': 'test-123',
        },
      })
    );

    const data = await response.json();
    expect(data.requestId).toBe('test-123');
  });
});
```

## Migration from Existing Middleware

If you're using the existing `requestId` or `loggingPlugin` middleware:

```typescript
// Before
import { requestId } from '@middlewares/request-id.middleware';
import { loggingPlugin } from '@core/logging/middleware';

app.use(requestId()).use(loggingPlugin);

// After
import { requestContextPlugin } from '@core/context';

app.use(requestContextPlugin());
```

The request context plugin combines the functionality of both middlewares while providing additional features.
