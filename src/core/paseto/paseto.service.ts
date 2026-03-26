/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

/**
 * PASETO Service - Hybrid Implementation (v4.local + v4.public)
 *
 * This service implements a hybrid PASETO approach for maximum learning:
 * - v4.local (encrypt/decrypt): Symmetric encryption for access tokens
 *   - Payload is HIDDEN - can't be read without the key
 *   - Perfect for: Sensitive user data, permissions, sessions
 *
 * - v4.public (sign/verify): Asymmetric signing for refresh tokens
 *   - Payload is READABLE - anyone can see it (but not modify)
 *   - Perfect for: Long-lived tokens, revocation, microservices verification
 */

import { encrypt, decrypt, sign, verify } from 'paseto-ts/v4';
import type { TokenPayload, AccessTokenPayload, RefreshTokenPayload, TokenPair, TokenValidationResult, TokenType } from './token.types';
import { KeyConfigError, InvalidTokenPayloadError, TokenExpiredError, TokenValidationError } from './errors';
import { validateTokenPayload, getTokenTypeFromPrefix, isTokenExpired } from './utils';

export interface PasetoServiceConfig {
  issuer: string;
  audience: string;
  symmetricKey: string | number[] | Uint8Array; // PASERK string or Uint8Array
  publicKey: string | number[] | Uint8Array; // PASERK string or Uint8Array
  secretKey: string | number[] | Uint8Array; // PASERK string or Uint8Array
  accessTokenExpiryMinutes: number;
  refreshTokenExpiryDays: number;
}

export class PasetoService {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly symmetricKey: Uint8Array; // Raw Uint8Array for encrypt/decrypt
  private readonly publicKey: string; // PASERK string for sign/verify
  private readonly secretKey: string; // PASERK string for sign/verify
  private readonly accessTokenExpiryMinutes: number;
  private readonly refreshTokenExpiryDays: number;

  constructor(config: PasetoServiceConfig) {
    if (!config.issuer || !config.audience) {
      throw new KeyConfigError('Issuer and audience are required');
    }

    if (
      !config.symmetricKey ||
      !config.publicKey ||
      !config.secretKey ||
      (Array.isArray(config.symmetricKey) && config.symmetricKey.length === 0) ||
      (Array.isArray(config.publicKey) && config.publicKey.length === 0) ||
      (Array.isArray(config.secretKey) && config.secretKey.length === 0) ||
      (typeof config.symmetricKey === 'string' && config.symmetricKey.length === 0) ||
      (typeof config.publicKey === 'string' && config.publicKey.length === 0) ||
      (typeof config.secretKey === 'string' && config.secretKey.length === 0)
    ) {
      throw new KeyConfigError('Symmetric key, public key, and secret key are required');
    }

    this.issuer = config.issuer;
    this.audience = config.audience;

    // For symmetric key: store as Uint8Array for paseto-ts encrypt/decrypt
    this.symmetricKey = this.convertToUint8Array(config.symmetricKey);
    // For asymmetric keys: store as PASERK strings for paseto-ts sign/verify
    this.publicKey = this.convertToPaserkString(config.publicKey, 'k4.public.');
    this.secretKey = this.convertToPaserkString(config.secretKey, 'k4.secret.');
    this.accessTokenExpiryMinutes = config.accessTokenExpiryMinutes;
    this.refreshTokenExpiryDays = config.refreshTokenExpiryDays;
  }

  /**
   * Convert key to Uint8Array (for symmetric crypto operations)
   */
  private convertToUint8Array(key: string | number[] | Uint8Array): Uint8Array {
    if (key instanceof Uint8Array) {
      return key;
    } else if (typeof key === 'string') {
      // Check if it's a PASERK string (k4.local.xxx)
      if (key.startsWith('k4.local.')) {
        // Extract the base64url part and convert to Uint8Array
        const base64urlPart = key.slice(9); // Remove 'k4.local.' prefix
        return this.base64UrlToUint8Array(base64urlPart);
      }
      // Assume it's raw base64url and convert directly
      return this.base64UrlToUint8Array(key);
    } else {
      // Convert number array to Uint8Array
      return new Uint8Array(key);
    }
  }

  /**
   * Convert key to PASERK string format (for asymmetric crypto operations)
   */
  private convertToPaserkString(key: string | number[] | Uint8Array, prefix: string): string {
    if (typeof key === 'string') {
      // If already in PASERK format, return as-is
      if (key.startsWith(prefix)) {
        return key;
      }
      // Otherwise, assume it's a raw base64url key and add the prefix
      return prefix + key;
    } else if (key instanceof Uint8Array) {
      // Convert Uint8Array to base64url string and add prefix
      return prefix + this.uint8ArrayToBase64Url(key);
    } else {
      // Convert number array to base64url string and add prefix
      return prefix + this.uint8ArrayToBase64Url(new Uint8Array(key));
    }
  }

  /**
   * Convert Uint8Array to base64url string
   */
  private uint8ArrayToBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    // Convert to base64url (remove padding, replace +/ with -_)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Convert base64url string to Uint8Array
   */
  private base64UrlToUint8Array(base64url: string): Uint8Array {
    // Add padding if needed
    const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
    const base64 = base64url + padding;
    // Replace URL-safe characters with standard base64 characters
    const base64Standard = base64.replace(/-/g, '+').replace(/_/g, '/');
    // Decode to binary string
    const binaryString = atob(base64Standard);
    // Convert to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Create an access token using v4.local (encrypted)
   * The payload is hidden and can only be read with the symmetric key
   */
  public createAccessToken(payload: AccessTokenPayload): string {
    try {
      validateTokenPayload(payload);

      // Ensure all required fields are present
      // Remove iat and exp from payload as we'll let paseto-ts handle them
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { iat, exp, ...payloadWithoutDates } = payload;

      const tokenPayload: Record<string, unknown> = {
        ...payloadWithoutDates,
        iss: payload.iss || this.issuer,
        aud: payload.aud || this.audience,
      };

      // Use relative time for exp if provided
      const options: {
        addIat: boolean;
        addExp?: boolean;
      } = {
        addIat: true,
      };

      if (exp) {
        // Convert Unix timestamp to relative time
        const secondsUntilExpiry = (exp as number) - Math.floor(Date.now() / 1000);
        if (secondsUntilExpiry > 0) {
          // Use the most appropriate unit
          if (secondsUntilExpiry < 60) {
            tokenPayload.exp = `${secondsUntilExpiry} seconds`;
          } else {
            const minutesUntilExpiry = Math.floor(secondsUntilExpiry / 60);
            tokenPayload.exp = `${minutesUntilExpiry} minutes`;
          }
        } else {
          // Token is already expired, this shouldn't happen in normal usage
          // But we need to handle it for testing purposes
          tokenPayload.exp = '1 second';
        }
      } else {
        options.addExp = true;
      }

      const token = encrypt(this.symmetricKey, tokenPayload, options as Parameters<typeof encrypt>[2]);
      return token;
    } catch (error) {
      if (error instanceof InvalidTokenPayloadError) {
        throw error;
      }
      throw new TokenValidationError(`Failed to create access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a refresh token using v4.public (signed)
   * The payload is readable but cannot be modified without the secret key
   */
  public createRefreshToken(payload: RefreshTokenPayload): string {
    try {
      validateTokenPayload(payload);

      // Ensure all required fields are present
      // Remove iat and exp from payload as we'll let paseto-ts handle them
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { iat, exp, ...payloadWithoutDates } = payload;

      const tokenPayload: Record<string, unknown> = {
        ...payloadWithoutDates,
        iss: payload.iss || this.issuer,
        aud: payload.aud || this.audience,
      };

      // Use relative time for exp if provided
      const options: {
        addIat: boolean;
        addExp?: boolean;
      } = {
        addIat: true,
      };

      if (exp) {
        // Convert Unix timestamp to relative time
        const secondsUntilExpiry = (exp as number) - Math.floor(Date.now() / 1000);
        if (secondsUntilExpiry > 0) {
          // Use the most appropriate unit
          if (secondsUntilExpiry < 60) {
            tokenPayload.exp = `${secondsUntilExpiry} seconds`;
          } else if (secondsUntilExpiry < 3600) {
            const minutesUntilExpiry = Math.floor(secondsUntilExpiry / 60);
            tokenPayload.exp = `${minutesUntilExpiry} minutes`;
          } else {
            const daysUntilExpiry = Math.floor(secondsUntilExpiry / (24 * 60 * 60));
            tokenPayload.exp = `${daysUntilExpiry} days`;
          }
        } else {
          // Token is already expired, this shouldn't happen in normal usage
          // But we need to handle it for testing purposes
          tokenPayload.exp = '1 second';
        }
      } else {
        options.addExp = true;
      }

      const token = sign(this.secretKey, tokenPayload, options as Parameters<typeof sign>[2]);
      return token;
    } catch (error) {
      if (error instanceof InvalidTokenPayloadError) {
        throw error;
      }
      throw new TokenValidationError(`Failed to create refresh token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create both access and refresh tokens as a pair
   * This is the main method for authentication flows
   */
  public createTokenPair(basePayload: { sub: string; email?: string; role?: string; permissions?: string[] }): TokenPair {
    const now = Math.floor(Date.now() / 1000);
    const accessJti = crypto.randomUUID();
    const refreshJti = crypto.randomUUID();

    // Create access token payload (v4.local - encrypted)
    const accessPayload: AccessTokenPayload = {
      iss: this.issuer,
      sub: basePayload.sub,
      aud: this.audience,
      exp: Math.floor(Date.now() / 1000) + this.accessTokenExpiryMinutes * 60,
      iat: now,
      jti: accessJti,
      type: 'access',
      email: basePayload.email,
      role: basePayload.role,
      permissions: basePayload.permissions,
    };

    // Create refresh token payload (v4.public - signed)
    const refreshPayload: RefreshTokenPayload = {
      iss: this.issuer,
      sub: basePayload.sub,
      aud: this.audience,
      exp: Math.floor(Date.now() / 1000) + this.refreshTokenExpiryDays * 24 * 60 * 60,
      iat: now,
      jti: refreshJti,
      type: 'refresh',
      tokenId: refreshJti, // Use JTI as the token ID for revocation
    };

    const accessToken = this.createAccessToken(accessPayload);
    const refreshToken = this.createRefreshToken(refreshPayload);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiryMinutes * 60, // Return in seconds
      accessJti, // Include access token JTI for session tracking
    };
  }

  /**
   * Validate and decrypt a v4.local access token
   * Returns the hidden payload if valid
   */
  public validateAccessToken(token: string): TokenValidationResult {
    try {
      // Check if this is a v4.local token
      if (!token.startsWith('v4.local.')) {
        return {
          valid: false,
          payload: null,
          error: 'Invalid token format: expected v4.local token',
        };
      }

      // Decrypt the token
      const result = decrypt(this.symmetricKey, token);

      if (!result || typeof result !== 'object') {
        return {
          valid: false,
          payload: null,
          error: 'Failed to decrypt token',
        };
      }

      // Extract payload from the result
      const payload = result.payload;

      // Validate the payload structure
      validateTokenPayload(payload);

      // Check if token has expired
      if (payload.exp !== undefined && isTokenExpired(payload.exp)) {
        throw new TokenExpiredError();
      }

      return {
        valid: true,
        payload: payload as TokenPayload,
        error: null,
      };
    } catch (error) {
      // Handle our custom TokenExpiredError
      if (error instanceof TokenExpiredError) {
        return {
          valid: false,
          payload: null,
          error: 'Token has been expired',
        };
      }
      if (error instanceof InvalidTokenPayloadError) {
        return {
          valid: false,
          payload: null,
          error: error.message,
        };
      }
      // Check if the error message indicates token expiration (from paseto-ts library)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.isExpirationError(errorMessage)) {
        return {
          valid: false,
          payload: null,
          error: 'Token has been expired',
        };
      }
      return {
        valid: false,
        payload: null,
        error: `Token validation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Check if an error message indicates token expiration
   * Handles various expiration error formats from paseto-ts library
   */
  private isExpirationError(message: string): boolean {
    const expirationPatterns = ['has expired', 'token is expired', 'exp claim', 'expiration', 'expired'];
    const lowerMessage = message.toLowerCase();
    return expirationPatterns.some(pattern => lowerMessage.includes(pattern));
  }

  /**
   * Validate and verify a v4.public refresh token
   * Returns the payload if the signature is valid
   */
  public validateRefreshToken(token: string): TokenValidationResult {
    try {
      // Check if this is a v4.public token
      if (!token.startsWith('v4.public.')) {
        return {
          valid: false,
          payload: null,
          error: 'Invalid token format: expected v4.public token',
        };
      }

      // Verify the token signature
      const result = verify(this.publicKey, token);

      if (!result || typeof result !== 'object') {
        return {
          valid: false,
          payload: null,
          error: 'Failed to verify token signature',
        };
      }

      // Extract payload from the result
      const payload = result.payload;

      // Validate the payload structure
      validateTokenPayload(payload);

      // Check if token has expired
      if (payload.exp !== undefined && isTokenExpired(payload.exp)) {
        throw new TokenExpiredError();
      }

      return {
        valid: true,
        payload: payload as TokenPayload,
        error: null,
      };
    } catch (error) {
      // Handle our custom TokenExpiredError
      if (error instanceof TokenExpiredError) {
        return {
          valid: false,
          payload: null,
          error: 'Token has been expired',
        };
      }
      if (error instanceof InvalidTokenPayloadError) {
        return {
          valid: false,
          payload: null,
          error: error.message,
        };
      }
      // Check if the error message indicates token expiration (from paseto-ts library)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.isExpirationError(errorMessage)) {
        return {
          valid: false,
          payload: null,
          error: 'Token has been expired',
        };
      }
      return {
        valid: false,
        payload: null,
        error: `Token validation failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Auto-detect token type and validate accordingly
   * This is useful when you don't know which type of token you're dealing with
   */
  public validateAndDecodeToken(token: string): TokenValidationResult {
    const tokenType = this.getTokenType(token);

    if (tokenType === 'access') {
      return this.validateAccessToken(token);
    } else if (tokenType === 'refresh') {
      return this.validateRefreshToken(token);
    }

    return {
      valid: false,
      payload: null,
      error: 'Unrecognized token format',
    };
  }

  /**
   * Extract token from Authorization header
   * Handles "Bearer <token>" format
   */
  public extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Detect token type from prefix
   * Returns 'access' for v4.local, 'refresh' for v4.public, or null
   */
  public getTokenType(token: string): TokenType | null {
    return getTokenTypeFromPrefix(token);
  }

  /**
   * Get the service configuration (useful for debugging)
   */
  public getConfig(): {
    issuer: string;
    audience: string;
    accessTokenExpiryMinutes: number;
    refreshTokenExpiryDays: number;
  } {
    return {
      issuer: this.issuer,
      audience: this.audience,
      accessTokenExpiryMinutes: this.accessTokenExpiryMinutes,
      refreshTokenExpiryDays: this.refreshTokenExpiryDays,
    };
  }
}

/**
 * Singleton instance getter
 * Note: This will be initialized with environment variables in production
 * For now, it returns a mock instance for testing
 */
let pasetoInstance: PasetoService | null = null;

export function getPasetoService(config?: PasetoServiceConfig): PasetoService {
  if (pasetoInstance && !config) {
    return pasetoInstance;
  }

  if (!config) {
    throw new KeyConfigError('PasetoService configuration required for first initialization');
  }

  pasetoInstance = new PasetoService(config);
  return pasetoInstance;
}

// Export a singleton instance (will be properly initialized later)
// For now, export a placeholder that will throw if used without initialization
export const paseto = new Proxy<PasetoService>({} as PasetoService, {
  get(target, prop) {
    if (!pasetoInstance) {
      throw new KeyConfigError('PasetoService not initialized. Call getPasetoService() with config first.');
    }
    // Use type assertion with 'unknown' as an intermediate type for safer casting
    return (pasetoInstance as unknown as Record<string, unknown>)[prop as string];
  },
});
