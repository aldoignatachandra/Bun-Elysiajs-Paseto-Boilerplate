import { eq } from 'drizzle-orm';
import { users } from '../database/schema';
import type { User, NewUser } from '../database/schema';
import { CRUDRepository } from './base.repository';
import type { IUserRepository } from './unit-of-work';

export class UserRepository extends CRUDRepository<User, string> implements IUserRepository {
  get tableName(): string {
    return 'users';
  }

  async findById(id: string): Promise<User | null> {
    try {
      const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
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
      const result = await this.db.select({ count: users.id }).from(users);
      return result.length;
    } catch (error) {
      return this.handleRepositoryError('count', error, 0);
    }
  }
}
