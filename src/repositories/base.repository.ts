import type { SQL } from 'drizzle-orm';
import { logger } from '../core/logging/logger';

export type Database = ReturnType<typeof import('../database/connection').getConnection>;

export interface FindOptions {
  where?: SQL;
  limit?: number;
  offset?: number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export abstract class BaseRepository {
  constructor(protected db: Database) {}

  protected logError(operation: string, error: unknown): void {
    logger.error(`Repository ${operation} failed`, error);
  }

  protected handleRepositoryError<T>(operation: string, error: unknown, defaultValue: T): T {
    this.logError(operation, error);
    return defaultValue;
  }
}

export abstract class CRUDRepository<T, K> extends BaseRepository {
  abstract get tableName(): string;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
  async findAll(_options: FindOptions = {}): Promise<T[]> {
    try {
      // Implementation depends on specific repository
      return [];
    } catch (error) {
      return this.handleRepositoryError('findAll', error, []);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async findById(_id: K): Promise<T | null> {
    try {
      // Implementation in specific repository
      return null;
    } catch (error) {
      return this.handleRepositoryError('findById', error, null);
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async create(data: T): Promise<T> {
    try {
      // Implementation in specific repository
      return data;
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async update(_id: K, _data: Partial<T>): Promise<T | null> {
    try {
      // Implementation in specific repository
      return null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async delete(_id: K): Promise<boolean> {
    try {
      // Implementation in specific repository
      return false;
    } catch (error) {
      return this.handleRepositoryError('delete', error, false);
    }
  }

  async paginate(options: PaginationOptions): Promise<PaginatedResult<T>> {
    const { page, pageSize } = options;
    const offset = (page - 1) * pageSize;

    try {
      const [data, countResult] = await Promise.all([this.findAll({ limit: pageSize, offset }), this.count()]);

      const total = Array.isArray(countResult) ? countResult.length : countResult;
      const totalPages = Math.ceil(total / pageSize);

      return {
        data,
        total,
        page,
        pageSize,
        totalPages,
      };
    } catch (error) {
      return this.handleRepositoryError('paginate', error, {
        data: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }
  }

  protected abstract count(): Promise<number>;
}
