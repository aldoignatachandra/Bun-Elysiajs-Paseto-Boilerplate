/**
 * IP Address Helper Utilities
 *
 * Provides functions for extracting client IP addresses from requests.
 * Checks multiple headers in order of reliability.
 *
 * @module IpHelper
 */

/**
 * Headers to check for client IP, in order of preference
 *
 * Order based on reliability and common proxy configurations:
 * 1. CF-Connecting-IP - Cloudflare's real visitor IP
 * 2. X-Real-IP - Nginx's real IP header
 * 3. True-Client-IP - Used by some CDNs and proxies
 * 4. X-Forwarded-For - Standard proxy header (takes first IP)
 * 5. Forwarded - RFC 7239 standard header
 */
const IP_HEADERS = ['cf-connecting-ip', 'x-real-ip', 'true-client-ip', 'x-forwarded-for', 'forwarded'] as const;

/**
 * Default IP address when no IP can be determined
 * Using loopback address (127.0.0.1) for local development
 */
const DEFAULT_IP = '127.0.0.1';

/**
 * Extract client IP address from request headers
 *
 * Checks multiple headers in order of reliability and returns the first valid IP found.
 * If no valid IP is found in headers, returns '127.0.0.1' (localhost).
 *
 * @param request - The HTTP request object
 * @returns The client IP address
 *
 * @example
 * ```typescript
 * // From Cloudflare
 * getClientIp(request) // "203.0.113.50"
 *
 * // From Nginx proxy
 * getClientIp(request) // "192.168.1.100"
 *
 * // Direct connection (no proxy headers)
 * getClientIp(request) // "127.0.0.1"
 * ```
 */
export function getClientIp(request: Request): string {
  for (const header of IP_HEADERS) {
    const value = request.headers.get(header);

    if (!value) {
      continue;
    }

    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    // The first one is typically the original client
    if (header === 'x-forwarded-for') {
      const firstIp = value.split(',')[0].trim();
      if (isValidIp(firstIp)) {
        return firstIp;
      }
      continue;
    }

    // Forwarded header format: "for=192.0.2.60;proto=http;by=203.0.113.43"
    if (header === 'forwarded') {
      const forMatch = value.match(/for=([^;,\s]+)/i);
      if (forMatch?.[1]) {
        let ip = forMatch[1].trim();
        // Remove quotes/brackets if present (IPv6 addresses may be quoted or bracketed)
        // Using separate replacements to avoid regex escape confusion
        ip = ip.replace(/^["']/, '').replace(/["']$/, '');
        if (ip.startsWith('[')) ip = ip.slice(1);
        if (ip.endsWith(']')) ip = ip.slice(0, -1);
        if (isValidIp(ip)) {
          return ip;
        }
      }
      continue;
    }

    // Direct header value
    const trimmedValue = value.trim();
    if (isValidIp(trimmedValue)) {
      return trimmedValue;
    }
  }

  // No valid IP found in headers - return localhost
  return DEFAULT_IP;
}

/**
 * Check if a string is a valid IP address (IPv4 or IPv6)
 *
 * @param ip - The string to validate
 * @returns True if valid IP address
 */
export function isValidIp(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(ip)) {
    // Validate each octet is 0-255
    const octets = ip.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
  }

  // IPv6 pattern (simplified - covers common formats)
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^([0-9a-fA-F]{1,4}:)*:([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
  if (ipv6Pattern.test(ip)) {
    return true;
  }

  // IPv6 with IPv4 mapping (::ffff:192.168.1.1)
  const ipv6MappedPattern = /^::ffff:(\d{1,3}\.){3}\d{1,3}$/i;
  if (ipv6MappedPattern.test(ip)) {
    return true;
  }

  return false;
}

/**
 * Get IP address with fallback options
 *
 * @param request - The HTTP request object
 * @param fallback - Custom fallback IP (defaults to 127.0.0.1)
 * @returns The client IP address or fallback
 */
export function getClientIpWithFallback(request: Request, fallback: string = DEFAULT_IP): string {
  const ip = getClientIp(request);
  return ip === DEFAULT_IP ? fallback : ip;
}
