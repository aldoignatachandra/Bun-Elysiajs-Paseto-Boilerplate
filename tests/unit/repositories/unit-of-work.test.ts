import { describe, test, expect, beforeEach, afterEach, vi } from 'bun:test';
import { UnitOfWork } from '@/repositories/unit-of-work';
import { createMockDb } from '../mocks/repository.mocks';

describe('UnitOfWork', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let unitOfWork: UnitOfWork;

  beforeEach(() => {
    mockDb = createMockDb();
    unitOfWork = new UnitOfWork(mockDb as any);
  });

  afterEach(async () => {
    // Clean up if needed
  });

  describe('repositories', () => {
    test('should provide users repository', () => {
      expect(unitOfWork.users).toBeDefined();
    });

    test('should provide sessions repository', () => {
      expect(unitOfWork.sessions).toBeDefined();
    });

    test('should provide products repository', () => {
      expect(unitOfWork.products).toBeDefined();
    });

    test('should cache repository instances', () => {
      const users1 = unitOfWork.users;
      const users2 = unitOfWork.users;
      expect(users1).toBe(users2);
    });
  });

  describe('transaction', () => {
    test('should execute callback within transaction with withTransaction', async () => {
      // Arrange
      let callbackExecuted = false;
      const resultValue = 'success';
      mockDb.transaction = vi.fn(callback =>
        callback({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => []),
              })),
            })),
          })),
          insert: vi.fn(() => []),
          update: vi.fn(() => []),
          delete: vi.fn(() => []),
        })
      );

      // Act
      const result = await unitOfWork.withTransaction(async uow => {
        callbackExecuted = true;
        expect(uow.users).toBeDefined();
        expect(uow.sessions).toBeDefined();
        expect(uow.products).toBeDefined();
        return resultValue;
      });

      // Assert
      expect(callbackExecuted).toBe(true);
      expect(result).toBe(resultValue);
    });

    test('should rollback on error in withTransaction', async () => {
      // Arrange
      mockDb.transaction = vi.fn(callback =>
        callback({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => []),
              })),
            })),
          })),
          insert: vi.fn(() => []),
          update: vi.fn(() => []),
          delete: vi.fn(() => []),
        })
      );
      const mockError = new Error('Callback failed');

      // Act & Assert
      await expect(
        unitOfWork.withTransaction(async () => {
          throw mockError;
        })
      ).rejects.toThrow('Callback failed');
    });

    test('should use existing transaction if already active in withTransaction', async () => {
      // Arrange
      let nestedCallCount = 0;
      mockDb.transaction = vi.fn(callback =>
        callback({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => []),
              })),
            })),
          })),
          insert: vi.fn(() => []),
          update: vi.fn(() => []),
          delete: vi.fn(() => []),
        })
      );

      // Start a transaction first
      await unitOfWork.withTransaction(async uow1 => {
        // Call withTransaction again - should use existing transaction
        await uow1.withTransaction(async uow2 => {
          nestedCallCount++;
          expect(uow2.users).toBeDefined();
        });
      });

      // Assert
      expect(nestedCallCount).toBe(1);
    });

    test('should provide activityLogs', () => {
      expect(unitOfWork.activityLogs).toBeDefined();
      expect(typeof unitOfWork.activityLogs.create).toBe('function');
      expect(typeof unitOfWork.activityLogs.findByUserId).toBe('function');
    });

    test('should create activity log', async () => {
      // Arrange
      const logData = {
        userId: 'user-123',
        action: 'login',
        entity: 'user',
        entityId: 'user-123',
        details: { ip: '127.0.0.1' },
      };

      // Mock insert to return a chainable with returning
      const mockReturning = vi.fn().mockResolvedValue([{ id: 'log-1' }]);
      mockDb.insert = vi.fn(() => ({ values: vi.fn(() => ({ returning: mockReturning })) }));

      // Act
      await unitOfWork.activityLogs.create(logData);

      // Assert
      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should find activity logs by user id', async () => {
      // Arrange - create a proper chainable mock for select
      // Chain: select().from().where().orderBy().limit().offset()
      const mockOffset = vi.fn().mockResolvedValue([{ id: 'log-1' }]);
      const mockLimit = vi.fn(() => ({ offset: mockOffset }));
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockDb.select = vi.fn(() => ({ from: mockFrom }));

      // Act
      const logs = await unitOfWork.activityLogs.findByUserId('user-123');

      // Assert
      expect(logs).toBeDefined();
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should count activity logs by user id', async () => {
      // Arrange - create a proper chainable mock for select with count
      const mockWhere = vi.fn().mockResolvedValue([{ count: 5 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockDb.select = vi.fn(() => ({ from: mockFrom }));

      // Act
      const count = await unitOfWork.activityLogs.countByUserId('user-123');

      // Assert
      expect(count).toBe(5);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
