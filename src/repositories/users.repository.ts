import { and, desc, eq, ilike, isNotNull, isNull, or } from 'drizzle-orm';
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
          or(ilike(users.email, `%${options.search}%`), ilike(users.firstName, `%${options.search}%`), ilike(users.lastName, `%${options.search}%`))
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
      const result = await this.db.update(users).set({ isActive: active, updatedAt: new Date() }).where(eq(users.id, id)).returning();

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
        .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
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
      const result = await this.db.update(users).set({ deletedAt: null, isActive: true, updatedAt: new Date() }).where(eq(users.id, id)).returning();

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

  protected async count(): Promise<number> {
    try {
      const rows = await this.db.select({ id: users.id }).from(users).where(isNull(users.deletedAt));
      return rows.length;
    } catch (error) {
      return this.handleRepositoryError('count', error, 0);
    }
  }
}
