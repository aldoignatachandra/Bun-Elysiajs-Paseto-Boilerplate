/**
 * PASETO Token Type Definitions
 *
 * Defines the structure for PASETO tokens in our hybrid approach:
 * - v4.local (encrypted) for access tokens
 * - v4.public (signed) for refresh tokens
 */

export interface TokenPayload {
  iss: string; // Issuer
  sub: string; // Subject (user ID)
  aud?: string; // Audience
  exp?: string | number; // Expiration (ISO date string or Unix timestamp)
  iat?: string; // Issued at (ISO date string)
  jti: string; // Token ID (for revocation)
  type: 'access' | 'refresh';
  [key: string]: unknown; // Additional claims
}

export interface AccessTokenPayload extends Omit<TokenPayload, 'type'> {
  type: 'access';
  email?: string;
  role?: string;
  permissions?: string[];
}

export interface RefreshTokenPayload extends Omit<TokenPayload, 'type'> {
  type: 'refresh';
  tokenId: string; // Reference to stored token
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  accessJti: string; // Access token JTI for session tracking
}

export interface TokenValidationResult {
  valid: boolean;
  payload: TokenPayload | null;
  error: string | null;
}

export type TokenType = 'access' | 'refresh';
