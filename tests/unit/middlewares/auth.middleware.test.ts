/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, jest } from 'bun:test';
import {
  requireAuth,
  optionalAuth,
  hasRole,
  hasAnyRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
} from '../../../src/middlewares/auth.middleware';
import type { AuthService } from '../../../src/services/auth.service';
import { UnauthorizedError, InvalidTokenError } from '../../../src/core/errors/app-error';

describe('Auth Middleware', () => {
  let mockAuthService: any;

  beforeEach(() => {
    mockAuthService = {
      validateAccessToken: jest.fn(),
    };
  });

  describe('requireAuth', () => {
    it('should return user context with valid token', async () => {
      mockAuthService.validateAccessToken.mockResolvedValue({
        valid: true,
        userId: 'user-123',
        payload: { email: 'test@example.com', role: 'USER' },
      });

      const middleware = requireAuth({} as any, mockAuthService);
      const mockContext = {
        request: new Request('http://localhost', {
          headers: { Authorization: 'Bearer valid_token' },
        }),
      };

      const result = await middleware(mockContext as any);

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('user-123');
    });

    it('should throw UnauthorizedError when no token provided', async () => {
      const middleware = requireAuth({} as any, mockAuthService);
      const mockContext = {
        request: new Request('http://localhost'),
      };

      await expect(middleware(mockContext as any)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw InvalidTokenError when token is invalid', async () => {
      mockAuthService.validateAccessToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const middleware = requireAuth({} as any, mockAuthService);
      const mockContext = {
        request: new Request('http://localhost', {
          headers: { Authorization: 'Bearer invalid_token' },
        }),
      };

      await expect(middleware(mockContext as any)).rejects.toThrow(InvalidTokenError);
    });
  });

  describe('optionalAuth', () => {
    it('should return user context with valid token', async () => {
      mockAuthService.validateAccessToken.mockResolvedValue({
        valid: true,
        userId: 'user-123',
        payload: { email: 'test@example.com', role: 'USER' },
      });

      const middleware = optionalAuth({} as any, mockAuthService);
      const mockContext = {
        request: new Request('http://localhost', {
          headers: { Authorization: 'Bearer valid_token' },
        }),
      };

      const result = await middleware(mockContext as any);

      expect(result.user).not.toBeNull();
      expect(result.user!.id).toBe('user-123');
    });

    it('should return null user when no token provided', async () => {
      const middleware = optionalAuth({} as any, mockAuthService);
      const mockContext = {
        request: new Request('http://localhost'),
      };

      const result = await middleware(mockContext as any);

      expect(result.user).toBeNull();
      expect(result.tokenId).toBeNull();
    });

    it('should return null user when token is invalid', async () => {
      mockAuthService.validateAccessToken.mockResolvedValue({
        valid: false,
        error: 'Invalid token',
      });

      const middleware = optionalAuth({} as any, mockAuthService);
      const mockContext = {
        request: new Request('http://localhost', {
          headers: { Authorization: 'Bearer invalid_token' },
        }),
      };

      const result = await middleware(mockContext as any);

      expect(result.user).toBeNull();
      expect(result.tokenId).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true when user has the role', () => {
      const user = { role: 'ADMIN' } as any;
      expect(hasRole(user, 'ADMIN')).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      const user = { role: 'USER' } as any;
      expect(hasRole(user, 'ADMIN')).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(hasRole(null, 'ADMIN')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has any of the roles', () => {
      const user = { role: 'ADMIN' } as any;
      expect(hasAnyRole(user, ['ADMIN', 'USER'])).toBe(true);
    });

    it('should return false when user does not have any of the roles', () => {
      const user = { role: 'USER' } as any;
      expect(hasAnyRole(user, ['ADMIN'])).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(hasAnyRole(null, ['ADMIN'])).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      const user = { permissions: ['read', 'write'] } as any;
      expect(hasPermission(user, 'read')).toBe(true);
    });

    it('should return false when user does not have the permission', () => {
      const user = { permissions: ['read'] } as any;
      expect(hasPermission(user, 'write')).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(hasPermission(null, 'read')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', () => {
      const user = { permissions: ['read', 'write', 'delete'] } as any;
      expect(hasAllPermissions(user, ['read', 'write'])).toBe(true);
    });

    it('should return false when user does not have all permissions', () => {
      const user = { permissions: ['read'] } as any;
      expect(hasAllPermissions(user, ['read', 'write'])).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has any permission', () => {
      const user = { permissions: ['read'] } as any;
      expect(hasAnyPermission(user, ['read', 'write'])).toBe(true);
    });

    it('should return false when user does not have any permission', () => {
      const user = { permissions: ['read'] } as any;
      expect(hasAnyPermission(user, ['write', 'delete'])).toBe(false);
    });
  });
});
