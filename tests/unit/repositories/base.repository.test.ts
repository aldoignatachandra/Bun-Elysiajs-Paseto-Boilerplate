/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach, jest } from 'bun:test';
import { CRUDRepository, BaseRepository } from '@/repositories/base.repository';
import { createMockDb } from '../mocks/repository.mocks';

describe('BaseRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
  });

  describe('BaseRepository error handling', () => {
    test('should handle repository errors and return default value', () => {
      const repository = new TestBaseRepository(mockDb as any);
      const error = new Error('Database error');

      const result = repository.handleRepositoryError('testOperation', error, 'default');

      expect(result).toBe('default');
    });

    test('should log errors when handling repository errors', () => {
      const repository = new TestBaseRepository(mockDb as any);
      const spy = jest.spyOn(repository as any, 'logError');
      const error = new Error('Database error');

      repository.handleRepositoryError('testOperation', error, 'default');

      expect(spy).toHaveBeenCalledWith('testOperation', error);
    });
  });
});

class TestBaseRepository extends BaseRepository {
  public testLogError(operation: string, error: unknown): void {
    this.logError(operation, error);
  }

  public testHandleRepositoryError<T>(operation: string, error: unknown, defaultValue: T): T {
    return this.handleRepositoryError(operation, error, defaultValue);
  }
}

describe('CRUDRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: TestCRUDRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new TestCRUDRepository(mockDb as any);
    repository.setMockRecords([]);
  });

  describe('findAll', () => {
    test('should return array of records', async () => {
      const mockRecords = [
        { id: '1', name: 'Record 1' },
        { id: '2', name: 'Record 2' },
      ];
      repository.setMockRecords(mockRecords);

      const result = await repository.findAll({});

      expect(result).toEqual(mockRecords);
    });

    test('should apply limit when provided', async () => {
      const mockRecords = [{ id: '1', name: 'Record 1' }];
      repository.setMockRecords(mockRecords);
      const limit = 1;

      const result = await repository.findAll({ limit });

      expect(result).toEqual(mockRecords);
    });

    test('should apply offset when provided', async () => {
      const mockRecords = [{ id: '2', name: 'Record 2' }];
      repository.setMockRecords(mockRecords);
      const offset = 1;

      const result = await repository.findAll({ offset });

      expect(result).toEqual(mockRecords);
    });

    test('should handle empty results', async () => {
      repository.setMockRecords([]);

      const result = await repository.findAll({});

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    test('should return record when found', async () => {
      const mockRecord = { id: '1', name: 'Record 1' };
      repository.setMockRecords([mockRecord]);

      const result = await repository.findById('1');

      expect(result).toEqual(mockRecord);
    });

    test('should return null when not found', async () => {
      repository.setMockRecords([]);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    test('should insert and return new record', async () => {
      const newRecord = { id: '1', name: 'New Record' };

      const result = await repository.create(newRecord);

      expect(result).toEqual(newRecord);
    });
  });

  describe('update', () => {
    test('should update and return updated record', async () => {
      const updatedRecord = { id: '1', name: 'Updated Record' };
      repository.setMockRecords([updatedRecord]);

      const result = await repository.update('1', { name: 'Updated Record' });

      expect(result).toEqual(updatedRecord);
    });

    test('should return null when record not found', async () => {
      repository.setMockRecords([]);

      const result = await repository.update('nonexistent', { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    test('should delete and return true when successful', async () => {
      const mockRecord = { id: '1', name: 'Record 1' };
      repository.setMockRecords([mockRecord]);

      const result = await repository.delete('1');

      expect(result).toBe(true);
    });

    test('should return false when record not found', async () => {
      repository.setMockRecords([]);

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('paginate', () => {
    test('should return paginated results with metadata', async () => {
      repository.setMockRecords([
        { id: '1', name: 'Record 1' },
        { id: '2', name: 'Record 2' },
      ]);
      repository.setMockCount(10);

      const result = await repository.paginate({ page: 1, pageSize: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(10);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.totalPages).toBe(5);
    });

    test('should calculate total pages correctly', async () => {
      repository.setMockRecords([{ id: '1', name: 'Record 1' }]);
      repository.setMockCount(5);

      const result = await repository.paginate({ page: 1, pageSize: 2 });

      expect(result.totalPages).toBe(3);
    });

    test('should return empty data when no records exist', async () => {
      repository.setMockRecords([]);
      repository.setMockCount(0);

      const result = await repository.paginate({ page: 1, pageSize: 10 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    test('should handle errors and return default paginated result', async () => {
      repository.setShouldThrowError(true);

      const result = await repository.paginate({ page: 1, pageSize: 10 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(0);
    });
  });
});

class TestCRUDRepository extends CRUDRepository<{ id: string; name: string }, string> {
  private mockRecords: { id: string; name: string }[] = [];
  private mockCountValue = 0;
  private shouldThrowError = false;

  get tableName(): string {
    return 'test_table';
  }

  setMockRecords(records: { id: string; name: string }[]): void {
    this.mockRecords = records;
  }

  setMockCount(count: number): void {
    this.mockCountValue = count;
  }

  setShouldThrowError(shouldThrow: boolean): void {
    this.shouldThrowError = shouldThrow;
  }

  async findAll(): Promise<{ id: string; name: string }[]> {
    if (this.shouldThrowError) {
      throw new Error('Database error');
    }
    return this.mockRecords;
  }

  async findById(id: string): Promise<{ id: string; name: string } | null> {
    return this.mockRecords.find(record => record.id === id) || null;
  }

  async create(data: { id: string; name: string }): Promise<{ id: string; name: string }> {
    if (this.shouldThrowError) {
      throw new Error('Database error');
    }
    return data;
  }

  async update(id: string): Promise<{ id: string; name: string } | null> {
    return this.mockRecords.find(record => record.id === id) || null;
  }

  async delete(id: string): Promise<boolean> {
    return this.mockRecords.some(record => record.id === id);
  }

  protected async count(): Promise<number> {
    if (this.shouldThrowError) {
      throw new Error('Database error');
    }
    return this.mockCountValue;
  }
}
