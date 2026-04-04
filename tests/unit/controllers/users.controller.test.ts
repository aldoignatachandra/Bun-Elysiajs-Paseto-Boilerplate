/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { UsersController } from '../../../src/controllers/users.controller';
import type { UsersService } from '../../../src/services/users.service';
import { UnauthorizedError, NotFoundError } from '../../../src/core/errors/app-error';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: any;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser',
    name: 'Test User',
    role: 'USER',
    deletedAt: null,
    createdAt: new Date(),
    lastLoginAt: null,
    updatedAt: new Date(),
  };

  const mockAuthContext = {
    user: mockUser,
    tokenId: 'token-123',
  } as any;

  beforeEach(() => {
    mockUsersService = {
      getProfile: jest.fn(),
      updateProfile: jest.fn(),
      updatePassword: jest.fn(),
      getUsers: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
      restoreUser: jest.fn(),
      getActivityLogs: jest.fn(),
      getUserStats: jest.fn(),
    };

    controller = new UsersController(mockUsersService as unknown as UsersService);
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      mockUsersService.getProfile.mockResolvedValue(mockUser);

      const result = await controller.getMe(mockAuthContext);

      // @ts-expect-error - Test type comparison
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.getMe({ user: null, tokenId: null } as any as any)).rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUsersService.getProfile.mockRejectedValue(new NotFoundError('User not found'));

      await expect(controller.getMe(mockAuthContext)).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateMe', () => {
    it('should update current user profile', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockUsersService.updateProfile.mockResolvedValue(updatedUser);

      const result = await controller.updateMe({ name: 'Updated' }, mockAuthContext);

      expect(result.name).toBe('Updated Name');
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.updateMe({}, { user: null, tokenId: null } as any)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      mockUsersService.updatePassword.mockResolvedValue({ message: 'Password changed successfully' });

      const result = await controller.changePassword({ currentPassword: 'old_password', newPassword: 'new_password123!' }, mockAuthContext);

      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.changePassword({ currentPassword: 'old', newPassword: 'new' }, { user: null, tokenId: null } as any)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      mockUsersService.getUsers.mockResolvedValue({ users: [mockUser], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } });

      const result = await controller.getUsers({ page: 1, limit: 10 }, mockAuthContext);

      expect(result.users).toHaveLength(1);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.getUsers({ page: 1, limit: 10 }, { user: null, tokenId: null } as any)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      mockUsersService.getProfile.mockResolvedValue(mockUser);

      const result = await controller.getUserById(mockUser.id, mockAuthContext);

      // @ts-expect-error - Test type comparison
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.getUserById('id', { user: null, tokenId: null } as any)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      mockUsersService.createUser.mockResolvedValue(mockUser);

      const result = await controller.createUser({ email: 'new@example.com', username: 'newuser', password: 'password123!' }, mockAuthContext);

      // @ts-expect-error - Test type comparison
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(
        controller.createUser({ email: 'new@example.com', username: 'new', password: 'pass' }, { user: null, tokenId: null } as any)
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      mockUsersService.updateUser.mockResolvedValue({ ...mockUser, name: 'Updated' });

      const result = await controller.updateUser(mockUser.id, { name: 'Updated' }, mockAuthContext);

      expect(result.name).toBe('Updated');
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.updateUser('id', {}, { user: null, tokenId: null } as any)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      mockUsersService.deleteUser.mockResolvedValue({ message: 'User deleted successfully' });

      const result = await controller.deleteUser(mockUser.id, false, mockAuthContext);

      expect(result.message).toBe('User deleted successfully');
    });

    it('should throw UnauthorizedError when user is null', async () => {
      await expect(controller.deleteUser('id', false, { user: null, tokenId: null } as any)).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('activateUser', () => {
    it('should activate user', async () => {
      mockUsersService.activateUser.mockResolvedValue({ message: 'User activated successfully' });

      const result = await controller.activateUser(mockUser.id, mockAuthContext);

      expect(result.message).toBe('User activated successfully');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      mockUsersService.deactivateUser.mockResolvedValue({ message: 'User deactivated successfully' });

      const result = await controller.deactivateUser(mockUser.id, mockAuthContext);

      expect(result.message).toBe('User deactivated successfully');
    });
  });

  describe('restoreUser', () => {
    it('should restore user', async () => {
      mockUsersService.restoreUser.mockResolvedValue({ message: 'User restored successfully' });

      const result = await controller.restoreUser(mockUser.id, mockAuthContext);

      expect(result.message).toBe('User restored successfully');
    });
  });

  describe('getActivityLogs', () => {
    it('should return activity logs', async () => {
      mockUsersService.getActivityLogs.mockResolvedValue({ logs: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } });

      const result = await controller.getActivityLogs({ page: 1, limit: 10 }, mockAuthContext);

      expect(result.logs).toEqual([]);
    });
  });

  describe('getUserStats', () => {
    it('should return user stats', async () => {
      mockUsersService.getUserStats.mockResolvedValue({ totalUsers: 100, activeUsers: 90 });

      const result = await controller.getUserStats(mockAuthContext);

      expect(result.totalUsers).toBe(100);
    });
  });
});
