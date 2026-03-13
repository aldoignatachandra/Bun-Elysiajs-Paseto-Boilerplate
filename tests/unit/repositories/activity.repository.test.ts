import { describe, test, expect, beforeEach } from 'bun:test';
import { ActivityLogRepository } from '@/repositories/activity.repository';

describe('ActivityLogRepository', () => {
  let repository: ActivityLogRepository;
  let mockDb: any;

  function createMockQuery(result: any) {
    const query = {
      from: () => query,
      where: () => query,
      orderBy: () => query,
      limit: () => query,
      offset: () => query,
      then: (resolve: (value: any) => void) => resolve(result),
      catch: (reject: (error: any) => void) => {
        if (result instanceof Error) {
          reject(result);
        }
      },
    };
    return query;
  }

  beforeEach(() => {
    mockDb = {
      select: () => createMockQuery([]),
      insert: () => ({}),
      delete: () => ({}),
    };
    repository = new ActivityLogRepository(mockDb);
  });

  describe('create', () => {
    test('should create activity log and return it', async () => {
      // Arrange
      const newActivityLog = {
        userId: 'user-123',
        action: 'login',
        entity: 'auth',
        entityId: 'session-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };
      const createdLog = {
        id: 'log-789',
        ...newActivityLog,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      const mockInsert = {
        values: () => mockInsert,
        returning: async () => [createdLog],
      };
      mockDb.insert = () => mockInsert;

      // Act
      const result = await repository.create(newActivityLog as any);

      // Assert
      expect(result).toEqual(createdLog);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const newActivityLog = {
        userId: 'user-123',
        action: 'login',
      };

      const mockInsert = {
        values: () => mockInsert,
        returning: async () => {
          throw new Error('Database connection failed');
        },
      };
      mockDb.insert = () => mockInsert;

      // Act & Assert
      expect(repository.create(newActivityLog as any)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByUserId', () => {
    test('should return activities for user', async () => {
      // Arrange
      const userId = 'user-123';
      const mockActivities = [
        {
          id: 'log-1',
          userId,
          action: 'login',
          entity: 'auth',
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'log-2',
          userId,
          action: 'logout',
          entity: 'auth',
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockDb.select = () => createMockQuery(mockActivities);

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result).toEqual(mockActivities);
    });

    test('should apply limit when provided', async () => {
      // Arrange
      const userId = 'user-123';
      const limit = 5;
      const mockActivities = [
        {
          id: 'log-1',
          userId,
          action: 'login',
          entity: 'auth',
          createdAt: new Date(),
        },
      ];

      mockDb.select = () => createMockQuery(mockActivities);

      // Act
      const result = await repository.findByUserId(userId, { limit });

      // Assert
      expect(result).toEqual(mockActivities);
    });

    test('should return empty array when no activities found', async () => {
      // Arrange
      const userId = 'non-existent-user';

      mockDb.select = () => createMockQuery([]);

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result).toEqual([]);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const userId = 'user-123';

      const errorQuery = {
        from: () => errorQuery,
        where: () => errorQuery,
        orderBy: () => errorQuery,
        limit: () => errorQuery,
        then: () => {
          throw new Error('Database error');
        },
      };
      mockDb.select = () => errorQuery;

      // Act
      const result = await repository.findByUserId(userId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findByAction', () => {
    test('should return activities for specific action', async () => {
      // Arrange
      const action = 'login';
      const mockActivities = [
        {
          id: 'log-1',
          userId: 'user-1',
          action,
          entity: 'auth',
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          userId: 'user-2',
          action,
          entity: 'auth',
          createdAt: new Date(),
        },
      ];

      mockDb.select = () => createMockQuery(mockActivities);

      // Act
      const result = await repository.findAll({ action });

      // Assert
      expect(result).toEqual(mockActivities);
    });

    test('should return empty array when no activities found for action', async () => {
      // Arrange
      const action = 'non-existent-action';

      mockDb.select = () => createMockQuery([]);

      // Act
      const result = await repository.findAll({ action });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('deleteOlderThan', () => {
    test('should delete logs older than specified date', async () => {
      // Arrange
      const cutoffDate = new Date('2024-01-01');
      const deletedLogs = [
        {
          id: 'log-old-1',
          userId: 'user-1',
          action: 'login',
          createdAt: new Date('2023-12-31'),
        },
        {
          id: 'log-old-2',
          userId: 'user-2',
          action: 'logout',
          createdAt: new Date('2023-12-30'),
        },
      ];

      const mockDelete = {
        where: () => mockDelete,
        returning: async () => deletedLogs,
      };
      mockDb.delete = () => mockDelete;

      // Act
      const result = await repository.deleteOlderThan(cutoffDate);

      // Assert
      expect(result).toBe(2);
    });

    test('should return 0 when no logs to delete', async () => {
      // Arrange
      const cutoffDate = new Date('2024-01-01');

      const mockDelete = {
        where: () => mockDelete,
        returning: async () => [],
      };
      mockDb.delete = () => mockDelete;

      // Act
      const result = await repository.deleteOlderThan(cutoffDate);

      // Assert
      expect(result).toBe(0);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const cutoffDate = new Date('2024-01-01');

      const mockDelete = {
        where: () => mockDelete,
        returning: async () => {
          throw new Error('Delete failed');
        },
      };
      mockDb.delete = () => mockDelete;

      // Act
      const result = await repository.deleteOlderThan(cutoffDate);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('findById', () => {
    test('should return activity log when found', async () => {
      // Arrange
      const logId = 'log-123';
      const mockLog = {
        id: logId,
        userId: 'user-123',
        action: 'login',
        entity: 'auth',
        createdAt: new Date(),
      };

      mockDb.select = () => createMockQuery([mockLog]);

      // Act
      const result = await repository.findById(logId);

      // Assert
      expect(result).toEqual(mockLog);
    });

    test('should return null when not found', async () => {
      // Arrange
      const logId = 'non-existent-log';

      mockDb.select = () => createMockQuery([]);

      // Act
      const result = await repository.findById(logId);

      // Assert
      expect(result).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const logId = 'log-123';

      const errorQuery = {
        from: () => errorQuery,
        where: () => errorQuery,
        limit: () => errorQuery,
        then: () => {
          throw new Error('Database error');
        },
      };
      mockDb.select = () => errorQuery;

      // Act
      const result = await repository.findById(logId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    test('should return all activity logs when no options provided', async () => {
      // Arrange
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'login',
          entity: 'auth',
          createdAt: new Date(),
        },
        {
          id: 'log-2',
          userId: 'user-2',
          action: 'logout',
          entity: 'auth',
          createdAt: new Date(),
        },
      ];

      mockDb.select = () => createMockQuery(mockLogs);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual(mockLogs);
    });

    test('should filter by userId when provided', async () => {
      // Arrange
      const userId = 'user-123';
      const mockLogs = [
        {
          id: 'log-1',
          userId,
          action: 'login',
          entity: 'auth',
          createdAt: new Date(),
        },
      ];

      mockDb.select = () => createMockQuery(mockLogs);

      // Act
      const result = await repository.findAll({ userId });

      // Assert
      expect(result).toEqual(mockLogs);
    });

    test('should apply limit and offset when provided', async () => {
      // Arrange
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          action: 'login',
          createdAt: new Date(),
        },
      ];

      mockDb.select = () => createMockQuery(mockLogs);

      // Act
      const result = await repository.findAll({ limit: 10, offset: 5 });

      // Assert
      expect(result).toEqual(mockLogs);
    });

    test('should handle database errors gracefully', async () => {
      // Arrange
      const errorQuery = {
        from: () => errorQuery,
        where: () => errorQuery,
        orderBy: () => errorQuery,
        limit: () => errorQuery,
        offset: () => errorQuery,
        then: () => {
          throw new Error('Database error');
        },
      };
      mockDb.select = () => errorQuery;

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
