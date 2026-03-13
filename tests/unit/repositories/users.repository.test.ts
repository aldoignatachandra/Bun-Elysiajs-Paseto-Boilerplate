import { describe, test, expect, beforeEach } from 'bun:test';
import { UserRepository } from '@/repositories/users.repository';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('UserRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: UserRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new UserRepository(mockDb as any);
  });

  describe('findByEmail', () => {
    test('should return user when exists', async () => {
      // Arrange
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockResolvedValue([mockUser]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
    });

    test('should return null when not exists', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
    });

    test('should return null on database error', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockRejectedValue(new Error('Database connection failed'));
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findByEmail('test@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateLastLogin', () => {
    test('should update last login timestamp', async () => {
      // Arrange
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        passwordHash: 'hash',
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([updatedUser]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.update('1', { lastLoginAt: new Date() });

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    test('should return null when user not found', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.update('999', { lastLoginAt: new Date() });

      // Assert
      expect(result).toBeNull();
    });

    test('should throw error on database connection failure', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Update failed'));
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      expect(repository.update('1', { lastLoginAt: new Date() })).rejects.toThrow('Update failed');
    });
  });

  describe('updatePassword', () => {
    test('should update password hash', async () => {
      // Arrange
      const updatedUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        passwordHash: 'newHash',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([updatedUser]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.update('1', { passwordHash: 'newHash' });

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    test('should return null when user not found', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.update('999', { passwordHash: 'newHash' });

      // Assert
      expect(result).toBeNull();
    });

    test('should throw error on database connection failure', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Update failed'));
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      expect(repository.update('1', { passwordHash: 'newHash' })).rejects.toThrow('Update failed');
    });
  });

  describe('softDelete', () => {
    test('should soft delete user successfully', async () => {
      // Arrange
      const deletedUser = {
        id: '1',
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([deletedUser]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.softDelete('1');

      // Assert
      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    test('should return false when user not found', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.softDelete('999');

      // Assert
      expect(result).toBe(false);
    });

    test('should return false on database error', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Soft delete failed'));
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.softDelete('1');

      // Assert
      expect(result).toBe(false);
    });

    test('should not soft delete already deleted user', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.softDelete('1');

      // Assert
      expect(result).toBe(false);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
