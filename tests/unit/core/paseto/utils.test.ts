/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'bun:test';
import {
  generateTokenId,
  calculateExpiry,
  calculateExpiryDays,
  isTokenExpired,
  validateTokenPayload,
  formatTokenForDisplay,
  getTokenTypeFromPrefix,
} from '@/core/paseto/utils';
import { InvalidTokenPayloadError } from '@/core/paseto/errors';

describe('PASETO Utils', () => {
  describe('generateTokenId', () => {
    it('should generate a valid UUID', () => {
      const id = generateTokenId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = generateTokenId();
      const id2 = generateTokenId();
      expect(id1).not.toBe(id2);
    });

    it('should generate different IDs on multiple calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTokenId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('calculateExpiry', () => {
    it('should calculate expiry for given minutes', () => {
      const minutes = 15;
      const now = Math.floor(Date.now() / 1000);
      const expiry = calculateExpiry(minutes);
      expect(expiry).toBeGreaterThanOrEqual(now + minutes * 60 - 1);
      expect(expiry).toBeLessThanOrEqual(now + minutes * 60 + 1);
    });

    it('should return number timestamp', () => {
      const expiry = calculateExpiry(10);
      expect(typeof expiry).toBe('number');
    });

    it('should calculate correct expiry for 0 minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiry = calculateExpiry(0);
      expect(expiry).toBeGreaterThanOrEqual(now);
      expect(expiry).toBeLessThanOrEqual(now + 1);
    });

    it('should calculate large expiry values', () => {
      const minutes = 1440; // 1 day
      const now = Math.floor(Date.now() / 1000);
      const expiry = calculateExpiry(minutes);
      expect(expiry).toBeGreaterThanOrEqual(now + minutes * 60 - 1);
      expect(expiry).toBeLessThanOrEqual(now + minutes * 60 + 1);
    });
  });

  describe('calculateExpiryDays', () => {
    it('should calculate expiry for given days', () => {
      const days = 7;
      const now = Math.floor(Date.now() / 1000);
      const expiry = calculateExpiryDays(days);
      const expectedExpiry = now + days * 24 * 60 * 60;
      expect(expiry).toBeGreaterThanOrEqual(expectedExpiry - 1);
      expect(expiry).toBeLessThanOrEqual(expectedExpiry + 1);
    });

    it('should return number timestamp', () => {
      const expiry = calculateExpiryDays(1);
      expect(typeof expiry).toBe('number');
    });

    it('should calculate correct expiry for 0 days', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiry = calculateExpiryDays(0);
      expect(expiry).toBeGreaterThanOrEqual(now);
      expect(expiry).toBeLessThanOrEqual(now + 1);
    });

    it('should calculate correct expiry for 30 days', () => {
      const days = 30;
      const now = Math.floor(Date.now() / 1000);
      const expiry = calculateExpiryDays(days);
      const expectedExpiry = now + days * 24 * 60 * 60;
      expect(expiry).toBeGreaterThanOrEqual(expectedExpiry - 1);
      expect(expiry).toBeLessThanOrEqual(expectedExpiry + 1);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for future timestamp', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      expect(isTokenExpired(futureExp)).toBe(false);
    });

    it('should return true for past timestamp', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 3600;
      expect(isTokenExpired(pastExp)).toBe(true);
    });

    it('should return true for current timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      expect(isTokenExpired(now)).toBe(true);
    });

    it('should handle ISO date string format', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it('should return true for past ISO date string', () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      expect(isTokenExpired(pastDate)).toBe(true);
    });

    it('should handle string number timestamps', () => {
      const futureExp = String(Math.floor(Date.now() / 1000) + 3600);
      expect(isTokenExpired(futureExp)).toBe(false);
    });
  });

  describe('validateTokenPayload', () => {
    it('should validate correct token payload', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
        exp: Date.now() + 3600000,
        iat: Date.now(),
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).not.toThrow();
    });

    it('should throw for null payload', () => {
      expect(() => validateTokenPayload(null)).toThrow(InvalidTokenPayloadError);
      expect(() => validateTokenPayload(null)).toThrow('Payload must be an object');
    });

    it('should throw for undefined payload', () => {
      expect(() => validateTokenPayload(undefined)).toThrow(InvalidTokenPayloadError);
    });

    it('should throw for non-object payload', () => {
      expect(() => validateTokenPayload('string')).toThrow(InvalidTokenPayloadError);
      expect(() => validateTokenPayload(123)).toThrow(InvalidTokenPayloadError);
    });

    it('should throw for missing iss field', () => {
      const payload = {
        sub: 'user-123',
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).toThrow(InvalidTokenPayloadError);
      expect(() => validateTokenPayload(payload)).toThrow('iss');
    });

    it('should throw for non-string iss field', () => {
      const payload = {
        iss: 123,
        sub: 'user-123',
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).toThrow(InvalidTokenPayloadError);
    });

    it('should throw for missing sub field', () => {
      const payload = {
        iss: 'https://example.com',
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).toThrow(InvalidTokenPayloadError);
      expect(() => validateTokenPayload(payload)).toThrow('sub');
    });

    it('should throw for non-string sub field', () => {
      const payload = {
        iss: 'https://example.com',
        sub: null,
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).toThrow(InvalidTokenPayloadError);
    });

    it('should throw for invalid exp field type', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
        exp: [],
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).toThrow(InvalidTokenPayloadError);
    });

    it('should accept valid number exp field', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
        exp: 1234567890,
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).not.toThrow();
    });

    it('should accept valid string exp field', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
        exp: '2024-01-01T00:00:00.000Z',
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).not.toThrow();
    });

    it('should allow optional exp field', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).not.toThrow();
    });

    it('should throw for invalid iat field type', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
        iat: {},
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).toThrow(InvalidTokenPayloadError);
    });

    it('should throw for missing type field', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
      };
      expect(() => validateTokenPayload(payload)).toThrow(InvalidTokenPayloadError);
      expect(() => validateTokenPayload(payload)).toThrow('type');
    });

    it('should throw for invalid type value', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
        type: 'invalid',
      };
      expect(() => validateTokenPayload(payload)).toThrow(InvalidTokenPayloadError);
      expect(() => validateTokenPayload(payload)).toThrow('access');
      expect(() => validateTokenPayload(payload)).toThrow('refresh');
    });

    it('should accept access type', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
        type: 'access',
      };
      expect(() => validateTokenPayload(payload)).not.toThrow();
    });

    it('should accept refresh type', () => {
      const payload = {
        iss: 'https://example.com',
        sub: 'user-123',
        type: 'refresh',
      };
      expect(() => validateTokenPayload(payload)).not.toThrow();
    });

    it('should narrow type after validation', () => {
      const payload: unknown = {
        iss: 'https://example.com',
        sub: 'user-123',
        type: 'access',
      };
      validateTokenPayload(payload);
      // TypeScript should now know this is a valid TokenPayload
      expect(payload).toHaveProperty('iss');
      expect(payload).toHaveProperty('sub');
      expect(payload).toHaveProperty('type');
    });
  });

  describe('formatTokenForDisplay', () => {
    const longToken = 'v4.local.very-long-token-string-that-should-be-truncated-for-display-purposes-to-show-only-beginning-and-end';

    it('should format long token with default visible chars', () => {
      const formatted = formatTokenForDisplay(longToken);
      expect(formatted).toMatch(/^.{10}\.\.\..{10}$/);
      expect(formatted).toContain('...');
    });

    it('should show beginning and end of token', () => {
      const formatted = formatTokenForDisplay(longToken);
      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThan(longToken.length);
    });

    it('should return short token as-is', () => {
      const shortToken = 'short';
      const formatted = formatTokenForDisplay(shortToken);
      expect(formatted).toBe(shortToken);
    });

    it('should respect custom visible chars', () => {
      const formatted = formatTokenForDisplay(longToken, 5);
      expect(formatted).toContain('...');
      expect(formatted.split('...')[0].length).toBe(5);
      expect(formatted.split('...')[1].length).toBe(5);
    });

    it('should handle tokens exactly at threshold', () => {
      const thresholdToken = 'a'.repeat(20);
      const formatted = formatTokenForDisplay(thresholdToken, 10);
      expect(formatted).toBe(thresholdToken);
    });

    it('should handle empty token', () => {
      const formatted = formatTokenForDisplay('');
      expect(formatted).toBe('');
    });

    it('should truncate very long tokens', () => {
      const veryLongToken = 'v4.local.' + 'x'.repeat(1000);
      const formatted = formatTokenForDisplay(veryLongToken, 15);
      expect(formatted.length).toBe(15 + 3 + 15); // visibleChars + "..." + visibleChars
    });
  });

  describe('getTokenTypeFromPrefix', () => {
    it('should identify access token from v4.local prefix', () => {
      const token = 'v4.local.some-token-data';
      const type = getTokenTypeFromPrefix(token);
      expect(type).toBe('access');
    });

    it('should identify refresh token from v4.public prefix', () => {
      const token = 'v4.public.some-token-data';
      const type = getTokenTypeFromPrefix(token);
      expect(type).toBe('refresh');
    });

    it('should return null for unknown prefix', () => {
      const token = 'v3.local.some-token-data';
      const type = getTokenTypeFromPrefix(token);
      expect(type).toBeNull();
    });

    it('should return null for empty string', () => {
      const type = getTokenTypeFromPrefix('');
      expect(type).toBeNull();
    });

    it('should return null for malformed token', () => {
      const token = 'not-a-paseto-token';
      const type = getTokenTypeFromPrefix(token);
      expect(type).toBeNull();
    });

    it('should handle v4.local with additional segments', () => {
      const token = 'v4.local.multiple.segments.here';
      const type = getTokenTypeFromPrefix(token);
      expect(type).toBe('access');
    });

    it('should handle v4.public with additional segments', () => {
      const token = 'v4.public.multiple.segments.here';
      const type = getTokenTypeFromPrefix(token);
      expect(type).toBe('refresh');
    });

    it('should be case sensitive', () => {
      const token = 'V4.LOCAL.some-token';
      const type = getTokenTypeFromPrefix(token);
      expect(type).toBeNull();
    });
  });

  describe('Integration Tests', () => {
    it('should generate token ID and format it', () => {
      const tokenId = generateTokenId();
      const formatted = formatTokenForDisplay(tokenId);
      expect(formatted).toContain('...');
      expect(formatted.length).toBeLessThan(tokenId.length);
    });

    it('should calculate expiry and check if expired', () => {
      const futureExpiry = calculateExpiry(60);
      expect(isTokenExpired(futureExpiry)).toBe(false);
    });

    it('should validate complete token payload', () => {
      const payload = {
        iss: 'https://api.example.com',
        sub: generateTokenId(),
        exp: calculateExpiry(15),
        iat: Math.floor(Date.now() / 1000),
        type: 'access' as const,
      };
      expect(() => validateTokenPayload(payload)).not.toThrow();
    });

    it('should identify token type from formatted token', () => {
      const accessToken = 'v4.local.' + generateTokenId();
      const refreshToken = 'v4.public.' + generateTokenId();
      expect(getTokenTypeFromPrefix(accessToken)).toBe('access');
      expect(getTokenTypeFromPrefix(refreshToken)).toBe('refresh');
    });
  });
});
