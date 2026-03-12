/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/await-thenable */
import { describe, it, expect, beforeEach, jest } from 'bun:test';
import { UsersService } from '../../../src/services/users.service';
import { NotFoundError, AuthenticationError, ConflictError } from '../../../src/core/errors/app-error';
import type { UnitOfWork } from '../../../src/repositories/unit-of-work';
import type { PasswordService } from '../../../src/core/crypto/password.service';
import type { User } from '../../../src/database/schema';

describe('UsersService', () => {
  let service: UsersService;
  let mockUnitOfWork: any;
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

  beforeEach(() => {
    mockUnitOfWork = {
      users: {
        findById: jest.fn(),
        findByEmail: jest.fn(),
        findByUsername: jest.fn(),
        findAll: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        softDelete: jest.fn(),
        restore: jest.fn(),
        delete: jest.fn(),
        setActive: jest.fn(),
        count: jest.fn().mockResolvedValue(10),
        countSince: jest.fn().mockResolvedValue(2),
      },
      sessions: {
        deleteByUserId: jest.fn().mockResolvedValue(true),
      },
      activityLogs: {
        create: jest.fn().mockResolvedValue({}),
        findByUserId: jest.fn().mockResolvedValue([]),
        countByUserId: jest.fn().mockResolvedValue(0),
      },
      withTransaction: jest.fn(callback => callback(mockUnitOfWork)),
    };

    mockPasswordService = {
      hash: jest.fn().mockResolvedValue('new_hashed_password'),
      verify: jest.fn().mockResolvedValue(true),
      needsRehash: jest.fn().mockReturnValue(false),
    };

    service = new UsersService(mockUnitOfWork as unknown as UnitOfWork, mockPasswordService as unknown as PasswordService);
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile({ userId: mockUser.id });

      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
      expect(result.username).toBe(mockUser.username);
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(null);

      await expect(service.getProfile({ userId: 'nonexistent-id' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name', username: 'updateduser' };
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      mockUnitOfWork.users.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile({
        userId: mockUser.id,
        name: 'Updated Name',
        username: 'updateduser',
      });

      expect(result.name).toBe('Updated Name');
      expect(result.username).toBe('updateduser');
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(null);

      await expect(
        service.updateProfile({
          userId: 'nonexistent-id',
          name: 'Updated Name',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updatePassword', () => {
    it('should update user password', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(true);
      mockUnitOfWork.users.update.mockResolvedValue(mockUser);
      mockUnitOfWork.sessions.deleteByUserId.mockResolvedValue(true);

      const result = await service.updatePassword({
        userId: mockUser.id,
        currentPassword: 'old_password',
        newPassword: 'new_password123!',
      });

      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(null);

      await expect(
        service.updatePassword({
          userId: 'nonexistent-id',
          currentPassword: 'old_password',
          newPassword: 'new_password123!',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw AuthenticationError when current password is incorrect', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      mockPasswordService.verify.mockResolvedValue(false);

      await expect(
        service.updatePassword({
          userId: mockUser.id,
          currentPassword: 'wrong_password',
          newPassword: 'new_password123!',
        })
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('getUsers', () => {
    it('should return paginated list of users', async () => {
      mockUnitOfWork.users.findAll.mockResolvedValue([mockUser, mockUser]);

      const result = await service.getUsers({ page: 1, limit: 10 });

      expect(result.users).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should handle search parameter', async () => {
      mockUnitOfWork.users.findAll.mockResolvedValue([mockUser]);

      const result = await service.getUsers({ page: 1, limit: 10, search: 'test' });

      expect(result.users).toHaveLength(1);
    });

    it('should handle pagination correctly', async () => {
      const users = Array(15).fill(mockUser);
      mockUnitOfWork.users.findAll.mockResolvedValue(users);

      const result = await service.getUsers({ page: 2, limit: 10 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPreviousPage).toBe(true);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      mockUnitOfWork.users.findByEmail.mockResolvedValue(null);
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUnitOfWork.users.create.mockResolvedValue(mockUser);

      const result = await service.createUser({
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123!',
        role: 'user',
      });

      expect(result.email).toBe(mockUser.email);
    });

    it('should throw ConflictError when email already exists', async () => {
      mockUnitOfWork.users.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.createUser({
          email: 'test@example.com',
          username: 'newuser',
          password: 'password123!',
          role: 'user',
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('updateUser', () => {
    it('should update user by admin', async () => {
      const updatedUser = { ...mockUser, role: 'ADMIN' };
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      mockUnitOfWork.users.findByEmail.mockResolvedValue(null);
      mockUnitOfWork.users.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser({
        id: mockUser.id,
        role: 'ADMIN',
      });

      expect(result.role).toBe('ADMIN');
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(null);

      await expect(
        service.updateUser({
          id: 'nonexistent-id',
          role: 'ADMIN',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when email already in use', async () => {
      const otherUser = { ...mockUser, id: 'different-id' };
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      mockUnitOfWork.users.findByEmail.mockResolvedValue(otherUser);

      await expect(
        service.updateUser({
          id: mockUser.id,
          email: otherUser.email,
        })
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('deleteUser', () => {
    it('should soft delete a user', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      mockUnitOfWork.users.softDelete.mockResolvedValue(true);

      const result = await service.deleteUser(mockUser.id);

      expect(result.message).toBe('User deleted successfully');
    });

    it('should permanently delete a user with force flag', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(mockUser);
      mockUnitOfWork.users.delete.mockResolvedValue(true);

      const result = await service.deleteUser(mockUser.id, true);

      expect(result.message).toBe('User deleted successfully');
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUnitOfWork.users.findById.mockResolvedValue(null);

      await expect(service.deleteUser('nonexistent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      mockUnitOfWork.users.count.mockResolvedValue(100);
      mockUnitOfWork.users.countSince.mockResolvedValue(5);

      const result = await service.getUserStats();

      expect(result.totalUsers).toBe(100);
      expect(result.activeUsers).toBe(100);
    });
  });

  describe('activateUser', () => {
    it('should activate a user', async () => {
      mockUnitOfWork.users.setActive.mockResolvedValue(true);

      const result = await service.activateUser(mockUser.id);

      expect(result.message).toBe('User activated successfully');
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUnitOfWork.users.setActive.mockResolvedValue(false);

      await expect(service.activateUser('nonexistent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate a user', async () => {
      mockUnitOfWork.users.setActive.mockResolvedValue(true);

      const result = await service.deactivateUser(mockUser.id);

      expect(result.message).toBe('User deactivated successfully');
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUnitOfWork.users.setActive.mockResolvedValue(false);

      await expect(service.deactivateUser('nonexistent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('restoreUser', () => {
    it('should restore a user', async () => {
      mockUnitOfWork.users.restore.mockResolvedValue(true);

      const result = await service.restoreUser(mockUser.id);

      expect(result.message).toBe('User restored successfully');
    });

    it('should throw NotFoundError when user not found', async () => {
      mockUnitOfWork.users.restore.mockResolvedValue(false);

      await expect(service.restoreUser('nonexistent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getActivityLogs', () => {
    it('should return activity logs', async () => {
      const result = await service.getActivityLogs({ page: 1, limit: 10 });

      expect(result.logs).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});
