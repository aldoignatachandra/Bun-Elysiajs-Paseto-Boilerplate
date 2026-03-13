/**
 * Nonce Generation Utilities
 *
 * Generates cryptographically secure nonces for Content Security Policy.
 * Nonces are used to allow specific inline scripts and styles while maintaining security.
 */

/**
 * Generate a cryptographically secure nonce for CSP
 *
 * Uses crypto.randomUUID() and removes dashes for a compact base64-like string.
 * Each nonce is unique and unpredictable.
 *
 * @returns A unique nonce string
 *
 * @example
 * ```typescript
 * const nonce = generateNonce();
 * // Returns: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
 * ```
 */
export function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * Generate a nonce with a specific prefix
 *
 * Useful for debugging or identifying nonces in logs.
 *
 * @param prefix - Prefix to add to the nonce
 * @returns A unique nonce string with the specified prefix
 *
 * @example
 * ```typescript
 * const nonce = generateNonceWithPrefix('script');
 * // Returns: "script-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
 * ```
 */
export function generateNonceWithPrefix(prefix: string): string {
  const nonce = generateNonce();
  return `${prefix}-${nonce}`;
}

/**
 * Format a nonce for use in CSP directives
 *
 * Wraps the nonce value in the correct CSP syntax.
 *
 * @param nonce - The nonce value to format
 * @returns The nonce formatted for CSP (e.g., "'nonce-abc123'")
 *
 * @example
 * ```typescript
 * const nonce = generateNonce();
 * const cspNonce = formatNonceForCsp(nonce);
 * // Returns: "'nonce-abc123def456...'"
 * ```
 */
export function formatNonceForCsp(nonce: string): string {
  return `'nonce-${nonce}'`;
}

/**
 * Generate a nonce already formatted for CSP
 *
 * Convenience function that combines generation and formatting.
 *
 * @returns A CSP-formatted nonce string
 *
 * @example
 * ```typescript
 * const cspNonce = generateCspNonce();
 * // Returns: "'nonce-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'"
 * ```
 */
export function generateCspNonce(): string {
  return formatNonceForCsp(generateNonce());
}

/**
 * Validate a nonce string
 *
 * Checks if a string appears to be a valid nonce.
 * This is a basic validation and doesn't guarantee the nonce was generated here.
 *
 * @param nonce - The nonce to validate
 * @returns True if the nonce appears valid
 *
 * @example
 * ```typescript
 * isValidNonce('abc123'); // true
 * isValidNonce(''); // false
 * isValidNonce('ab c'); // false (contains space)
 * ```
 */
export function isValidNonce(nonce: string): boolean {
  // Nonces should be alphanumeric, at least 16 characters
  return /^[a-zA-Z0-9]{16,}$/.test(nonce);
}
