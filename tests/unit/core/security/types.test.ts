import { describe, it, expect } from 'bun:test';
import { SecurityLevel, type CspDirective, type CspConfig, type HstsConfig, type SecurityHeadersConfig } from '@/core/security/types';

describe('Security Headers Types', () => {
  describe('SecurityLevel Enum', () => {
    it('should have DEVELOPMENT value', () => {
      expect(SecurityLevel.DEVELOPMENT).toBe('development');
    });

    it('should have STAGING value', () => {
      expect(SecurityLevel.STAGING).toBe('staging');
    });

    it('should have PRODUCTION value', () => {
      expect(SecurityLevel.PRODUCTION).toBe('production');
    });
  });

  describe('CspDirective Interface', () => {
    it('should accept valid directive structure', () => {
      const directive: CspDirective = {
        name: 'script-src',
        sources: ["'self'", 'https://cdn.example.com'],
        enabled: true,
      };

      expect(directive.name).toBe('script-src');
      expect(directive.sources).toHaveLength(2);
      expect(directive.enabled).toBe(true);
    });

    it('should accept directive without enabled field', () => {
      const directive: CspDirective = {
        name: 'default-src',
        sources: ["'self'"],
      };

      expect(directive.name).toBe('default-src');
      expect(directive.enabled).toBeUndefined();
    });

    it('should accept directive with empty sources', () => {
      const directive: CspDirective = {
        name: 'upgrade-insecure-requests',
        sources: [],
      };

      expect(directive.sources).toHaveLength(0);
    });
  });

  describe('CspConfig Interface', () => {
    it('should accept full CSP configuration', () => {
      const config: CspConfig = {
        enabled: true,
        reportOnly: false,
        reportUri: '/api/v1/security/csp-report',
        directives: [{ name: 'script-src', sources: ["'self'"] }],
        useNonce: false,
      };

      expect(config.enabled).toBe(true);
      expect(config.reportOnly).toBe(false);
      expect(config.reportUri).toBe('/api/v1/security/csp-report');
      expect(config.directives).toBeDefined();
      expect(config.useNonce).toBe(false);
    });

    it('should accept minimal CSP configuration', () => {
      const config: CspConfig = {};

      expect(config.enabled).toBeUndefined();
      expect(config.directives).toBeUndefined();
    });
  });

  describe('HstsConfig Interface', () => {
    it('should accept full HSTS configuration', () => {
      const config: HstsConfig = {
        enabled: true,
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      };

      expect(config.enabled).toBe(true);
      expect(config.maxAge).toBe(63072000);
      expect(config.includeSubDomains).toBe(true);
      expect(config.preload).toBe(true);
    });

    it('should accept minimal HSTS configuration', () => {
      const config: HstsConfig = {};

      expect(config.enabled).toBeUndefined();
    });
  });

  describe('SecurityHeadersConfig Interface', () => {
    it('should accept full security headers configuration', () => {
      const config: SecurityHeadersConfig = {
        securityLevel: SecurityLevel.PRODUCTION,
        contentSecurityPolicy: {
          enabled: true,
          directives: [{ name: 'script-src', sources: ["'self'"] }],
        },
        strictTransportSecurity: {
          enabled: true,
          maxAge: 31536000,
        },
        xContentTypeOptions: 'nosniff',
        xFrameOptions: 'DENY',
        xXssProtection: '1; mode=block',
        referrerPolicy: 'strict-origin-when-cross-origin',
        permissionsPolicy: 'geolocation=()',
        crossOriginOpenerPolicy: 'same-origin',
        crossOriginResourcePolicy: 'same-origin',
        crossOriginEmbedderPolicy: 'require-corp',
        customHeaders: {
          'X-Custom-Header': 'custom-value',
        },
      };

      expect(config.securityLevel).toBe(SecurityLevel.PRODUCTION);
      expect(config.contentSecurityPolicy).toBeDefined();
      expect(config.strictTransportSecurity).toBeDefined();
      expect(config.customHeaders).toBeDefined();
    });

    it('should accept boolean values for headers', () => {
      const config: SecurityHeadersConfig = {
        contentSecurityPolicy: true,
        strictTransportSecurity: true,
        xContentTypeOptions: false,
        xFrameOptions: false,
      };

      expect(config.contentSecurityPolicy).toBe(true);
      expect(config.strictTransportSecurity).toBe(true);
      expect(config.xContentTypeOptions).toBe(false);
      expect(config.xFrameOptions).toBe(false);
    });
  });
});
