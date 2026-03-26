/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach } from 'bun:test';
import { SessionRepository } from '@/repositories/sessions.repository';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('SessionRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: SessionRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new SessionRepository(mockDb as any);
  });

  describe('create', () => {
    test('should create new session and return it', async () => {
      // Arrange
      const newSession = {
        userId: 'user-123',
        token: 'valid-token-abc',
        expiresAt: new Date('2025-01-01T00:00:00Z'),
      };
      const createdSession = {
        id: 'session-123',
        ...newSession,
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.values.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([createdSession]);
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.create(newSession as any);

      // Assert
      // @ts-expect-error - Test assertion type mismatch
      expect(result).toEqual(createdSession);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.values).toHaveBeenCalledWith(newSession);
      expect(mockQueryBuilder.returning).toHaveBeenCalled();
    });

    test('should handle insert errors by throwing', async () => {
      // Arrange
      const newSession = {
        userId: 'user-123',
        token: 'valid-token-abc',
        expiresAt: new Date('2025-01-01T00:00:00Z'),
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.values.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Insert failed'));
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      expect(repository.create(newSession as any)).rejects.toThrow('Insert failed');
    });
  });

  describe('findByToken', () => {
    test('should return session when token exists', async () => {
      // Arrange
      const token = 'valid-token-abc';
      const session = {
        id: 'session-123',
        userId: 'user-123',
        token,
        expiresAt: new Date('2025-01-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockResolvedValue([session]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findByToken(token);

      // Assert
      // @ts-expect-error - Test assertion type mismatch
      expect(result).toEqual(session);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
    });

    test('should return null when token does not exist', async () => {
      // Arrange
      const token = 'invalid-token';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findByToken(token);

      // Assert
      expect(result).toBeNull();
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const token = 'valid-token-abc';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockRejectedValue(new Error('Database connection failed'));
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findByToken(token);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('deleteByUserId', () => {
    test('should delete all sessions for user and return true when sessions exist', async () => {
      // Arrange
      const userId = 'user-123';
      const deletedSessions = [
        { id: 'session-1', userId },
        { id: 'session-2', userId },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue(deletedSessions);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.deleteByUserId(userId);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    test('should return false when no sessions exist for user', async () => {
      // Arrange
      const userId = 'user-999';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.deleteByUserId(userId);

      // Assert
      expect(result).toBe(false);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Delete failed'));
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.deleteByUserId(userId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('deleteExpired', () => {
    test('should delete expired sessions and return count', async () => {
      // Arrange
      const deletedSessions = [{ id: 'session-1' }, { id: 'session-2' }, { id: 'session-3' }];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue(deletedSessions);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.deleteExpired();

      // Assert
      expect(result).toBe(3);
      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    test('should return 0 when no expired sessions exist', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.deleteExpired();

      // Assert
      expect(result).toBe(0);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Database connection failed'));
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.deleteExpired();

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('findById', () => {
    test('should return session when found', async () => {
      // Arrange
      const sessionId = 'session-123';
      const session = {
        id: sessionId,
        userId: 'user-123',
        token: 'valid-token-abc',
        expiresAt: new Date('2025-01-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockResolvedValue([session]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findById(sessionId);

      // Assert
      // @ts-expect-error - Test assertion type mismatch
      expect(result).toEqual(session);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(1);
    });

    test('should return null when not found', async () => {
      // Arrange
      const sessionId = 'session-999';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findById(sessionId);

      // Assert
      expect(result).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockRejectedValue(new Error('Database connection failed'));
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findById(sessionId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    test('should return all sessions for user', async () => {
      // Arrange
      const userId = 'user-123';
      const sessions = [
        {
          id: 'session-1',
          userId,
          token: 'token-1',
          expiresAt: new Date('2025-01-01T00:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          revokedAt: null,
        },
        {
          id: 'session-2',
          userId,
          token: 'token-2',
          expiresAt: new Date('2025-01-01T00:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          revokedAt: null,
        },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockResolvedValue(sessions);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      // @ts-expect-error - Test assertion type mismatch
      expect(result).toEqual(sessions);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockQueryBuilder.from).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    test('should return empty array when no sessions found for user', async () => {
      // Arrange
      const userId = 'user-999';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockResolvedValue([]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result).toEqual([]);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockRejectedValue(new Error('Database connection failed'));
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    test('should update session and return updated session', async () => {
      // Arrange
      const sessionId = 'session-123';
      const updateData = { token: 'new-token' };
      const updatedSession = {
        id: sessionId,
        userId: 'user-123',
        token: 'new-token',
        expiresAt: new Date('2025-01-01T00:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        revokedAt: null,
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([updatedSession]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.update(sessionId, updateData);

      // Assert
      // @ts-expect-error - Test assertion type mismatch
      expect(result).toEqual(updatedSession);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalled();
    });

    test('should return null when session not found', async () => {
      // Arrange
      const sessionId = 'session-999';
      const updateData = { token: 'new-token' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.update(sessionId, updateData);

      // Assert
      expect(result).toBeNull();
    });

    test('should handle update errors by throwing', async () => {
      // Arrange
      const sessionId = 'session-123';
      const updateData = { token: 'new-token' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Update failed'));
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act & Assert
      expect(repository.update(sessionId, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    test('should delete session and return true when successful', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([{ id: sessionId }]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.delete(sessionId);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    test('should return false when session not found', async () => {
      // Arrange
      const sessionId = 'session-999';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.delete(sessionId);

      // Assert
      expect(result).toBe(false);
    });

    test('should handle delete errors gracefully', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Delete failed'));
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.delete(sessionId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('revoke', () => {
    test('should revoke session and return true when successful', async () => {
      // Arrange
      const sessionId = 'session-123';
      const revokedSession = {
        id: sessionId,
        revokedAt: new Date(),
        updatedAt: new Date(),
      };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([revokedSession]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.revoke(sessionId);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should return false when session not found', async () => {
      // Arrange
      const sessionId = 'session-999';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.revoke(sessionId);

      // Assert
      expect(result).toBe(false);
    });

    test('should handle revoke errors gracefully', async () => {
      // Arrange
      const sessionId = 'session-123';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Revoke failed'));
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.revoke(sessionId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('revokeAllForUser', () => {
    test('should revoke all sessions for user and return true when sessions exist', async () => {
      // Arrange
      const userId = 'user-123';
      const revokedSessions = [
        { id: 'session-1', userId },
        { id: 'session-2', userId },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue(revokedSessions);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.revokeAllForUser(userId);

      // Assert
      expect(result).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should return false when no active sessions exist for user', async () => {
      // Arrange
      const userId = 'user-999';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.revokeAllForUser(userId);

      // Assert
      expect(result).toBe(false);
    });

    test('should handle revoke all errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockRejectedValue(new Error('Revoke all failed'));
      mockDb.update.mockReturnValue(mockQueryBuilder);

      // Act
      const result = await repository.revokeAllForUser(userId);

      // Assert
      expect(result).toBe(false);
    });
  });
});
