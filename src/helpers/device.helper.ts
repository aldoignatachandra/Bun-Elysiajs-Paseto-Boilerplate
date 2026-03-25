/**
 * Device Detection Helper Utilities
 *
 * Provides functions for extracting device information from user agent strings.
 *
 * @module DeviceHelper
 */

/**
 * Device type enumeration
 */
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';

/**
 * Detect device type from user agent string
 *
 * Analyzes the user agent to determine the type of device making the request.
 *
 * @param userAgent - The user agent string from the request headers
 * @returns The detected device type
 *
 * @example
 * ```typescript
 * getDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)...') // 'desktop'
 * getDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0...') // 'mobile'
 * getDeviceType('Mozilla/5.0 (iPad; CPU OS 14_0...') // 'tablet'
 * ```
 */
export function getDeviceType(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) {
    return 'unknown';
  }

  const ua = userAgent.toLowerCase();

  // Check for bots/crawlers first
  if (
    ua.includes('bot') ||
    ua.includes('crawler') ||
    ua.includes('spider') ||
    ua.includes('scraper') ||
    ua.includes('curl') ||
    ua.includes('wget') ||
    ua.includes('postman') ||
    ua.includes('insomnia') ||
    ua.includes('httpie')
  ) {
    return 'bot';
  }

  // Check for tablets (must check before mobile as tablets also match mobile patterns)
  if (
    ua.includes('ipad') ||
    ua.includes('tablet') ||
    ua.includes('playbook') ||
    ua.includes('silk') ||
    (ua.includes('android') && !ua.includes('mobile')) ||
    ua.includes('kindle')
  ) {
    return 'tablet';
  }

  // Check for mobile devices
  if (
    ua.includes('mobile') ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    ua.includes('android') ||
    ua.includes('blackberry') ||
    ua.includes('opera mini') ||
    ua.includes('opera mobi') ||
    ua.includes('windows phone') ||
    ua.includes('webos') ||
    ua.includes('palm') ||
    ua.includes('symbian') ||
    ua.includes('nokia')
  ) {
    return 'mobile';
  }

  // Default to desktop for anything else
  return 'desktop';
}

/**
 * Get a simplified device description
 *
 * Returns a human-readable description of the device.
 *
 * @param userAgent - The user agent string
 * @returns A simplified device description
 */
export function getDeviceDescription(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return 'Unknown device';
  }

  const ua = userAgent;
  const deviceType = getDeviceType(ua);

  // Extract browser
  let browser = 'Unknown Browser';
  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    browser = 'Opera';
  }

  // Extract OS
  let os = 'Unknown OS';
  if (ua.includes('Windows')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  }

  return `${deviceType.charAt(0).toUpperCase() + deviceType.slice(1)} (${os}, ${browser})`;
}
