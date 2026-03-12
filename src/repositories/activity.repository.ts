import { desc, eq, and, isNull, isNotNull, sql } from 'drizzle-orm';
import { userActivityLogs } from '../database/schema';
import type { UserActivityLog, NewUserActivityLog } from '../database/schema';
import { BaseRepository, type FindOptions } from './base.repository';

export interface ActivityLogListOptions extends FindOptions {
  userId?: string;
  action?: string;
  entity?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
}

export interface IActivityLogRepository {
  create(data: NewUserActivityLog): Promise<UserActivityLog>;
  findById(id: string): Promise<UserActivityLog | null>;
  findByUserId(userId: string, options?: { limit?: number; offset?: number }): Promise<UserActivityLog[]>;
  findAll(options?: ActivityLogListOptions): Promise<UserActivityLog[]>;
  deleteOlderThan(date: Date): Promise<number>;
}

export class ActivityLogRepository extends BaseRepository implements IActivityLogRepository {
  get tableName(): string {
    return 'user_activity_logs';
  }

  async create(data: NewUserActivityLog): Promise<UserActivityLog> {
    try {
      const result = await this.db.insert(userActivityLogs).values(data).returning();
      return result[0];
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async findById(id: string): Promise<UserActivityLog | null> {
    try {
      const result = await this.db.select().from(userActivityLogs).where(eq(userActivityLogs.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.logError('findById', error);
      return null;
    }
  }

  async findByUserId(userId: string, options?: { limit?: number; offset?: number }): Promise<UserActivityLog[]> {
    try {
      const conditions = [eq(userActivityLogs.userId, userId)];
      const baseQuery = this.db
        .select()
        .from(userActivityLogs)
        .where(and(...conditions));

      if (options?.limit && options?.offset) {
        return await baseQuery.orderBy(desc(userActivityLogs.createdAt)).limit(options.limit).offset(options.offset);
      }

      if (options?.limit) {
        return await baseQuery.orderBy(desc(userActivityLogs.createdAt)).limit(options.limit);
      }

      return await baseQuery.orderBy(desc(userActivityLogs.createdAt));
    } catch (error) {
      this.logError('findByUserId', error);
      return [];
    }
  }

  async findAll(options: ActivityLogListOptions = {}): Promise<UserActivityLog[]> {
    try {
      const conditions = [];

      if (options.userId) {
        conditions.push(eq(userActivityLogs.userId, options.userId));
      }

      if (options.action) {
        conditions.push(eq(userActivityLogs.action, options.action));
      }

      if (options.entity) {
        conditions.push(eq(userActivityLogs.entity, options.entity));
      }

      if (options.onlyDeleted) {
        conditions.push(isNotNull(userActivityLogs.deletedAt));
      } else if (!options.includeDeleted) {
        conditions.push(isNull(userActivityLogs.deletedAt));
      }

      const baseQuery =
        conditions.length > 0
          ? this.db
              .select()
              .from(userActivityLogs)
              .where(and(...conditions))
          : this.db.select().from(userActivityLogs);

      if (options.limit && options.offset) {
        return await baseQuery.orderBy(desc(userActivityLogs.createdAt)).limit(options.limit).offset(options.offset);
      }

      if (options.limit) {
        return await baseQuery.orderBy(desc(userActivityLogs.createdAt)).limit(options.limit);
      }

      return await baseQuery.orderBy(desc(userActivityLogs.createdAt));
    } catch (error) {
      this.logError('findAll', error);
      return [];
    }
  }

  async deleteOlderThan(date: Date): Promise<number> {
    try {
      const result = await this.db
        .delete(userActivityLogs)
        .where(sql`${userActivityLogs.createdAt} < ${date}`)
        .returning();
      return result.length;
    } catch (error) {
      this.logError('deleteOlderThan', error);
      return 0;
    }
  }
}
