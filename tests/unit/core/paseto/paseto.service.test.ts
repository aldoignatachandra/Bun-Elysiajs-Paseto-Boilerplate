import { describe, it, expect, beforeEach } from 'bun:test';
import { generateKeys } from 'paseto-ts/v4';
import {
  paseto,
  PasetoService,
  InvalidTokenPayloadError,
  KeyConfigError,
  type AccessTokenPayload,
  type RefreshTokenPayload,
  type TokenPair,
} from '@/core/paseto';
import { generateTokenId, calculateExpiry, calculateExpiryDays } from '@/core/paseto/utils';

describe('PasetoService - Token Generation (v4.local and v4.public)', () => {
  let service: PasetoService;
  let testSymmetricKey: Uint8Array;
  let testKeyPair: { publicKey: string; secretKey: string };

  beforeEach(() => {
    // Generate fresh keys for each test
    // For v4.local we need a symmetric key (use buffer format for encrypt/decrypt)
    testSymmetricKey = generateKeys('local', { format: 'buffer' });
    // For v4.public we need a key pair (PASERK returns string format for sign/verify)
    testKeyPair = generateKeys('public');

    service = new PasetoService({
      issuer: 'test-issuer',
      audience: 'test-audience',
      symmetricKey: testSymmetricKey,
      publicKey: testKeyPair.publicKey,
      secretKey: testKeyPair.secretKey,
      accessTokenExpiryMinutes: 15,
      refreshTokenExpiryDays: 7,
    });
  });

  describe('v4.local (Encrypted Access Tokens)', () => {
    it('should create a valid access token with v4.local', () => {
      const payload: AccessTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-123',
        aud: 'test-audience',
        exp: calculateExpiry(15),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'access',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read', 'write'],
      };

      const token = service.createAccessToken(payload);
      expect(token).toBeDefined();
      expect(token).toMatch(/^v4\.local\./);
    });

    it('should validate and decrypt a v4.local access token', () => {
      const payload: AccessTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-456',
        aud: 'test-audience',
        exp: calculateExpiry(15),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'access',
        email: 'secure@example.com',
        role: 'user',
      };

      const token = service.createAccessToken(payload);
      const result = service.validateAccessToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe('user-456');
      expect(result.payload?.type).toBe('access');
      expect(result.payload?.email).toBe('secure@example.com');
      expect(result.error).toBeNull();
    });

    it('should fail validation for expired v4.local token', async () => {
      // Create a token with a very short expiry (1 second)
      const shortLivedPayload: AccessTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-789',
        aud: 'test-audience',
        exp: Math.floor(Date.now() / 1000) + 1, // Expire in 1 second
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'access',
      };

      const token = service.createAccessToken(shortLivedPayload);

      // Wait for token to expire (2 seconds to be safe)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = service.validateAccessToken(token);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toContain('expired');
    });

    it('should fail validation for invalid v4.local token', () => {
      const invalidToken = 'v4.local.invalid-token-content';
      const result = service.validateAccessToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should fail validation for v4.public token when validating access token', () => {
      // This test ensures v4.public tokens are rejected for access token validation
      const invalidToken = 'v4.public.some-signed-token';
      const result = service.validateAccessToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('v4.public (Signed Refresh Tokens)', () => {
    it('should create a valid refresh token with v4.public', () => {
      const payload: RefreshTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-123',
        aud: 'test-audience',
        exp: calculateExpiryDays(7),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'refresh',
        tokenId: 'stored-token-id-123',
      };

      const token = service.createRefreshToken(payload);
      expect(token).toBeDefined();
      expect(token).toMatch(/^v4\.public\./);
    });

    it('should validate and verify a v4.public refresh token', () => {
      const payload: RefreshTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-456',
        aud: 'test-audience',
        exp: calculateExpiryDays(7),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'refresh',
        tokenId: 'stored-token-id-456',
      };

      const token = service.createRefreshToken(payload);
      const result = service.validateRefreshToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe('user-456');
      expect(result.payload?.type).toBe('refresh');
      // Use type guard to safely access tokenId
      if (result.payload && 'tokenId' in result.payload) {
        expect((result.payload as unknown as RefreshTokenPayload).tokenId).toBe(
          'stored-token-id-456'
        );
      }
      expect(result.error).toBeNull();
    });

    it('should fail validation for expired v4.public token', async () => {
      // Create a token with a very short expiry (1 second)
      const shortLivedPayload: RefreshTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-789',
        aud: 'test-audience',
        exp: Math.floor(Date.now() / 1000) + 1, // Expire in 1 second
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'refresh',
        tokenId: 'expired-token-id',
      };

      const token = service.createRefreshToken(shortLivedPayload);

      // Wait for token to expire (2 seconds to be safe)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const result = service.validateRefreshToken(token);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toContain('expired');
    });

    it('should fail validation for invalid v4.public token signature', () => {
      // Create a token with one key pair, then try to validate with different keys
      const originalPayload: RefreshTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-999',
        aud: 'test-audience',
        exp: calculateExpiryDays(7),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'refresh',
        tokenId: 'token-id-999',
      };

      const token = service.createRefreshToken(originalPayload);

      // Create a new service with different keys
      const newKeyPair = generateKeys('public');

      const newService = new PasetoService({
        issuer: 'test-issuer',
        audience: 'test-audience',
        symmetricKey: testSymmetricKey,
        publicKey: newKeyPair.publicKey,
        secretKey: newKeyPair.secretKey,
        accessTokenExpiryMinutes: 15,
        refreshTokenExpiryDays: 7,
      });

      const result = newService.validateRefreshToken(token);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should fail validation for v4.local token when validating refresh token', () => {
      // This test ensures v4.local tokens are rejected for refresh token validation
      const invalidToken = 'v4.local.some-encrypted-token';
      const result = service.validateRefreshToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Token Pair Creation (Hybrid v4.local + v4.public)', () => {
    it('should create both access and refresh tokens', () => {
      const basePayload = {
        sub: 'user-123',
        email: 'user@example.com',
        role: 'admin' as const,
        permissions: ['read', 'write', 'delete'],
      };

      const tokenPair: TokenPair = service.createTokenPair(basePayload);

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBe(15 * 60); // 15 minutes in seconds

      // Verify access token is v4.local
      expect(tokenPair.accessToken).toMatch(/^v4\.local\./);

      // Verify refresh token is v4.public
      expect(tokenPair.refreshToken).toMatch(/^v4\.public\./);
    });

    it('should create tokens with matching user data', () => {
      const basePayload = {
        sub: 'user-456',
        email: 'test@example.com',
        role: 'user' as const,
        permissions: ['read'],
      };

      const tokenPair = service.createTokenPair(basePayload);

      // Validate access token
      const accessResult = service.validateAccessToken(tokenPair.accessToken);
      expect(accessResult.valid).toBe(true);
      expect(accessResult.payload?.sub).toBe('user-456');
      expect((accessResult.payload as AccessTokenPayload).email).toBe('test@example.com');

      // Validate refresh token
      const refreshResult = service.validateRefreshToken(tokenPair.refreshToken);
      expect(refreshResult.valid).toBe(true);
      expect(refreshResult.payload?.sub).toBe('user-456');
    });

    it('should generate unique JTI for each token', () => {
      const basePayload = {
        sub: 'user-789',
        email: 'unique@example.com',
      };

      const tokenPair1 = service.createTokenPair(basePayload);
      const tokenPair2 = service.createTokenPair(basePayload);

      const result1 = service.validateAccessToken(tokenPair1.accessToken);
      const result2 = service.validateAccessToken(tokenPair2.accessToken);

      expect(result1.payload?.jti).not.toBe(result2.payload?.jti);
    });
  });

  describe('Auto-detection and Generic Validation', () => {
    it('should auto-detect and validate v4.local access token', () => {
      const payload: AccessTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-auto-1',
        aud: 'test-audience',
        exp: calculateExpiry(15),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'access',
      };

      const token = service.createAccessToken(payload);
      const result = service.validateAndDecodeToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.type).toBe('access');
    });

    it('should auto-detect and validate v4.public refresh token', () => {
      const payload: RefreshTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-auto-2',
        aud: 'test-audience',
        exp: calculateExpiryDays(7),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'refresh',
        tokenId: 'auto-detect-token',
      };

      const token = service.createRefreshToken(payload);
      const result = service.validateAndDecodeToken(token);

      expect(result.valid).toBe(true);
      expect(result.payload?.type).toBe('refresh');
    });

    it('should fail validation for unrecognized token format', () => {
      const invalidToken = 'invalid.token.format';
      const result = service.validateAndDecodeToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('Token Type Detection', () => {
    it('should detect v4.local as access token', () => {
      const payload: AccessTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-detect-1',
        aud: 'test-audience',
        exp: calculateExpiry(15),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'access',
      };

      const token = service.createAccessToken(payload);
      const tokenType = service.getTokenType(token);

      expect(tokenType).toBe('access');
    });

    it('should detect v4.public as refresh token', () => {
      const payload: RefreshTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-detect-2',
        aud: 'test-audience',
        exp: calculateExpiryDays(7),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'refresh',
        tokenId: 'detect-token-id',
      };

      const token = service.createRefreshToken(payload);
      const tokenType = service.getTokenType(token);

      expect(tokenType).toBe('refresh');
    });

    it('should return null for invalid token format', () => {
      expect(service.getTokenType('invalid')).toBeNull();
      expect(service.getTokenType('v3.local.token')).toBeNull();
      expect(service.getTokenType('')).toBeNull();
    });
  });

  describe('Header Extraction', () => {
    it('should extract token from valid Authorization header', () => {
      const payload: AccessTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-header-1',
        aud: 'test-audience',
        exp: calculateExpiry(15),
        iat: Math.floor(Date.now() / 1000),
        jti: generateTokenId(),
        type: 'access',
      };

      const token = service.createAccessToken(payload);
      const header = `Bearer ${token}`;
      const extracted = service.extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });

    it('should return null for missing Authorization header', () => {
      expect(service.extractTokenFromHeader('')).toBeNull();
      expect(service.extractTokenFromHeader(undefined as unknown as string)).toBeNull();
    });

    it('should return null for malformed Authorization header', () => {
      expect(service.extractTokenFromHeader('InvalidFormat token')).toBeNull();
      expect(service.extractTokenFromHeader('Bearer')).toBeNull();
    });
  });

  describe('Singleton Instance', () => {
    it('should export getPasetoService function', () => {
      expect(paseto).toBeDefined();
      expect(typeof paseto).toBe('function');
    });

    it('should provide consistent instance across calls', () => {
      const testSymmetricKey = generateKeys('local', { format: 'buffer' });
      const testKeyPair = generateKeys('public');

      const paseto1 = paseto({
        issuer: 'test-issuer',
        audience: 'test-audience',
        symmetricKey: testSymmetricKey,
        publicKey: testKeyPair.publicKey,
        secretKey: testKeyPair.secretKey,
        accessTokenExpiryMinutes: 15,
        refreshTokenExpiryDays: 7,
      });

      const paseto2 = paseto();

      expect(paseto1).toBe(paseto2);
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique token IDs', () => {
      const id1 = generateTokenId();
      const id2 = generateTokenId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should calculate expiry correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const fifteenMinutes = 15 * 60;
      const expiry = calculateExpiry(15);

      expect(expiry).toBeGreaterThanOrEqual(now + fifteenMinutes);
      expect(expiry).toBeLessThanOrEqual(now + fifteenMinutes + 1); // Allow 1 second margin
    });

    it('should calculate expiry in days correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const sevenDays = 7 * 24 * 60 * 60;
      const expiry = calculateExpiryDays(7);

      expect(expiry).toBeGreaterThanOrEqual(now + sevenDays);
      expect(expiry).toBeLessThanOrEqual(now + sevenDays + 1); // Allow 1 second margin
    });
  });

  describe('Error Handling', () => {
    it('should throw KeyConfigError when keys are missing', () => {
      expect(() => {
        new PasetoService({
          issuer: 'test',
          audience: 'test',
          symmetricKey: [],
          publicKey: [],
          secretKey: [],
          accessTokenExpiryMinutes: 15,
          refreshTokenExpiryDays: 7,
        });
      }).toThrow(KeyConfigError);
    });

    it('should throw InvalidTokenPayloadError for invalid payload', () => {
      expect(() => {
        service.createAccessToken({} as AccessTokenPayload);
      }).toThrow(InvalidTokenPayloadError);
    });
  });

  describe('Production-like Scenarios', () => {
    it('should handle complete authentication flow', () => {
      // User login
      const userPayload = {
        sub: 'user-complete-1',
        email: 'complete@example.com',
        role: 'admin' as const,
        permissions: ['create', 'read', 'update', 'delete'],
      };

      // Create token pair
      const tokenPair = service.createTokenPair(userPayload);

      // Verify access token for API request
      const accessResult = service.validateAccessToken(tokenPair.accessToken);
      expect(accessResult.valid).toBe(true);
      expect((accessResult.payload as AccessTokenPayload).email).toBe('complete@example.com');

      // Simulate token refresh
      const refreshResult = service.validateRefreshToken(tokenPair.refreshToken);
      expect(refreshResult.valid).toBe(true);

      // Create new access token using refresh token data
      if (refreshResult.payload) {
        const newAccessPayload: AccessTokenPayload = {
          iss: 'test-issuer',
          sub: refreshResult.payload.sub,
          aud: 'test-audience',
          exp: calculateExpiry(15),
          iat: Math.floor(Date.now() / 1000),
          jti: generateTokenId(),
          type: 'access',
          email: userPayload.email,
          role: userPayload.role,
          permissions: userPayload.permissions,
        };
        const newAccessToken = service.createAccessToken(newAccessPayload);
        const newResult = service.validateAccessToken(newAccessToken);
        expect(newResult.valid).toBe(true);
      }
    });

    it('should support token revocation via JTI', () => {
      const payload: AccessTokenPayload = {
        iss: 'test-issuer',
        sub: 'user-revoke-1',
        aud: 'test-audience',
        exp: calculateExpiry(15),
        iat: Math.floor(Date.now() / 1000),
        jti: 'revoke-test-jti-123',
        type: 'access',
      };

      const token = service.createAccessToken(payload);
      const result = service.validateAccessToken(token);

      // In a real app, you'd check the JTI against a blacklist
      expect(result.payload?.jti).toBe('revoke-test-jti-123');
    });
  });
});
