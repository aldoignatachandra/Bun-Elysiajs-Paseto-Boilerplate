import { eq, and, lt, isNull } from 'drizzle-orm';
import { userSessions } from '../database/schema';
import type { UserSession, NewUserSession } from '../database/schema';
import { CRUDRepository } from './base.repository';
import type { ISessionRepository } from './unit-of-work';

export class SessionRepository extends CRUDRepository<UserSession, string> implements ISessionRepository {
  get tableName(): string {
    return 'user_sessions';
  }

  async findById(id: string): Promise<UserSession | null> {
    try {
      const result = await this.db.select().from(userSessions).where(eq(userSessions.id, id)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.logError('findById', error);
      return null;
    }
  }

  async findByToken(token: string): Promise<UserSession | null> {
    try {
      const result = await this.db.select().from(userSessions).where(eq(userSessions.token, token)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.logError('findByToken', error);
      return null;
    }
  }

  async findByTokenId(tokenId: string): Promise<UserSession | null> {
    try {
      // tokenId is stored in the token field for refresh token sessions
      const result = await this.db.select().from(userSessions).where(eq(userSessions.token, tokenId)).limit(1);
      return result[0] || null;
    } catch (error) {
      this.logError('findByTokenId', error);
      return null;
    }
  }

  async findActiveSessionByUserId(userId: string): Promise<UserSession | null> {
    try {
      const result = await this.db
        .select()
        .from(userSessions)
        .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      this.logError('findActiveSessionByUserId', error);
      return null;
    }
  }

  async findByUserId(userId: string): Promise<UserSession[]> {
    try {
      const result = await this.db.select().from(userSessions).where(eq(userSessions.userId, userId));
      return result;
    } catch (error) {
      this.logError('findByUserId', error);
      return [];
    }
  }

  async create(data: NewUserSession): Promise<UserSession> {
    try {
      const result = await this.db.insert(userSessions).values(data).returning();
      return result[0];
    } catch (error) {
      this.logError('create', error);
      throw error;
    }
  }

  async revoke(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(userSessions)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(userSessions.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      this.logError('revoke', error);
      return false;
    }
  }

  async revokeAllForUser(userId: string): Promise<boolean> {
    try {
      const result = await this.db
        .update(userSessions)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)))
        .returning();
      return result.length > 0;
    } catch (error) {
      this.logError('revokeAllForUser', error);
      return false;
    }
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    try {
      const result = await this.db.delete(userSessions).where(eq(userSessions.userId, userId)).returning();
      return result.length > 0;
    } catch (error) {
      this.logError('deleteByUserId', error);
      return false;
    }
  }

  async deleteExpired(): Promise<number> {
    try {
      const result = await this.db
        .delete(userSessions)
        .where(and(lt(userSessions.expiresAt, new Date()), isNull(userSessions.revokedAt)))
        .returning();
      return result.length;
    } catch (error) {
      this.logError('deleteExpired', error);
      return 0;
    }
  }

  async update(id: string, data: Partial<UserSession>): Promise<UserSession | null> {
    try {
      const result = await this.db
        .update(userSessions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userSessions.id, id))
        .returning();
      return result[0] || null;
    } catch (error) {
      this.logError('update', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db.delete(userSessions).where(eq(userSessions.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      this.logError('delete', error);
      return false;
    }
  }

  protected async count(): Promise<number> {
    try {
      const result = await this.db.select({ count: userSessions.id }).from(userSessions);
      return result.length;
    } catch (error) {
      return this.handleRepositoryError('count', error, 0);
    }
  }
}
