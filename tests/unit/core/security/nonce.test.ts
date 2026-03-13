import { describe, it, expect } from 'bun:test';
import { generateNonce, generateNonceWithPrefix, formatNonceForCsp, generateCspNonce, isValidNonce } from '@/core/security/nonce';

describe('Nonce Generation Utilities', () => {
  describe('generateNonce', () => {
    it('should generate a unique nonce', () => {
      const nonce = generateNonce();

      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('should generate different nonces each time', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();

      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate alphanumeric nonces without dashes', () => {
      const nonce = generateNonce();

      expect(nonce).toMatch(/^[a-zA-Z0-9]+$/);
      expect(nonce).not.toContain('-');
    });

    it('should generate nonces of sufficient length', () => {
      const nonce = generateNonce();

      // UUID without dashes is 32 characters
      expect(nonce.length).toBe(32);
    });

    it('should generate cryptographically random nonces', () => {
      const nonces = new Set<string>();

      // Generate 1000 nonces and verify they're all unique
      for (let i = 0; i < 1000; i++) {
        nonces.add(generateNonce());
      }

      expect(nonces.size).toBe(1000);
    });
  });

  describe('generateNonceWithPrefix', () => {
    it('should generate nonce with specified prefix', () => {
      const nonce = generateNonceWithPrefix('script');

      expect(nonce).toBeDefined();
      expect(nonce).toStartWith('script-');
    });

    it('should generate different nonces with same prefix', () => {
      const nonce1 = generateNonceWithPrefix('style');
      const nonce2 = generateNonceWithPrefix('style');

      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toStartWith('style-');
      expect(nonce2).toStartWith('style-');
    });

    it('should handle empty prefix', () => {
      const nonce = generateNonceWithPrefix('');

      expect(nonce).toBeDefined();
      expect(nonce).toStartWith('-');
    });

    it('should handle special characters in prefix', () => {
      const nonce = generateNonceWithPrefix('test_prefix-123');

      expect(nonce).toStartWith('test_prefix-123-');
    });
  });

  describe('formatNonceForCsp', () => {
    it('should format nonce for CSP directive', () => {
      const nonce = 'abc123def456';
      const formatted = formatNonceForCsp(nonce);

      expect(formatted).toBe("'nonce-abc123def456'");
    });

    it('should handle empty nonce', () => {
      const formatted = formatNonceForCsp('');

      expect(formatted).toBe("'nonce-'");
    });

    it('should preserve nonce value', () => {
      const nonce = generateNonce();
      const formatted = formatNonceForCsp(nonce);

      expect(formatted).toContain(nonce);
      expect(formatted).toMatch(/^'nonce-[a-zA-Z0-9]+'$/);
    });
  });

  describe('generateCspNonce', () => {
    it('should generate pre-formatted CSP nonce', () => {
      const cspNonce = generateCspNonce();

      expect(cspNonce).toMatch(/^'nonce-[a-zA-Z0-9]+'$/);
    });

    it('should generate different CSP nonces', () => {
      const nonce1 = generateCspNonce();
      const nonce2 = generateCspNonce();

      expect(nonce1).not.toBe(nonce2);
    });

    it('should be valid CSP nonce format', () => {
      const cspNonce = generateCspNonce();

      // CSP nonce format: 'nonce-{32 alphanumeric chars}'
      expect(cspNonce).toMatch(/^'nonce-[a-zA-Z0-9]{32}'$/);
    });
  });

  describe('isValidNonce', () => {
    it('should validate valid nonces', () => {
      expect(isValidNonce('abcdefghijklmnopqrstuvwxyz123456')).toBe(true);
      expect(isValidNonce('ABC123DEF4567890')).toBe(true); // At least 16 chars
      expect(isValidNonce('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6')).toBe(true);
    });

    it('should reject invalid nonces', () => {
      expect(isValidNonce('')).toBe(false);
      expect(isValidNonce('short')).toBe(false);
      expect(isValidNonce('ab cd')).toBe(false); // contains space
      expect(isValidNonce('ab-cd')).toBe(false); // contains dash
      expect(isValidNonce('ab_cd')).toBe(false); // contains underscore
      expect(isValidNonce('ab.cd')).toBe(false); // contains dot
    });

    it('should require minimum length of 16 characters', () => {
      expect(isValidNonce('123456789012345')).toBe(false); // 15 chars
      expect(isValidNonce('1234567890123456')).toBe(true); // 16 chars
      expect(isValidNonce('12345678901234567')).toBe(true); // 17 chars
    });

    it('should accept very long nonces', () => {
      const longNonce = 'a'.repeat(100);
      expect(isValidNonce(longNonce)).toBe(true);
    });

    it('should accept mixed case alphanumeric', () => {
      expect(isValidNonce('aBcDeFgHiJkLmNoPqRsTuVwXyZ123456')).toBe(true);
    });
  });

  describe('Integration', () => {
    it('should work end-to-end: generate and validate', () => {
      const nonce = generateNonce();
      const formatted = formatNonceForCsp(nonce);

      expect(isValidNonce(nonce)).toBe(true);
      expect(formatted).toMatch(/^'nonce-[a-zA-Z0-9]{32}'$/);
    });

    it('should generate usable CSP directive', () => {
      const nonce = generateCspNonce();
      const directive = `script-src ${nonce} 'self'`;

      expect(directive).toMatch(/^script-src 'nonce-[a-zA-Z0-9]{32}' 'self'$/);
    });
  });
});
