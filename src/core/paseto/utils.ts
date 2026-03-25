/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */

/**
 * PASETO Utility Functions
 *
 * Helper functions for PASETO token operations
 * Note: paseto-ts uses PASERK format, so we don't need hex conversion
 */

import { InvalidTokenPayloadError } from './errors';

export function generateTokenId(): string {
  return crypto.randomUUID();
}

export function calculateExpiry(minutes: number): number {
  return Math.floor(Date.now() / 1000) + minutes * 60;
}

export function calculateExpiryDays(days: number): number {
  return Math.floor(Date.now() / 1000) + days * 24 * 60 * 60;
}

export function isTokenExpired(exp: string | number): boolean {
  if (typeof exp === 'string') {
    // ISO date string
    return new Date(exp) <= new Date();
  }
  // Unix timestamp
  return Math.floor(Date.now() / 1000) >= exp;
}

export function validateTokenPayload(payload: unknown): asserts payload is import('./token.types').TokenPayload {
  if (!payload || typeof payload !== 'object') {
    throw new InvalidTokenPayloadError('Payload must be an object');
  }

  const p = payload as Record<string, unknown>;

  if (!p.iss || typeof p.iss !== 'string') {
    throw new InvalidTokenPayloadError('Payload must have "iss" (issuer) field');
  }

  if (!p.sub || typeof p.sub !== 'string') {
    throw new InvalidTokenPayloadError('Payload must have "sub" (subject) field');
  }

  if (p.exp !== undefined && typeof p.exp !== 'number' && typeof p.exp !== 'string') {
    throw new InvalidTokenPayloadError('Payload "exp" (expiration) must be a number or string');
  }

  if (p.iat !== undefined && typeof p.iat !== 'number' && typeof p.iat !== 'string') {
    throw new InvalidTokenPayloadError('Payload "iat" (issued at) must be a number or string');
  }

  if (!p.type || typeof p.type !== 'string') {
    throw new InvalidTokenPayloadError('Payload must have "type" field');
  }

  if (p.type !== 'access' && p.type !== 'refresh') {
    throw new InvalidTokenPayloadError('Token type must be "access" or "refresh"');
  }
}

export function formatTokenForDisplay(token: string, visibleChars = 10): string {
  if (token.length <= visibleChars * 2) {
    return token;
  }
  return `${token.slice(0, visibleChars)}...${token.slice(-visibleChars)}`;
}

export function getTokenTypeFromPrefix(token: string): 'access' | 'refresh' | null {
  if (token.startsWith('v4.local.')) {
    return 'access';
  } else if (token.startsWith('v4.public.')) {
    return 'refresh';
  }
  return null;
}
