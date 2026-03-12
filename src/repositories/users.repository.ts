import { and, desc, eq, ilike, isNotNull, isNull, or, count, gte } from 'drizzle-orm';
import { users } from '../database/schema';
import type { User, NewUser } from '../database/schema';
import { CRUDRepository, type FindOptions } from './base.repository';
import type { IUserRepository } from './unit-of-work';

export interface UserListOptions extends FindOptions {
  search?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
}

export class UserRepository extends CRUDRepository<User, string> implements IUserRepository {
  get tableName(): string {
    return 'users';
  }

  async findAll(options: UserListOptions = {}): Promise<User[]> {
    try {
      const conditions = [];

      if (options.search) {
        conditions.push(
          or(ilike(users.email, `%${options.search}%`), ilike(users.username, `%${options.search}%`), ilike(users.name, `%${options.search}%`))
        );
      }

      if (options.onlyDeleted) {
        conditions.push(isNotNull(users.deletedAt));
      } else if (!options.includeDeleted) {
        conditions.push(isNull(users.deletedAt));
      }

      let query = this.db.select().from(users).$dynamic();

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(users.createdAt));

      if (typeof options.limit === 'number') {
        query = query.limit(options.limit);
      }

      if (typeof options.offset === 'number') {
        query = query.offset(options.offset);
      }

      return await query;
    } catch (error) {
      this.logError('findAll', error);
      return [];
    }
  }

  async findById(id: string, includeDeleted = true): Promise<User | null> {
    try {
      const conditions = [eq(users.id, id)];
      if (!includeDeleted) {
        conditions.push(isNull(users.deletedAt));
      }

      const result = await this.db
        .select()
        .from(users)
        .where(and(...conditions))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      this.logError('findById', error);
      return null;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.logError('findByEmail', error);
      return null;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.logError('findByUsername', error);
      return null;
    }
  }

  async count(includeDeleted = false): Promise<number> {
    try {
      const result = includeDeleted
        ? await this.db.select({ count: count() }).from(users)
        : await this.db.select({ count: count() }).from(users).where(isNull(users.deletedAt));
      return result[0]?.count ?? 0;
    } catch (error) {
      this.logError('count', error);
      return 0;
    }
  }

  async countSince(date: Date): Promise<number> {
    try {
      const result = await this.db
        .select({ count: count() })
        .from(users)
        .where(and(isNull(users.deletedAt), gte(users.createdAt, date)));
      return result[0]?.count ?? 0;
    } catch (error) {
      this.logError('countSince', error);
      return 0;
    }
  }

  async create(data: NewUser): Promise<User> {
    try {
      const result = await this.db.insert(users).values(data).returning();
      return result[0];
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    try {
      const result = await this.db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  async setActive(id: string, active: boolean): Promise<boolean> {
    try {
      const result = await this.db
        .update(users)
        .set({ deletedAt: active ? null : new Date(), updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      this.logError('setActive', error);
      return false;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(users)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(users.id, id), isNull(users.deletedAt)))
        .returning();

      return result.length > 0;
    } catch (error) {
      this.logError('softDelete', error);
      return false;
    }
  }

  async restore(id: string): Promise<boolean> {
    try {
      const result = await this.db.update(users).set({ deletedAt: null, updatedAt: new Date() }).where(eq(users.id, id)).returning();

      return result.length > 0;
    } catch (error) {
      this.logError('restore', error);
      return false;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      this.logError('delete', error);
      return false;
    }
  }
}
