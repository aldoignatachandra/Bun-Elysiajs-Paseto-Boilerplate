/**
 * PASETO Authentication Middleware
 *
 * Elysia middleware for protecting routes with PASETO token authentication.
 * Validates access tokens and attaches user information to the request context.
 *
 * Features:
 * - Extracts token from Authorization header
 * - Validates access token using PASETO service
 * - Attaches user data to context
 * - Supports required and optional authentication
 * - Type-safe context augmentation
 *
 * @example
 * ```typescript
 * // Require authentication
 * app.use('/protected', requireAuth());
 *
 * // Optional authentication
 * app.use('/optional', optionalAuth());
 * ```
 */

import type { Elysia } from 'elysia';
import type { PasetoService } from '../core/paseto/paseto.service';
import type { AuthService } from '../services/auth.service';
import { UnauthorizedError, InvalidTokenError } from '../core/errors/app-error';
import { logger } from '../core/logging/logger';

/**
 * Augmented Elysia context with user information
 */
export interface AuthContext {
  user: {
    id: string;
    email?: string;
    role?: string;
    permissions?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  } | null;
  tokenId: string | null;
}

/**
 * Create an authentication middleware that requires valid token
 *
 * This middleware will:
 * 1. Extract the access token from the Authorization header
 * 2. Validate the token using the PASETO service
 * 3. Attach user information to the context
 * 4. Throw an error if authentication fails
 *
 * @param pasetoService - PASETO service instance
 * @param authService - Authentication service instance
 * @returns Elysia middleware plugin
 */
export function requireAuth(pasetoService: PasetoService, authService: AuthService) {
  return (app: Elysia) =>
    app.derive(async ({ request }) => {
      // Extract token from Authorization header
      const authHeader = request.headers.get('Authorization');
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        logger.warn('Authentication failed: No token provided');
        throw new UnauthorizedError('Authentication required');
      }

      // Validate token
      const result = await authService.validateAccessToken({ token });

      if (!result.valid || !result.userId || !result.payload) {
        logger.warn('Authentication failed: Invalid token', { error: result.error });
        throw new InvalidTokenError(result.error || 'Invalid token');
      }

      // Attach user to context
      const payload = result.payload;
      return {
        user: {
          id: result.userId,
          email: typeof payload.email === 'string' ? payload.email : undefined,
          role: typeof payload.role === 'string' ? payload.role : undefined,
          permissions: Array.isArray(payload.permissions) ? payload.permissions : undefined,
          ...payload,
        },
        tokenId: typeof payload.jti === 'string' ? payload.jti : null,
      } satisfies AuthContext;
    });
}

/**
 * Create an authentication middleware that doesn't require valid token
 *
 * This middleware will:
 * 1. Extract the access token from the Authorization header (if present)
 * 2. Validate the token using the PASETO service (if present)
 * 3. Attach user information to the context (if valid)
 * 4. Continue without error if authentication fails
 *
 * Use this for routes that work both authenticated and unauthenticated
 *
 * @param pasetoService - PASETO service instance
 * @param authService - Authentication service instance
 * @returns Elysia middleware plugin
 */
export function optionalAuth(pasetoService: PasetoService, authService: AuthService) {
  return (app: Elysia) =>
    app.derive(async ({ request }) => {
      // Extract token from Authorization header
      const authHeader = request.headers.get('Authorization');
      const token = extractTokenFromHeader(authHeader);

      // No token provided, continue without user
      if (!token) {
        return {
          user: null,
          tokenId: null,
        } satisfies AuthContext;
      }

      // Validate token
      try {
        const result = await authService.validateAccessToken({ token });

        if (!result.valid || !result.userId || !result.payload) {
          // Invalid token, continue without user
          logger.debug('Optional authentication failed: Invalid token', {
            error: result.error,
          });
          return {
            user: null,
            tokenId: null,
          } satisfies AuthContext;
        }

        // Attach user to context
        const payload = result.payload;
        return {
          user: {
            id: result.userId,
            email: typeof payload.email === 'string' ? payload.email : undefined,
            role: typeof payload.role === 'string' ? payload.role : undefined,
            permissions: Array.isArray(payload.permissions) ? payload.permissions : undefined,
            ...payload,
          },
          tokenId: typeof payload.jti === 'string' ? payload.jti : null,
        } satisfies AuthContext;
      } catch (error) {
        // Error during validation, continue without user
        logger.warn('Optional authentication error', { error });
        return {
          user: null,
          tokenId: null,
        } satisfies AuthContext;
      }
    });
}

/**
 * Extract token from Authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
function extractTokenFromHeader(authHeader: string | null): string | null {
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
 * Check if user has required role
 *
 * @param user - User from context
 * @param requiredRole - Required role
 * @returns True if user has required role
 */
export function hasRole(user: AuthContext['user'], requiredRole: string): boolean {
  if (!user) {
    return false;
  }

  return user.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 *
 * @param user - User from context
 * @param roles - Array of acceptable roles
 * @returns True if user has any of the required roles
 */
export function hasAnyRole(user: AuthContext['user'], roles: string[]): boolean {
  if (!user || !user.role) {
    return false;
  }

  return roles.includes(user.role);
}

/**
 * Check if user has required permission
 *
 * @param user - User from context
 * @param permission - Required permission
 * @returns True if user has required permission
 */
export function hasPermission(user: AuthContext['user'], permission: string): boolean {
  if (!user || !user.permissions) {
    return false;
  }

  return user.permissions.includes(permission);
}

/**
 * Check if user has all required permissions
 *
 * @param user - User from context
 * @param permissions - Array of required permissions
 * @returns True if user has all required permissions
 */
export function hasAllPermissions(user: AuthContext['user'], permissions: string[]): boolean {
  if (!user || !user.permissions) {
    return false;
  }

  return permissions.every(p => user.permissions?.includes(p));
}

/**
 * Check if user has any of the required permissions
 *
 * @param user - User from context
 * @param permissions - Array of acceptable permissions
 * @returns True if user has any of the required permissions
 */
export function hasAnyPermission(user: AuthContext['user'], permissions: string[]): boolean {
  if (!user || !user.permissions) {
    return false;
  }

  return permissions.some(p => user.permissions?.includes(p));
}
