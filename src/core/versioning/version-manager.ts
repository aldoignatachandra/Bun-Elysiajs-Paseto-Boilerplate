import type { ApiVersion, VersionConfig, DeprecationInfo } from './types';

/**
 * Version Manager
 * Manages API version configuration, validation, and deprecation information.
 *
 * @example
 * ```ts
 * import { versionManager } from '@/core/versioning/version-manager';
 *
 * // Configure versioning
 * versionManager.configure({
 *   defaultVersion: 'v1',
 *   supportedVersions: ['v1', 'v2'],
 *   deprecatedVersions: ['v1'],
 *   deprecationDate: new Date('2024-01-01'),
 * });
 *
 * // Check if version is supported
 * if (versionManager.isVersionSupported('v1')) {
 *   // Handle v1 request
 * }
 *
 * // Get deprecation info
 * const deprecation = versionManager.getDeprecationInfo('v1');
 * if (deprecation) {
 *   console.log(`Version deprecated since ${deprecation.since}`);
 *   console.log(`Will sunset on ${deprecation.sunsetAt}`);
 *   console.log(`Migrate to ${deprecation.migrateTo}`);
 * }
 * ```
 */
class VersionManager {
  private config: VersionConfig = {
    defaultVersion: 'v1',
    supportedVersions: ['v1'],
    deprecatedVersions: [],
  };

  private readonly SUNSET_DAYS = 180;

  /**
   * Configure the version manager with custom settings.
   * @param config The version configuration
   * @throws Error if defaultVersion is not in supportedVersions
   */
  configure(config: VersionConfig): void {
    if (!config.supportedVersions.includes(config.defaultVersion)) {
      throw new Error(
        `defaultVersion '${config.defaultVersion}' must be included in supportedVersions`
      );
    }

    this.config = {
      ...config,
    };
  }

  /**
   * Get the current configuration.
   * @returns The current version configuration
   */
  getConfig(): VersionConfig {
    return { ...this.config };
  }

  /**
   * Get the default API version.
   * @returns The default API version
   */
  getDefaultVersion(): ApiVersion {
    return this.config.defaultVersion;
  }

  /**
   * Parse version from URL path.
   * @param path The URL path to parse
   * @returns The extracted version or null if not found
   *
   * @example
   * ```ts
   * parseVersionFromPath('/api/v1/users') // returns 'v1'
   * parseVersionFromPath('/api/users') // returns null
   * parseVersionFromPath('/health') // returns null
   * ```
   */
  parseVersionFromPath(path: string): ApiVersion | null {
    if (!path) {
      return null;
    }

    // Match /api/v{version}/ pattern
    const apiVersionPattern = /^\/api\/(v\d+)\//;
    const match = path.match(apiVersionPattern);

    if (match && match[1]) {
      const version = match[1] as ApiVersion;
      // Validate it's a proper version format
      if (/^v\d+$/.test(version)) {
        return version;
      }
    }

    return null;
  }

  /**
   * Check if a version is supported.
   * @param version The version to check
   * @returns true if the version is supported, false otherwise
   */
  isVersionSupported(version: ApiVersion | null): boolean {
    if (!version) {
      return false;
    }

    // Handle 'latest' - it maps to the default version
    if (version === 'latest') {
      return true;
    }

    // Validate version format
    if (!/^v\d+$/.test(version)) {
      return false;
    }

    return this.config.supportedVersions.includes(version);
  }

  /**
   * Check if a version is deprecated.
   * @param version The version to check
   * @returns true if the version is deprecated, false otherwise
   */
  isVersionDeprecated(version: ApiVersion | null): boolean {
    if (!version) {
      return false;
    }

    // Handle 'latest' - it's never deprecated
    if (version === 'latest') {
      return false;
    }

    return this.config.deprecatedVersions.includes(version);
  }

  /**
   * Get deprecation information for a version.
   * @param version The version to get deprecation info for
   * @returns Deprecation information or null if not deprecated
   */
  getDeprecationInfo(version: ApiVersion | null): DeprecationInfo | null {
    if (!version || !this.isVersionDeprecated(version)) {
      return null;
    }

    const deprecationDate = this.config.deprecationDate || new Date();
    const sunsetAt = new Date(deprecationDate);
    sunsetAt.setDate(sunsetAt.getDate() + this.SUNSET_DAYS);

    // Find the next version to migrate to
    // First try to find the next version in the list (even if deprecated)
    // This allows clients to migrate incrementally
    const currentVersionIndex = this.config.supportedVersions.indexOf(version);
    let migrateTo = this.config.defaultVersion;

    if (
      currentVersionIndex >= 0 &&
      currentVersionIndex < this.config.supportedVersions.length - 1
    ) {
      // Use the next version in the supported versions list
      migrateTo = this.config.supportedVersions[currentVersionIndex + 1];
    }

    return {
      since: deprecationDate,
      sunsetAt,
      migrateTo,
    };
  }

  /**
   * Generate a deprecation warning for a version.
   * @param version The version to generate a warning for
   * @returns Warning message or null if not deprecated
   */
  warnDeprecatedVersion(version: ApiVersion | null): string | null {
    const info = this.getDeprecationInfo(version);

    if (!info) {
      return null;
    }

    const versionStr = version || 'unknown';
    const sunsetDateStr = info.sunsetAt.toISOString().split('T')[0];

    return (
      `API version ${versionStr} is deprecated and will be sunset on ${sunsetDateStr}. ` +
      `Please migrate to version ${info.migrateTo} at your earliest convenience.`
    );
  }

  /**
   * Get all supported versions (excluding deprecated).
   * @returns Array of active (non-deprecated) versions
   */
  getActiveVersions(): ApiVersion[] {
    return this.config.supportedVersions.filter(
      version => !this.config.deprecatedVersions.includes(version)
    );
  }

  /**
   * Resolve 'latest' to the actual version.
   * @returns The resolved version (default version)
   */
  resolveLatestVersion(): ApiVersion {
    return this.config.defaultVersion;
  }

  /**
   * Validate if a version string is in correct format.
   * @param version The version string to validate
   * @returns true if valid format, false otherwise
   */
  isValidVersionFormat(version: string): boolean {
    return /^v\d+$/.test(version) || version === 'latest';
  }
}

// Export singleton instance
export const versionManager = new VersionManager();

// Export class for testing purposes
export { VersionManager };
