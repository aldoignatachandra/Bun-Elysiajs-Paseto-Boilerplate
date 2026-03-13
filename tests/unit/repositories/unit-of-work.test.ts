import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { UnitOfWork } from '@/repositories/unit-of-work';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('UnitOfWork', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let unitOfWork: UnitOfWork;

  beforeEach(() => {
    mockDb = createMockDb();
    unitOfWork = new UnitOfWork(mockDb as any);
  });

  afterEach(async () => {
    if (unitOfWork.isTransactionActive) {
      await unitOfWork.rollback();
    }
  });

  describe('repositories', () => {
    test('should provide users repository', () => {
      // Arrange
      const usersRepository = unitOfWork.users;

      // Act & Assert
      expect(usersRepository).toBeDefined();
      expect(typeof usersRepository.findAll).toBe('function');
      expect(typeof usersRepository.findById).toBe('function');
      expect(typeof usersRepository.findByEmail).toBe('function');
      expect(typeof usersRepository.create).toBe('function');
      expect(typeof usersRepository.update).toBe('function');
      expect(typeof usersRepository.delete).toBe('function');
    });

    test('should provide sessions repository', () => {
      // Arrange
      const sessionsRepository = unitOfWork.sessions;

      // Act & Assert
      expect(sessionsRepository).toBeDefined();
      expect(typeof sessionsRepository.findById).toBe('function');
      expect(typeof sessionsRepository.findByToken).toBe('function');
      expect(typeof sessionsRepository.findByUserId).toBe('function');
      expect(typeof sessionsRepository.create).toBe('function');
      expect(typeof sessionsRepository.revoke).toBe('function');
      expect(typeof sessionsRepository.deleteByUserId).toBe('function');
    });

    test('should provide products repository', () => {
      // Arrange
      const productsRepository = unitOfWork.products;

      // Act & Assert
      expect(productsRepository).toBeDefined();
      expect(typeof productsRepository.findAll).toBe('function');
      expect(typeof productsRepository.findById).toBe('function');
      expect(typeof productsRepository.create).toBe('function');
      expect(typeof productsRepository.update).toBe('function');
      expect(typeof productsRepository.delete).toBe('function');
    });

    test('should provide activity logs repository', () => {
      // Arrange
      const activityLogs = unitOfWork.activityLogs;

      // Act & Assert
      expect(activityLogs).toBeDefined();
      expect(typeof activityLogs.create).toBe('function');
      expect(typeof activityLogs.findByUserId).toBe('function');
      expect(typeof activityLogs.countByUserId).toBe('function');
    });

    test('should return same repository instance on multiple accesses', () => {
      // Arrange & Act
      const users1 = unitOfWork.users;
      const users2 = unitOfWork.users;
      const sessions1 = unitOfWork.sessions;
      const sessions2 = unitOfWork.sessions;
      const products1 = unitOfWork.products;
      const products2 = unitOfWork.products;

      // Assert
      expect(users1).toBe(users2);
      expect(sessions1).toBe(sessions2);
      expect(products1).toBe(products2);
    });
  });

  describe('transaction', () => {
    test('should begin transaction', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));

      // Act
      await unitOfWork.beginTransaction();

      // Assert
      expect(unitOfWork.isTransactionActive).toBe(true);
    });

    test('should throw error when beginning transaction while one is active', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      await unitOfWork.beginTransaction();

      // Act & Assert
      await expect(unitOfWork.beginTransaction()).rejects.toThrow('Transaction already started');
    });

    test('should commit transaction', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      await unitOfWork.beginTransaction();

      // Act
      await unitOfWork.commit();

      // Assert
      expect(unitOfWork.isTransactionActive).toBe(false);
    });

    test('should throw error when committing with no active transaction', async () => {
      // Act & Assert
      await expect(unitOfWork.commit()).rejects.toThrow('No active transaction');
    });

    test('should rollback transaction', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      await unitOfWork.beginTransaction();

      // Act
      await unitOfWork.rollback();

      // Assert
      expect(unitOfWork.isTransactionActive).toBe(false);
    });

    test('should throw error when rolling back with no active transaction', async () => {
      // Act & Assert
      await expect(unitOfWork.rollback()).rejects.toThrow('No active transaction');
    });

    test('should reset repositories after transaction commit', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      await unitOfWork.beginTransaction();
      const usersBefore = unitOfWork.users;

      // Act
      await unitOfWork.commit();
      const usersAfter = unitOfWork.users;

      // Assert
      expect(usersBefore).not.toBe(usersAfter);
      expect(unitOfWork.isTransactionActive).toBe(false);
    });

    test('should reset repositories after transaction rollback', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      await unitOfWork.beginTransaction();
      const usersBefore = unitOfWork.users;

      // Act
      await unitOfWork.rollback();
      const usersAfter = unitOfWork.users;

      // Assert
      expect(usersBefore).not.toBe(usersAfter);
      expect(unitOfWork.isTransactionActive).toBe(false);
    });

    test('should handle commit error and rollback', async () => {
      // Arrange
      const mockError = new Error('Commit failed');
      const mockTransaction = {
        commit: async () => {
          throw mockError;
        },
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      await unitOfWork.beginTransaction();

      // Act & Assert
      await expect(unitOfWork.commit()).rejects.toThrow('Commit failed');
      expect(unitOfWork.isTransactionActive).toBe(false);
    });

    test('should execute callback within transaction with withTransaction', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      let callbackExecuted = false;
      const resultValue = 'success';

      // Act
      const result = await unitOfWork.withTransaction(async uow => {
        callbackExecuted = true;
        expect(uow.isTransactionActive).toBe(true);
        return resultValue;
      });

      // Assert
      expect(callbackExecuted).toBe(true);
      expect(result).toBe(resultValue);
      expect(unitOfWork.isTransactionActive).toBe(false);
    });

    test('should rollback on error in withTransaction', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      const mockError = new Error('Callback failed');

      // Act & Assert
      await expect(
        unitOfWork.withTransaction(async () => {
          throw mockError;
        })
      ).rejects.toThrow('Callback failed');
      expect(unitOfWork.isTransactionActive).toBe(false);
    });

    test('should use existing transaction if already active in withTransaction', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      await unitOfWork.beginTransaction();
      let nestedCallCount = 0;

      // Act
      await unitOfWork.withTransaction(async uow => {
        nestedCallCount++;
        expect(uow.isTransactionActive).toBe(true);
      });

      // Assert
      expect(nestedCallCount).toBe(1);
      expect(unitOfWork.isTransactionActive).toBe(true);
      await unitOfWork.rollback();
    });

    test('should rollback on async dispose', async () => {
      // Arrange
      const mockTransaction = {
        commit: async () => {},
        rollback: async () => {},
      };
      mockDb.transaction = fn => Promise.resolve(fn(mockTransaction as any));
      await unitOfWork.beginTransaction();

      // Act
      await unitOfWork[Symbol.asyncDispose]();

      // Assert
      expect(unitOfWork.isTransactionActive).toBe(false);
    });

    test('should not error on async dispose without transaction', async () => {
      // Arrange & Act & Assert
      await unitOfWork[Symbol.asyncDispose]();
      expect(unitOfWork.isTransactionActive).toBe(false);
    });
  });

  describe('activityLogs', () => {
    test('should create activity log', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.values.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue([]);
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      const logData = {
        userId: 'user-123',
        action: 'login',
        entity: 'user',
        entityId: 'user-123',
        details: { ip: '127.0.0.1' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      // Act
      await unitOfWork.activityLogs.create(logData);

      // Assert
      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should find activity logs by user id', async () => {
      // Arrange
      const mockLogs = [
        { id: '1', userId: 'user-123', action: 'login' },
        { id: '2', userId: 'user-123', action: 'logout' },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.orderBy.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.limit.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.offset.mockReturnValue(mockQueryBuilder);
      mockQueryBuilder.returning.mockResolvedValue(mockLogs);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      // Act
      await unitOfWork.activityLogs.findByUserId('user-123', { limit: 10, offset: 0 });

      // Assert
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should count activity logs by user id', async () => {
      // Arrange
      const mockCountQueryBuilder = createMockQueryBuilder();
      mockCountQueryBuilder.from.mockReturnValue(mockCountQueryBuilder);
      mockCountQueryBuilder.where.mockReturnValue(mockCountQueryBuilder);
      mockDb.select.mockReturnValue(mockCountQueryBuilder);

      const selectCall = mockDb.select as any;
      selectCall.mockImplementation(() => {
        const mockQuery = createMockQueryBuilder();
        mockQuery.from.mockReturnValue(mockQuery);
        mockQuery.where.mockReturnValue(Promise.resolve([{ count: 5 }]));
        return mockQuery;
      });

      // Act
      const result = await unitOfWork.activityLogs.countByUserId('user-123');

      // Assert
      expect(result).toBe(5);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
