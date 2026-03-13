import { describe, test, expect, beforeEach } from 'bun:test';
import { BaseRepository } from '@/repositories/base.repository';
import { createMockDb, createMockQueryBuilder } from '../mocks/repository.mocks';

describe('BaseRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: TestRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new TestRepository(mockDb as any);
  });

  describe('findAll', () => {
    test('should return array of records', async () => {
      const mockData = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockData);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findAll('test_table');

      expect(result).toEqual(mockData);
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should return empty array when no records found', async () => {
      const mockData: unknown[] = [];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockData);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findAll('test_table');

      expect(result).toEqual([]);
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockRejectedValue(new Error('Database connection failed'));
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findAll('test_table');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    test('should return record when found', async () => {
      const mockData = { id: '1', name: 'Item 1' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([mockData]);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findById('test_table', '1');

      expect(result).toEqual(mockData);
      expect(mockDb.select).toHaveBeenCalled();
    });

    test('should return null when not found', async () => {
      const mockData: unknown[] = [];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockData);
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findById('test_table', '999');

      expect(result).toBeNull();
    });

    test('should handle database errors gracefully', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockRejectedValue(new Error('Database connection failed'));
      mockDb.select.mockReturnValue(mockQueryBuilder);

      const result = await repository.findById('test_table', '1');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    test('should insert and return new record', async () => {
      const newRecord = { id: '1', name: 'New Item' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([newRecord]);
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      const result = await repository.create('test_table', newRecord);

      expect(result).toEqual(newRecord);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    test('should handle insert errors by throwing', async () => {
      const newRecord = { id: '1', name: 'New Item' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockRejectedValue(new Error('Insert failed'));
      mockDb.insert.mockReturnValue(mockQueryBuilder);

      expect(repository.create('test_table', newRecord)).rejects.toThrow('Insert failed');
    });
  });

  describe('update', () => {
    test('should update and return updated record', async () => {
      const updatedRecord = { id: '1', name: 'Updated Item' };
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue([updatedRecord]);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      const result = await repository.update('test_table', '1', { name: 'Updated Item' });

      expect(result).toEqual(updatedRecord);
      expect(mockDb.update).toHaveBeenCalled();
    });

    test('should return null when record not found', async () => {
      const mockData: unknown[] = [];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockResolvedValue(mockData);
      mockDb.update.mockReturnValue(mockQueryBuilder);

      const result = await repository.update('test_table', '999', { name: 'Updated' });

      expect(result).toBeNull();
    });

    test('should handle update errors by throwing', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.returning.mockRejectedValue(new Error('Update failed'));
      mockDb.update.mockReturnValue(mockQueryBuilder);

      expect(repository.update('test_table', '1', { name: 'Updated' })).rejects.toThrow('Update failed');
    });
  });

  describe('delete', () => {
    test('should delete and return true when successful', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.execute.mockResolvedValue(1);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      const result = await repository.delete('test_table', '1');

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    test('should return false when record not found', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.execute.mockResolvedValue(0);
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      const result = await repository.delete('test_table', '999');

      expect(result).toBe(false);
    });

    test('should handle delete errors gracefully', async () => {
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.execute.mockRejectedValue(new Error('Delete failed'));
      mockDb.delete.mockReturnValue(mockQueryBuilder);

      const result = await repository.delete('test_table', '1');

      expect(result).toBe(false);
    });
  });
});

class TestRepository extends BaseRepository {
  async findAll(tableName: string): Promise<unknown[]> {
    try {
      const queryBuilder = this.db.select(tableName) as any;
      const result = await queryBuilder.from(tableName).returning();
      return result as unknown[];
    } catch {
      return this.handleRepositoryError('findAll', new Error(), []);
    }
  }

  async findById(tableName: string, id: string): Promise<null> {
    try {
      const queryBuilder = this.db.select(tableName) as any;
      const result = await queryBuilder.from(tableName).where({ id }).returning();
      return Array.isArray(result) && result.length > 0 ? result[0] : null;
    } catch {
      return this.handleRepositoryError('findById', new Error(), null);
    }
  }

  async create(tableName: string, data: unknown): Promise<unknown> {
    try {
      const queryBuilder = this.db.insert(tableName) as any;
      const result = await queryBuilder.values(data).returning();
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async update(tableName: string, id: string, data: unknown): Promise<null> {
    try {
      const queryBuilder = this.db.update(tableName) as any;
      const result = await queryBuilder.set(data).where({ id }).returning();
      return Array.isArray(result) && result.length > 0 ? result[0] : null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  async delete(tableName: string, id: string): Promise<boolean> {
    try {
      const queryBuilder = this.db.delete(tableName) as any;
      const result = await queryBuilder.where({ id }).execute();
      return (result as number) > 0;
    } catch {
      return this.handleRepositoryError('delete', new Error(), false);
    }
  }
}
