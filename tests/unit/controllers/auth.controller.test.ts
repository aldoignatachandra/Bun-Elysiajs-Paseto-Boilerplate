/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { AuthController } from '../../../src/controllers/auth.controller';
import type { AuthService } from '../../../src/services/auth.service';
import type { UsersService } from '../../../src/services/users.service';
import { ConflictError, AuthenticationError, UnauthorizedError, InternalServerError } from '../../../src/core/errors/app-error';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockUsersService: any;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    role: 'USER',
    createdAt: new Date(),
    lastLoginAt: null,
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'v4.local.test_access_token',
    refreshToken: 'v4.public.test_refresh_token',
    expiresIn: 900,
  };

  beforeEach(() => {
    mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      validateAccessToken: jest.fn(),
    };

    mockUsersService = {
      getProfile: jest.fn(),
    };

    controller = new AuthController(mockAuthService as unknown as AuthService, mockUsersService as unknown as UsersService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      mockAuthService.register.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const result = await controller.register({
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123!',
        name: 'John Doe',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should throw ConflictError when email already exists', async () => {
      mockAuthService.register.mockRejectedValue(new ConflictError('Email already exists'));

      await expect(
        controller.register({
          email: 'existing@example.com',
          username: 'newuser',
          password: 'password123!',
          name: 'John Doe',
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw InternalServerError on other errors', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.register({
          email: 'new@example.com',
          username: 'newuser',
          password: 'password123!',
          name: 'John Doe',
        })
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('login', () => {
    it('should login a user with valid credentials', async () => {
      mockAuthService.login.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const result = await controller.login({
        email: 'test@example.com',
        password: 'password123!',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should throw AuthenticationError on invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new AuthenticationError('Invalid credentials'));

      await expect(
        controller.login({
          email: 'test@example.com',
          password: 'wrong_password',
        })
      ).rejects.toThrow(AuthenticationError);
    });

    it('should throw InternalServerError on other errors', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.login({
          email: 'test@example.com',
          password: 'password123!',
        })
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token with valid refresh token', async () => {
      mockAuthService.refreshToken.mockResolvedValue({ tokens: mockTokens });

      const result = await controller.refreshToken({
        refreshToken: 'v4.public.test_refresh_token',
      });

      expect(result.tokens).toEqual(mockTokens);
    });

    it('should throw UnauthorizedError on invalid token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(new UnauthorizedError('Invalid token'));

      await expect(
        controller.refreshToken({
          refreshToken: 'invalid_token',
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout({
        user: mockUser,
        tokenId: 'token-123',
        accessToken: 'v4.local.test_access_token',
      });

      expect(result.message).toBe('Logged out successfully');
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(
        controller.logout({
          user: null,
          tokenId: null,
          accessToken: null,
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when accessToken is null', async () => {
      await expect(
        controller.logout({
          user: mockUser,
          tokenId: 'token-123',
          accessToken: null,
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('should propagate error from service', async () => {
      const error = new Error('Session not found');
      mockAuthService.logout.mockRejectedValue(error);

      await expect(
        controller.logout({
          user: mockUser,
          tokenId: 'token-123',
          accessToken: 'v4.local.test_access_token',
        })
      ).rejects.toThrow(error);
    });
  });

  describe('me', () => {
    it('should return current user', async () => {
      mockUsersService.getProfile.mockResolvedValue({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        name: mockUser.name,
        role: mockUser.role,
        createdAt: mockUser.createdAt,
        lastLoginAt: mockUser.lastLoginAt,
        updatedAt: mockUser.updatedAt,
        deletedAt: null,
      });

      const result = await controller.me({
        user: mockUser,
        tokenId: 'token-123',
        accessToken: 'v4.local.test_access_token',
      });

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.name).toBe(mockUser.name);
      expect(mockUsersService.getProfile).toHaveBeenCalledWith({ userId: mockUser.id });
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(
        controller.me({
          user: null,
          tokenId: null,
          accessToken: null,
        })
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
