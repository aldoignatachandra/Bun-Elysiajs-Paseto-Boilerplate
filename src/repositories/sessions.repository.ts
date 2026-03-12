import { eq, and, lt } from 'drizzle-orm';
import { sessions } from '../database/schema';
import type { Session, NewSession } from '../database/schema';
import { CRUDRepository } from './base.repository';
import type { ISessionRepository } from './unit-of-work';

export class SessionRepository extends CRUDRepository<Session, string> implements ISessionRepository {
  get tableName(): string {
    return 'sessions';
  }

  async findById(id: string): Promise<Session | null> {
    try {
      const result = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.logError('findById', error);
      return null;
    }
  }

  async findByTokenId(tokenId: string): Promise<Session | null> {
    try {
      const result = await this.db.select().from(sessions).where(eq(sessions.tokenId, tokenId)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.logError('findByTokenId', error);
      return null;
    }
  }

  async create(data: NewSession): Promise<Session> {
    try {
      const result = await this.db.insert(sessions).values(data).returning();
      return result[0];
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async revoke(id: string): Promise<boolean> {
    try {
      const result = await this.db.update(sessions).set({ isRevoked: true, updatedAt: new Date() }).where(eq(sessions.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      this.logError('revoke', error);
      return false;
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const result = await this.db
        .delete(sessions)
        .where(and(lt(sessions.expiresAt, new Date()), eq(sessions.isRevoked, false)))
        .returning();
      return result.length;
    } catch (error) {
      this.logError('deleteExpired', error);
      return 0;
    }
  }

  async update(id: string, data: Partial<Session>): Promise<Session | null> {
    try {
      const result = await this.db
        .update(sessions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sessions.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(sessions).where(eq(sessions.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      this.logError('delete', error);
      return false;
    }
  }

  protected async count(): Promise<number> {
    try {
      const result = await this.db.select({ count: sessions.id }).from(sessions);
      return result.length;
    } catch (error) {
      return this.handleRepositoryError('count', error, 0);
    }
  }
}
