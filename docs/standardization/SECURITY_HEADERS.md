# Security Headers

This document describes the security headers implementation for the Bun + Elysia + PASETO boilerplate API.

## Overview

The security headers middleware provides OWASP-recommended security headers for all HTTP responses. It includes:

- **Content Security Policy (CSP)** - Controls resources the user agent is allowed to load
- **HTTP Strict Transport Security (HSTS)** - Enforces HTTPS connections
- **X-Content-Type-Options** - Prevents MIME-sniffing
- **X-Frame-Options** - Prevents clickjacking attacks
- **X-XSS-Protection** - Enables XSS filtering
- **Referrer-Policy** - Controls referrer information
- **Permissions-Policy** - Controls browser feature access
- **Cross-Origin headers** - COOP, CORP, COEP for isolation

## Installation

The security headers middleware is included in the core security module:

```typescript
import { securityHeaders } from '@/core/security';
```

## Usage

### Basic Usage

Apply security headers with default configuration:

```typescript
import { securityHeaders } from '@/core/security';

app.use(securityHeaders());
```

### Custom Configuration

```typescript
import { securityHeaders, SecurityLevel } from '@/core/security';

app.use(
  securityHeaders({
    config: {
      contentSecurityPolicy: {
        directives: [{ name: 'script-src', sources: ["'self'", 'https://cdn.example.com'] }],
      },
      strictTransportSecurity: {
        maxAge: 63072000, // 2 years
        includeSubDomains: true,
        preload: true,
      },
      customHeaders: {
        'X-Custom-Header': 'custom-value',
      },
    },
  })
);
```

### Environment Override

```typescript
app.use(
  securityHeaders({
    overrideEnvironment: SecurityLevel.PRODUCTION,
  })
);
```

### Integration with Main App

Here's a complete example of integrating security headers with your Elysia application:

```typescript
// src/app.ts
import { Elysia } from 'elysia';
import { securityHeaders } from '@/core/security';
import { logger } from '@/core/logging';
import { requestId } from '@/middlewares/request-id.middleware';

export function createApp() {
  const app = new Elysia();

  // Apply security headers first (before routes)
  app.use(securityHeaders());

  // Apply other middleware
  app.use(requestId());
  app.use(logger);

  // Add your routes
  app.get('/api/v1/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  return app;
}

// Start the server
const app = createApp();
app.listen(process.env.PORT || 3000);

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
```

### Security Headers with Existing Middleware

Security headers work seamlessly with other middleware:

```typescript
const app = new Elysia()
  .use(securityHeaders()) // Apply security headers
  .use(requestId()) // Request tracking
  .use(authMiddleware()) // Authentication
  .use(rateLimitMiddleware()) // Rate limiting
  .get('/api/v1/users', () => ({ users: [] }))
  .post('/api/v1/users', () => ({ created: true }));
```

## Configuration Options

### Security Level

The middleware supports three security levels:

- `SecurityLevel.DEVELOPMENT` - Permissive settings for development
- `SecurityLevel.STAGING` - Balanced security for staging
- `SecurityLevel.PRODUCTION` - Strict security for production

The environment is automatically detected from `NODE_ENV`.

### Content Security Policy (CSP)

```typescript
contentSecurityPolicy: {
  enabled?: boolean;
  reportOnly?: boolean;
  reportUri?: string;
  directives?: CspDirective[];
  useNonce?: boolean;
}
```

#### CSP Directives

Commonly used directives:

- `default-src` - Fallback for other directives
- `script-src` - Valid script sources
- `style-src` - Valid style sources
- `img-src` - Valid image sources
- `connect-src` - Valid fetch/websocket sources
- `font-src` - Valid font sources
- `object-src` - Valid plugin sources
- `frame-src` - Valid frame sources
- `base-uri` - Restricts document base URL
- `form-action` - Restricts form submission targets
- `frame-ancestors` - Restricts who can embed the page

#### CSP with Nonce

Enable nonce for inline scripts and styles:

```typescript
contentSecurityPolicy: {
  useNonce: true,
}
```

### HTTP Strict Transport Security (HSTS)

```typescript
strictTransportSecurity: {
  enabled?: boolean;
  maxAge?: number; // Default: 31536000 (1 year)
  includeSubDomains?: boolean; // Default: true
  preload?: boolean; // Default: false
}
```

**Note:** HSTS is only enabled in production by default.

### Standard Headers

```typescript
{
  xContentTypeOptions?: string | boolean; // Default: 'nosniff'
  xFrameOptions?: string | boolean; // Default: 'DENY'
  xXssProtection?: string | boolean; // Default: '1; mode=block'
  referrerPolicy?: string | boolean; // Default: 'strict-origin-when-cross-origin'
  permissionsPolicy?: string | boolean;
  crossOriginOpenerPolicy?: string | boolean; // Default: 'same-origin'
  crossOriginResourcePolicy?: string | boolean; // Default: 'same-origin'
  crossOriginEmbedderPolicy?: string | boolean; // Default: 'require-corp'
}
```

**Deprecation Notice:** The `X-XSS-Protection` header is largely obsolete as modern browsers have replaced it with Content Security Policy (CSP). It's included for legacy browser support but should not be relied upon as a primary XSS defense. Use CSP with strict policies instead.

### Custom Headers

Add custom headers:

```typescript
{
  customHeaders?: Record<string, string>;
}
```

## Default Behavior

### Development Mode

When `NODE_ENV=development`:

- CSP uses Report-Only mode
- CSP allows `unsafe-inline`, `unsafe-eval`
- CSP allows `localhost` sources
- X-Frame-Options is `SAMEORIGIN`
- HSTS is disabled
- Cross-Origin headers are permissive

### Production Mode

When `NODE_ENV=production`:

- CSP is enforced
- CSP blocks `unsafe-inline`, `unsafe-eval`
- CSP uses strict policies
- X-Frame-Options is `DENY`
- HSTS is enabled with 1-year max-age
- Cross-Origin headers use strict isolation

## Security Best Practices

### 1. Start with Report-Only Mode

Before enforcing CSP, use Report-Only mode to identify issues:

```typescript
contentSecurityPolicy: {
  reportOnly: true,
  reportUri: '/api/v1/security/csp-report',
}
```

### 2. Use Nonce for Inline Scripts

Instead of `unsafe-inline`, use nonce:

```typescript
contentSecurityPolicy: {
  useNonce: true,
}
```

Then in your templates:

```html
<script nonce="<%= nonce %>">
  // Inline script
</script>
```

### 3. Specify Exact Sources

Avoid wildcards. Specify exact domains:

```typescript
directives: [{ name: 'script-src', sources: ["'self'", 'https://cdn.example.com'] }];
```

### 4. Enable HSTS Preload

For production, enable HSTS preload:

```typescript
strictTransportSecurity: {
  maxAge: 63072000, // 2 years minimum for preload
  includeSubDomains: true,
  preload: true,
}
```

Then submit your domain to [hstspreload.org](https://hstspreload.org/).

### 5. Regularly Review Headers

Security requirements change. Regularly review and update your security headers.

## Testing

Test your security headers:

```bash
# Check all headers
curl -I http://localhost:3000/api/v1/health

# Check specific headers
curl -I http://localhost:3000/api/v1/health | grep -i "content-security-policy"

# Use online tools
# - https://securityheaders.com
# - https://observatory.mozilla.org
```

## Troubleshooting

### CSP Violations

If resources are blocked:

1. Check browser console for CSP violations
2. Use Report-Only mode first
3. Add missing sources to directives
4. Consider using nonce for inline scripts

### HSTS Issues

If HSTS causes problems:

1. Only enable in production
2. Start with shorter max-age
3. Test thoroughly before enabling preload
4. Remember: HSTS is cached by browsers

### Mixed Content

If you get mixed content warnings:

1. Ensure all resources use HTTPS
2. Add `upgrade-insecure-requests` to CSP
3. Check for hardcoded HTTP URLs

## References

- [OWASP Security Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [MDN CSP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [HSTS Preload](https://hstspreload.org/)
