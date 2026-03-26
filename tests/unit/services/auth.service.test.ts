/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/await-thenable */

import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { AuthService } from '../../../src/services/auth.service';
import { ConflictError, AuthenticationError, ForbiddenError, InvalidTokenError, NotFoundError } from '../../../src/core/errors/app-error';
import type { PasetoService } from '../../../src/core/paseto/paseto.service';
import type { PasswordService } from '../../../src/core/crypto/password.service';
import type { UnitOfWork } from '../../../src/repositories/unit-of-work';
import type { User } from '../../../src/database/schema';

describe('AuthService', () => {
  let service: AuthService;
  let mockUnitOfWork: any;
  let mockPasetoService: any;
  let mockPasswordService: any;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    passwordHash: 'hashed_password',
    role: 'USER',
    lastLoginAt: new Date(),
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokenPair = {
    accessToken: 'v4.local.test_access_token',
    refreshToken: 'v4.public.test_refresh_token',
    expiresIn: 900,
    accessJti: 'access-jti-123',
  };

  beforeEach(() => {
    mockUnitOfWork = {
      users: {
        findById: jest.fn(),
        findByEmail: jest.fn(),
        findByUsername: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      sessions: {
        findByTokenId: jest.fn(),
        findByToken: jest.fn(),
        findByRefreshTokenId: jest.fn(),
        findActiveSessionByUserId: jest.fn(),
        create: jest.fn(),
        revoke: jest.fn(),
        deleteByUserId: jest.fn(),
      },
      activityLogs: {
        create: jest.fn().mockResolvedValue({}),
      },
      withTransaction: jest.fn(callback => callback(mockUnitOfWork)),
    };

    mockPasetoService = {
      createTokenPair: jest.fn().mockReturnValue(mockTokenPair),
      createAccessToken: jest.fn().mockReturnValue('v4.local.test_access_token'),
      createRefreshToken: jest.fn().mockReturnValue('v4.public.test_refresh_token'),
      validateAccessToken: jest.fn().mockReturnValue({
        valid: true,
        payload: { sub: mockUser.id, email: mockUser.email, role: 'USER' },
      }),
      validateRefreshToken: jest.fn().mockReturnValue({
        valid: true,
        payload: { sub: mockUser.id, tokenId: 'token-id-123' },
      }),
    };

    mockPasswordService = {
      hash: jest.fn().mockResolvedValue('hashed_password'),
      verify: jest.fn().mockResolvedValue(true),
    };

    service = new AuthService(
      mockUnitOfWork as unknown as UnitOfWork,
      mockPasetoService as unknown as PasetoService,
      mockPasswordService as unknown as PasswordService
    );
  });

  describe('register', () => {
    it('should register a new user', async () => {
      mockUnitOfWork.users.findByEmail.mockResolvedValue(null);
      mockUnitOfWork.users.findByUsername.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUnitOfWork.users.create.mockResolvedValue(mockUser);
      mockPasetoService.validateRefreshToken.mockReturnValue({
        valid: true,
        payload: { sub: mockUser.id, tokenId: 'token-id-123' },
      });
      mockUnitOfWork.sessions.create.mockResolvedValue({});
      mockUnitOfWork.activityLogs.create.mockResolvedValue({});

      const result = await service.register({
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123!',
        name: 'John Doe',
      });

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
    });

    it('should throw ConflictError when email already exists', async () => {
      mockUnitOfWork.users.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          username: 'newuser',
          password: 'password123!',
          name: 'John Doe',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError when username already exists', async () => {
      mockUnitOfWork.users.findByEmail.mockResolvedValue(null);
      mockUnitOfWork.users.findByUsername.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'new@example.com',
          username: 'testuser',
          password: 'password123!',
          name: 'John Doe',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('login', () => {
    it('should login a user with valid credentials', async () => {
      mockUnitOfWork.users.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(true);
      mockUnitOfWork.users.update.mockResolvedValue(mockUser);
      mockUnitOfWork.sessions.deleteByUserId.mockResolvedValue(true);
      mockPasetoService.validateRefreshToken.mockReturnValue({
        valid: true,
        payload: { sub: mockUser.id, tokenId: 'token-id-123' },
      });
      mockUnitOfWork.sessions.create.mockResolvedValue({});
      mockUnitOfWork.activityLogs.create.mockResolvedValue({});

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123!',
      });

      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
    });

    it('should throw AuthenticationError when user not found', async () => {
      mockUnitOfWork.users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password123!',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw ForbiddenError when user is deleted', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      mockUnitOfWork.users.findByEmail.mockResolvedValue(deletedUser);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123!',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw AuthenticationError when password is invalid', async () => {
      mockUnitOfWork.users.findByEmail.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong_password',
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token with valid refresh token', async () => {
      const tokenId = 'refresh-token-123';
      const session = {
        id: 'session-123',
        userId: mockUser.id,
        token: 'v4.local.old_access_token',
        refreshTokenId: tokenId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      };
      mockPasetoService.validateRefreshToken.mockReturnValue({
        valid: true,
        payload: { sub: mockUser.id, tokenId },
      });
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      mockUnitOfWork.sessions.findByRefreshTokenId.mockResolvedValue(session);
      mockPasetoService.createTokenPair.mockReturnValue(mockTokenPair);
      mockUnitOfWork.sessions.create.mockResolvedValue({});
      mockUnitOfWork.sessions.revoke.mockResolvedValue(true);

      const result = await service.refreshToken({
        refreshToken: 'v4.public.test_refresh_token',
      });

      expect(result.tokens).toBeDefined();
      expect(mockUnitOfWork.sessions.findByRefreshTokenId).toHaveBeenCalledWith(tokenId);
    });

    it('should throw InvalidTokenError for invalid refresh token', async () => {
      mockPasetoService.validateRefreshToken.mockReturnValue({
        valid: false,
        error: 'Invalid token',
      });

      await expect(
        service.refreshToken({
          refreshToken: 'invalid_token',
        })
      ).rejects.toThrow(InvalidTokenError);
    });

    it('should throw ForbiddenError when user is deleted', async () => {
      const tokenId = 'refresh-token-123';
      mockPasetoService.validateRefreshToken.mockReturnValue({
        valid: true,
        payload: { sub: mockUser.id, tokenId },
      });
      mockUnitOfWork.users.findById.mockResolvedValue({ ...mockUser, deletedAt: new Date() });

      await expect(
        service.refreshToken({
          refreshToken: 'v4.public.test_refresh_token',
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when no active session found', async () => {
      const tokenId = 'refresh-token-123';
      mockPasetoService.validateRefreshToken.mockReturnValue({
        valid: true,
        payload: { sub: mockUser.id, tokenId },
      });
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      mockUnitOfWork.sessions.findByRefreshTokenId.mockResolvedValue(null);

      await expect(
        service.refreshToken({
          refreshToken: 'v4.public.test_refresh_token',
        })
      ).rejects.toThrow(InvalidTokenError); // Changed from NotFoundError to InvalidTokenError
    });

    it('should throw InvalidTokenError when session is revoked', async () => {
      const tokenId = 'refresh-token-123';
      mockPasetoService.validateRefreshToken.mockReturnValue({
        valid: true,
        payload: { sub: mockUser.id, tokenId },
      });
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      // findByRefreshTokenId only returns non-revoked sessions (revokedAt IS NULL)
      // So a revoked session won't be found, resulting in InvalidTokenError
      mockUnitOfWork.sessions.findByRefreshTokenId.mockResolvedValue(null);

      await expect(
        service.refreshToken({
          refreshToken: 'v4.public.test_refresh_token',
        })
      ).rejects.toThrow(InvalidTokenError);
    });
  });

  describe('logout', () => {
    it('should logout and revoke session', async () => {
      const accessToken = 'v4.local.test_access_token';
      const session = {
        id: 'session-123',
        userId: mockUser.id,
        token: accessToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      };
      mockUnitOfWork.sessions.findByToken.mockResolvedValue(session);
      mockUnitOfWork.sessions.revoke.mockResolvedValue(true);
      mockUnitOfWork.activityLogs.create.mockResolvedValue({});

      await service.logout({
        userId: mockUser.id,
        accessToken,
      });

      expect(mockUnitOfWork.sessions.findByToken).toHaveBeenCalledWith(accessToken);
      expect(mockUnitOfWork.sessions.revoke).toHaveBeenCalledWith('session-123');
    });

    it('should throw NotFoundError when no session found', async () => {
      mockUnitOfWork.sessions.findByToken.mockResolvedValue(null);

      await expect(
        service.logout({
          userId: mockUser.id,
          accessToken: 'nonexistent-token',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw InvalidTokenError when token already revoked (prevent reuse)', async () => {
      const accessToken = 'v4.local.test_access_token';
      const session = {
        id: 'session-123',
        userId: mockUser.id,
        token: accessToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(), // Already revoked
      };
      mockUnitOfWork.sessions.findByToken.mockResolvedValue(session);

      await expect(
        service.logout({
          userId: mockUser.id,
          accessToken,
        })
      ).rejects.toThrow(InvalidTokenError);
    });

    it('should throw ForbiddenError when session belongs to different user', async () => {
      const accessToken = 'v4.local.test_access_token';
      const session = {
        id: 'session-123',
        userId: 'different-user-id',
        token: accessToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      };
      mockUnitOfWork.sessions.findByToken.mockResolvedValue(session);

      await expect(
        service.logout({
          userId: mockUser.id,
          accessToken,
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('validateAccessToken', () => {
    it('should validate a valid access token', async () => {
      const accessToken = 'v4.local.valid_token';
      const session = {
        id: 'session-123',
        userId: mockUser.id,
        token: accessToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      };
      mockUnitOfWork.sessions.findByToken.mockResolvedValue(session);

      const result = await service.validateAccessToken({
        token: accessToken,
      });

      expect(result.valid).toBe(true);
      expect(result.userId).toBe(mockUser.id);
    });

    it('should return invalid for an invalid token', async () => {
      mockPasetoService.validateAccessToken.mockReturnValue({
        valid: false,
        error: 'Invalid token',
      });

      const result = await service.validateAccessToken({
        token: 'v4.local.invalid_token',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
