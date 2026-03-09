# PASETO Authentication Guide

> 🎯 **Comprehensive guide to implementing PASETO (Platform-Agnostic SEcurity TOkens) in Bun with Elysia**

## Table of Contents

- [Overview](#overview)
- [Why PASETO?](#why-paseto)
- [PASETO vs JWT](#paseto-vs-jwt)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Token Structure](#token-structure)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

PASETO (Platform-Agnostic Security Tokens) is a secure token format that addresses the security vulnerabilities found in JWT. This boilerplate implements PASETO v4 using modern cryptographic primitives.

### What is PASETO?

**PASETO** is a specification for secure stateless tokens that:

- ✅ Uses modern, authenticated encryption
- ✅ Prevents algorithm confusion attacks
- ✅ Provides versioning for future upgrades
- ✅ Has a simple, unambiguous implementation
- ✅ Supports both symmetric (local) and asymmetric (public) tokens

### Key Features

| Feature | Description |
|---------|-------------|
| **Version 4** | Uses modern cryptography (XChaCha20-Poly1305, Ed25519) |
| **Local Purpose** | Symmetric encryption (both parties share secret) |
| **Public Purpose** | Asymmetric signatures (public/private key pairs) |
| **Payload Encryption** | Encrypts payload by default (not just signs) |
| **Explicit Versioning** | Version number in token prevents ambiguity |

---

## Why PASETO?

### Security Advantages

PASETO addresses critical JWT vulnerabilities:

```typescript
// ❌ JWT Issues:
// 1. Algorithm confusion attacks ("none" algorithm)
// 2. Missing key identification
// 3. Implicit security model
// 4. Too many implementation options
// 5. Header manipulation vulnerabilities

// ✅ PASETO Solutions:
// 1. Version-specific algorithms (no algorithm confusion)
// 2. Keys are bound to versions and purposes
// 3. Explicit security model (encrypt vs sign)
// 4. Single correct implementation per version
// 5. Immutable protocol design
```

### Real-World Impact

| Attack Type | JWT Vulnerability | PASETO Protection |
|-------------|-------------------|-------------------|
| Algorithm Confusion | ⚠️ Vulnerable | ✅ Protected (version-specific) |
| Key Confusion | ⚠️ Vulnerable | ✅ Protected (purpose-bound) |
| None Algorithm | ⚠️ Vulnerable | ✅ Protected (no "none" option) |
| Header Injection | ⚠️ Vulnerable | ✅ Protected (immutable header) |
| Timing Attacks | ⚠️ Possible | ✅ Protected (constant-time operations) |

---

## PASETO vs JWT

### Comparison Table

| Feature | JWT | PASETO v4 |
|---------|-----|-----------|
| **Header** | Contains algorithm (mutable) | Version + purpose only (immutable) |
| **Payload** | Base64 encoded (readable) | Encrypted (local) or signed (public) |
| **Signature** | Optional algorithms | Version-specific (no choice) |
| **Key Management** | Manual (error-prone) | Built-in key binding |
| **Algorithm Confusion** | ⚠️ Vulnerable | ✅ Protected |
| **Payload Encryption** | ❌ Not standard | ✅ Built-in (local tokens) |
| **Versioning** | ❌ Not supported | ✅ Required (v1, v2, v3, v4) |
| **Implementation** | Multiple options | Single correct way |

### Token Format Comparison

```
# JWT Format (vulnerable)
header.payload.signature
{
  "alg": "HS256",     // ⚠️ Can be manipulated
  "typ": "JWT"
}
{
  "sub": "user123",
  "exp": 1234567890
}
# Signature (HMAC-SHA256)

# PASETO Format (secure)
version.purpose.payload
v4.local.encoded_encrypted_data
├─ v4       # Version (immutable algorithms)
├─ local    # Purpose (symmetric encryption)
└─ payload  # Encrypted payload (not base64)
```

---

## Architecture

### Token Types

```
┌─────────────────────────────────────────────────────────────┐
│                    PASETO Token Types                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  v4.local (Symmetric Encryption)                           │
│  ├─ Same key for encrypt/decrypt                           │
│  ├─ Payload is encrypted (confidential)                    │
│  └─ Use case: API tokens, session tokens                   │
│                                                             │
│  v4.public (Asymmetric Signature)                          │
│  ├─ Private key signs, public key verifies                 │
│  ├─ Payload is visible (not encrypted)                     │
│  └─ Use case: Public APIs, verifiable claims               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Token Lifecycle

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Client     │───▶│   API Server │───▶│  Validation  │
│  (Request)   │    │  (PASETO)    │    │   Service    │
└──────────────┘    └──────────────┘    └──────────────┘
       │                   │                    │
       │                   │                    │
       │ 1. Extract Token  │                    │
       │<──────────────────│                    │
       │                   │                    │
       │ 2. Validate Token │                    │
       │                   │<───────────────────│
       │                   │                    │
       │ 3. Return Payload │                    │
       │<──────────────────│                    │
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Authentication Flow                        │
└─────────────────────────────────────────────────────────────┘

  LOGIN REQUEST
       │
       ├─▶ Validate credentials
       │   └─ Check email/password
       │
       ├─▶ Generate access token (v4.local, 15min)
       │   └─ Include: userId, email, role, permissions
       │
       ├─▶ Generate refresh token (v4.local, 7 days)
       │   └─ Include: userId, tokenId
       │
       ├─▶ Store refresh token session
       │   └─ Hash token, store in database
       │
       └─▶ Return token pair to client


  API REQUEST (with token)
       │
       ├─▶ Extract Bearer token
       │
       ├─▶ Validate token structure
       │   ├─ Check version (v4)
       │   ├─ Check purpose (local)
       │   └─ Decrypt payload
       │
       ├─▶ Validate claims
       │   ├─ Check expiration (exp)
       │   ├─ Check issued at (iat)
       │   ├─ Check token type (access/refresh)
       │   └─ Verify user exists and active
       │
       ├─▶ Extract user context
       │   └─ userId, email, role, permissions
       │
       └─▶ Process request with user context


  TOKEN REFRESH
       │
       ├─▶ Validate refresh token
       │   └─ Decrypt, verify not revoked
       │
       ├─▶ Check session exists
       │   └─ Query database by tokenId
       │
       ├─▶ Generate new token pair
       │   └─ New access + new refresh token
       │
       ├─▶ Revoke old refresh token
       │   └─ Mark session as revoked
       │
       └─▶ Return new token pair
```

---

## Implementation

### Project Structure

```
src/core/paseto/
├── paseto.service.ts       # Core PASETO operations
├── token.types.ts          # TypeScript interfaces
├── errors.ts               # PASETO-specific errors
└── utils.ts                # Helper functions
```

### Environment Configuration

```env
# PASETO Configuration
PASETO_VERSION=4                    # Use version 4 (modern crypto)
PASETO_PURPOSE=local                # Purpose: local or public

# For v4.local (symmetric encryption)
# Generate 32-byte key (64 hex characters)
PASETO_LOCAL_KEY=your-32-byte-key-hex-encoded-here

# For v4.public (asymmetric signatures) - optional
PASETO_PUBLIC_KEY=your-public-key-hex-encoded
PASETO_PRIVATE_KEY=your-private-key-hex-encoded

# Token Expiration
ACCESS_TOKEN_EXPIRY_MINUTES=15
REFRESH_TOKEN_EXPIRY_DAYS=7
```

### Key Generation

```bash
# Generate a 32-byte key (64 hex characters) for v4.local
openssl rand -hex 32

# Or use Bun's crypto
bun -e "console.log(crypto.randomUUID().replace(/-/g, '').substring(0, 64))"

# For v4.public (asymmetric)
# Generate key pair using the paseto library
```

---

## Token Structure

### Access Token Payload

```typescript
interface AccessTokenPayload {
  // Standard claims
  iss: string;      // Issuer (e.g., "bun-elysia-paseto-boilerplate")
  sub: string;      // Subject (user ID)
  aud?: string;     // Audience (optional)
  exp: number;      // Expiration (Unix timestamp)
  iat: number;      // Issued at (Unix timestamp)
  jti: string;      // Token ID (unique identifier)
  type: 'access';   // Token type

  // Custom claims (application-specific)
  email?: string;           // User email
  role?: string;            // User role (ADMIN, USER)
  permissions?: string[];   // User permissions

  // Additional claims
  [key: string]: unknown;   // Extension point
}
```

### Refresh Token Payload

```typescript
interface RefreshTokenPayload {
  // Standard claims
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  jti: string;
  type: 'refresh';

  // Refresh-specific claims
  tokenId: string;  // Reference to stored session

  // Note: Minimal payload for security
  // Additional claims retrieved from database
}
```

### Token Example

```
# Access Token (decoded payload example)
{
  "iss": "bun-elysia-paseto-boilerplate",
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "exp": 1734567890,
  "iat": 1734567090,
  "jti": "token-20250309-123456",
  "type": "access",
  "email": "user@example.com",
  "role": "ADMIN",
  "permissions": ["users:read", "users:write", "products:read"]
}

# Encrypted token (what's actually sent)
v4.local.k4ADQFYoRlDd69Xl7wQEi2aLkQp8h-mXcOq3NvY9ZJQvYG2w5sXHPb8nM...
```

---

## Security Best Practices

### 1. Key Management

```typescript
// ✅ Good: Load from environment, never hardcode
const localKey = process.env.PASETO_LOCAL_KEY;

// ❌ Bad: Hardcoded key
const localKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// ✅ Good: Use separate keys for environments
// Development key != Production key

// ❌ Bad: Same key across all environments
```

### 2. Token Expiration

```typescript
// ✅ Good: Short-lived access tokens
ACCESS_TOKEN_EXPIRY_MINUTES = 15  // 15 minutes

// ✅ Good: Longer-lived refresh tokens (with revocation)
REFRESH_TOKEN_EXPIRY_DAYS = 7     // 7 days

// ❌ Bad: Long-lived access tokens (no refresh mechanism)
ACCESS_TOKEN_EXPIRY_DAYS = 365     // 1 year!
```

### 3. Token Storage

```typescript
// Client-side storage recommendations:

// ✅ Good: Memory (for SPA)
let accessToken = null;

// ✅ Good: HttpOnly, Secure, SameSite cookie
Set-Cookie: access_token=<token>; HttpOnly; Secure; SameSite=Strict

// ⚠️ Acceptable: sessionStorage (cleared on tab close)
sessionStorage.setItem('accessToken', token);

// ❌ Bad: localStorage (vulnerable to XSS)
localStorage.setItem('accessToken', token);  // Avoid!
```

### 4. Token Validation

```typescript
// ✅ Good: Validate all claims
async function validateToken(token: string) {
  const result = await pasetoService.validateAndDecodeToken(token);

  if (!result.valid || !result.payload) {
    throw new UnauthorizedError('Invalid token');
  }

  // Check expiration
  if (isTokenExpired(result.payload.exp)) {
    throw new UnauthorizedError('Token expired');
  }

  // Check user exists and active
  const user = await userRepository.findById(result.payload.sub);
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User inactive');
  }

  // Check token type
  if (result.payload.type !== 'access') {
    throw new UnauthorizedError('Wrong token type');
  }

  return result.payload;
}

// ❌ Bad: Only validate signature, ignore claims
async function validateTokenBad(token: string) {
  // Only checks if token can be decrypted
  const payload = await pasetoService.decrypt(token);
  return payload;  // No additional checks!
}
```

### 5. Error Handling

```typescript
// ✅ Good: Specific error messages without information leakage
try {
  const payload = await validateToken(token);
} catch (error) {
  if (error instanceof TokenExpiredError) {
    throw new UnauthorizedError('Token has expired');
  }
  if (error instanceof InvalidTokenError) {
    throw new UnauthorizedError('Invalid token');
  }
  // Generic error for other cases
  throw new UnauthorizedError('Authentication failed');
}

// ❌ Bad: Verbose error messages that leak information
try {
  const payload = await validateToken(token);
} catch (error) {
  // Leaks implementation details
  throw new Error(`Decryption failed: ${error.message}. Key used: ${key.substring(0, 4)}...`);
}
```

### 6. Refresh Token Security

```typescript
// ✅ Good: Store hashed tokens, support revocation
async function createRefreshToken(userId: string): Promise<string> {
  const token = await pasetoService.createRefreshToken(userId);
  const payload = await pasetoService.validateAndDecodeToken(token);

  // Store hash, not plaintext
  const hash = await passwordService.hash(token);

  await sessionsRepository.create({
    userId,
    tokenId: payload.tokenId,
    refreshTokenHash: hash,
    expiresAt: new Date(payload.exp * 1000),
  });

  return token;
}

// ✅ Good: Validate against stored session
async function validateRefreshToken(token: string): Promise<boolean> {
  const result = await pasetoService.validateAndDecodeToken(token);

  if (!result.valid || !result.payload) {
    return false;
  }

  const payload = result.payload as RefreshTokenPayload;

  // Check session exists and not revoked
  const session = await sessionsRepository.findByTokenId(payload.tokenId);

  if (!session || session.isRevoked) {
    return false;
  }

  // Verify hash
  const isValid = await passwordService.verify(session.refreshTokenHash, token);

  return isValid;
}

// ❌ Bad: Stateless refresh tokens (no revocation)
// Once issued, cannot be revoked until expiration
```

### 7. Token Rotation

```typescript
// ✅ Good: Rotate refresh tokens on use
async function refreshToken(oldRefreshToken: string): Promise<TokenPair> {
  // Validate old token
  const payload = await validateRefreshToken(oldRefreshToken);

  // Generate new token pair
  const newTokens = await pasetoService.createTokenPair(payload.userId);

  // Revoke old refresh token
  await revokeRefreshToken(oldRefreshToken);

  // Store new refresh token session
  await storeRefreshToken(payload.userId, newTokens.refreshToken);

  return newTokens;
}

// Benefits:
// - Limits damage of token leakage
// - Shortens window for token reuse attacks
// - Maintains session validity
```

### 8. Context Binding (Optional Advanced)

```typescript
// ✅ Good: Bind token to specific context (optional)
interface TokenPayload {
  // ... other claims
  aud?: string;      // Audience (e.g., "api.example.com")
  nonce?: string;    // Random nonce for additional binding
}

// Bind to client IP or user agent (optional, may affect UX)
interface TokenBinding {
  ip?: string;       // Client IP address
  userAgent?: string; // Client user agent hash
}

// Validate binding on each request
if (tokenBinding.ip !== request.ip) {
  throw new SecurityError('Token bound to different IP');
}
```

---

## Troubleshooting

### Common Issues

#### 1. Token Validation Fails

```
Error: Token validation failed
```

**Possible Causes:**
- Token has expired
- Wrong key used for decryption
- Token format corrupted
- Version mismatch

**Solutions:**
```typescript
// Check token expiration
const now = Math.floor(Date.now() / 1000);
if (payload.exp < now) {
  console.log('Token expired');
}

// Verify key configuration
console.log('PASETO_VERSION:', config.paseto.version);
console.log('PASETO_PURPOSE:', config.paseto.purpose);
console.log('Key length:', config.paseto.localKey?.length);  // Should be 32 bytes (64 hex chars)

// Validate token format
if (!token.startsWith('v4.')) {
  console.log('Invalid token format');
}
```

#### 2. Key Configuration Errors

```
Error: PASETO key not initialized
```

**Solutions:**
```bash
# Check environment variables
echo $PASETO_LOCAL_KEY

# Should be 64 hex characters (32 bytes)
# Example: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Generate new key
openssl rand -hex 32

# Update .env file
PASETO_LOCAL_KEY=<generated-key>
```

#### 3. Token Size Issues

```
Error: Token too large for header
```

**Solutions:**
```typescript
// ✅ Good: Minimal payload
interface AccessTokenPayload {
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  jti: string;
  type: 'access';
  email: string;      // Store ID, not entire user object
  role: string;       // Store role, not permissions array
}

// ❌ Bad: Large payload
interface AccessTokenPayload {
  // ... standard claims
  user: {             // Entire user object!
    id: string;
    email: string;
    profile: { ... },
    settings: { ... },
    // ... more data
  };
  permissions: string[];  // Large array
}
```

#### 4. Clock Skew Issues

```
Error: Token not yet valid
```

**Solutions:**
```typescript
// ✅ Good: Allow small clock skew (leeway)
const LEEWAY_SECONDS = 30;  // 30 seconds

function isTokenExpired(exp: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return (now + LEEWAY_SECONDS) >= exp;
}

// Or use ntp to synchronize server time
```

#### 5. Decryption Failures

```
Error: Failed to decrypt token
```

**Possible Causes:**
- Key mismatch between token generation and validation
- Token corrupted during transmission
- Version/purpose mismatch

**Solutions:**
```typescript
// Verify key consistency
const keyUsedForSigning = config.paseto.localKey;
const keyUsedForVerification = config.paseto.localKey;

console.log('Keys match:', keyUsedForSigning === keyUsedForVerification);

// Check token integrity
if (!token || token.length < 20) {
  throw new Error('Invalid token length');
}

// Verify version and purpose
const [version, purpose] = token.split('.');
if (version !== 'v4' || purpose !== 'local') {
  throw new Error('Unexpected token version or purpose');
}
```

---

## Performance Considerations

### Token Operations

```
Operation      | Time Complexity | Performance Notes
---------------|-----------------|-------------------
Create Token   | O(1)           | Fast (XChaCha20-Poly1305)
Validate Token | O(1)           | Fast (constant-time)
Decrypt Token  | O(1)           | Fast (symmetric)
Sign Token     | O(1)           | Fast (Ed25519)
Verify Token   | O(1)           | Fast (Ed25519)
```

### Optimization Tips

```typescript
// ✅ Cache frequently validated tokens (optional)
const tokenCache = new Map<string, { payload: TokenPayload; expires: number }>();

async function validateTokenWithCache(token: string): Promise<TokenPayload> {
  const cached = tokenCache.get(token);

  if (cached && cached.expires > Date.now()) {
    return cached.payload;
  }

  const payload = await validateToken(token);

  // Cache for 1 minute (less than access token lifetime)
  tokenCache.set(token, { payload, expires: Date.now() + 60000 });

  return payload;
}

// ⚠️ Note: Caching tokens means revocation won't take effect immediately
// Use with caution and consider security implications
```

---

## Testing

### Unit Tests

```typescript
// tests/unit/core/paseto/paseto.service.test.ts

describe('PasetoService', () => {
  describe('createAccessToken', () => {
    it('should create a valid access token', async () => {
      const userId = 'user-123';
      const token = await pasetoService.createAccessToken(userId);

      expect(token).toBeDefined();
      expect(token).toStartWith('v4.local.');
    });

    it('should include custom claims', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';

      const token = await pasetoService.createAccessToken(userId, { email });

      const result = await pasetoService.validateAndDecodeToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.email).toBe(email);
    });
  });

  describe('validateAndDecodeToken', () => {
    it('should validate a valid token', async () => {
      const token = await pasetoService.createAccessToken('user-123');

      const result = await pasetoService.validateAndDecodeToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
    });

    it('should reject an expired token', async () => {
      // Create token with past expiration
      const expiredToken = await createExpiredToken();

      const result = await pasetoService.validateAndDecodeToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject invalid token format', async () => {
      const invalidToken = 'not-a-valid-token';

      const result = await pasetoService.validateAndDecodeToken(invalidToken);

      expect(result.valid).toBe(false);
    });
  });
});
```

### Integration Tests

```typescript
// tests/integration/authentication/auth.integration.test.ts

describe('Authentication Integration', () => {
  describe('Login Flow', () => {
    it('should authenticate user and return tokens', async () => {
      const response = await app.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tokens.accessToken).toBeDefined();
      expect(data.data.tokens.refreshToken).toBeDefined();
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh access token', async () => {
      // Login to get tokens
      const loginResponse = await app.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'SecurePass123!',
        }),
      });

      const { refreshToken } = (await loginResponse.json()).data.tokens;

      // Refresh token
      const refreshResponse = await app.request('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      const data = await refreshResponse.json();

      expect(refreshResponse.status).toBe(200);
      expect(data.data.tokens.accessToken).toBeDefined();
    });
  });
});
```

---

## Migration from JWT

### When to Migrate

✅ **Migrate to PASETO if:**
- Starting a new project
- Current JWT implementation has known vulnerabilities
- Need payload encryption by default
- Want simpler, more secure implementation

❌ **Keep JWT if:**
- Deeply integrated with existing systems
- Third-party services require JWT
- Team has extensive JWT expertise
- Minimal security requirements

### Migration Steps

```typescript
// Step 1: Add PASETO alongside JWT
export class HybridTokenService {
  private jwtService: JwtService;
  private pasetoService: PasetoService;

  async createToken(userId: string): Promise<{ jwt: string; paseto: string }> {
    const jwt = await this.jwtService.createToken(userId);
    const paseto = await this.pasetoService.createAccessToken(userId);

    return { jwt, paseto };
  }
}

// Step 2: Validate both token types
async function validateToken(token: string): Promise<UserPayload> {
  // Try PASETO first
  if (token.startsWith('v4.')) {
    return await pasetoService.validateAndDecodeToken(token);
  }

  // Fall back to JWT
  return await jwtService.validateToken(token);
}

// Step 3: Gradually migrate clients
// - Issue both JWT and PASETO tokens
// - Validate both during transition period
// - Remove JWT after all clients updated
```

---

## Additional Resources

- [PASETO Specification](https://github.com/paseto-standard/paseto-spec)
- [paseto-ts Library](https://github.com/paragonie/paseto-typescript)
- [Security Considerations](https://github.com/paseto-standard/paseto-spec/blob/master/README.md#security-considerations)

---

## Checklist

Before deploying to production:

- [ ] Generate unique PASETO keys for each environment
- [ ] Set appropriate token expiration times
- [ ] Implement token revocation for refresh tokens
- [ ] Add rate limiting for authentication endpoints
- [ ] Enable logging for token validation failures
- [ ] Test token expiration and refresh flow
- [ ] Verify HTTPS is enforced in production
- [ ] Review error messages for information leakage
- [ ] Set up monitoring for authentication failures
- [ ] Document key rotation procedures

---

## Quick Reference

```typescript
// Create access token (15 min expiry)
const token = await pasetoService.createAccessToken(userId, {
  email: user.email,
  role: user.role,
});

// Create refresh token (7 day expiry)
const refreshToken = await pasetoService.createRefreshToken(userId, tokenId);

// Validate and decode token
const result = await pasetoService.validateAndDecodeToken(token);

// Extract token from Authorization header
const token = await pasetoService.extractTokenFromHeader(
  request.headers.get('Authorization')
);

// Create token pair
const tokens = await pasetoService.createTokenPair(userId, {
  email: user.email,
});
```

---

**Last Updated:** 2025-03-09

**Version:** 1.0.0

**Maintainer:** Backend Team
