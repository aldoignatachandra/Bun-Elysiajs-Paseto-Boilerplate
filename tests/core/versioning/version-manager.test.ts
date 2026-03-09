import { describe, it, expect, beforeEach } from 'bun:test';
import { versionManager } from '@/core/versioning/version-manager';
import type { ApiVersion } from '@/core/versioning/types';

describe('Version Manager', () => {
  beforeEach(() => {
    // Reset to default configuration before each test
    versionManager.configure({
      defaultVersion: 'v1',
      supportedVersions: ['v1'],
      deprecatedVersions: [],
    });
  });

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const config = versionManager.getConfig();
      expect(config.defaultVersion).toBe('v1');
      expect(config.supportedVersions).toEqual(['v1']);
      expect(config.deprecatedVersions).toEqual([]);
    });

    it('should allow custom configuration', () => {
      versionManager.configure({
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
        deprecatedVersions: ['v1'],
        deprecationDate: new Date('2024-01-01'),
      });

      const config = versionManager.getConfig();
      expect(config.defaultVersion).toBe('v2');
      expect(config.supportedVersions).toEqual(['v1', 'v2']);
      expect(config.deprecatedVersions).toEqual(['v1']);
      expect(config.deprecationDate).toEqual(new Date('2024-01-01'));
    });

    it('should validate version in supportedVersions matches defaultVersion', () => {
      expect(() => {
        versionManager.configure({
          defaultVersion: 'v3',
          supportedVersions: ['v1', 'v2'],
        });
      }).toThrow();
    });
  });

  describe('Version Parsing', () => {
    it('should parse version from /api/v1/ path', () => {
      const version = versionManager.parseVersionFromPath('/api/v1/users');
      expect(version).toBe('v1');
    });

    it('should parse version from /api/v2/ path', () => {
      const version = versionManager.parseVersionFromPath('/api/v2/users');
      expect(version).toBe('v2');
    });

    it('should parse version from /api/v3/ path', () => {
      const version = versionManager.parseVersionFromPath('/api/v3/posts');
      expect(version).toBe('v3');
    });

    it('should return null when no version in path', () => {
      const version = versionManager.parseVersionFromPath('/api/users');
      expect(version).toBeNull();
    });

    it('should return null for empty path', () => {
      const version = versionManager.parseVersionFromPath('');
      expect(version).toBeNull();
    });

    it('should return null for paths without api prefix', () => {
      const version = versionManager.parseVersionFromPath('/users');
      expect(version).toBeNull();
    });

    it('should handle complex paths correctly', () => {
      const version = versionManager.parseVersionFromPath('/api/v1/users/123/posts');
      expect(version).toBe('v1');
    });

    it('should be case sensitive for API prefix', () => {
      const version = versionManager.parseVersionFromPath('/API/v1/users');
      expect(version).toBeNull();
    });

    it('should handle paths with query parameters', () => {
      const version = versionManager.parseVersionFromPath('/api/v1/users?limit=10');
      expect(version).toBe('v1');
    });
  });

  describe('Version Support Check', () => {
    it('should return true for supported version', () => {
      expect(versionManager.isVersionSupported('v1')).toBe(true);
    });

    it('should return false for unsupported version', () => {
      expect(versionManager.isVersionSupported('v2')).toBe(false);
    });

    it('should return false for invalid version format', () => {
      expect(versionManager.isVersionSupported('invalid')).toBe(false);
    });

    it('should return false for null version', () => {
      expect(versionManager.isVersionSupported(null as unknown as ApiVersion)).toBe(false);
    });

    it('should handle multiple supported versions', () => {
      versionManager.configure({
        defaultVersion: 'v1',
        supportedVersions: ['v1', 'v2', 'v3'],
      });

      expect(versionManager.isVersionSupported('v1')).toBe(true);
      expect(versionManager.isVersionSupported('v2')).toBe(true);
      expect(versionManager.isVersionSupported('v3')).toBe(true);
      expect(versionManager.isVersionSupported('v4')).toBe(false);
    });
  });

  describe('Deprecation Check', () => {
    it('should return false for non-deprecated version', () => {
      expect(versionManager.isVersionDeprecated('v1')).toBe(false);
    });

    it('should return true for deprecated version', () => {
      versionManager.configure({
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
        deprecatedVersions: ['v1'],
        deprecationDate: new Date('2024-01-01'),
      });

      expect(versionManager.isVersionDeprecated('v1')).toBe(true);
      expect(versionManager.isVersionDeprecated('v2')).toBe(false);
    });

    it('should return false for unknown version', () => {
      expect(versionManager.isVersionDeprecated('v99')).toBe(false);
    });
  });

  describe('Deprecation Info Retrieval', () => {
    beforeEach(() => {
      versionManager.configure({
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
        deprecatedVersions: ['v1'],
        deprecationDate: new Date('2024-01-01'),
      });
    });

    it('should return deprecation info for deprecated version', () => {
      const info = versionManager.getDeprecationInfo('v1');

      expect(info).toBeDefined();
      expect(info?.since).toEqual(new Date('2024-01-01'));
      expect(info?.sunsetAt).toBeDefined();
      expect(info?.migrateTo).toBe('v2');
    });

    it('should calculate sunset date 180 days after deprecation', () => {
      const deprecationDate = new Date('2024-01-01');
      versionManager.configure({
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
        deprecatedVersions: ['v1'],
        deprecationDate,
      });

      const info = versionManager.getDeprecationInfo('v1');
      const expectedSunset = new Date(deprecationDate);
      expectedSunset.setDate(expectedSunset.getDate() + 180);

      expect(info?.sunsetAt).toEqual(expectedSunset);
    });

    it('should return null for non-deprecated version', () => {
      const info = versionManager.getDeprecationInfo('v2');
      expect(info).toBeNull();
    });

    it('should return null for unknown version', () => {
      const info = versionManager.getDeprecationInfo('v99');
      expect(info).toBeNull();
    });

    it('should suggest migration to next supported version', () => {
      versionManager.configure({
        defaultVersion: 'v3',
        supportedVersions: ['v1', 'v2', 'v3'],
        deprecatedVersions: ['v1', 'v2'],
        deprecationDate: new Date('2024-01-01'),
      });

      const info1 = versionManager.getDeprecationInfo('v1');
      expect(info1?.migrateTo).toBe('v2');

      const info2 = versionManager.getDeprecationInfo('v2');
      expect(info2?.migrateTo).toBe('v3');
    });
  });

  describe('Deprecation Warning Generation', () => {
    beforeEach(() => {
      versionManager.configure({
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
        deprecatedVersions: ['v1'],
        deprecationDate: new Date('2024-01-01'),
      });
    });

    it('should generate warning for deprecated version', () => {
      const warning = versionManager.warnDeprecatedVersion('v1');

      expect(warning).toBeDefined();
      expect(warning).toContain('v1');
      expect(warning).toContain('deprecated');
      expect(warning).toContain('sunset');
    });

    it('should include migration information in warning', () => {
      const warning = versionManager.warnDeprecatedVersion('v1');
      expect(warning).toContain('v2');
      expect(warning).toContain('migrate');
    });

    it('should include sunset date in warning', () => {
      const warning = versionManager.warnDeprecatedVersion('v1');
      const info = versionManager.getDeprecationInfo('v1');
      expect(warning).toContain(info?.sunsetAt.toISOString().split('T')[0] || '');
    });

    it('should return null for non-deprecated version', () => {
      const warning = versionManager.warnDeprecatedVersion('v2');
      expect(warning).toBeNull();
    });

    it('should return null for unknown version', () => {
      const warning = versionManager.warnDeprecatedVersion('v99');
      expect(warning).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle reconfiguration correctly', () => {
      // Initial config
      versionManager.configure({
        defaultVersion: 'v1',
        supportedVersions: ['v1'],
        deprecatedVersions: [],
      });

      expect(versionManager.isVersionSupported('v1')).toBe(true);
      expect(versionManager.isVersionSupported('v2')).toBe(false);

      // Reconfigure
      versionManager.configure({
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
        deprecatedVersions: ['v1'],
        deprecationDate: new Date('2024-01-01'),
      });

      expect(versionManager.isVersionSupported('v1')).toBe(true);
      expect(versionManager.isVersionSupported('v2')).toBe(true);
      expect(versionManager.isVersionDeprecated('v1')).toBe(true);
    });

    it('should handle version "latest" correctly', () => {
      versionManager.configure({
        defaultVersion: 'v2',
        supportedVersions: ['v1', 'v2'],
      });

      // "latest" should map to the default version
      const latestVersion = versionManager.getDefaultVersion();
      expect(latestVersion).toBe('v2');
    });
  });
});
